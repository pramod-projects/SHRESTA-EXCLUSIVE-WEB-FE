import type { CategoryFamily } from "@/features/catalog/category-config";
import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from "@/features/admin/admin-auth";
import type { NotificationConfiguration } from "@/features/admin/notification-configuration";
import type { RefundPolicyConfiguration } from "@/features/admin/refund-policy-configuration";
import { browserSafeMediaUrl, normalizeStorefrontHomeMediaUrls, type StorefrontHome } from "@/features/storefront/storefront-home";
import { ShrestaApiError, requestApi } from "@/lib/api-client";

export type AdminRole = "SUPER_ADMIN" | "CHANGE_SUBMITTER" | "CHANGE_APPROVER" | "CHANGE_MANAGER" | "CHANGE_ADMIN";

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
  systemTotal?: number;
  systemImageTotal?: number;
  systemVideoTotal?: number;
  systemOtherTotal?: number;
  systemReferencedTotal?: number;
  systemUnreferencedTotal?: number;
};

export type UnreferencedMediaAsset = AssetResponse;

export type UnreferencedMediaAssetsResponse = {
  items: UnreferencedMediaAsset[];
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
  status: "PENDING_UPLOAD" | "READY" | "FAILED" | "ARCHIVED" | string;
  version: number;
  widthPx: number;
  heightPx: number;
  byteSize: number;
  contentType: string | null;
  deliveryMode: string;
  tags: string[];
  seoTitle: string | null;
  seoDescription: string | null;
};

export type MediaUploadAuthorizationRequest = {
  productId?: string;
  mediaType: "PRODUCT_IMAGE" | "PRODUCT_VIDEO" | "DISPLAY_IMAGE" | "DISPLAY_VIDEO";
  contentType: string;
  originalFilename: string;
  byteSize: number;
  widthPx?: number;
  heightPx?: number;
  durationSeconds?: number;
  altText?: string;
};

export type MediaUploadAuthorizationResponse = {
  mediaId: string;
  assetKey: string;
  objectKey: string;
  uploadUrl: string;
  expiresAt: string;
  contentType: string;
  requiredHeaders: Record<string, string>;
};

export type ProductMediaReservationResponse = {
  productId: string;
  expiresAt: string;
};

export type MutationOptions = {
  idempotencyKey: string;
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
  refundRequestStatus: "NONE" | "REQUESTED" | "PROCESSING" | "SUCCESS" | string;
  deliveryMode: string;
  paymentMethod: string;
  totalPaise: number;
  itemCount: number;
  placedAt: string;
  isTest: boolean;
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
  fulfillmentStatus: string;
  note?: string;
  opsReference?: string;
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
  isTest: boolean;
  statusEvents: Array<{
    eventType: string;
    fromStatus: string | null;
    toStatus: string;
    actorType: string;
    note: string | null;
    createdAt: string;
  }>;
};

export type AdminOrderRefundStatusCheck = {
  orderNumber: string;
  refundId: string | null;
  razorpayStatus: string;
  refundSuccessful: boolean;
  paymentMarkedRefunded: boolean;
  message: string;
};

export type AdminUserResponse = {
  email: string;
  role: AdminRole | string;
  active: boolean;
  createdByEmail: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminUserCreatePayload = {
  email: string;
  password: string;
  role: AdminRole;
};

export type TestUserSummary = {
  customerId: string;
  displayName: string;
  email: string;
  mobile: string | null;
  note: string | null;
  active: boolean;
  testOrdersCount: number;
  createdAt: string;
  otpRevealed: boolean;
};

export type AdminTestUsersResponse = {
  items: TestUserSummary[];
  page: number;
  size: number;
  total: number;
};

export type TestUserOtpRevealResponse = {
  otp: string;
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
  const response = await requestAdminApi<AssetSearchResponse>(`/api/v1/admin/assets${suffix}`, {
    role: "CHANGE_MANAGER"
  });
  return {
    ...response,
    assets: response.assets.map((asset) => ({
      ...asset,
      assetUrl: browserSafeMediaUrl(asset.assetUrl) ?? asset.assetUrl
    }))
  };
}

export async function fetchUnreferencedMediaAssets(params: AssetSearchParams = {}): Promise<UnreferencedMediaAssetsResponse> {
  const query = new URLSearchParams();
  appendQuery(query, "query", params.query);
  appendQuery(query, "status", params.status);
  appendQuery(query, "page", params.page?.toString());
  appendQuery(query, "size", params.size?.toString());

  const suffix = query.size > 0 ? `?${query.toString()}` : "";
  const response = await requestAdminApi<UnreferencedMediaAssetsResponse>(`/api/v1/admin/assets/storefront-unreferenced${suffix}`, {
    role: "CHANGE_MANAGER"
  });
  return {
    ...response,
    items: response.items.map((asset) => ({
      ...asset,
      assetUrl: browserSafeMediaUrl(asset.assetUrl) ?? asset.assetUrl
    }))
  };
}

export function fetchAdminCategories(): Promise<CategoryFamily[]> {
  return requestAdminApi<CategoryFamily[]>("/api/v1/admin/catalog/categories", {
    role: "CHANGE_MANAGER"
  });
}

export async function fetchAdminStorefrontHome(): Promise<StorefrontHome> {
  const home = await requestAdminApi<StorefrontHome>("/api/v1/admin/storefront/home", {
    role: "CHANGE_MANAGER"
  });
  return normalizeStorefrontHomeMediaUrls(home);
}

export function fetchAdminAcl(role: AdminRole = "CHANGE_MANAGER"): Promise<AdminAclResponse> {
  return requestAdminApi<AdminAclResponse>("/api/v1/admin/acl/me", { role });
}

export function fetchAdminNotificationConfiguration(): Promise<NotificationConfiguration[]> {
  return requestAdminApi<NotificationConfiguration[]>("/api/v1/admin/configurations/notifications", {
    role: "CHANGE_MANAGER"
  });
}

export function fetchAdminRefundPolicyConfiguration(): Promise<RefundPolicyConfiguration> {
  return requestAdminApi<RefundPolicyConfiguration>("/api/v1/admin/configurations/refund-policy", {
    role: "CHANGE_MANAGER"
  });
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

export function approveAdminOrderRefund(orderNumber: string, payload: { note?: string; opsReference?: string }, options: MutationOptions): Promise<Record<string, unknown>> {
  return requestAdminApi<Record<string, unknown>>(`/api/v1/admin/orders/${encodeURIComponent(orderNumber)}/refund/approve`, {
    method: "POST",
    role: "CHANGE_MANAGER",
    body: payload,
    idempotencyKey: options.idempotencyKey
  });
}

export function checkAdminOrderRefundStatus(orderNumber: string): Promise<AdminOrderRefundStatusCheck> {
  return requestAdminApi<AdminOrderRefundStatusCheck>(`/api/v1/admin/orders/${encodeURIComponent(orderNumber)}/refund/check-status`, {
    method: "POST",
    role: "CHANGE_MANAGER",
    body: {}
  });
}

export function fetchAdminChangeRequests(status = "PENDING_REVIEW"): Promise<AdminChangeRequestResponse[]> {
  const query = new URLSearchParams();
  appendQuery(query, "status", status);
  const suffix = query.size > 0 ? `?${query.toString()}` : "";
  return requestAdminApi<AdminChangeRequestResponse[]>(`/api/v1/admin/change-requests${suffix}`, {
    role: "CHANGE_APPROVER"
  });
}

export function authorizeAdminMediaUpload(payload: MediaUploadAuthorizationRequest, options: MutationOptions): Promise<MediaUploadAuthorizationResponse> {
  return requestAdminApi<MediaUploadAuthorizationResponse>("/api/v1/admin/assets/upload-authorizations", {
    method: "POST",
    role: "CHANGE_SUBMITTER",
    body: payload,
    idempotencyKey: options.idempotencyKey
  });
}

export function reserveProductMedia(options: MutationOptions): Promise<ProductMediaReservationResponse> {
  return requestAdminApi<ProductMediaReservationResponse>("/api/v1/admin/assets/product-media-reservations", {
    method: "POST",
    role: "CHANGE_SUBMITTER",
    body: {},
    idempotencyKey: options.idempotencyKey
  });
}

export function completeAdminMediaUpload(mediaId: string, options: MutationOptions): Promise<AssetResponse> {
  return requestAdminApi<AssetResponse>("/api/v1/admin/assets/upload-completions", {
    method: "POST",
    role: "CHANGE_SUBMITTER",
    body: { mediaId },
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
    role: "CHANGE_APPROVER",
    body: { reviewedBy: "SHRESTA reviewer", reviewNote },
    idempotencyKey: options.idempotencyKey
  });
}

export function rejectAdminChangeRequest(requestKey: string, reviewNote: string | undefined, options: MutationOptions): Promise<AdminChangeRequestResponse> {
  return requestAdminApi<AdminChangeRequestResponse>(`/api/v1/admin/change-requests/${encodeURIComponent(requestKey)}/reject`, {
    method: "POST",
    role: "CHANGE_APPROVER",
    body: { reviewedBy: "SHRESTA reviewer", reviewNote },
    idempotencyKey: options.idempotencyKey
  });
}

export function fetchAdminUsers(): Promise<AdminUserResponse[]> {
  return requestAdminApi<AdminUserResponse[]>("/api/v1/admin/users", {
    role: "SUPER_ADMIN"
  });
}

export function fetchAdminTestUsers(params: { page?: number; size?: number } = {}): Promise<AdminTestUsersResponse> {
  const query = new URLSearchParams();
  appendQuery(query, "page", params.page?.toString());
  appendQuery(query, "size", params.size?.toString());
  const suffix = query.size > 0 ? `?${query.toString()}` : "";

  return requestAdminApi<AdminTestUsersResponse>(`/api/v1/admin/test-users${suffix}`, {
    role: "CHANGE_MANAGER"
  });
}

/**
 * One-time OTP reveal. The backend stores only an OTP hash — this endpoint returns the
 * plaintext exactly once (404 TEST_USER_NOT_FOUND, 409 TEST_USER_OTP_ALREADY_REVEALED).
 */
export async function revealTestUserOtp(customerId: string): Promise<TestUserOtpRevealResponse> {
  try {
    return await requestAdminApi<TestUserOtpRevealResponse>(`/api/v1/admin/test-users/${encodeURIComponent(customerId)}/reveal-otp`, {
      role: "CHANGE_MANAGER"
    });
  } catch (error) {
    if (error instanceof ShrestaApiError) {
      if (error.status === 404 || error.code === "TEST_USER_NOT_FOUND") {
        throw new Error("Test user not found. It may have been deleted by an approved change request.");
      }
      if (error.status === 409 || error.code === "TEST_USER_OTP_ALREADY_REVEALED") {
        throw new Error("The OTP for this test user has already been revealed and can never be shown again.");
      }
    }
    throw error;
  }
}

export function createAdminUser(payload: AdminUserCreatePayload): Promise<AdminUserResponse> {
  return requestAdminApi<AdminUserResponse>("/api/v1/admin/users", {
    method: "POST",
    role: "SUPER_ADMIN",
    body: payload
  });
}

export function deleteAdminUser(email: string): Promise<AdminUserResponse> {
  return requestAdminApi<AdminUserResponse>(`/api/v1/admin/users/${encodeURIComponent(email)}`, {
    method: "DELETE",
    role: "SUPER_ADMIN"
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
  const headers = await adminHeaders(options.role, options.idempotencyKey);
  try {
    return await requestApi<T>(path as `/${string}`, {
      apiBaseUrl: apiBaseUrl(),
      method: options.method ?? "GET",
      headers,
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

async function adminHeaders(role: AdminRole, idempotencyKey?: string): Promise<HeadersInit> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  const session = verifyAdminSessionToken(sessionToken);
  const effectiveRole = session?.role ?? role;

  const headers: Record<string, string> = {
    "X-SHRESTA-ADMIN-KEY": adminKey(),
    "X-SHRESTA-ADMIN-ROLE": effectiveRole
  };
  if (session?.email) {
    headers["X-SHRESTA-ADMIN-ACTOR"] = session.email;
  }
  if (idempotencyKey) {
    headers["Idempotency-Key"] = idempotencyKey;
  }

  return headers;
}

function apiBaseUrl(): string {
  return (process.env.SHRESTA_API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8090").replace(/\/$/, "");
}

function adminKey(): string {
  const value = process.env.SHRESTA_ADMIN_API_KEY?.trim();
  if (!value) {
    throw new Error("SHRESTA_ADMIN_API_KEY is required");
  }
  return value;
}

function appendQuery(query: URLSearchParams, key: string, value: string | undefined) {
  if (value && value.trim()) {
    query.set(key, value.trim());
  }
}
