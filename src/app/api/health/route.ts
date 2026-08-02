import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    service: "shresta-web-fe",
    status: "UP",
    architecture: "nextjs-app-router",
    moneyUnit: "paise",
    serverState: "tanstack-query",
    uiState: "zustand-ui-only",
    timestamp: new Date().toISOString()
  });
}
