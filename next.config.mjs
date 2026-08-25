import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(fileURLToPath(import.meta.url));
const environmentMode = (process.env.SHRESTA_ENVIRONMENT_MODE ?? "DEV").trim().toUpperCase();
if (!["DEV", "UAT", "PROD"].includes(environmentMode)) {
  throw new Error("SHRESTA_ENVIRONMENT_MODE must be DEV, UAT, or PROD");
}

validateDeploymentEnvironment(environmentMode);

// This is the public read origin, not the private R2 API endpoint or an R2 credential.
const mediaBaseUrl = new URL(process.env.NEXT_PUBLIC_MEDIA_BASE_URL ?? "http://localhost:9010");
const isDevelopmentMode = environmentMode === "DEV";

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    // Keeps Turbopack resolution scoped to this repository in the multi-repo workspace.
    root: projectRoot
  },
  // Allows local HMR; Cloudflare exposure is backend-only.
  allowedDevOrigins: ["127.0.0.1"],
  poweredByHeader: false,
  reactStrictMode: true,
  experimental: {
    serverActions: {
      // Covers metadata forms only. Media bytes bypass Next and upload directly to R2/MinIO.
      bodySizeLimit: "20mb"
    }
  },
  images: {
    // Current mode: serve the canonical object unchanged. Cloudflare resizing may be enabled later.
    unoptimized: true,
    // Next blocks private IP image fetches by default. DEV needs this for local MinIO only.
    dangerouslyAllowLocalIP: isDevelopmentMode,
    // Restricts next/image sources to the configured canonical public media origin.
    remotePatterns: [
      {
        protocol: mediaBaseUrl.protocol.replace(":", ""),
        hostname: mediaBaseUrl.hostname,
        port: mediaBaseUrl.port,
        pathname: "/**"
      }
    ]
  },
  async rewrites() {
    if (!isDevelopmentMode) return [];
    return [
      {
        source: "/shresta-local-assets/:path*",
        destination: `${mediaBaseUrl.origin}/shresta-local-assets/:path*`
      }
    ];
  },
  async headers() {
    // Baseline response hardening for every application route.
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" }
        ]
      }
    ];
  }
};

export default nextConfig;

function validateDeploymentEnvironment(mode) {
  if (mode === "DEV") return;

  const expected = mode === "UAT"
    ? {
        storefront: "https://uat.shrestaexclusive.com",
        admin: "https://uat-admin.shrestaexclusive.com",
        api: "https://uat-api.shrestaexclusive.com"
      }
    : {
        storefront: "https://shrestaexclusive.com",
        admin: "https://admin.shrestaexclusive.com",
        api: "https://api.shrestaexclusive.com"
      };

  requireExact("NEXT_PUBLIC_STOREFRONT_URL", expected.storefront, mode);
  requireExact("NEXT_PUBLIC_ADMIN_URL", expected.admin, mode);
  requireExact("SHRESTA_API_BASE_URL", expected.api, mode);
  requireExact("NEXT_PUBLIC_API_BASE_URL", expected.api, mode);
  requireSecret("SHRESTA_ADMIN_API_KEY");
  requireSecret("SHRESTA_ADMIN_SESSION_SECRET");

  const mediaUrl = requireSecret("NEXT_PUBLIC_MEDIA_BASE_URL");
  if (!mediaUrl.startsWith("https://") || mediaUrl.includes("YOUR_") || mediaUrl.includes("r2.cloudflarestorage.com")) {
    throw new Error("NEXT_PUBLIC_MEDIA_BASE_URL must be the HTTPS Cloudflare custom media domain");
  }
}

function requireExact(name, expected, mode) {
  if (process.env[name]?.trim() !== expected) {
    throw new Error(`${name} must be ${expected} for ${mode}`);
  }
}

function requireSecret(name) {
  const value = process.env[name]?.trim();
  if (!value || value.includes("YOUR_") || value.includes("change-me")) {
    throw new Error(`${name} must be configured with a non-placeholder value`);
  }
  return value;
}
