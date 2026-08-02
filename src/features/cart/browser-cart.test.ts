import { describe, expect, it } from "vitest";
import { normalizeCartLines } from "./browser-cart";

describe("browser cart", () => {
  it("normalizes persisted cart lines", () => {
    expect(normalizeCartLines([
      { productId: "sku-1", quantity: 1 },
      { productId: "sku-1", quantity: 2.8 },
      { productId: "sku-2", quantity: 0 },
      { productId: " ", quantity: 5 },
      { productId: "sku-3", quantity: 120 }
    ])).toEqual([
      { productId: "sku-1", quantity: 3 },
      { productId: "sku-3", quantity: 99 }
    ]);
  });
});
