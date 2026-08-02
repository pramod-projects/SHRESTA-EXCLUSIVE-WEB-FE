import { StorefrontCartExperience } from "@/components/storefront/storefront-cart-experience";
import { StorefrontBackendUnavailable } from "@/components/storefront/storefront-home-experience";
import { fetchStorefrontPageData } from "@/features/storefront/storefront-page-data";

export const dynamic = "force-dynamic";

export default async function CartPage() {
  const data = await fetchStorefrontPageData();
  if (!data) {
    return <StorefrontBackendUnavailable />;
  }

  return <StorefrontCartExperience home={data.home} products={data.home.bestsellers} />;
}
