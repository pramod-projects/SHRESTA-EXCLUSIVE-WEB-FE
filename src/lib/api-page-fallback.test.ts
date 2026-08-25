import { describe, expect, it } from "vitest";
import { ShrestaApiError, ShrestaApiUnavailableError } from "./api-client";
import { nullWhenShrestaApiUnavailable } from "./api-page-fallback";

describe("nullWhenShrestaApiUnavailable", () => {
  it.each([
    new ShrestaApiUnavailableError("unreachable", null),
    new ShrestaApiError("edge response", 403, "INVALID_ENVELOPE", "not-set"),
    new ShrestaApiError("rate limited", 429, "RATE_LIMITED", "trace-1"),
    new ShrestaApiError("service unavailable", 503, "SERVICE_UNAVAILABLE", "trace-2")
  ])("returns null for infrastructure failures", async (error) => {
    await expect(nullWhenShrestaApiUnavailable(async () => {
      throw error;
    })).resolves.toBeNull();
  });

  it("preserves domain errors", async () => {
    const error = new ShrestaApiError("Category is disabled", 409, "CATEGORY_DISABLED", "trace-3");

    await expect(nullWhenShrestaApiUnavailable(async () => {
      throw error;
    })).rejects.toBe(error);
  });
});