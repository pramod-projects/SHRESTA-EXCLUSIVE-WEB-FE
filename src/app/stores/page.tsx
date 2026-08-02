import { StorefrontStoresExperience } from "@/components/storefront/storefront-browse-experience";
import { StorefrontBackendUnavailable } from "@/components/storefront/storefront-home-experience";
import { fetchStorefrontStoresPageData } from "@/features/storefront/storefront-page-data";

export const dynamic = "force-dynamic";

export default async function StoresPage() {
  const data = await fetchStorefrontStoresPageData();
  if (!data) {
    return <StorefrontBackendUnavailable />;
  }

  return <StorefrontStoresExperience home={data.home} stores={data.stores} />;
}
