import { NextResponse } from "next/server";
import { ShrestaApiError, requestApi, toShrestaUserMessage } from "@/lib/api-client";

export const dynamic = "force-dynamic";

type CustomerRegistrationResponse = {
  registrationStatus: "OTP_SENT" | "VERIFIED";
  customerId: string;
  identityEmail: string;
  identityMobile: string;
  displayName: string;
  loginOtp?: string | null;
  otpExpiresAt?: string | null;
  registrationOtp?: string | null;
};

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({
      success: false,
      data: null,
      error: { code: "INVALID_JSON", message: "We couldn't read your account request. Please refresh the page and try again." }
    }, { status: 400 });
  }

  try {
    const data = await requestApi<CustomerRegistrationResponse>("/api/v1/auth/customer/register", {
      apiBaseUrl: process.env.SHRESTA_API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8090",
      body: body as Record<string, unknown>,
      method: "POST"
    });

    return NextResponse.json({
      success: true,
      data,
      error: null
    });
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
      error: { code: "CUSTOMER_REGISTRATION_PROXY_FAILED", message: "Account creation is temporarily unavailable. Please try again shortly." }
    }, { status: 503 });
  }
}
