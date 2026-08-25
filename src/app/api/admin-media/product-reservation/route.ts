import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { reserveProductMedia } from "@/features/admin/admin-api";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from "@/features/admin/admin-auth";
import { mediaRouteError } from "../media-route-error";

export async function POST(request: Request) {
  const session = verifyAdminSessionToken(cookieValue(request.headers.get("cookie"), ADMIN_SESSION_COOKIE));
  if (!session) {
    return NextResponse.json({ error: "Admin login is required" }, { status: 401 });
  }
  try {
    const reservation = await reserveProductMedia({ idempotencyKey: randomUUID() });
    return NextResponse.json(reservation, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return mediaRouteError(error, "Product media reservation failed");
  }
}

function cookieValue(header: string | null, name: string): string | undefined {
  return header?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`))?.slice(name.length + 1);
}
