import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { CUSTOMER_SESSION_COOKIE } from "@/features/auth/session-cookie";
import { ShrestaApiError, requestApi, toShrestaUserMessage } from "@/lib/api-client";

export const dynamic = "force-dynamic";

function shouldClearCustomerSession(error: ShrestaApiError): boolean {
  return error.status === 401 && error.code.startsWith("CUSTOMER_");
}

export async function POST(
  request: Request,
  context: { params: Promise<{ draftOrderId: string }> }
) {
  const sessionToken = (await cookies()).get(CUSTOMER_SESSION_COOKIE)?.value;
  if (!sessionToken) {
    return NextResponse.json({
      success: false,
      data: null,
      error: { code: "CUSTOMER_UNAUTHENTICATED", message: "Login is required before reporting payment status." }
    }, { status: 401 });
  }

  const { draftOrderId } = await context.params;
  if (!draftOrderId?.trim()) {
    return NextResponse.json({
      success: false,
      data: null,
      error: { code: "INVALID_DRAFT_ORDER_ID", message: "Checkout order ID is required to report payment status." }
    }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({
      success: false,
      data: null,
      error: { code: "INVALID_JSON", message: "We couldn't read your payment status payload. Please try again." }
    }, { status: 400 });
  }

  try {
    const data = await requestApi<Record<string, unknown>>(`/api/v1/customer/orders/draft/${encodeURIComponent(draftOrderId)}/payment-failed`, {
      apiBaseUrl: process.env.SHRESTA_API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8090",
      body: body as Record<string, unknown>,
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${sessionToken}`
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
      error: { code: "CUSTOMER_ORDER_DRAFT_PAYMENT_STATUS_PROXY_FAILED", message: "Couldn't report payment status right now. Please try again." }
    }, { status: 503 });
  }
}
