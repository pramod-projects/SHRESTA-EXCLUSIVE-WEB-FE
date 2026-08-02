import { StorefrontCollectionsExperience } from "@/components/storefront/storefront-browse-experience";
import { StorefrontBackendUnavailable } from "@/components/storefront/storefront-home-experience";
import { fetchStorefrontPageData } from "@/features/storefront/storefront-page-data";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const data = await fetchStorefrontPageData();
  if (!data) {
    return <StorefrontBackendUnavailable />;
  }

  return <StorefrontCollectionsExperience categories={data.categories} home={data.home} surface="categories" />;
}
