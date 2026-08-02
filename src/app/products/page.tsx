import { StorefrontBackendUnavailable } from "@/components/storefront/storefront-home-experience";
import { StorefrontListingExperience } from "@/components/storefront/storefront-browse-experience";
import { fetchStorefrontPageData } from "@/features/storefront/storefront-page-data";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ProductsPage({ searchParams }: PageProps) {
  const data = await fetchStorefrontPageData();
  if (!data) {
    return <StorefrontBackendUnavailable />;
  }

  const params = await searchParams;
  return (
    <StorefrontListingExperience
      categories={data.categories}
      home={data.home}
      mode="all"
      query={stringParam(params, "query") ?? stringParam(params, "occasion")}
    />
  );
}

function stringParam(params: Record<string, string | string[] | undefined> | undefined, key: string): string | undefined {
  const value = params?.[key];
  return Array.isArray(value) ? value[0] : value;
}
