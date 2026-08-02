import { describe, expect, it } from "vitest";
import { isLoginInputShapeValid, normalizeCustomerIdentity } from "./customer-session";

describe("customer session input contract", () => {
  it("normalizes email and mobile identities before login", () => {
    expect(normalizeCustomerIdentity(" TestUser@Gmail.com ")).toBe("testuser@gmail.com");
    expect(normalizeCustomerIdentity("+91 98765 43210")).toBe("+919876543210");
  });

  it("requires a valid identity and exactly six OTP digits", () => {
    expect(isLoginInputShapeValid("testuser@gmail.com", "123456")).toBe(true);
    expect(isLoginInputShapeValid("+91 98765 43210", "123456")).toBe(true);
    expect(isLoginInputShapeValid("not-an-email", "123456")).toBe(false);
    expect(isLoginInputShapeValid("testuser@gmail.com", "12345")).toBe(false);
  });
});
