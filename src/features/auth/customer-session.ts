"use client";

import { INPUT_PATTERNS } from "@/lib/input-patterns";

export type CustomerSession = {
  customerId: string;
  identityEmail: string;
  displayName: string;
  status: string;
  expiresAt: string;
};

export type CustomerLoginResponse = CustomerSession;

export type CustomerLoginResult =
  | { ok: true; session: CustomerSession }
  | { ok: false; message: string };

export function normalizeCustomerIdentity(value: string): string {
  const trimmed = value.trim();
  if (trimmed.includes("@")) {
    return trimmed.toLowerCase();
  }

  return trimmed.replace(/[ -]/g, "");
}

export function isLoginInputShapeValid(identity: string, otp: string): boolean {
  return new RegExp(INPUT_PATTERNS.loginIdentity).test(normalizeCustomerIdentity(identity))
    && new RegExp(INPUT_PATTERNS.otpSixDigits).test(otp.trim());
}

export async function submitCustomerLogin(identity: string, otp: string): Promise<CustomerLoginResult> {
  if (!isLoginInputShapeValid(identity, otp)) {
    return { ok: false, message: "Enter a valid email or Indian mobile number and the 6 digit OTP." };
  }

  try {
    const response = await fetch("/api/customer-login", {
      body: JSON.stringify({ identity: normalizeCustomerIdentity(identity), otp: otp.trim() }),
      headers: { "Content-Type": "application/json" },
      method: "POST"
    });
    const payload = await response.json() as {
      success?: boolean;
      data?: CustomerLoginResponse;
      error?: { message?: string };
    };

    if (!response.ok || !payload.success || !payload.data) {
      return { ok: false, message: payload.error?.message ?? "Login failed. Check the email and OTP, then try again." };
    }

    return { ok: true, session: payload.data };
  } catch {
    return { ok: false, message: "We could not reach SHRESTA login right now. Please try again shortly." };
  }
}

export async function fetchCustomerSession(): Promise<CustomerSession | null> {
  const response = await fetch("/api/customer-profile", { cache: "no-store" });
  if (response.status === 401) {
    return null;
  }

  const payload = await response.json() as {
    success?: boolean;
    data?: CustomerSession;
  };
  return response.ok && payload.success && payload.data ? payload.data : null;
}

export async function logoutCustomerSession(): Promise<void> {
  await fetch("/api/customer-logout", { method: "POST" });
}
