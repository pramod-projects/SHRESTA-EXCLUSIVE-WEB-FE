import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { CUSTOMER_SESSION_COOKIE } from "@/features/auth/session-cookie";
import { ShrestaApiError, requestApi, toShrestaUserMessage } from "@/lib/api-client";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ orderNumber: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const sessionToken = (await cookies()).get(CUSTOMER_SESSION_COOKIE)?.value;
  if (!sessionToken) {
    return NextResponse.json({
      success: false,
      data: null,
      error: { code: "CUSTOMER_UNAUTHENTICATED", message: "Login is required to cancel an order." }
    }, { status: 401 });
  }

  const idempotencyKey = request.headers.get("Idempotency-Key")?.trim();
  if (!idempotencyKey) {
    return NextResponse.json({
      success: false,
      data: null,
      error: { code: "IDEMPOTENCY_KEY_REQUIRED", message: "Idempotency-Key is required for cancellation." }
    }, { status: 400 });
  }

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const { orderNumber } = await context.params;

  try {
    const data = await requestApi<Record<string, unknown>>(`/api/v1/customer/orders/${encodeURIComponent(orderNumber)}/cancel` as `/${string}`, {
      apiBaseUrl: process.env.SHRESTA_API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8090",
      body: body as Record<string, unknown>,
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${sessionToken}`,
        "Idempotency-Key": idempotencyKey
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
      if (error.status === 401) {
        response.cookies.delete(CUSTOMER_SESSION_COOKIE);
      }
      return response;
    }

    return NextResponse.json({
      success: false,
      data: null,
      error: { code: "CUSTOMER_ORDER_CANCEL_PROXY_FAILED", message: "We couldn't cancel this order right now. Please try again shortly." }
    }, { status: 503 });
  }
}
