import { NextResponse } from "next/server";
import { ShrestaApiError, ShrestaApiUnavailableError } from "@/lib/api-client";

export function mediaRouteError(error: unknown, fallbackMessage: string): NextResponse {
  if (error instanceof ShrestaApiError) {
    return NextResponse.json(
      { error: error.message, code: error.code, traceId: error.traceId },
      { status: error.status },
    );
  }
  if (error instanceof ShrestaApiUnavailableError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.status ?? 503 },
    );
  }
  return NextResponse.json(
    { error: error instanceof Error ? error.message : fallbackMessage },
    { status: 400 },
  );
}
