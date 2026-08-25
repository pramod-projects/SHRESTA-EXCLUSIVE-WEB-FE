import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createAdminSessionToken, setAdminSessionCookie, type AdminRole } from "@/features/admin/admin-auth";
import { requestApi } from "@/lib/api-client";

export async function POST(request: Request) {
  let payload: { email?: string; password?: string; next?: string };
  try {
    payload = await request.json() as { email?: string; password?: string; next?: string };
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request body." }, { status: 400 });
  }

  const email = payload.email ?? "";
  const password = payload.password ?? "";

  let loginData: { email: string; role: AdminRole };
  try {
    const data = await requestApi<{ email: string; role: AdminRole }>("/api/v1/admin/auth/login", {
      apiBaseUrl: apiBaseUrl(),
      method: "POST",
      body: { email, password },
      headers: {
        "Content-Type": "application/json"
      }
    });
    loginData = { email: data.email, role: data.role };
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid email or password." }, { status: 401 });
  }

  const token = createAdminSessionToken(loginData.email, loginData.role);
  const cookieStore = await cookies();
  setAdminSessionCookie(cookieStore, token);

  const nextPath = normalizeNextPath(payload.next);
  return NextResponse.json({ ok: true, nextPath });
}

function apiBaseUrl(): string {
  return (process.env.SHRESTA_API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8090").replace(/\/$/, "");
}

function normalizeNextPath(nextPath: string | undefined): string {
  if (!nextPath || !nextPath.startsWith("/")) {
    return "/admin";
  }
  if (nextPath.startsWith("//") || nextPath.startsWith("/admin-login")) {
    return "/admin";
  }
  return nextPath;
}
