import { NextResponse } from "next/server";
import { ShrestaApiError, requestApi } from "@/lib/api-client";

export const dynamic = "force-dynamic";

type CustomerChatResponse = {
  conversationId: string;
  assistantMessage: string;
  quickActions: string[];
  escalationSuggested: boolean;
  timestamp: string;
};

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({
      success: false,
      data: null,
      error: { code: "INVALID_JSON", message: "Chat request body must be valid JSON." }
    }, { status: 400 });
  }

  try {
    const data = await requestApi<CustomerChatResponse>("/api/v1/customer/chat/messages", {
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
        error: { code: error.code, message: error.message }
      }, { status: error.status });
    }

    return NextResponse.json({
      success: false,
      data: null,
      error: { code: "CUSTOMER_CHAT_PROXY_FAILED", message: "SHRESTA Assistant is unavailable." }
    }, { status: 503 });
  }
}
