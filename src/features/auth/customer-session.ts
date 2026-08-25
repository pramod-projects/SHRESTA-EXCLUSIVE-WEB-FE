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

export type CustomerOtpResult =
  | { ok: true; destination: string; expiresAt: string }
  | { ok: false; message: string };

export type CustomerRegistrationResult =
  | { ok: true; account: CustomerRegistrationResponse }
  | { ok: false; message: string };

type RegistrationApiError = {
  code?: string;
  message?: string;
};

const SESSION_CACHE_TTL_MS = 10_000;

let cachedSession: CustomerSession | null | undefined;
let sessionCacheExpiresAt = 0;
let inFlightSessionRequest: Promise<CustomerSession | null> | null = null;

export function normalizeCustomerIdentity(value: string): string {
  const trimmed = value.trim();
  if (trimmed.includes("@")) {
    return trimmed.toLowerCase();
  }

  return trimmed.replace(/[ -]/g, "");
}

export function isLoginInputShapeValid(identity: string, otp: string): boolean {
  return isCustomerIdentityShapeValid(identity)
    && new RegExp(INPUT_PATTERNS.otpSixDigits).test(otp.trim());
}

export function isCustomerIdentityShapeValid(identity: string): boolean {
  return new RegExp(INPUT_PATTERNS.loginIdentity).test(normalizeCustomerIdentity(identity));
}

export async function requestCustomerOtp(identity: string): Promise<CustomerOtpResult> {
  if (!isCustomerIdentityShapeValid(identity)) {
    return { ok: false, message: "Enter a valid email address or 10 digit Indian mobile number." };
  }

  try {
    const response = await fetch("/api/customer-otp/request", {
      body: JSON.stringify({ identity: normalizeCustomerIdentity(identity) }),
      headers: { "Content-Type": "application/json" },
      method: "POST"
    });
    const payload = await response.json() as {
      success?: boolean;
      data?: { destination: string; expiresAt: string };
      error?: { message?: string };
    };

    if (!response.ok || !payload.success || !payload.data) {
      return { ok: false, message: payload.error?.message ?? "We could not send the OTP. Please try again." };
    }
    return { ok: true, destination: payload.data.destination, expiresAt: payload.data.expiresAt };
  } catch {
    return { ok: false, message: "We could not reach SHRESTA OTP services right now. Please try again shortly." };
  }
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

    cachedSession = payload.data;
    sessionCacheExpiresAt = Date.now() + SESSION_CACHE_TTL_MS;
    inFlightSessionRequest = null;

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

export async function fetchCustomerSession(options?: { force?: boolean }): Promise<CustomerSession | null> {
  const force = options?.force === true;
  const now = Date.now();

  if (!force && cachedSession !== undefined && now < sessionCacheExpiresAt) {
    return cachedSession;
  }

  if (!force && inFlightSessionRequest) {
    return inFlightSessionRequest;
  }

  inFlightSessionRequest = (async () => {
    const response = await fetch("/api/customer-profile", { cache: "no-store" });
    const payload = await response.json() as {
      success?: boolean;
      data?: CustomerSession | null;
      authenticated?: boolean;
    };

    const nextSession = response.ok && payload.success && payload.data ? payload.data : null;
    cachedSession = nextSession;
    sessionCacheExpiresAt = Date.now() + SESSION_CACHE_TTL_MS;
    return nextSession;
  })();

  try {
    return await inFlightSessionRequest;
  } finally {
    inFlightSessionRequest = null;
  }
}

export async function logoutCustomerSession(): Promise<void> {
  await fetch("/api/customer-logout", { method: "POST" });
  cachedSession = null;
  sessionCacheExpiresAt = Date.now() + SESSION_CACHE_TTL_MS;
  inFlightSessionRequest = null;
}
