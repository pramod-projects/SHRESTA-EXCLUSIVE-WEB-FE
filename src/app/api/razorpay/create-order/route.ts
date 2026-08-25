import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { CUSTOMER_SESSION_COOKIE } from "@/features/auth/session-cookie";
import { ShrestaApiError, requestApi, toShrestaUserMessage } from "@/lib/api-client";

export const dynamic = "force-dynamic";

function shouldClearCustomerSession(error: ShrestaApiError): boolean {
  return error.status === 401 && error.code.startsWith("CUSTOMER_");
}

export async function POST(request: Request) {
  const sessionToken = (await cookies()).get(CUSTOMER_SESSION_COOKIE)?.value;
  if (!sessionToken) {
    return NextResponse.json({
      success: false,
      data: null,
      error: { code: "CUSTOMER_UNAUTHENTICATED", message: "Login is required before payment can start." }
    }, { status: 401 });
  }

  let body: { draftOrderId?: unknown };
  try {
    body = await request.json() as { draftOrderId?: unknown };
  } catch {
    return NextResponse.json({
      success: false,
      data: null,
      error: { code: "INVALID_JSON", message: "We couldn't read your payment request. Please try again." }
    }, { status: 400 });
  }

  const draftOrderId = typeof body.draftOrderId === "string" ? body.draftOrderId.trim() : "";
  if (!draftOrderId) {
    return NextResponse.json({
      success: false,
      data: null,
      error: { code: "DRAFT_ORDER_ID_REQUIRED", message: "Checkout order ID is required before payment can start." }
    }, { status: 400 });
  }

  try {
    const data = await requestApi<Record<string, unknown>>(`/api/v1/customer/orders/draft/${encodeURIComponent(draftOrderId)}/razorpay-order`, {
      apiBaseUrl: process.env.SHRESTA_API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8090",
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${sessionToken}`,
        "Idempotency-Key": `razorpay-order-${draftOrderId}`
      },
      method: "POST"
    });
    return NextResponse.json({ success: true, data, error: null });
  } catch (error) {
    if (error instanceof ShrestaApiError) {
      const response = NextResponse.json({
        success: false,
        data: null,
        error: { code: error.code, message: toShrestaUserMessage(error) }
      }, { status: error.status >= 500 ? 503 : error.status });
      if (shouldClearCustomerSession(error)) {
        response.cookies.delete(CUSTOMER_SESSION_COOKIE);
      }
      return response;
    }

    return NextResponse.json({
      success: false,
      data: null,
      error: { code: "RAZORPAY_CREATE_ORDER_PROXY_FAILED", message: "Couldn't initiate Razorpay checkout right now. Please try again." }
    }, { status: 503 });
  }
}
