import { NextResponse } from "next/server";
import { deploymentMode } from "@/lib/environment-mode";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    service: "shresta-web-fe",
    status: "UP",
    environmentMode: deploymentMode(),
    architecture: "nextjs-app-router",
    moneyUnit: "paise",
    serverState: "tanstack-query",
    uiState: "zustand-ui-only",
    timestamp: new Date().toISOString()
  });
}
