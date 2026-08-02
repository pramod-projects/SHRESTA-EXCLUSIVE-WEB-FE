import { describe, expect, it } from "vitest";
import { ShrestaApiError, requestApi, type FetchLike } from "./api-client";

describe("api-client", () => {
  it("unwraps successful SHRESTA response envelopes", async () => {
    const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
    const fetchImpl: FetchLike = async (input, init) => {
      calls.push({ input, init });
      return jsonResponse({
        success: true,
        data: [{ familyKey: "silk_saree" }],
        error: null,
        traceId: "trace-1",
        timestamp: "2026-07-05T00:00:00Z"
      });
    };

    const data = await requestApi<Array<{ familyKey: string }>>("/api/v1/categories", {
      apiBaseUrl: "http://localhost:8090/",
      fetchImpl
    });

    expect(data).toEqual([{ familyKey: "silk_saree" }]);
    expect(calls[0]?.input).toBe("http://localhost:8090/api/v1/categories");
    expect(new Headers(calls[0]?.init?.headers).get("Accept")).toBe("application/json");
  });

  it("throws normalized SHRESTA API errors", async () => {
    const fetchImpl: FetchLike = async () => jsonResponse({
      success: false,
      data: null,
      error: { code: "CATEGORY_DISABLED", message: "Category is disabled" },
      traceId: "trace-2",
      timestamp: "2026-07-05T00:00:00Z"
    }, 409);

    await expect(requestApi("/api/v1/categories", {
      apiBaseUrl: "http://localhost:8090",
      fetchImpl
    })).rejects.toMatchObject({
      name: "ShrestaApiError",
      status: 409,
      code: "CATEGORY_DISABLED",
      traceId: "trace-2",
      message: "Category is disabled"
    } satisfies Partial<ShrestaApiError>);
  });

  it("rejects invalid API envelopes", async () => {
    const fetchImpl: FetchLike = async () => jsonResponse({ ok: true });

    await expect(requestApi("/api/v1/categories", {
      apiBaseUrl: "http://localhost:8090",
      fetchImpl
    })).rejects.toMatchObject({
      code: "INVALID_ENVELOPE"
    } satisfies Partial<ShrestaApiError>);
  });
});

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
