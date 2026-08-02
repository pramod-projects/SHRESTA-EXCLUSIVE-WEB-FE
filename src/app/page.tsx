import { StorefrontBackendUnavailable, StorefrontHomeExperience } from "@/components/storefront/storefront-home-experience";
import { fetchStorefrontHome, type StorefrontHome } from "@/features/storefront/storefront-home";
import { nullWhenShrestaApiUnavailable } from "@/lib/api-page-fallback";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const home = await loadStorefrontHome();
  if (!home) {
    return <StorefrontBackendUnavailable />;
  }

  return <StorefrontHomeExperience home={home} />;
}

async function loadStorefrontHome(): Promise<StorefrontHome | null> {
  return nullWhenShrestaApiUnavailable(async () => {
    return await fetchStorefrontHome({
      apiBaseUrl: process.env.SHRESTA_API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8090"
    });
  });
}
