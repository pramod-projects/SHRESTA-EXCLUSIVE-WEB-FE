import { NextResponse } from "next/server";
import { ShrestaApiError, requestApi, toShrestaUserMessage } from "@/lib/api-client";

export const dynamic = "force-dynamic";

type CustomerOtpResponse = {
  status: "OTP_SENT";
  destination: string;
  expiresAt: string;
};

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({
      success: false,
      data: null,
      error: { code: "INVALID_JSON", message: "We couldn't read your OTP request. Please refresh the page and try again." }
    }, { status: 400 });
  }

  try {
    const data = await requestApi<CustomerOtpResponse>("/api/v1/auth/customer/otp/request", {
      apiBaseUrl: process.env.SHRESTA_API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8090",
      body: body as Record<string, unknown>,
      method: "POST"
    });
    return NextResponse.json({ success: true, data, error: null });
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
      error: { code: "CUSTOMER_OTP_PROXY_FAILED", message: "OTP delivery is temporarily unavailable. Please try again shortly." }
    }, { status: 503 });
  }
}
