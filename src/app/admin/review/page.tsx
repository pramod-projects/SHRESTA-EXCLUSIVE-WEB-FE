import { randomUUID } from "crypto";
import { approveChangeRequestAction, rejectChangeRequestAction } from "@/app/admin/actions";
import { AdminApiUnavailable } from "@/components/admin/admin-api-unavailable";
import { ConfirmSubmitButton } from "@/components/admin/confirm-submit-button";
import { fetchAdminAcl, fetchAdminChangeRequests, fetchAdminStorefrontHome, type AdminChangeRequestResponse } from "@/features/admin/admin-api";
import type { ProductCard } from "@/features/storefront/storefront-home";
import { toEnumValue } from "@/lib/admin-enums";
import { nullWhenShrestaApiUnavailable } from "@/lib/api-page-fallback";

export const dynamic = "force-dynamic";

export default async function AdminReviewPage() {
  const data = await nullWhenShrestaApiUnavailable(async () => {
    const [acl, requests, home] = await Promise.all([
      fetchAdminAcl("CHANGE_REVIEWER"),
      fetchAdminChangeRequests("PENDING_REVIEW"),
      fetchAdminStorefrontHome()
    ]);
    return { acl, requests, products: home.bestsellers };
  });
  if (!data) {
    return <AdminApiUnavailable />;
  }

  const { acl, requests, products } = data;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 border-b border-[var(--wine-800)] pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--gold-400)]">Governed Operations</p>
          <h1 className="mt-2 font-serif text-4xl font-light text-white">Review Queue</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--shresta-text-secondary)]">
            Review create, update, archive, and permanent-delete requests before they are allowed to change production data.
          </p>
        </div>
        <div className="text-sm text-[var(--shresta-text-muted)]">{acl.role} — {requests.length} pending</div>
      </header>

      <section className="grid gap-3 md:grid-cols-4">
        <Metric label="Pending" value={requests.length.toString()} />
        <Metric label="Can Approve" value={acl.permissions.includes("change_request:approve") ? "Yes" : "No"} />
        <Metric label="Can Reject" value={acl.permissions.includes("change_request:reject") ? "Yes" : "No"} />
        <Metric label="Role" value={acl.role} />
      </section>

      <section className="space-y-4">
        {requests.map((request) => (
          <ReviewCard key={request.requestKey} products={products} request={request} />
        ))}
        {requests.length === 0 ? (
          <div className="admin-panel rounded-lg p-8 text-center">
            <h2 className="font-serif text-2xl font-light text-white">No Pending Requests</h2>
            <p className="mt-2 text-sm text-[var(--shresta-text-muted)]">Submitted admin operations will appear here before anything is archived or permanently deleted.</p>
          </div>
        ) : null}
      </section>
    </div>
  );
}

// ── Diff engine ────────────────────────────────────────────────────────────────

type DiffRow = { field: string; before: string; after: string; changed: boolean };

function fmtPaise(v: unknown): string {
  if (v == null || v === "" || v === 0) return "₹0";
  const n = typeof v === "number" ? v : Number(v);
  if (Number.isNaN(n)) return String(v);
  return `₹${(n / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtVal(v: unknown): string {
  if (v == null || v === "") return "—";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (Array.isArray(v)) return v.length === 0 ? "—" : [...(v as string[])].map(toEnumValue).sort().join(", ");
  return String(v);
}

function row(field: string, before: unknown, after: unknown): DiffRow | null {
  if (after === undefined) return null;
  const b = fmtVal(before);
  const a = fmtVal(after);
  return { field, before: b, after: a, changed: b !== a };
}

function paiseRow(field: string, before: unknown, after: unknown): DiffRow | null {
  if (after === undefined) return null;
  const b = fmtPaise(before);
  const a = fmtPaise(after);
  return { field, before: b, after: a, changed: b !== a };
}

function buildProductDiff(payload: Record<string, unknown>, current: ProductCard): DiffRow[] {
  const meta = (payload.metadata ?? {}) as Record<string, unknown>;
  const rows: DiffRow[] = [
    row("Name", current.name, payload.title),
    row("SKU", current.sku, meta.sku),
    row("Slug", current.slug, meta.slug),
    row("Family", current.familyKey, payload.familyKey),
    row("Product Type", current.productType, meta.productType),
    paiseRow("Selling Price", current.pricePaise, meta.pricePaise),
    paiseRow("Compare-at Price", current.compareAtPricePaise, meta.compareAtPricePaise),
    row("Short Description", current.description, payload.description),
    row("Long Description", current.longDescription, meta.longDescription),
    row("Bestseller", current.isBestseller, payload.featured),
    row("Rating", current.rating, meta.rating),
    row("Review Count", current.reviewCount, meta.reviewCount),
    row("Badges", current.badges, meta.badges),
    row("Demo Video", current.demoVideoUrl, payload.demoVideoUrl),
  ].filter((r): r is DiffRow => r !== null);

  if (payload.media !== undefined) {
    rows.push({ field: "Primary Image", before: current.image?.url ? "Image set" : "—", after: "New upload", changed: true });
  }
  if (payload.galleryAssetKeys !== undefined) {
    rows.push({ field: "Gallery Images", before: "Current gallery", after: "Updated", changed: true });
  }
  return rows;
}

function buildProductImageDiff(payload: Record<string, unknown>): DiffRow[] {
  return [{ field: "Primary Image", before: "—", after: "New upload", changed: true }];
}

function buildProductGalleryDiff(payload: Record<string, unknown>): DiffRow[] {
  const slot = payload.gallerySlot as number | undefined;
  const assetKey = payload.galleryAssetKey;
  const action = assetKey === "" || assetKey == null ? "Clear slot" : "New upload";
  return [{ field: `Gallery Slot ${slot ?? "?"}`, before: "—", after: action, changed: true }];
}

function buildProductVideoDiff(payload: Record<string, unknown>): DiffRow[] {
  const url = String(payload.demoVideoUrl ?? "");
  return [{ field: "Demo Video", before: "—", after: url === "" ? "(cleared)" : url, changed: true }];
}

function buildNewProductRows(payload: Record<string, unknown>): DiffRow[] {
  const meta = (payload.metadata ?? {}) as Record<string, unknown>;
  const toRow = (field: string, v: unknown): DiffRow => ({ field, before: "—", after: fmtVal(v), changed: true });
  const toPaiseRow = (field: string, v: unknown): DiffRow => ({ field, before: "—", after: fmtPaise(v), changed: true });
  return [
    toRow("Name", payload.title),
    toRow("SKU", meta.sku),
    toRow("Slug", meta.slug),
    toRow("Family", payload.familyKey),
    toRow("Product Type", meta.productType),
    toPaiseRow("Selling Price", meta.pricePaise),
    toPaiseRow("Compare-at Price", meta.compareAtPricePaise),
    toRow("Short Description", payload.description),
    toRow("Long Description", meta.longDescription),
    toRow("Bestseller", payload.featured),
    toRow("Rating", meta.rating),
    toRow("Review Count", meta.reviewCount),
    toRow("Badges", meta.badges),
    toRow("Demo Video", payload.demoVideoUrl),
  ].filter((r) => r.after !== "—");
}

// ── ReviewCard ─────────────────────────────────────────────────────────────────

function ReviewCard({ request, products }: { request: AdminChangeRequestResponse; products: ProductCard[] }) {
  const PRODUCT_UPDATE_TYPES = [
    "storefront-product-merchandising",
    "storefront-product-image",
    "storefront-product-gallery",
    "storefront-product-video",
  ];
  const isProductUpdate = PRODUCT_UPDATE_TYPES.includes(request.requestType) && request.action === "UPDATE";
  const isProductCreate = request.requestType === "storefront-product-create" && request.action === "CREATE";

  // For gallery: entityKey = "productId:gallery:N" — extract the base productId
  const productEntityKey = request.entityKey.includes(":gallery:")
    ? request.entityKey.split(":gallery:")[0]
    : request.entityKey;

  const currentProduct = isProductUpdate ? products.find((p) => p.id === productEntityKey) : undefined;

  let diffRows: DiffRow[] | null = null;
  if (isProductUpdate) {
    if (request.requestType === "storefront-product-merchandising" && currentProduct) {
      diffRows = buildProductDiff(request.payload, currentProduct);
    } else if (request.requestType === "storefront-product-image") {
      diffRows = buildProductImageDiff(request.payload);
    } else if (request.requestType === "storefront-product-gallery") {
      diffRows = buildProductGalleryDiff(request.payload);
    } else if (request.requestType === "storefront-product-video") {
      diffRows = buildProductVideoDiff(request.payload);
    }
  } else if (isProductCreate) {
    diffRows = buildNewProductRows(request.payload);
  }

  const changedRows = diffRows?.filter((r) => r.changed) ?? [];
  const unchangedRows = diffRows?.filter((r) => !r.changed) ?? [];

  return (
    <article className="admin-panel rounded-lg p-4">
      {/* ── Header ── */}
      <div className="flex flex-col gap-3 border-b border-[var(--wine-800)] pb-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={request.action === "DELETE" ? "rounded-full bg-red-500/15 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-red-200" : "rounded-full bg-[rgba(212,175,55,0.14)] px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-[var(--gold-300)]"}>
              {request.action}
            </span>
            <span className="rounded-full border border-[var(--wine-700)] px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-[var(--shresta-text-muted)]">{request.status}</span>
            {isProductUpdate && <span className="rounded-full border border-[var(--wine-700)] px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-amber-300">{changedRows.length} field{changedRows.length !== 1 ? "s" : ""} changed</span>}
            {isProductCreate && <span className="rounded-full border border-emerald-800 bg-emerald-900/20 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-emerald-400">New product</span>}
          </div>
          <h2 className="mt-3 font-serif text-2xl font-light text-white">
            {isProductUpdate && currentProduct ? currentProduct.name : (request.payload.title as string | undefined) ?? request.requestType}
          </h2>
          <p className="mt-1 text-xs text-[var(--shresta-text-muted)]">{request.requestType} · {request.entityKey}</p>
        </div>
        <div className="text-xs text-[var(--shresta-text-muted)]">
          <p className="font-mono">{request.requestKey}</p>
          <p className="mt-1">Submitted by {request.submittedByRole}</p>
          <p className="mt-0.5">{new Date(request.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</p>
        </div>
      </div>

      {/* ── Diff table ── */}
      {diffRows && diffRows.length > 0 ? (
        <div className="mt-4 space-y-3">
          {/* Changed fields */}
          {changedRows.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-[var(--gold-400)]">
                {isProductCreate ? "New values" : `Changed fields (${changedRows.length})`}
              </p>
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[var(--wine-800)]">
                    <th className="w-36 py-2 pr-4 text-left text-xs font-bold uppercase tracking-[0.1em] text-[var(--shresta-text-muted)]">Field</th>
                    {!isProductCreate && <th className="py-2 pr-4 text-left text-xs font-bold uppercase tracking-[0.1em] text-[var(--shresta-text-muted)]">Before</th>}
                    <th className="py-2 text-left text-xs font-bold uppercase tracking-[0.1em] text-[var(--shresta-text-muted)]">{isProductCreate ? "Value" : "After"}</th>
                  </tr>
                </thead>
                <tbody>
                  {changedRows.map((r) => (
                    <tr key={r.field} className="border-b border-[var(--wine-800)]/50">
                      <td className="py-2 pr-4 text-xs font-semibold text-[var(--shresta-text-secondary)]">{r.field}</td>
                      {!isProductCreate && (
                        <td className="py-2 pr-4 text-xs text-[var(--shresta-text-muted)] line-through decoration-[var(--wine-500)]">{r.before}</td>
                      )}
                      <td className="py-2 text-xs font-medium text-amber-300">{r.after}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Unchanged fields (collapsible) */}
          {!isProductCreate && unchangedRows.length > 0 && (
            <details className="group">
              <summary className="cursor-pointer select-none text-xs font-bold uppercase tracking-[0.1em] text-[var(--shresta-text-muted)] hover:text-[var(--shresta-text-secondary)]">
                Unchanged fields ({unchangedRows.length}) ▸
              </summary>
              <table className="mt-2 w-full border-collapse text-sm">
                <tbody>
                  {unchangedRows.map((r) => (
                    <tr key={r.field} className="border-b border-[var(--wine-800)]/30">
                      <td className="w-36 py-1.5 pr-4 text-xs text-[var(--shresta-text-muted)]">{r.field}</td>
                      <td className="py-1.5 text-xs text-[var(--shresta-text-muted)]">{r.after}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          )}
        </div>
      ) : null}

      {/* Raw JSON toggle */}
      <details className="mt-4">
        <summary className="cursor-pointer select-none text-xs font-bold uppercase tracking-[0.1em] text-[var(--shresta-text-muted)] hover:text-[var(--shresta-text-secondary)]">
          Raw payload ▸
        </summary>
        <pre className="mt-2 max-h-72 overflow-auto rounded-lg border border-[var(--wine-800)] bg-[rgba(26,9,12,0.42)] p-4 text-xs leading-6 text-[var(--shresta-text-secondary)]">
          {JSON.stringify(request.payload, null, 2)}
        </pre>
      </details>

      {/* ── Actions ── */}
      <div className="mt-4 grid gap-3 border-t border-[var(--wine-800)] pt-4 lg:grid-cols-[1fr_180px_180px]">
        <label className="admin-label">
          Review Note
          <input className="admin-input" form={`approve-${request.requestKey}`} name="reviewNote" placeholder="Reason or approval note" />
        </label>
        <form action={approveChangeRequestAction} className="self-end" id={`approve-${request.requestKey}`}>
          <input name="idempotencyKey" type="hidden" value={randomUUID()} />
          <input name="requestKey" type="hidden" value={request.requestKey} />
          {(request.action === "DELETE" || request.action === "ARCHIVE") ? (
            <ConfirmSubmitButton
              className="admin-button w-full"
              message={`Approving this will PERMANENTLY ${request.action === "DELETE" ? "delete the asset record and" : "archive the asset and delete the"} file from S3. This cannot be undone. Approve?`}
            >
              Approve
            </ConfirmSubmitButton>
          ) : (
            <button className="admin-button w-full" type="submit">Approve</button>
          )}
        </form>
        <form action={rejectChangeRequestAction} className="self-end">
          <input name="idempotencyKey" type="hidden" value={randomUUID()} />
          <input name="requestKey" type="hidden" value={request.requestKey} />
          <input name="reviewNote" type="hidden" value="Rejected from admin review queue" />
          <button className="admin-button danger w-full" type="submit">Reject</button>
        </form>
      </div>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--wine-800)] p-3">
      <p className="text-xs uppercase tracking-[0.12em] text-[var(--shresta-text-muted)]">{label}</p>
      <p className="mt-1 font-semibold text-white">{value}</p>
    </div>
  );
}
