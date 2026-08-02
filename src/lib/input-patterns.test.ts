import { describe, expect, it } from "vitest";
import { INPUT_PATTERNS } from "./input-patterns";

describe("input patterns", () => {
  it("accepts email or Indian mobile login identities", () => {
    const pattern = new RegExp(INPUT_PATTERNS.loginIdentity);
    expect(pattern.test("buyer@example.com")).toBe(true);
    expect(pattern.test("+91 9876543210")).toBe(true);
    expect(pattern.test("9876543210")).toBe(true);
    expect(pattern.test("12345")).toBe(false);
  });

  it("requires exactly six OTP digits", () => {
    const pattern = new RegExp(INPUT_PATTERNS.otpSixDigits);
    expect(pattern.test("123456")).toBe(true);
    expect(pattern.test("12345")).toBe(false);
    expect(pattern.test("1234567")).toBe(false);
    expect(pattern.test("12A456")).toBe(false);
  });
});
