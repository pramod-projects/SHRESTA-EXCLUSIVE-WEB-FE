import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { completeAdminMediaUpload } from "@/features/admin/admin-api";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from "@/features/admin/admin-auth";
import { mediaRouteError } from "../media-route-error";

export async function POST(request: Request) {
  const session = verifyAdminSessionToken(cookieValue(request.headers.get("cookie"), ADMIN_SESSION_COOKIE));
  if (!session) {
    return NextResponse.json({ error: "Admin login is required" }, { status: 401 });
  }
  try {
    const payload = await request.json() as { mediaId?: string };
    if (!payload.mediaId) {
      return NextResponse.json({ error: "mediaId is required" }, { status: 400 });
    }
    const asset = await completeAdminMediaUpload(payload.mediaId, { idempotencyKey: randomUUID() });
    return NextResponse.json(asset, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return mediaRouteError(error, "Upload completion failed");
  }
}

function cookieValue(header: string | null, name: string): string | undefined {
  return header?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`))?.slice(name.length + 1);
}
