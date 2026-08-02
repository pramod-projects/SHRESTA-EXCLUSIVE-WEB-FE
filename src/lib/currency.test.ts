import { describe, expect, it } from "vitest";
import { asPriceInPaise, formatPaise } from "./currency";

describe("currency", () => {
  it("brands safe integer paise values", () => {
    expect(asPriceInPaise(69_950)).toBe(69_950);
  });

  it("rejects unsafe or negative values", () => {
    expect(() => asPriceInPaise(-1)).toThrow("Price must be a non-negative safe integer in paise");
    expect(() => asPriceInPaise(10.5)).toThrow("Price must be a non-negative safe integer in paise");
  });

  it("formats paise for Indian currency display", () => {
    expect(formatPaise(asPriceInPaise(69_950))).toContain("₹");
    expect(formatPaise(asPriceInPaise(69_950))).toContain("699.50");
    expect(formatPaise(asPriceInPaise(99_900))).toContain("999");
  });
});
