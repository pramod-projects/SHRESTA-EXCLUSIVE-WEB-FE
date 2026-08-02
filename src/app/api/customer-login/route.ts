import { NextResponse } from "next/server";
import { CUSTOMER_SESSION_COOKIE } from "@/features/auth/session-cookie";
import { ShrestaApiError, requestApi, toShrestaUserMessage } from "@/lib/api-client";

export const dynamic = "force-dynamic";

type CustomerLoginResponse = {
  customerId: string;
  identityEmail: string;
  displayName: string;
  authMode: string;
  issuedAt: string;
  expiresAt: string;
  sessionToken: string;
};

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({
      success: false,
      data: null,
      error: { code: "INVALID_JSON", message: "We couldn't read your login request. Please refresh the page and try again." }
    }, { status: 400 });
  }

  try {
    const data = await requestApi<CustomerLoginResponse>("/api/v1/auth/customer/login", {
      apiBaseUrl: process.env.SHRESTA_API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8090",
      body: body as Record<string, unknown>,
      method: "POST"
    });
    const response = NextResponse.json({
      success: true,
      data: {
        customerId: data.customerId,
        displayName: data.displayName,
        expiresAt: data.expiresAt,
        identityEmail: data.identityEmail,
        status: "ACTIVE"
      },
      error: null
    });
    response.cookies.set(CUSTOMER_SESSION_COOKIE, data.sessionToken, {
      expires: new Date(data.expiresAt),
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production"
    });
    return response;
  } catch (error) {
    if (error instanceof ShrestaApiError) {
      return NextResponse.json({
        success: false,
        data: null,
        error: { code: error.code, message: toShrestaUserMessage(error) }
      }, { status: error.status >= 500 ? 503 : error.status });
    }

    return NextResponse.json({
      success: false,
      data: null,
      error: { code: "CUSTOMER_LOGIN_PROXY_FAILED", message: "Login is temporarily unavailable. Please try again shortly." }
    }, { status: 503 });
  }
}
