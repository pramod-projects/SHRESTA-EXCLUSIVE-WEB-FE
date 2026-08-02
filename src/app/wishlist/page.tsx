import { StorefrontWishlistExperience } from "@/components/storefront/storefront-cart-experience";
import { StorefrontBackendUnavailable } from "@/components/storefront/storefront-home-experience";
import { fetchStorefrontPageData } from "@/features/storefront/storefront-page-data";

export const dynamic = "force-dynamic";

export default async function WishlistPage() {
  const data = await fetchStorefrontPageData();
  if (!data) {
    return <StorefrontBackendUnavailable />;
  }

  return <StorefrontWishlistExperience home={data.home} products={data.home.bestsellers} />;
}
