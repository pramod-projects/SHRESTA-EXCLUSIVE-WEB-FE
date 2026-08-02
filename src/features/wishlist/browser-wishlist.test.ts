import { describe, expect, it } from "vitest";
import { normalizeWishlistIds } from "./browser-wishlist";

describe("browser wishlist", () => {
  it("normalizes persisted wishlist ids", () => {
    expect(normalizeWishlistIds(["sku-1", "sku-1", " ", "sku-2", 42])).toEqual(["sku-1", "sku-2"]);
  });
});
