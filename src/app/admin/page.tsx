import Link from "next/link";
import { AdminApiUnavailable } from "@/components/admin/admin-api-unavailable";
import { fetchAdminAcl, fetchAdminAssets, fetchAdminCategories, fetchAdminChangeRequests, type AssetResponse } from "@/features/admin/admin-api";
import { nullWhenShrestaApiUnavailable } from "@/lib/api-page-fallback";

export const dynamic = "force-dynamic";

export default async function AdminIndexPage() {
  const data = await nullWhenShrestaApiUnavailable(async () => {
    const [assets, categories, acl, pendingRequests] = await Promise.all([
      fetchAdminAssets({ page: 0, size: 100 }),
      fetchAdminCategories(),
      fetchAdminAcl("CHANGE_MANAGER"),
      fetchAdminChangeRequests("PENDING_REVIEW")
    ]);
    return { acl, assets, categories, pendingRequests };
  });
  if (!data) {
    return <AdminApiUnavailable />;
  }

  const { acl, assets, categories, pendingRequests } = data;
  const assetRows = assets.assets;
  const productTypeCount = categories.reduce((total, category) => total + category.productTypes.length, 0);
  const attributeCount = categories.reduce((total, category) => total + category.attributes.length, 0);
  const filterCount = categories.reduce((total, category) => total + category.filters.length, 0);
  const taxRuleCount = categories.reduce((total, category) => total + category.taxes.length, 0);
  const stylingRuleCount = categories.reduce((total, category) => total + category.styling.length, 0);
  const readyAssets = assetRows.filter((asset) => asset.status === "READY").length;
  const unlinkedAssets = assetRows.filter((asset) => !asset.categoryFamilyKey || !asset.categoryProductTypeKey).length;
  const skuLinkedAssets = assetRows.filter((asset) => asset.productSku).length;
  const variantCount = assetRows.reduce((total, asset) => total + asset.variants.length, 0);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 border-b border-[var(--wine-800)] pb-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--gold-400)]">Catalog Control Center</p>
          <h1 className="mt-2 font-serif text-4xl font-light text-white">Admin Overview</h1>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-[var(--shresta-text-secondary)]">
            Manage category taxonomy, asset details, image variants, SKU bindings, and governed approvals from one operations console.
          </p>
        </div>
        <div className="rounded-lg border border-[rgba(212,175,55,0.24)] bg-[rgba(212,175,55,0.08)] px-4 py-3 text-sm">
          <p className="font-semibold text-white">{acl.role}</p>
          <p className="mt-1 text-xs text-[var(--shresta-text-muted)]">{acl.permissions.length} active permissions</p>
        </div>
      </header>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Metric label="Media Files" value={assets.total.toString()} note="Uploaded images & videos" />
        <Metric label="Categories" value={categories.length.toString()} note={`${productTypeCount} subcategories`} />
        <Metric label="Product-Linked Files" value={skuLinkedAssets.toString()} note={`${unlinkedAssets} without product binding`} />
        <Metric label="Pending Reviews" value={pendingRequests.length.toString()} note="Create/update/archive/delete queue" />
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <ActionPanel
          cta="Open Products"
          href="/admin/assets"
          label="Product Catalog"
          summary="Upload images and videos directly to S3, edit every customer-visible product field (name, pricing, gallery, demo video, badges), manage asset metadata and variants — all in one place."
        />
        <ActionPanel
          cta="Open Categories"
          href="/admin/categories"
          label="Category Taxonomy"
          summary="Create and update families, subcategories, attributes, filters, GST rules, and styling rules."
        />
        <ActionPanel
          cta="Open Review Queue"
          href="/admin/review"
          label="Governed Changes"
          summary="Approve or reject requested catalog and asset changes before they affect live operations."
        />
      </section>

      <section className="admin-panel rounded-lg p-4">
        <div className="flex flex-col gap-2 border-b border-[var(--wine-800)] pb-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="font-serif text-2xl font-light text-white">Catalog Data Coverage</h2>
            <p className="mt-1 text-sm text-[var(--shresta-text-muted)]">Every listed field has a clear source and a governed create/update path where applicable.</p>
          </div>
          <span className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--gold-300)]">Governed updates</span>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.12em] text-[var(--shresta-text-muted)]">
              <tr>
                <th className="py-2 pr-4">Surface</th>
                <th className="py-2 pr-4">Read Source</th>
                <th className="py-2 pr-4">Editable Data Points</th>
                <th className="py-2 pr-4">Write Path</th>
                <th className="py-2">Current Shape</th>
              </tr>
            </thead>
            <tbody>
              <ContractRow
                current={`${categories.length} families, ${productTypeCount} subcategories`}
                fields="familyKey, displayName, description, sortOrder, advanced details, typeKey"
                readApi="Catalog category source"
                surface="Categories"
                writePath="reviewed create/update/archive/delete"
              />
              <ContractRow
                current={`${attributeCount} attributes, ${filterCount} filters`}
                fields="attributeKey, dataType, required, filterable, searchable, allowedValues, control, facet mapping"
                readApi="Catalog category source"
                surface="Attributes & Filters"
                writePath="reviewed create/update/archive/delete"
              />
              <ContractRow
                current={`${taxRuleCount} tax rules, ${stylingRuleCount} styling rules`}
                fields="hsnCode, gstRateBasisPoints, effective dates, occasionKey, complementaryFamilyKeys, rules JSON"
                readApi="Catalog category source"
                surface="Tax & Styling"
                writePath="reviewed create/update/archive/delete"
              />
              <ContractRow
                current={`${assets.total} media files, ${variantCount} responsive variants`}
                fields="files, categoryFamilyKey, categoryProductTypeKey, productSku, tags, altText, seoTitle, seoDescription"
                readApi="Asset manager source"
                surface="Assets"
                writePath="upload + reviewed details/archive/delete"
              />
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="admin-panel rounded-lg p-4">
          <h2 className="font-serif text-2xl font-light text-white">Asset Hygiene</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <Metric label="Ready" value={readyAssets.toString()} note="Status READY (first 100)" />
            <Metric label="Image Variants" value={variantCount.toString()} note="Responsive sizes per image" />
            <Metric label="Needs Binding" value={unlinkedAssets.toString()} note="Missing category or subcategory" />
          </div>
          <div className="mt-4 space-y-2">
            {assetRows.slice(0, 6).map((asset) => (
              <AssetHealthRow asset={asset} key={asset.assetKey} />
            ))}
          </div>
        </div>

        <div className="admin-panel rounded-lg p-4">
          <h2 className="font-serif text-2xl font-light text-white">Review Snapshot</h2>
          <div className="mt-4 space-y-3">
            {pendingRequests.slice(0, 6).map((request) => (
              <div className="rounded-lg border border-[var(--wine-800)] p-3" key={request.requestKey}>
                <div className="flex items-center justify-between gap-3">
                  <span className="rounded-full bg-[rgba(212,175,55,0.12)] px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-[var(--gold-300)]">{request.action}</span>
                  <span className="text-xs text-[var(--shresta-text-muted)]">{request.requestType}</span>
                </div>
                <p className="mt-2 break-words text-sm font-semibold text-white">{request.entityKey}</p>
              </div>
            ))}
            {pendingRequests.length === 0 ? <p className="text-sm text-[var(--shresta-text-muted)]">No pending governed changes.</p> : null}
          </div>
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-lg border border-[var(--wine-800)] bg-[rgba(26,9,12,0.32)] p-4">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--shresta-text-muted)]">{label}</p>
      <p className="mt-2 font-serif text-3xl font-light text-white">{value}</p>
      <p className="mt-1 text-xs text-[var(--shresta-text-muted)]">{note}</p>
    </div>
  );
}

function ActionPanel({ cta, href, label, summary }: { cta: string; href: string; label: string; summary: string }) {
  return (
    <article className="admin-panel rounded-lg p-4">
      <h2 className="font-serif text-2xl font-light text-white">{label}</h2>
      <p className="mt-2 min-h-16 text-sm leading-6 text-[var(--shresta-text-secondary)]">{summary}</p>
      <Link className="admin-button mt-4 inline-flex" href={href}>{cta}</Link>
    </article>
  );
}

function ContractRow({
  current,
  fields,
  readApi,
  surface,
  writePath
}: {
  current: string;
  fields: string;
  readApi: string;
  surface: string;
  writePath: string;
}) {
  return (
    <tr className="border-t border-[var(--wine-800)]">
      <td className="py-4 pr-4 font-semibold text-white">{surface}</td>
      <td className="py-4 pr-4 font-mono text-xs text-[var(--gold-300)]">{readApi}</td>
      <td className="py-4 pr-4 text-[var(--shresta-text-secondary)]">{fields}</td>
      <td className="py-4 pr-4 text-[var(--shresta-text-secondary)]">{writePath}</td>
      <td className="py-4 text-[var(--shresta-text-muted)]">{current}</td>
    </tr>
  );
}

function AssetHealthRow({ asset }: { asset: AssetResponse }) {
  const isLinked = Boolean(asset.categoryFamilyKey && asset.categoryProductTypeKey);
  return (
    <div className="grid gap-2 rounded-lg border border-[var(--wine-800)] p-3 text-sm md:grid-cols-[1fr_120px_120px]">
      <div className="min-w-0">
        <p className="truncate font-semibold text-white">{asset.assetKey}</p>
        <p className="mt-1 text-xs text-[var(--shresta-text-muted)]">{asset.productSku ?? "No SKU"} - {asset.tags.join(", ") || "No tags"}</p>
      </div>
      <span className="text-[var(--shresta-text-secondary)]">{asset.status}</span>
      <span className={isLinked ? "text-[var(--gold-300)]" : "text-red-200"}>{isLinked ? "Bound" : "Needs bind"}</span>
    </div>
  );
}
