import type { NextRequest } from "next/server";

const DEFAULT_MEDIA_ORIGIN = "http://localhost:9010";

export async function GET(request: NextRequest, context: { params: Promise<{ assetPath: string[] }> }) {
  const { assetPath: segments } = await context.params;
  const assetPath = segments?.join("/");
  if (!assetPath) {
    return new Response("Missing media path", { status: 400 });
  }

  const origin = normalizeOrigin(
    process.env.SHRESTA_MEDIA_PROXY_ORIGIN
      ?? process.env.NEXT_PUBLIC_MEDIA_PROXY_ORIGIN
      ?? DEFAULT_MEDIA_ORIGIN
  );

  const upstreamUrl = new URL(assetPath, `${origin}/`);
  upstreamUrl.search = request.nextUrl.search;

  let upstream: Response;
  try {
    upstream = await fetch(upstreamUrl, {
      cache: "no-store",
      redirect: "follow"
    });
  } catch {
    return new Response("Media upstream unavailable", { status: 502 });
  }

  if (!upstream.ok) {
    return new Response("Media not found", { status: upstream.status });
  }

  const headers = new Headers();
  copyHeader(upstream.headers, headers, "content-type");
  copyHeader(upstream.headers, headers, "cache-control");
  copyHeader(upstream.headers, headers, "etag");
  copyHeader(upstream.headers, headers, "last-modified");
  copyHeader(upstream.headers, headers, "content-length");

  return new Response(upstream.body, {
    status: upstream.status,
    headers
  });
}

function normalizeOrigin(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function copyHeader(from: Headers, to: Headers, key: string) {
  const value = from.get(key);
  if (value) {
    to.set(key, value);
  }
}
