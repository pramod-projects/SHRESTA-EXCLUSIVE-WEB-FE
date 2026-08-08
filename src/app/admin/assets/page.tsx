import { createHash, randomUUID } from "crypto";
import {
  addProductAction,
  archiveAssetAction,
  clearProductGallerySlotAction,
  deleteAssetRequestAction,
  updateMerchandisingProductAction,
  uploadAndSetProductGalleryImageAction,
  uploadAndSetProductPrimaryImageAction,
  uploadAndSetProductVideoAction
} from "@/app/admin/actions";
import { AdminApiUnavailable } from "@/components/admin/admin-api-unavailable";
import { AdminActionForm, AdminSubmitButton } from "@/components/admin/admin-action-form";
import { DisplayItemEditor } from "@/components/admin/display-item-editor";
import { EnumMultiSelect } from "@/components/admin/enum-multi-select";
import { PageJump } from "@/components/admin/page-jump";
import {
  fetchAdminAssets,
  fetchAdminCategories,
  fetchAdminChangeRequests,
  fetchAdminStorefrontHome,
  type AdminChangeRequestResponse,
  type AssetResponse,
} from "@/features/admin/admin-api";
import type { ProductCard } from "@/features/storefront/storefront-home";
import { adminTagValues, ensureAdminTagOptions, ensureEnumOption, enumValues, toEnumValue } from "@/lib/admin-enums";
import { nullWhenShrestaApiUnavailable } from "@/lib/api-page-fallback";
import { PricingSection } from "@/components/admin/pricing-section";
import { ImageFilePreview } from "@/components/admin/image-file-preview";

export const dynamic = "force-dynamic";

/**
 * Deterministic per-product, per-operation idempotency key.
 * Stable within the same UTC hour so multiple rapid clicks resolve to a single
 * HTTP-level write.  After the hour rolls over the key changes, allowing fresh
 * submissions once previous requests have been reviewed / approved.
 * DB-level upsert provides the hard uniqueness guarantee on top.
 */
function stableKey(productKey: string, op: string): string {
  const hour = new Date().toISOString().slice(0, 13); // "2026-07-18T14"
  return createHash("sha256")
    .update(`${productKey}:${op}:${hour}`)
    .digest("hex")
    .slice(0, 32);
}

const PRODUCTS_PER_PAGE = 5;

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminAssetsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const productPage = numberParam(params, "productPage", 0);

  const data = await nullWhenShrestaApiUnavailable(async () => {
    const [categories, home, allAssets, pendingRequests] = await Promise.all([
      fetchAdminCategories(),
      fetchAdminStorefrontHome(),
      fetchAdminAssets({ page: 0, size: 200 }),
      fetchAdminChangeRequests("PENDING_REVIEW"),
    ]);
    return { categories, home, allAssets, pendingRequests };
  });

  if (!data) {
    return <AdminApiUnavailable />;
  }

  const { categories, home, allAssets, pendingRequests } = data;
  const products = home.bestsellers;

  // Build per-entity lookup (assetKey → request for asset-removal)
  // and per-product lookup (covers metadata, image, gallery per slot, video)
  const pendingByEntity = new Map<string, AdminChangeRequestResponse>();
  for (const req of pendingRequests) {
    pendingByEntity.set(req.entityKey, req);
  }

  const totalProductPages = Math.max(1, Math.ceil(products.length / PRODUCTS_PER_PAGE));
  const normalizedProductPage = Math.min(Math.max(0, productPage), totalProductPages - 1);
  const pagedProducts = products.slice(
    normalizedProductPage * PRODUCTS_PER_PAGE,
    (normalizedProductPage + 1) * PRODUCTS_PER_PAGE
  );

  const skuOptions = enumValues(home.bestsellers.map((p) => p.sku));
  const productTypeOptions = categories.flatMap((category) =>
    category.productTypes.map((type) => ({
      familyKey: category.familyKey,
      familyName: category.displayName,
      label: type.displayName,
      value: type.typeKey
    }))
  );
  const badgeOptions = adminTagValues(products.flatMap((p) => p.badges));
  const tagOptions = badgeOptions;

  const hasDiscount = (p: ProductCard) => p.compareAtPricePaise > p.pricePaise;
  const discountPct = (p: ProductCard) =>
    hasDiscount(p) ? Math.round(((p.compareAtPricePaise - p.pricePaise) / p.compareAtPricePaise) * 100) : 0;

  return (
    <div className="space-y-8">

      {/* Header */}
      <header className="flex flex-col gap-3 border-b border-[var(--shresta-logo-border)] pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--gold-400)]">Catalog Operations</p>
          <h1 className="mt-2 font-serif text-4xl font-light text-[var(--shresta-logo-text)]">Products</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--shresta-logo-muted)]">
            Manage storefront products. Upload images and videos directly to S3, edit every product field,
            and submit changes through the review queue.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 text-sm text-[var(--shresta-logo-muted)]">
          <span>{products.length} storefront products</span>
        </div>
      </header>

      {/* Metrics */}
      <section className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
        <Metric label="Total Products" value={products.length.toString()} />
        <Metric label="With Image" value={products.filter((p) => p.image).length.toString()} />
        <Metric label="With Discount" value={products.filter(hasDiscount).length.toString()} />
        <Metric label="With Video" value={products.filter((p) => p.demoVideoUrl).length.toString()} />
      </section>

      {/* Find Assets */}
      {/* Add New Product */}
      <details className="admin-panel rounded-lg p-4">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
          <div>
            <h2 className="font-serif text-2xl font-light text-[var(--shresta-logo-text)]">Add New Product</h2>
            <p className="mt-1 text-sm text-[var(--shresta-logo-muted)]">
              Create a new bestseller product with image, gallery, video, pricing, and metadata — the change
              goes to the review queue before going live.
            </p>
          </div>
          <span className="rounded-full bg-[rgba(212,175,55,0.14)] px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-[var(--gold-600)]">Add product</span>
        </summary>
        <AdminActionForm action={addProductAction} className="mt-5 space-y-5">
          <input name="idempotencyKey" type="hidden" value={randomUUID()} />

          {/* Primary Image */}
          <div className="rounded-lg border border-[var(--shresta-logo-border)] p-4">
            <p className="mb-1 text-xs font-bold uppercase tracking-[0.14em] text-[var(--gold-400)]">Primary Display Image — optional</p>
            <p className="mb-3 text-xs text-[var(--shresta-logo-muted)]">
              Upload the main product image. It is uploaded straight to S3 and linked to the new product.
              You can also add or replace it later from the edit panel.
            </p>
            <ImageFilePreview className="w-36" label="Upload primary image" name="imageFile" />
          </div>

          {/* Gallery Images */}
          <div className="rounded-lg border border-[var(--shresta-logo-border)] p-4">
            <p className="mb-1 text-xs font-bold uppercase tracking-[0.14em] text-[var(--gold-400)]">Gallery Images — up to 4 optional</p>
            <p className="mb-4 text-xs text-[var(--shresta-logo-muted)]">
              Upload additional product images shown in the carousel. Each slot is optional — leave empty if not needed.
            </p>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {([1, 2, 3, 4] as const).map((slot) => (
                <div key={slot} className="space-y-2 rounded-lg border border-[var(--shresta-logo-border)] p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--shresta-logo-muted)]">Slot {slot}</p>
                  <ImageFilePreview label="Upload image" name={`galleryFile${slot}`} />
                </div>
              ))}
            </div>
          </div>

          {/* Demo Video */}
          <div className="rounded-lg border border-[var(--shresta-logo-border)] p-4">
            <p className="mb-1 text-xs font-bold uppercase tracking-[0.14em] text-[var(--gold-400)]">Demo Video — optional</p>
            <p className="mb-3 text-xs text-[var(--shresta-logo-muted)]">
              Upload a video file (stored on S3) or paste a URL. File upload takes precedence if both are provided.
            </p>
            <div className="grid gap-3 lg:grid-cols-2">
              <label className="admin-label">
                Upload video file (MP4, MOV, etc.)
                <input accept="video/*" className="admin-input" name="videoFile" type="file" />
              </label>
              <label className="admin-label">
                — or paste a video URL
                <input className="admin-input" name="demoVideoUrl" placeholder="https://youtube.com/watch?v=..." type="url" />
              </label>
            </div>
          </div>

          {/* Metadata */}
          <div className="space-y-5 rounded-lg border border-[var(--shresta-logo-border)] p-4">
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-[var(--gold-400)]">Identity</p>
              <div className="grid gap-3 lg:grid-cols-6">
                <label className="admin-label lg:col-span-3">
                  Product Name (Title) <span className="text-rose-400">*</span>
                  <input className="admin-input" name="title" placeholder="e.g. Kundan Gold Necklace Set" required />
                </label>
                <label className="admin-label">
                  SKU
                  <input className="admin-input" name="sku" placeholder="e.g. kun-nk-0001" />
                </label>
                <label className="admin-label">
                  Sort Order
                  <input className="admin-input" defaultValue="0" min="0" name="sortOrder" type="number" />
                </label>
                <label className="admin-label">
                  Category Family
                  <select className="admin-input" name="familyKey">
                    <option value="">Unassigned</option>
                    {categories.map((category) => (
                      <option key={category.familyKey} value={category.familyKey}>{category.displayName}</option>
                    ))}
                  </select>
                </label>
                <label className="admin-label">
                  Product Type
                  <select className="admin-input" name="productType">
                    <option value="">Unassigned</option>
                    {productTypeOptions.map((type) => (
                      <option key={`${type.familyKey}-${type.value}`} value={type.value}>{type.familyName} / {type.label}</option>
                    ))}
                  </select>
                </label>
                <label className="flex cursor-pointer items-center gap-2 self-end pb-2 text-sm text-[var(--shresta-logo-muted)]">
                  <input className="h-4 w-4 accent-[var(--gold-500)]" name="featured" type="checkbox" />
                  Show as Bestseller
                </label>
              </div>
            </div>

            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-[var(--gold-400)]">Pricing and Discount</p>
              <PricingSection defaultCompareAtPricePaise={0} defaultPricePaise={0} />
            </div>

            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-[var(--gold-400)]">Descriptions</p>
              <div className="grid gap-3 lg:grid-cols-2">
                <label className="admin-label">
                  Short Description
                  <textarea className="admin-input min-h-20" name="description" placeholder="Shown on product cards" />
                </label>
                <label className="admin-label">
                  Long Description
                  <textarea className="admin-input min-h-20" name="longDescription" placeholder="Full detail shown on product page" />
                </label>
              </div>
            </div>

            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-[var(--gold-400)]">Ratings and Social Proof</p>
              <div className="grid gap-3 lg:grid-cols-4">
                <label className="admin-label">
                  Rating (0–5)
                  <input className="admin-input" max="5" min="0" name="rating" step="0.1" type="number" />
                </label>
                <label className="admin-label">
                  Review Count
                  <input className="admin-input" min="0" name="reviewCount" type="number" />
                </label>
                <label className="admin-label">
                  Stock Quantity
                  <input className="admin-input" min="0" name="stockQuantity" type="number" />
                </label>
                <div className="lg:col-span-2">
                  <EnumMultiSelect
                    defaultValues={[]}
                    label="Badges"
                    name="badges"
                    options={badgeOptions}
                    valueKind="tag"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 border-t border-[var(--shresta-logo-border)] pt-4">
              <AdminSubmitButton label="Submit for Review" />
              <p className="text-xs text-[var(--shresta-logo-muted)]">Goes to review queue — must be approved before going live.</p>
            </div>
          </div>
        </AdminActionForm>
      </details>

      {/* ══════════════════════════════════════════════
          DISPLAY SECTIONS
          ══════════════════════════════════════════════ */}
      <details className="admin-panel rounded-lg p-4">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
          <div>
            <h2 className="font-serif text-2xl font-light text-[var(--shresta-logo-text)]">Display Sections</h2>
            <p className="mt-1 text-sm text-[var(--shresta-logo-muted)]">
              Manage images for hero slides, featured collections, material showcase, and brand logo.
              Choose any uploaded asset or upload a new file.
            </p>
          </div>
          <span className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--shresta-logo-muted)]">
            {home.heroSlides.length + home.featuredCollections.length + home.materialShowcase.stories.length + 1} items
          </span>
        </summary>
        <div className="mt-5 space-y-6">

          {/* Brand */}
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-[var(--shresta-logo-muted)]">Brand</p>
            <DisplayItemEditor
              availableAssets={allAssets.assets}
              currentImage={home.brand.logo}
              idempotencyKey={randomUUID()}
              itemKey={home.brand.itemKey}
              sectionLabel="Brand"
              title={home.brand.name}
            />
          </div>

          {/* Hero Slides */}
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-[var(--shresta-logo-muted)]">Hero Slides ({home.heroSlides.length})</p>
            <div className="space-y-3">
              {home.heroSlides.map((slide) => (
                <DisplayItemEditor
                  availableAssets={allAssets.assets}
                  currentImage={slide.image}
                  idempotencyKey={randomUUID()}
                  itemKey={slide.id}
                  key={slide.id}
                  sectionLabel="Hero"
                  title={slide.title}
                />
              ))}
            </div>
          </div>

          {/* Featured Collections */}
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-[var(--shresta-logo-muted)]">Featured Collections ({home.featuredCollections.length})</p>
            <div className="space-y-3">
              {home.featuredCollections.map((col) => (
                <DisplayItemEditor
                  availableAssets={allAssets.assets}
                  currentImage={col.image}
                  idempotencyKey={randomUUID()}
                  itemKey={col.id}
                  key={col.id}
                  sectionLabel="Collection"
                  title={col.title}
                />
              ))}
            </div>
          </div>

          {/* Material Showcase */}
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-[var(--shresta-logo-muted)]">Material Showcase ({home.materialShowcase.stories.length})</p>
            <div className="space-y-3">
              {home.materialShowcase.stories.map((story) => (
                <DisplayItemEditor
                  availableAssets={allAssets.assets}
                  currentImage={story.image}
                  idempotencyKey={randomUUID()}
                  itemKey={story.id}
                  key={story.id}
                  sectionLabel="Material"
                  title={story.title}
                />
              ))}
            </div>
          </div>
        </div>
      </details>

      {/* ══════════════════════════════════════════════
          PRODUCTS LIST
          ══════════════════════════════════════════════ */}
      <section className="space-y-5">
        <div className="flex flex-col gap-3 border-b border-[var(--shresta-logo-border)] pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--gold-400)]">Storefront Catalog</p>
            <h2 className="mt-1 font-serif text-3xl font-light text-[var(--shresta-logo-text)]">Products</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--shresta-logo-muted)]">
              Upload images and video directly — they go straight to S3 and link automatically. Edit all text
              fields and submit through the review queue.
            </p>
          </div>
          <p className="shrink-0 text-sm text-[var(--shresta-logo-muted)]">{products.length} products total</p>
        </div>

        {pagedProducts.map((product) => {
          const g = product.galleryImages ?? [];
          // Collect ALL pending requests that belong to this product:
          //   - exact match on product.id  (metadata, image, video)
          //   - prefix match for gallery slots  (entityKey = "productId:gallery:N")
          const productPending = pendingRequests.filter(
            req => req.entityKey === product.id || req.entityKey.startsWith(`${product.id}:gallery:`)
          );
          const metadataPending = productPending.find(
            req => req.requestType === "storefront-product-merchandising"
          );
          // Delete/archive requests use assetKey as entityKey, not product.id
          const pendingImageDelete = product.image ? pendingByEntity.get(product.image.assetKey) : undefined;

          return (
            <article className="admin-panel rounded-lg p-4" key={product.id}>
              {/* Pending review banners — one per pending request type */}
              {productPending.map(req => (
                <PendingReviewBanner key={req.requestKey} product={product} request={req} />
              ))}
              {/* Pending review banner — image delete/archive */}
              {pendingImageDelete && <PendingReviewBanner product={product} request={pendingImageDelete} />}
              {/* Summary */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-4">
                  {product.image ? (
                    <img
                      alt={product.image.altText}
                      className="h-20 w-20 shrink-0 rounded-lg border border-[var(--shresta-logo-border)] object-cover"
                      src={product.image.url}
                    />
                  ) : (
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg border border-dashed border-[var(--shresta-logo-border)] text-xs text-[var(--shresta-logo-muted)]">
                      No image
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--gold-400)]">{product.sku}</p>
                      {product.isBestseller && (
                        <span className="rounded-full bg-[rgba(212,175,55,0.2)] px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-[0.1em] text-[var(--gold-700)]">Bestseller</span>
                      )}
                    </div>
                    <h3 className="mt-1 font-serif text-2xl font-light text-[var(--shresta-logo-text)]">{product.name}</h3>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-[var(--shresta-logo-muted)]">
                      <span>₹{(product.pricePaise / 100).toFixed(0)}</span>
                      {hasDiscount(product) && (
                        <span className="rounded-full bg-rose-200/80 px-2 py-0.5 text-xs font-bold text-rose-700">
                          {discountPct(product)}% off
                        </span>
                      )}
                      {product.stockQuantity === 0 ? (
                        <span className="rounded-full bg-red-200/80 px-2 py-0.5 text-xs font-bold text-red-700">Out of Stock</span>
                      ) : product.stockQuantity <= 10 ? (
                        <span className="rounded-full bg-amber-200/80 px-2 py-0.5 text-xs font-bold text-amber-700">Stock: {product.stockQuantity}</span>
                      ) : (
                        <span className="rounded-full bg-emerald-200/80 px-2 py-0.5 text-xs font-bold text-emerald-700">Stock: {product.stockQuantity}</span>
                      )}
                      <span>{(product.galleryImages ?? []).length} gallery</span>
                      {product.demoVideoUrl && <span className="text-[var(--gold-400)]">Has video</span>}
                    </div>
                  </div>
                </div>
                {product.image && (
                  <div className="flex flex-wrap gap-2 sm:shrink-0">
                    {pendingImageDelete ? (
                      <div className="flex items-center gap-2 rounded-lg border border-red-800 bg-red-950/30 px-3 py-1.5">
                        <span className="text-xs font-bold uppercase tracking-[0.1em] text-red-400">
                          🗑 {pendingImageDelete.action === "DELETE" ? "Delete" : "Archive"} pending review
                        </span>
                        <a className="text-xs text-[var(--gold-400)] hover:underline" href="/admin/review">Review →</a>
                      </div>
                    ) : (
                      <>
                        <AdminActionForm action={archiveAssetAction}>
                          <input name="idempotencyKey" type="hidden" value={randomUUID()} />
                          <input name="assetKey" type="hidden" value={product.image.assetKey} />
                          <AdminSubmitButton
                            className="secondary text-xs"
                            label="Request Archive"
                            confirmMessage="When approved, this will permanently delete the file from S3. This cannot be undone. Request archive?"
                          />
                        </AdminActionForm>
                        <AdminActionForm action={deleteAssetRequestAction}>
                          <input name="idempotencyKey" type="hidden" value={randomUUID()} />
                          <input name="assetKey" type="hidden" value={product.image.assetKey} />
                          <AdminSubmitButton
                            className="danger text-xs"
                            label="Request Delete"
                            confirmMessage="When approved, this will PERMANENTLY DELETE the asset record and file from S3. This cannot be undone. Request permanent deletion?"
                          />
                        </AdminActionForm>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Edit panel */}
              <details className="mt-4">
                <summary className="cursor-pointer list-none font-serif text-xl font-light text-[var(--shresta-logo-text)] hover:text-[var(--gold-600)]">
                  Edit product ▸
                </summary>
                <div className="mt-5 space-y-5">

                  {/* Primary Image Upload */}
                  <div className="rounded-lg border border-[var(--shresta-logo-border)] p-4">
                    <p className="mb-1 text-xs font-bold uppercase tracking-[0.14em] text-[var(--gold-400)]">Primary Display Image — mandatory</p>
                    <p className="mb-3 text-xs text-[var(--shresta-logo-muted)]">
                      Upload a new image to replace the current one. The old asset is archived automatically and the new URL is linked to the product.
                    </p>
                    {product.image ? (
                      <div className="mb-3 flex items-center gap-3 rounded-lg border border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-surface)] p-3">
                        <img alt={product.image.altText} className="h-16 w-16 rounded-lg object-cover" src={product.image.url} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold text-[var(--gold-600)]">{product.image.assetKey}</p>
                          <p className="mt-0.5 text-xs text-[var(--shresta-logo-muted)]">
                            {product.image.width} × {product.image.height} · {product.image.deliveryMode}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="mb-3 text-sm text-amber-400">⚠ No primary image set. Upload one below.</p>
                    )}
                    <AdminActionForm action={uploadAndSetProductPrimaryImageAction} className="flex flex-wrap items-end gap-3">
                      <input name="idempotencyKey" type="hidden" value={stableKey(product.id, "primary-upload")} />
                      <input name="productKey" type="hidden" value={product.id} />
                      {product.image && <input name="oldAssetKey" type="hidden" value={product.image.assetKey} />}
                      <div className="w-36 shrink-0">
                        <ImageFilePreview
                          aspectRatio={1}
                          currentAlt={product.image?.altText}
                          currentSrc={product.image?.url}
                          label={product.image ? "Replace image (upload new file → archives old)" : "Upload primary image"}
                          name="file"
                          required
                        />
                      </div>
                      <AdminSubmitButton className="shrink-0" label={product.image ? "Upload & Replace Primary" : "Upload & Set Primary"} />
                    </AdminActionForm>
                  </div>

                  {/* Gallery Images */}
                  <div className="rounded-lg border border-[var(--shresta-logo-border)] p-4">
                    <p className="mb-1 text-xs font-bold uppercase tracking-[0.14em] text-[var(--gold-400)]">Gallery Images — up to 4 optional</p>
                    <p className="mb-4 text-xs text-[var(--shresta-logo-muted)]">
                      Each slot holds one image shown in the product gallery on the storefront. Uploading replaces the slot and archives the old image.
                    </p>
                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                      {([1, 2, 3, 4] as const).map((slot) => {
                        const existing = (product.galleryImages ?? [])[slot - 1];
                        return (
                          <div key={slot} className="space-y-3 rounded-lg border border-[var(--shresta-logo-border)] p-3">
                            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--shresta-logo-muted)]">Slot {slot}</p>
                            {existing && (
                              <p className="truncate text-xs text-[var(--gold-600)]">{existing.assetKey}</p>
                            )}
                            <AdminActionForm action={uploadAndSetProductGalleryImageAction} className="space-y-2">
                              <input name="idempotencyKey" type="hidden" value={stableKey(product.id, `gallery-upload-${slot}`)} />
                              <input name="productKey" type="hidden" value={product.id} />
                              <input name="slot" type="hidden" value={slot.toString()} />
                              {existing && <input name="oldAssetKey" type="hidden" value={existing.assetKey} />}
                              <ImageFilePreview
                                aspectRatio={1}
                                currentAlt={existing?.altText}
                                currentSrc={existing?.url}
                                label={existing ? "Replace image" : "Upload image"}
                                name="file"
                                required
                              />
                              <AdminSubmitButton className="w-full text-xs" label={`Upload to Slot ${slot}`} />
                            </AdminActionForm>
                            {existing && (
                              <AdminActionForm action={clearProductGallerySlotAction}>
                                <input name="idempotencyKey" type="hidden" value={stableKey(product.id, `gallery-clear-${slot}`)} />
                                <input name="productKey" type="hidden" value={product.id} />
                                <input name="slot" type="hidden" value={slot.toString()} />
                                <input name="oldAssetKey" type="hidden" value={existing.assetKey} />
                                <AdminSubmitButton
                                  className="secondary w-full text-xs"
                                  label="Clear &amp; Archive"
                                  confirmMessage="When approved, the current gallery image will be permanently deleted from S3. Clear this slot?"
                                />
                              </AdminActionForm>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Demo Video */}
                  <div className="rounded-lg border border-[var(--shresta-logo-border)] p-4">
                    <p className="mb-1 text-xs font-bold uppercase tracking-[0.14em] text-[var(--gold-400)]">Demo Video — optional</p>
                    <p className="mb-3 text-xs text-[var(--shresta-logo-muted)]">
                      Upload a video file (stored on S3) or paste a URL (YouTube, Vimeo, direct MP4 link). Leave both empty to clear the video link.
                    </p>
                    {product.demoVideoUrl && (
                      <div className="mb-3 rounded-lg border border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-surface)] p-3">
                        <p className="mb-0.5 text-xs text-[var(--shresta-logo-muted)]">Current:</p>
                        <p className="break-all text-xs text-[var(--gold-600)]">{product.demoVideoUrl}</p>
                      </div>
                    )}
                    <AdminActionForm action={uploadAndSetProductVideoAction} className="space-y-3">
                      <input name="idempotencyKey" type="hidden" value={stableKey(product.id, "video-upload")} />
                      <input name="productKey" type="hidden" value={product.id} />
                      <div className="grid gap-3 lg:grid-cols-2">
                        <label className="admin-label">
                          Upload video file (MP4, MOV, etc.)
                          <input accept="video/*" className="admin-input" name="file" type="file" />
                        </label>
                        <label className="admin-label">
                          — or paste a video URL
                          <input
                            className="admin-input"
                            defaultValue={product.demoVideoUrl ?? ""}
                            name="demoVideoUrl"
                            placeholder="https://youtube.com/watch?v=..."
                            type="url"
                          />
                        </label>
                      </div>
                      <AdminSubmitButton label="Update Video" />
                    </AdminActionForm>
                  </div>

                  {/* Product Metadata */}
                  <AdminActionForm action={updateMerchandisingProductAction} className="space-y-5 rounded-lg border border-[var(--shresta-logo-border)] p-4">
                    <input name="idempotencyKey" type="hidden" value={randomUUID()} />
                    <input name="itemKey" type="hidden" value={product.id} />
                    <input name="metadata" type="hidden" value="{}" />

                    <div>
                      <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-[var(--gold-400)]">Identity</p>
                      <div className="grid gap-3 lg:grid-cols-6">
                        <label className="admin-label lg:col-span-3">
                          Product Name (Title)
                          <input className="admin-input" defaultValue={product.name} name="title" required />
                        </label>
                        <label className="admin-label">
                          SKU
                          <input className="admin-input" defaultValue={product.sku} name="sku" required />
                        </label>
                        <label className="admin-label">
                          Slug
                          <input className="admin-input" defaultValue={product.slug ?? ""} name="slug" required />
                        </label>
                        <label className="admin-label">
                          Sort Order
                          <input className="admin-input" min="0" name="sortOrder" type="number" />
                        </label>
                        <label className="admin-label">
                          Category Family
                          <select className="admin-input" defaultValue={product.familyKey} name="familyKey" required>
                            {categories.map((cat) => (
                              <option key={cat.familyKey} value={cat.familyKey}>{cat.displayName}</option>
                            ))}
                          </select>
                        </label>
                        <label className="admin-label">
                          Product Type
                          <select className="admin-input" defaultValue={product.productType} name="productType" required>
                            {productTypeOptions.map((type) => (
                              <option key={`${type.familyKey}-${type.value}`} value={type.value}>
                                {type.familyName} / {type.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="flex cursor-pointer items-center gap-2 self-end pb-2 text-sm text-[var(--shresta-logo-muted)]">
                          <input
                            className="h-4 w-4 accent-[var(--gold-500)]"
                            defaultChecked={product.isBestseller}
                            name="featured"
                            type="checkbox"
                          />
                          Show as Bestseller
                        </label>
                      </div>
                    </div>

                    <div>
                      <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-[var(--gold-400)]">Pricing and Discount</p>
                      <PricingSection
                        defaultCompareAtPricePaise={product.compareAtPricePaise}
                        defaultPricePaise={product.pricePaise}
                      />
                    </div>

                    <div>
                      <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-[var(--gold-400)]">Descriptions</p>
                      <div className="grid gap-3 lg:grid-cols-2">
                        <label className="admin-label">
                          Short Description
                          <textarea className="admin-input min-h-20" defaultValue={product.description ?? ""} name="description" />
                        </label>
                        <label className="admin-label">
                          Long Description
                          <textarea className="admin-input min-h-20" defaultValue={product.longDescription ?? ""} name="longDescription" />
                        </label>
                      </div>
                    </div>

                    <div>
                      <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-[var(--gold-400)]">Ratings and Social Proof</p>
                      <div className="grid gap-3 lg:grid-cols-4">
                        <label className="admin-label">
                          Rating (0–5)
                          <input className="admin-input" defaultValue={product.rating} max="5" min="0" name="rating" step="0.1" type="number" />
                        </label>
                        <label className="admin-label">
                          Review Count
                          <input className="admin-input" defaultValue={product.reviewCount} min="0" name="reviewCount" type="number" />
                        </label>
                        <label className="admin-label">
                          Stock Quantity
                          <input className="admin-input" defaultValue={product.stockQuantity} min="0" name="stockQuantity" type="number" />
                        </label>
                        <div className="lg:col-span-2">
                          <EnumMultiSelect
                            defaultValues={product.badges}
                            label="Badges"
                            name="badges"
                            options={ensureAdminTagOptions(badgeOptions, product.badges)}
                            valueKind="tag"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 border-t border-[var(--shresta-logo-border)] pt-4">
                      {metadataPending ? (
                        <div className="flex flex-wrap items-center gap-3">
                          <button className="admin-button cursor-not-allowed opacity-40" disabled type="button">Submit for Review</button>
                          <p className="text-xs text-amber-400">⏳ A metadata change is pending review — approve or reject it before submitting new changes.</p>
                        </div>
                      ) : (
                        <>
                          <AdminSubmitButton label="Submit for Review" />
                          <p className="text-xs text-[var(--shresta-logo-muted)]">Goes to review queue — must be approved before going live.</p>
                        </>
                      )}
                    </div>
                  </AdminActionForm>

                </div>
              </details>
            </article>
          );
        })}

        <nav className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <a className="admin-button secondary" href={productPageHref(params, Math.max(0, normalizedProductPage - 1))}>← Previous</a>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[var(--shresta-logo-muted)]">
              Page {normalizedProductPage + 1} of {totalProductPages}
              <span className="ml-2 rounded-full bg-[rgba(212,175,55,0.1)] px-2 py-0.5 text-xs">{products.length} products</span>
            </span>
            <PageJump current={normalizedProductPage} total={totalProductPages} />
          </div>
          <a className="admin-button secondary" href={productPageHref(params, Math.min(totalProductPages - 1, normalizedProductPage + 1))}>Next →</a>
        </nav>
      </section>
    </div>
  );
}

// ─── Helper components ────────────────────────────────────────────────────────

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--shresta-logo-border)] p-3">
      <p className="text-xs uppercase tracking-[0.12em] text-[var(--shresta-logo-muted)]">{label}</p>
      <p className="mt-1 font-semibold text-[var(--shresta-logo-text)]">{value}</p>
    </div>
  );
}

// ─── Pending Review Banner ────────────────────────────────────────────────────

type DiffItem = { field: string; before: string; after: string };

function fmtPendingPaise(v: unknown): string {
  const n = typeof v === "number" ? v : Number(v);
  if (!v || Number.isNaN(n)) return "₹0";
  return `₹${(n / 100).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function normalizeTag(s: string): string { return toEnumValue(s); }

function fmtPendingVal(v: unknown): string {
  if (v == null || v === "") return "—";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (Array.isArray(v)) return v.length === 0 ? "—" : [...(v as string[])].map(normalizeTag).sort().join(", ");
  return String(v);
}

function buildPendingDiff(payload: Record<string, unknown>, product: ProductCard, requestType: string): DiffItem[] {
  // Image-only change
  if (requestType === "storefront-product-image") {
    return [{ field: "Primary Image", before: product.image?.url ? "Image set" : "—", after: "New upload" }];
  }
  // Gallery slot change — entityKey "productId:gallery:N"
  if (requestType === "storefront-product-gallery") {
    const slot = (payload.gallerySlot as number | undefined) ?? "?";
    const assetKey = payload.galleryAssetKey;
    const action = assetKey === "" || assetKey == null ? "Clear slot" : "New upload";
    return [{ field: `Gallery Slot ${slot}`, before: "—", after: action }];
  }
  // Video-only change
  if (requestType === "storefront-product-video") {
    const url = String(payload.demoVideoUrl ?? "");
    return [{ field: "Demo Video", before: product.demoVideoUrl ?? "—", after: url === "" ? "(cleared)" : url }];
  }
  // Full metadata change (storefront-product-merchandising)
  const meta = (payload.metadata ?? {}) as Record<string, unknown>;
  const pairs: [string, unknown, unknown][] = [
    ["Name", product.name, payload.title],
    ["SKU", product.sku, meta.sku],
    ["Slug", product.slug, meta.slug],
    ["Family", product.familyKey, payload.familyKey],
    ["Product Type", product.productType, meta.productType],
    ["Price", fmtPendingPaise(product.pricePaise), meta.pricePaise !== undefined ? fmtPendingPaise(meta.pricePaise) : undefined],
    ["Compare-at", fmtPendingPaise(product.compareAtPricePaise), meta.compareAtPricePaise !== undefined ? fmtPendingPaise(meta.compareAtPricePaise) : undefined],
    ["Description", product.description, payload.description],
    ["Bestseller", product.isBestseller, payload.featured],
    ["Rating", product.rating, meta.rating],
    ["Review Count", product.reviewCount, meta.reviewCount],
    ["Stock Quantity", product.stockQuantity, meta.stockQuantity],
    ["Badges", product.badges, meta.badges],
    ["Long Description", product.longDescription, meta.longDescription],
  ];
  const textRows = pairs
    .filter(([, , afterRaw]) => afterRaw !== undefined)
    .map(([field, before, after]) => ({ field, before: fmtPendingVal(before), after: fmtPendingVal(after) }))
    .filter((d) => d.before !== d.after);

  const imageRows: DiffItem[] = [];
  if (payload.media !== undefined) {
    imageRows.push({ field: "Primary Image", before: product.image?.url ? "Image set" : "—", after: "New upload" });
  }
  if (payload.galleryAssetKeys !== undefined) {
    imageRows.push({ field: "Gallery Images", before: "Current gallery", after: "Updated" });
  }
  return [...textRows, ...imageRows];
}

function PendingReviewBanner({ request, product }: { request: AdminChangeRequestResponse; product: ProductCard }) {
  const PRODUCT_REQUEST_TYPES = [
    "storefront-product-merchandising",
    "storefront-product-image",
    "storefront-product-gallery",
    "storefront-product-video",
  ];
  const isUpdate = PRODUCT_REQUEST_TYPES.includes(request.requestType) && request.action === "UPDATE";
  const isDelete = request.action === "ARCHIVE" || request.action === "DELETE";
  const changedFields = isUpdate ? buildPendingDiff(request.payload, product, request.requestType) : [];
  const submittedAt = new Date(request.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

  return (
    <div className={`mb-4 rounded-lg border px-4 py-3 ${isDelete ? "border-red-800 bg-red-950/30" : "border-amber-800 bg-amber-950/20"}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-[0.1em] ${isDelete ? "bg-red-700/45 text-red-100" : "bg-amber-700/45 text-amber-100"}`}>
            {isDelete ? "⚠ Deletion pending" : "⏳ Change pending review"}
          </span>
          <span className="text-xs text-white/80">Submitted {submittedAt}</span>
        </div>
        <a className="text-xs text-[var(--gold-200)] hover:underline" href="/admin/review">View in review queue →</a>
      </div>

      {isUpdate && changedFields.length > 0 && (
        <div className="mt-3">
          <p className="mb-1.5 text-xs font-bold uppercase tracking-[0.1em] text-amber-100">{changedFields.length} field{changedFields.length !== 1 ? "s" : ""} awaiting approval</p>
          <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
            {changedFields.map((d) => (
              <div key={d.field} className="flex items-baseline gap-1.5 text-xs">
                <span className="shrink-0 font-semibold text-white/80">{d.field}:</span>
                <span className="line-through text-white/55 decoration-[var(--wine-500)]">{d.before}</span>
                <span className="text-amber-200">→ {d.after}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {isDelete && (
        <p className="mt-1.5 text-xs text-red-300">
          A <strong>{request.action === "DELETE" ? "permanent delete" : "archive"}</strong> request for this product&apos;s primary image is awaiting reviewer approval.
          The image will not be removed until approved. Go to the review queue to resolve it.
        </p>
      )}
    </div>
  );
}


// ─── Helpers ─────────────────────────────────────────────────────────────────

function stringParam(params: Record<string, string | string[] | undefined> | undefined, key: string): string | undefined {
  const value = params?.[key];
  return Array.isArray(value) ? value[0] : value;
}

function numberParam(params: Record<string, string | string[] | undefined> | undefined, key: string, fallback: number): number {
  const value = Number.parseInt(stringParam(params, key) ?? "", 10);
  return Number.isNaN(value) ? fallback : value;
}

function productPageHref(params: Record<string, string | string[] | undefined> | undefined, page: number): string {
  const query = new URLSearchParams();
  query.set("productPage", page.toString());
  return `/admin/assets?${query.toString()}`;
}

function productTypeLabel(options: { label: string; value: string }[], value: string | null): string {
  if (!value) return "Unassigned";
  return options.find((o) => o.value === value)?.label ?? value;
}
