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

export type CustomerRegistrationResponse = {
  registrationStatus: "OTP_SENT" | "VERIFIED";
  customerId: string;
  identityEmail: string;
  identityMobile: string;
  displayName: string;
  loginOtp?: string | null;
  otpExpiresAt?: string | null;
  registrationOtp?: string | null;
};

export type CustomerLoginResult =
  | { ok: true; session: CustomerSession }
  | { ok: false; message: string };

export type CustomerRegistrationResult =
  | { ok: true; account: CustomerRegistrationResponse }
  | { ok: false; message: string };

type RegistrationApiError = {
  code?: string;
  message?: string;
};

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

export function isRegistrationInputShapeValid(email: string, mobile: string): boolean {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedMobile = mobile.trim().replace(/\D/g, "").slice(-10);
  return new RegExp(INPUT_PATTERNS.email).test(normalizedEmail)
    && new RegExp(INPUT_PATTERNS.indianMobile).test(normalizedMobile);
}

function isRegistrationNameShapeValid(firstName: string, middleName: string, lastName: string): boolean {
  const normalizedFirstName = firstName.trim();
  const normalizedMiddleName = middleName.trim();
  const normalizedLastName = lastName.trim();
  const personNamePattern = new RegExp(INPUT_PATTERNS.personName);

  if (!personNamePattern.test(normalizedFirstName) || !personNamePattern.test(normalizedLastName)) {
    return false;
  }

  return normalizedMiddleName.length === 0 || personNamePattern.test(normalizedMiddleName);
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

export async function submitCustomerRegistration(firstName: string, middleName: string, lastName: string, email: string, mobile: string, otp?: string): Promise<CustomerRegistrationResult> {
  const normalizedFirstName = firstName.trim();
  const normalizedMiddleName = middleName.trim();
  const normalizedLastName = lastName.trim();
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedMobile = mobile.trim().replace(/\D/g, "").slice(-10);
  const normalizedOtp = otp?.trim() ?? "";

  if (!isRegistrationNameShapeValid(normalizedFirstName, normalizedMiddleName, normalizedLastName)) {
    return { ok: false, message: "Enter valid first and last names. Middle name is optional." };
  }
  if (!isRegistrationInputShapeValid(normalizedEmail, normalizedMobile)) {
    return { ok: false, message: "Enter a valid email address and 10 digit Indian mobile number." };
  }
  if (normalizedOtp && !new RegExp(INPUT_PATTERNS.otpSixDigits).test(normalizedOtp)) {
    return { ok: false, message: "Enter the 6 digit OTP sent to your email and mobile." };
  }

  try {
    const response = await fetch("/api/customer-register", {
      body: JSON.stringify({
        firstName: normalizedFirstName,
        middleName: normalizedMiddleName || undefined,
        lastName: normalizedLastName,
        email: normalizedEmail,
        mobile: normalizedMobile,
        otp: normalizedOtp || undefined
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST"
    });

    const payload = await response.json() as {
      success?: boolean;
      data?: CustomerRegistrationResponse;
      error?: RegistrationApiError;
    };

    if (!response.ok || !payload.success || !payload.data) {
      return { ok: false, message: registrationErrorMessage(payload.error) };
    }

    return { ok: true, account: payload.data };
  } catch {
    return { ok: false, message: "We could not reach SHRESTA account services right now. Please try again shortly." };
  }
}

function registrationErrorMessage(error?: RegistrationApiError): string {
  if (!error?.message) {
    return "Account creation failed. Please try again.";
  }

  const message = error.message.trim();
  if (error.code === "CUSTOMER_REGISTRATION_CONFLICT" && /already linked to a customer account/i.test(message)) {
    return "This account is already registered. Please sign in to continue.";
  }

  return message;
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
