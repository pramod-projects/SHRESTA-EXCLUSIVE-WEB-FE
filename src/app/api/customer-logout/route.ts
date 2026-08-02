import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { CUSTOMER_SESSION_COOKIE } from "@/features/auth/session-cookie";
import { requestApi } from "@/lib/api-client";

export const dynamic = "force-dynamic";

export async function POST() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(CUSTOMER_SESSION_COOKIE)?.value;
  if (sessionToken) {
    try {
      await requestApi<void>("/api/v1/auth/customer/logout", {
        apiBaseUrl: process.env.SHRESTA_API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8090",
        headers: { Authorization: `Bearer ${sessionToken}` },
        method: "POST"
      });
    } catch {
      // Logout still clears the browser cookie even if the backend session has already expired.
    }
  }

  const response = NextResponse.json({ success: true, data: null, error: null });
  response.cookies.delete(CUSTOMER_SESSION_COOKIE);
  return response;
}
