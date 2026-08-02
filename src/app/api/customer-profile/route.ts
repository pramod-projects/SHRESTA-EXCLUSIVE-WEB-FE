import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { CUSTOMER_SESSION_COOKIE } from "@/features/auth/session-cookie";
import { ShrestaApiError, requestApi, toShrestaUserMessage } from "@/lib/api-client";

export const dynamic = "force-dynamic";

type CustomerProfileResponse = {
  customerId: string;
  identityEmail: string;
  displayName: string;
  status: string;
  sessionExpiresAt: string;
};

export async function GET() {
  const sessionToken = (await cookies()).get(CUSTOMER_SESSION_COOKIE)?.value;
  if (!sessionToken) {
    return NextResponse.json({
      success: false,
      data: null,
      error: { code: "CUSTOMER_UNAUTHENTICATED", message: "Login is required." }
    }, { status: 401 });
  }

  try {
    const data = await requestApi<CustomerProfileResponse>("/api/v1/customer/profile", {
      apiBaseUrl: process.env.SHRESTA_API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8090",
      cache: "no-store",
      headers: { Authorization: `Bearer ${sessionToken}` }
    });
    return NextResponse.json({
      success: true,
      data: {
        customerId: data.customerId,
        displayName: data.displayName,
        expiresAt: data.sessionExpiresAt,
        identityEmail: data.identityEmail,
        status: data.status
      },
      error: null
    });
  } catch (error) {
    if (error instanceof ShrestaApiError) {
      const response = NextResponse.json({
        success: false,
        data: null,
        error: { code: error.code, message: toShrestaUserMessage(error) }
      }, { status: error.status >= 500 ? 503 : error.status });
      if (error.status === 401) {
        response.cookies.delete(CUSTOMER_SESSION_COOKIE);
      }
      return response;
    }

    return NextResponse.json({
      success: false,
      data: null,
      error: { code: "CUSTOMER_PROFILE_PROXY_FAILED", message: "Customer profile service is unavailable." }
    }, { status: 503 });
  }
}
