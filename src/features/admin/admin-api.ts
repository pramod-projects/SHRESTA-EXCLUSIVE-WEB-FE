import type { CategoryFamily } from "@/features/catalog/category-config";
import type { StorefrontHome } from "@/features/storefront/storefront-home";
import { ShrestaApiError, ShrestaApiUnavailableError, requestApi, type ApiResponseEnvelope } from "@/lib/api-client";

export type AdminRole = "SUPER_ADMIN" | "CHANGE_SUBMITTER" | "CHANGE_REVIEWER" | "CHANGE_MANAGER";

export type AssetSearchParams = {
  query?: string;
  categoryFamilyKey?: string;
  categoryProductTypeKey?: string;
  productSku?: string;
  status?: string;
  page?: number;
  size?: number;
};

export type AssetSearchResponse = {
  assets: AssetResponse[];
  page: number;
  size: number;
  total: number;
};

export type AssetResponse = {
  assetKey: string;
  originalFilename: string | null;
  assetUrl: string;
  altText: string;
  categoryFamilyKey: string | null;
  categoryProductTypeKey: string | null;
  productSku: string | null;
  status: "UPLOADED" | "PROCESSING" | "READY" | "FAILED" | "ARCHIVED" | string;
  version: number;
  widthPx: number;
  heightPx: number;
  byteSize: number;
  contentType: string | null;
  deliveryMode: string;
  lqipDataUrl: string | null;
  tags: string[];
  seoTitle: string | null;
  seoDescription: string | null;
  variants: AssetVariantResponse[];
  optimizationStats: AssetOptimizationStats;
};

export type AssetVariantResponse = {
  variantKey: string;
  format: string;
  widthPx: number;
  heightPx: number;
  byteSize: number;
  url: string;
};

export type AssetOptimizationStats = {
  originalBytes: number;
  smallestVariantBytes: number;
  bytesSavedAgainstSmallest: number;
  percentSavedAgainstSmallest: number;
  variantCount: number;
};

export type AssetMetadataUpdatePayload = {
  altText?: string;
  categoryFamilyKey?: string;
  categoryProductTypeKey?: string;
  productSku?: string;
  tags?: string[];
  seoTitle?: string;
  seoDescription?: string;
  clearCategoryFamilyKey?: boolean;
  clearCategoryProductTypeKey?: boolean;
  clearProductSku?: boolean;
  clearTags?: boolean;
  clearSeoTitle?: boolean;
  clearSeoDescription?: boolean;
};

export type CategoryFamilyMutationPayload = {
  familyKey?: string;
  displayName?: string;
  description?: string;
  sortOrder?: number;
  metadata?: Record<string, unknown>;
};

export type CategoryProductTypeMutationPayload = {
  typeKey?: string;
  displayName?: string;
  sortOrder?: number;
  metadata?: Record<string, unknown>;
};

export type CategoryAttributeMutationPayload = {
  attributeKey?: string;
  displayName?: string;
  dataType?: string;
  required?: boolean;
  filterable?: boolean;
  searchable?: boolean;
  allowedValues?: string[];
  sortOrder?: number;
};

export type CategoryFilterMutationPayload = {
  filterKey?: string;
  displayName?: string;
  attributeKey?: string;
  frontendControl?: string;
  backendMapping?: string;
  sortOrder?: number;
};

export type CategoryTaxMutationPayload = {
  hsnCode?: string;
  gstRateBasisPoints?: number;
  effectiveFrom?: string;
  effectiveTo?: string | null;
  clearEffectiveTo?: boolean;
};

export type CategoryStylingMutationPayload = {
  occasionKey?: string;
  displayName?: string;
  complementaryFamilyKeys?: string[];
  rules?: Record<string, unknown>;
  sortOrder?: number;
};

export type MutationOptions = {
  idempotencyKey: string;
};

export type StorefrontHomeItemUpdatePayload = {
  familyKey?: string;
  title?: string;
  subtitle?: string;
  description?: string;
  ctaLabel?: string;
  ctaHref?: string;
  sortOrder?: number;
  featured?: boolean;
  metadata?: Record<string, unknown>;
  media?: {
    assetUrl?: string;
    altText?: string;
    widthPx?: number;
    heightPx?: number;
    deliveryMode?: string;
  };
};

export type AdminAclResponse = {
  role: AdminRole | string;
  permissions: string[];
};

export type AdminChangeRequestResponse = {
  requestKey: string;
  requestType: string;
  entityType: string;
  entityKey: string;
  action: "CREATE" | "UPDATE" | "ARCHIVE" | "DELETE" | string;
  status: "PENDING_REVIEW" | "APPROVED" | "REJECTED" | "APPLIED" | "FAILED" | string;
  submittedByRole: string;
  submittedBy: string | null;
  reviewedByRole: string | null;
  reviewedBy: string | null;
  reviewNote: string | null;
  payload: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  reviewedAt: string | null;
};

export type AdminChangeRequestCreatePayload = {
  requestType: string;
  entityType: string;
  entityKey: string;
  action: "CREATE" | "UPDATE" | "ARCHIVE" | "DELETE";
  submittedBy?: string;
  payload?: Record<string, unknown>;
};

export type AdminOrderSummary = {
  orderNumber: string;
  customerId: string;
  customerEmail: string;
  customerDisplayName: string;
  orderStatus: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  deliveryMode: string;
  paymentMethod: string;
  totalPaise: number;
  itemCount: number;
  placedAt: string;
};

export type AdminCustomerOrderSummary = {
  customerId: string;
  customerEmail: string;
  customerDisplayName: string;
  totalOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  activeOrders: number;
  grossOrderValuePaise: number;
  lastOrderAt: string | null;
};

export type AdminOrderStatusUpdatePayload = {
  orderStatus?: string;
  paymentStatus?: string;
  fulfillmentStatus?: string;
  note?: string;
};

export type AdminOrderDetail = {
  orderNumber: string;
  customerId: string;
  customerEmail: string;
  orderStatus: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  currency: string;
  subtotalPaise: number;
  deliveryPaise: number;
  discountPaise: number;
  taxPaise: number;
  totalPaise: number;
  deliveryMode: string;
  paymentMethod: string;
  placedAt: string;
  statusEvents: Array<{
    eventType: string;
    fromStatus: string | null;
    toStatus: string;
    actorType: string;
    note: string | null;
    createdAt: string;
  }>;
};

export async function fetchAdminAssets(params: AssetSearchParams = {}): Promise<AssetSearchResponse> {
  const query = new URLSearchParams();
  appendQuery(query, "query", params.query);
  appendQuery(query, "categoryFamilyKey", params.categoryFamilyKey);
  appendQuery(query, "categoryProductTypeKey", params.categoryProductTypeKey);
  appendQuery(query, "productSku", params.productSku);
  appendQuery(query, "status", params.status);
  appendQuery(query, "page", params.page?.toString());
  appendQuery(query, "size", params.size?.toString());

  const suffix = query.size > 0 ? `?${query.toString()}` : "";
  return requestAdminApi<AssetSearchResponse>(`/api/v1/admin/assets${suffix}`, {
    role: "CHANGE_MANAGER"
  });
}

export function fetchAdminCategories(): Promise<CategoryFamily[]> {
  return requestAdminApi<CategoryFamily[]>("/api/v1/admin/catalog/categories", {
    role: "CHANGE_MANAGER"
  });
}

export function fetchAdminStorefrontHome(): Promise<StorefrontHome> {
  return requestAdminApi<StorefrontHome>("/api/v1/admin/storefront/home", {
    role: "CHANGE_MANAGER"
  });
}

export function fetchAdminAcl(role: AdminRole = "CHANGE_MANAGER"): Promise<AdminAclResponse> {
  return requestAdminApi<AdminAclResponse>("/api/v1/admin/acl/me", { role });
}

export function fetchAdminOrders(params: { limit?: number; offset?: number; customerEmail?: string; orderNumber?: string } = {}): Promise<AdminOrderSummary[]> {
  const query = new URLSearchParams();
  appendQuery(query, "limit", params.limit?.toString());
  appendQuery(query, "offset", params.offset?.toString());
  appendQuery(query, "customerEmail", params.customerEmail);
  appendQuery(query, "orderNumber", params.orderNumber);
  const suffix = query.size > 0 ? `?${query.toString()}` : "";

  return requestAdminApi<AdminOrderSummary[]>(`/api/v1/admin/orders${suffix}`, {
    role: "CHANGE_MANAGER"
  });
}

export function fetchAdminOrderCustomers(params: { limit?: number; offset?: number } = {}): Promise<AdminCustomerOrderSummary[]> {
  const query = new URLSearchParams();
  appendQuery(query, "limit", params.limit?.toString());
  appendQuery(query, "offset", params.offset?.toString());
  const suffix = query.size > 0 ? `?${query.toString()}` : "";

  return requestAdminApi<AdminCustomerOrderSummary[]>(`/api/v1/admin/orders/customers${suffix}`, {
    role: "CHANGE_MANAGER"
  });
}

export function fetchAdminOrder(orderNumber: string): Promise<AdminOrderDetail> {
  return requestAdminApi<AdminOrderDetail>(`/api/v1/admin/orders/${encodeURIComponent(orderNumber)}`, {
    role: "CHANGE_MANAGER"
  });
}

export function updateAdminOrderStatus(orderNumber: string, payload: AdminOrderStatusUpdatePayload, options: MutationOptions): Promise<Record<string, unknown>> {
  return requestAdminApi<Record<string, unknown>>(`/api/v1/admin/orders/${encodeURIComponent(orderNumber)}/status`, {
    method: "PATCH",
    role: "CHANGE_MANAGER",
    body: payload,
    idempotencyKey: options.idempotencyKey
  });
}

export function fetchAdminChangeRequests(status = "PENDING_REVIEW"): Promise<AdminChangeRequestResponse[]> {
  const query = new URLSearchParams();
  appendQuery(query, "status", status);
  const suffix = query.size > 0 ? `?${query.toString()}` : "";
  return requestAdminApi<AdminChangeRequestResponse[]>(`/api/v1/admin/change-requests${suffix}`, {
    role: "CHANGE_REVIEWER"
  });
}

export function uploadAdminAssets(formData: FormData, options: MutationOptions): Promise<AssetResponse[]> {
  return requestMultipartAdminApi<AssetResponse[]>("/api/v1/admin/assets", formData, "CHANGE_SUBMITTER", options.idempotencyKey);
}

export function replaceAdminAssetImage(assetKey: string, formData: FormData, options: MutationOptions): Promise<AssetResponse> {
  return requestMultipartAdminApi<AssetResponse>(`/api/v1/admin/assets/${encodeURIComponent(assetKey)}/image`, formData, "CHANGE_SUBMITTER", options.idempotencyKey);
}

export function updateAdminAssetMetadata(assetKey: string, payload: AssetMetadataUpdatePayload, options: MutationOptions): Promise<AssetResponse> {
  return requestAdminApi<AssetResponse>(`/api/v1/admin/assets/${encodeURIComponent(assetKey)}`, {
    method: "PATCH",
    role: "CHANGE_SUBMITTER",
    body: payload,
    idempotencyKey: options.idempotencyKey
  });
}

export function archiveAdminAsset(assetKey: string, options: MutationOptions): Promise<void> {
  return requestAdminApi<void>(`/api/v1/admin/assets/${encodeURIComponent(assetKey)}`, {
    method: "DELETE",
    role: "CHANGE_SUBMITTER",
    allowEmptyData: true,
    idempotencyKey: options.idempotencyKey
  });
}

export function bulkAssignAdminAssets(assetKeys: string[], categoryFamilyKey: string, categoryProductTypeKey: string | undefined, options: MutationOptions): Promise<AssetSearchResponse> {
  return requestAdminApi<AssetSearchResponse>("/api/v1/admin/assets/bulk/category-assignment", {
    method: "POST",
    role: "CHANGE_SUBMITTER",
    body: { assetKeys, categoryFamilyKey, categoryProductTypeKey },
    idempotencyKey: options.idempotencyKey
  });
}

export function updateAdminStorefrontHomeItem(itemKey: string, payload: StorefrontHomeItemUpdatePayload, options: MutationOptions): Promise<StorefrontHome> {
  return requestAdminApi<StorefrontHome>(`/api/v1/admin/storefront/home/items/${encodeURIComponent(itemKey)}`, {
    method: "PATCH",
    role: "CHANGE_SUBMITTER",
    body: payload,
    idempotencyKey: options.idempotencyKey
  });
}

export function createAdminChangeRequest(payload: AdminChangeRequestCreatePayload, options: MutationOptions, role: AdminRole = "CHANGE_SUBMITTER"): Promise<AdminChangeRequestResponse> {
  return requestAdminApi<AdminChangeRequestResponse>("/api/v1/admin/change-requests", {
    method: "POST",
    role,
    body: payload,
    idempotencyKey: options.idempotencyKey
  });
}

/** Replaces an existing PENDING_REVIEW request for the same (entityKey, requestType) — or creates new. Prevents duplicates. */
export function upsertAdminChangeRequest(payload: AdminChangeRequestCreatePayload, options: MutationOptions, role: AdminRole = "CHANGE_SUBMITTER"): Promise<AdminChangeRequestResponse> {
  return requestAdminApi<AdminChangeRequestResponse>("/api/v1/admin/change-requests/upsert", {
    method: "POST",
    role,
    body: payload,
    idempotencyKey: options.idempotencyKey
  });
}

export function approveAdminChangeRequest(requestKey: string, reviewNote: string | undefined, options: MutationOptions): Promise<AdminChangeRequestResponse> {
  return requestAdminApi<AdminChangeRequestResponse>(`/api/v1/admin/change-requests/${encodeURIComponent(requestKey)}/approve`, {
    method: "POST",
    role: "CHANGE_REVIEWER",
    body: { reviewedBy: "SHRESTA reviewer", reviewNote },
    idempotencyKey: options.idempotencyKey
  });
}

export function rejectAdminChangeRequest(requestKey: string, reviewNote: string | undefined, options: MutationOptions): Promise<AdminChangeRequestResponse> {
  return requestAdminApi<AdminChangeRequestResponse>(`/api/v1/admin/change-requests/${encodeURIComponent(requestKey)}/reject`, {
    method: "POST",
    role: "CHANGE_REVIEWER",
    body: { reviewedBy: "SHRESTA reviewer", reviewNote },
    idempotencyKey: options.idempotencyKey
  });
}

export function createCategoryFamily(payload: CategoryFamilyMutationPayload, options: MutationOptions): Promise<CategoryFamily[]> {
  return requestAdminApi<CategoryFamily[]>("/api/v1/admin/catalog/categories", {
    method: "POST",
    role: "CHANGE_SUBMITTER",
    body: payload,
    idempotencyKey: options.idempotencyKey
  });
}

export function updateCategoryFamily(familyKey: string, payload: CategoryFamilyMutationPayload, options: MutationOptions): Promise<CategoryFamily[]> {
  return requestAdminApi<CategoryFamily[]>(`/api/v1/admin/catalog/categories/${encodeURIComponent(familyKey)}`, {
    method: "PATCH",
    role: "CHANGE_SUBMITTER",
    body: payload,
    idempotencyKey: options.idempotencyKey
  });
}

export function archiveCategoryFamily(familyKey: string, options: MutationOptions): Promise<CategoryFamily[]> {
  return requestAdminApi<CategoryFamily[]>(`/api/v1/admin/catalog/categories/${encodeURIComponent(familyKey)}`, {
    method: "DELETE",
    role: "CHANGE_SUBMITTER",
    idempotencyKey: options.idempotencyKey
  });
}

export function createCategoryProductType(familyKey: string, payload: CategoryProductTypeMutationPayload, options: MutationOptions): Promise<CategoryFamily[]> {
  return requestAdminApi<CategoryFamily[]>(`/api/v1/admin/catalog/categories/${encodeURIComponent(familyKey)}/subcategories`, {
    method: "POST",
    role: "CHANGE_SUBMITTER",
    body: payload,
    idempotencyKey: options.idempotencyKey
  });
}

export function updateCategoryProductType(familyKey: string, typeKey: string, payload: CategoryProductTypeMutationPayload, options: MutationOptions): Promise<CategoryFamily[]> {
  return requestAdminApi<CategoryFamily[]>(`/api/v1/admin/catalog/categories/${encodeURIComponent(familyKey)}/subcategories/${encodeURIComponent(typeKey)}`, {
    method: "PATCH",
    role: "CHANGE_SUBMITTER",
    body: payload,
    idempotencyKey: options.idempotencyKey
  });
}

export function archiveCategoryProductType(familyKey: string, typeKey: string, options: MutationOptions): Promise<CategoryFamily[]> {
  return requestAdminApi<CategoryFamily[]>(`/api/v1/admin/catalog/categories/${encodeURIComponent(familyKey)}/subcategories/${encodeURIComponent(typeKey)}`, {
    method: "DELETE",
    role: "CHANGE_SUBMITTER",
    idempotencyKey: options.idempotencyKey
  });
}

export function createCategoryAttribute(familyKey: string, payload: CategoryAttributeMutationPayload, options: MutationOptions): Promise<CategoryFamily[]> {
  return requestAdminApi<CategoryFamily[]>(`/api/v1/admin/catalog/categories/${encodeURIComponent(familyKey)}/attributes`, {
    method: "POST",
    role: "CHANGE_SUBMITTER",
    body: payload,
    idempotencyKey: options.idempotencyKey
  });
}

export function updateCategoryAttribute(familyKey: string, attributeKey: string, payload: CategoryAttributeMutationPayload, options: MutationOptions): Promise<CategoryFamily[]> {
  return requestAdminApi<CategoryFamily[]>(`/api/v1/admin/catalog/categories/${encodeURIComponent(familyKey)}/attributes/${encodeURIComponent(attributeKey)}`, {
    method: "PATCH",
    role: "CHANGE_SUBMITTER",
    body: payload,
    idempotencyKey: options.idempotencyKey
  });
}

export function archiveCategoryAttribute(familyKey: string, attributeKey: string, options: MutationOptions): Promise<CategoryFamily[]> {
  return requestAdminApi<CategoryFamily[]>(`/api/v1/admin/catalog/categories/${encodeURIComponent(familyKey)}/attributes/${encodeURIComponent(attributeKey)}`, {
    method: "DELETE",
    role: "CHANGE_SUBMITTER",
    idempotencyKey: options.idempotencyKey
  });
}

export function createCategoryFilter(familyKey: string, payload: CategoryFilterMutationPayload, options: MutationOptions): Promise<CategoryFamily[]> {
  return requestAdminApi<CategoryFamily[]>(`/api/v1/admin/catalog/categories/${encodeURIComponent(familyKey)}/filters`, {
    method: "POST",
    role: "CHANGE_SUBMITTER",
    body: payload,
    idempotencyKey: options.idempotencyKey
  });
}

export function updateCategoryFilter(familyKey: string, filterKey: string, payload: CategoryFilterMutationPayload, options: MutationOptions): Promise<CategoryFamily[]> {
  return requestAdminApi<CategoryFamily[]>(`/api/v1/admin/catalog/categories/${encodeURIComponent(familyKey)}/filters/${encodeURIComponent(filterKey)}`, {
    method: "PATCH",
    role: "CHANGE_SUBMITTER",
    body: payload,
    idempotencyKey: options.idempotencyKey
  });
}

export function archiveCategoryFilter(familyKey: string, filterKey: string, options: MutationOptions): Promise<CategoryFamily[]> {
  return requestAdminApi<CategoryFamily[]>(`/api/v1/admin/catalog/categories/${encodeURIComponent(familyKey)}/filters/${encodeURIComponent(filterKey)}`, {
    method: "DELETE",
    role: "CHANGE_SUBMITTER",
    idempotencyKey: options.idempotencyKey
  });
}

export function createCategoryTax(familyKey: string, payload: CategoryTaxMutationPayload, options: MutationOptions): Promise<CategoryFamily[]> {
  return requestAdminApi<CategoryFamily[]>(`/api/v1/admin/catalog/categories/${encodeURIComponent(familyKey)}/taxes`, {
    method: "POST",
    role: "CHANGE_SUBMITTER",
    body: payload,
    idempotencyKey: options.idempotencyKey
  });
}

export function updateCategoryTax(familyKey: string, hsnCode: string, effectiveFrom: string, payload: CategoryTaxMutationPayload, options: MutationOptions): Promise<CategoryFamily[]> {
  return requestAdminApi<CategoryFamily[]>(`/api/v1/admin/catalog/categories/${encodeURIComponent(familyKey)}/taxes/${encodeURIComponent(hsnCode)}/${encodeURIComponent(effectiveFrom)}`, {
    method: "PATCH",
    role: "CHANGE_SUBMITTER",
    body: payload,
    idempotencyKey: options.idempotencyKey
  });
}

export function archiveCategoryTax(familyKey: string, hsnCode: string, effectiveFrom: string, options: MutationOptions): Promise<CategoryFamily[]> {
  return requestAdminApi<CategoryFamily[]>(`/api/v1/admin/catalog/categories/${encodeURIComponent(familyKey)}/taxes/${encodeURIComponent(hsnCode)}/${encodeURIComponent(effectiveFrom)}`, {
    method: "DELETE",
    role: "CHANGE_SUBMITTER",
    idempotencyKey: options.idempotencyKey
  });
}

export function createCategoryStyling(familyKey: string, payload: CategoryStylingMutationPayload, options: MutationOptions): Promise<CategoryFamily[]> {
  return requestAdminApi<CategoryFamily[]>(`/api/v1/admin/catalog/categories/${encodeURIComponent(familyKey)}/styling`, {
    method: "POST",
    role: "CHANGE_SUBMITTER",
    body: payload,
    idempotencyKey: options.idempotencyKey
  });
}

export function updateCategoryStyling(familyKey: string, occasionKey: string, payload: CategoryStylingMutationPayload, options: MutationOptions): Promise<CategoryFamily[]> {
  return requestAdminApi<CategoryFamily[]>(`/api/v1/admin/catalog/categories/${encodeURIComponent(familyKey)}/styling/${encodeURIComponent(occasionKey)}`, {
    method: "PATCH",
    role: "CHANGE_SUBMITTER",
    body: payload,
    idempotencyKey: options.idempotencyKey
  });
}

export function archiveCategoryStyling(familyKey: string, occasionKey: string, options: MutationOptions): Promise<CategoryFamily[]> {
  return requestAdminApi<CategoryFamily[]>(`/api/v1/admin/catalog/categories/${encodeURIComponent(familyKey)}/styling/${encodeURIComponent(occasionKey)}`, {
    method: "DELETE",
    role: "CHANGE_SUBMITTER",
    idempotencyKey: options.idempotencyKey
  });
}

type AdminRequestOptions = {
  method?: string;
  role: AdminRole;
  body?: Record<string, unknown> | readonly unknown[];
  allowEmptyData?: boolean;
  idempotencyKey?: string;
};

async function requestAdminApi<T>(path: string, options: AdminRequestOptions): Promise<T> {
  try {
    return await requestApi<T>(path as `/${string}`, {
      apiBaseUrl: apiBaseUrl(),
      method: options.method ?? "GET",
      headers: adminHeaders(options.role, options.idempotencyKey),
      body: options.body,
      cache: "no-store"
    });
  } catch (error) {
    if (options.allowEmptyData && error instanceof ShrestaApiError && error.code === "EMPTY_DATA") {
      return undefined as T;
    }
    throw error;
  }
}

async function requestMultipartAdminApi<T>(path: string, formData: FormData, role: AdminRole, idempotencyKey: string): Promise<T> {
  const headers = new Headers(adminHeaders(role, idempotencyKey));
  headers.set("Accept", "application/json");

  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl()}${path}`, {
      method: "POST",
      body: formData,
      cache: "no-store",
      headers
    });
  } catch (error) {
    throw new ShrestaApiUnavailableError("SHRESTA service is not reachable", null, error);
  }
  if (response.status === 404) {
    throw new ShrestaApiUnavailableError("SHRESTA service route was not found", 404);
  }
  const envelope = await response.json() as ApiResponseEnvelope<T>;
  if (!response.ok || !envelope.success) {
    throw new ShrestaApiError(
      envelope.error?.message ?? `SHRESTA service request failed with status ${response.status}`,
      response.status,
      envelope.error?.code ?? "SHRESTA_SERVICE_ERROR",
      envelope.traceId
    );
  }
  if (envelope.data === null) {
    throw new ShrestaApiError("SHRESTA service returned an empty success payload", response.status, "EMPTY_DATA", envelope.traceId);
  }

  return envelope.data;
}

function adminHeaders(role: AdminRole, idempotencyKey?: string): HeadersInit {
  const headers: Record<string, string> = {
    "X-SHRESTA-ADMIN-KEY": adminKey(),
    "X-SHRESTA-ADMIN-ROLE": role
  };
  if (idempotencyKey) {
    headers["Idempotency-Key"] = idempotencyKey;
  }

  return headers;
}

function apiBaseUrl(): string {
  return (process.env.SHRESTA_API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8090").replace(/\/$/, "");
}

function adminKey(): string {
  return process.env.SHRESTA_ADMIN_API_KEY ?? "local-shresta-admin-key";
}

function appendQuery(query: URLSearchParams, key: string, value: string | undefined) {
  if (value && value.trim()) {
    query.set(key, value.trim());
  }
}
