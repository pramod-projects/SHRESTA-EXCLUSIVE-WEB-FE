export type ApiErrorPayload = {
  code: string;
  message: string;
};

export type ApiResponseEnvelope<T> = {
  success: boolean;
  data: T | null;
  error: ApiErrorPayload | null;
  traceId: string;
  timestamp: string;
};

export type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export type ApiRequestOptions = Omit<RequestInit, "body"> & {
  apiBaseUrl?: string;
  body?: Record<string, unknown> | readonly unknown[];
  fetchImpl?: FetchLike;
};

export class ShrestaApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly traceId: string;

  constructor(message: string, status: number, code: string, traceId: string) {
    super(message);
    this.name = "ShrestaApiError";
    this.status = status;
    this.code = code;
    this.traceId = traceId;
  }
}

export class ShrestaApiUnavailableError extends Error {
  readonly status: number | null;
  readonly code: string;
  readonly cause: unknown;

  constructor(message: string, status: number | null, cause?: unknown) {
    super(message);
    this.name = "ShrestaApiUnavailableError";
    this.status = status;
    this.code = status === 404 ? "SHRESTA_API_NOT_FOUND" : "SHRESTA_API_UNREACHABLE";
    this.cause = cause;
  }
}

export async function requestApi<T>(path: `/${string}`, options: ApiRequestOptions = {}): Promise<T> {
  const { apiBaseUrl, body, fetchImpl = fetch, headers, ...requestInit } = options;
  const requestHeaders = new Headers(headers);
  if (!requestHeaders.has("Accept")) {
    requestHeaders.set("Accept", "application/json");
  }
  if (body !== undefined && !requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json");
  }

  let response: Response;
  try {
    response = await fetchImpl(`${resolveApiBaseUrl(apiBaseUrl)}${path}`, {
      ...requestInit,
      body: body === undefined ? undefined : JSON.stringify(body),
      headers: requestHeaders
    });
  } catch (error) {
    throw new ShrestaApiUnavailableError("Cannot connect to the SHRESTA backend. The service may be down or unreachable.", null, error);
  }

  if (response.status === 404) {
    throw new ShrestaApiUnavailableError("The requested API endpoint was not found on the SHRESTA backend (404).", 404);
  }

  const envelope = await readEnvelope<T>(response);
  if (!response.ok || !envelope.success) {
    throw new ShrestaApiError(
      envelope.error?.message ?? `SHRESTA service request failed with status ${response.status}`,
      response.status,
      envelope.error?.code ?? "SHRESTA_SERVICE_ERROR",
      envelope.traceId
    );
  }

  if (envelope.data === null) {
    throw new ShrestaApiError("Backend returned a success response with no data payload.", response.status, "EMPTY_DATA", envelope.traceId);
  }

  return envelope.data;
}

export function isShrestaApiUnavailableError(error: unknown): error is ShrestaApiUnavailableError {
  return error instanceof ShrestaApiUnavailableError;
}

/** Maps a ShrestaApiError to a safe, user-readable message. Internal infrastructure
 * error codes are replaced with a generic fallback so raw technical strings
 * never reach the customer UI. BE-originated business error messages pass through. */
export function toShrestaUserMessage(error: ShrestaApiError): string {
  const INFRA_CODES: ReadonlySet<string> = new Set(["INVALID_ENVELOPE", "EMPTY_DATA", "SHRESTA_SERVICE_ERROR"]);
  if (INFRA_CODES.has(error.code)) {
    return "Something went wrong on our end. Please try again in a moment.";
  }
  return error.message;
}

function resolveApiBaseUrl(value = process.env.NEXT_PUBLIC_API_BASE_URL): string {
  if (!value) {
    throw new Error("SHRESTA service base URL is required");
  }

  return value.endsWith("/") ? value.slice(0, -1) : value;
}

async function readEnvelope<T>(response: Response): Promise<ApiResponseEnvelope<T>> {
  const payload: unknown = await response.json();
  if (!isApiResponseEnvelope(payload)) {
    throw new ShrestaApiError(
      "Backend returned an unexpected response format — the service may be starting up or returning an error page.",
      response.status,
      "INVALID_ENVELOPE",
      "not-set"
    );
  }

  return payload as ApiResponseEnvelope<T>;
}

function isApiResponseEnvelope(value: unknown): value is ApiResponseEnvelope<unknown> {
  if (!isRecord(value)) {
    return false;
  }

  return typeof value.success === "boolean"
    && "data" in value
    && (value.error === null || isApiErrorPayload(value.error))
    && typeof value.traceId === "string"
    && typeof value.timestamp === "string";
}

function isApiErrorPayload(value: unknown): value is ApiErrorPayload {
  return isRecord(value)
    && typeof value.code === "string"
    && typeof value.message === "string";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
