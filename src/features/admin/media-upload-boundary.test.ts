import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("direct media upload boundary", () => {
  it("keeps Next API routes JSON-only and sends bytes directly to the presigned URL", () => {
    const authorizeRoute = source("src/app/api/admin-media/authorize/route.ts");
    const completeRoute = source("src/app/api/admin-media/complete/route.ts");
    const browserUpload = source("src/features/admin/media-upload.ts");

    for (const route of [authorizeRoute, completeRoute]) {
      expect(route).not.toMatch(/\.formData\(|\.arrayBuffer\(|\.blob\(|ReadableStream|FormData/);
      expect(route).toContain("request.json()");
    }

    expect(browserUpload).toContain('request.open("PUT", authorization.uploadUrl)');
    expect(browserUpload).toContain("request.send(file)");
    expect(browserUpload).toContain('postJson<AssetResponse>("/api/admin-media/complete"');
    expect(browserUpload).toContain("mediaId: authorization.mediaId");
  });

  it("keeps Cloudflare and Next.js image resizing disabled in the current mode", () => {
    const nextConfig = source("next.config.mjs");
    const responsiveMedia = source("src/components/storefront/responsive-media.tsx");
    const runtimeSource = `${nextConfig}\n${responsiveMedia}`;

    expect(nextConfig).toMatch(/images:\s*\{[\s\S]*?unoptimized:\s*true/);
    expect(responsiveMedia).toContain("unoptimized");
    expect(runtimeSource).not.toMatch(/cdn-cgi\/image|loader:\s*["']?cloudflare/i);
  });

  it("proxies same-origin DEV media paths to local MinIO", () => {
    const nextConfig = source("next.config.mjs");

    expect(nextConfig).toContain('source: "/shresta-local-assets/:path*"');
    expect(nextConfig).toContain('destination: `${mediaBaseUrl.origin}/shresta-local-assets/:path*`');
  });
});

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}