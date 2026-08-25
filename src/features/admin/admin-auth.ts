import { createHmac, timingSafeEqual } from "node:crypto";
import type { RequestCookies, ResponseCookies } from "next/dist/compiled/@edge-runtime/cookies";

export const ADMIN_SESSION_COOKIE = "shresta_admin_session";

const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;
const ADMIN_ROLES = ["SUPER_ADMIN", "CHANGE_SUBMITTER", "CHANGE_APPROVER", "CHANGE_MANAGER", "CHANGE_ADMIN"] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export type AdminSessionPayload = {
  email: string;
  role: AdminRole;
  exp: number;
};

export function createAdminSessionToken(email: string, role: AdminRole): string {
  const payload: AdminSessionPayload = {
    email: email.trim().toLowerCase(),
    role,
    exp: Math.floor(Date.now() / 1000) + ADMIN_SESSION_MAX_AGE_SECONDS
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = signPayload(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function verifyAdminSessionToken(token: string | undefined | null): AdminSessionPayload | null {
  if (!token) {
    return null;
  }

  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return null;
  }

  const [encodedPayload, signature] = parts;
  const expectedSignature = signPayload(encodedPayload);
  if (!safeEqual(signature, expectedSignature)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as Partial<AdminSessionPayload>;
    if (!payload || typeof payload.email !== "string" || typeof payload.role !== "string" || typeof payload.exp !== "number") {
      return null;
    }
    if (!isAdminRole(payload.role)) {
      return null;
    }
    if (payload.exp <= Math.floor(Date.now() / 1000)) {
      return null;
    }
    return {
      email: payload.email,
      role: payload.role,
      exp: payload.exp
    };
  } catch {
    return null;
  }
}

function isAdminRole(value: string): value is AdminRole {
  return ADMIN_ROLES.includes(value as AdminRole);
}

export function setAdminSessionCookie(cookieStore: ResponseCookies, token: string) {
  cookieStore.set({
    name: ADMIN_SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
    path: "/"
  });
}

export function clearAdminSessionCookie(cookieStore: RequestCookies | ResponseCookies) {
  cookieStore.set({
    name: ADMIN_SESSION_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
    path: "/"
  });
}

function signPayload(payload: string): string {
  return createHmac("sha256", requiredServerSecret("SHRESTA_ADMIN_SESSION_SECRET"))
    .update(payload)
    .digest("base64url");
}

function requiredServerSecret(name: "SHRESTA_ADMIN_SESSION_SECRET"): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  if (left.length !== right.length) {
    return false;
  }
  return timingSafeEqual(left, right);
}
