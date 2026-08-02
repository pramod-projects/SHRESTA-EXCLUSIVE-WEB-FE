import { notFound } from "next/navigation";
import { StorefrontBackendUnavailable } from "@/components/storefront/storefront-home-experience";
import { StorefrontListingExperience } from "@/components/storefront/storefront-browse-experience";
import { fetchStorefrontPageData, findCategoryBySlug, findCollectionBySlug } from "@/features/storefront/storefront-page-data";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function CategoryPage({ params }: PageProps) {
  const data = await fetchStorefrontPageData();
  if (!data) {
    return <StorefrontBackendUnavailable />;
  }

  const { slug } = await params;
  if (!findCategoryBySlug(data.categories, slug) && !findCollectionBySlug(data.home, slug)) {
    notFound();
  }

  return <StorefrontListingExperience categories={data.categories} home={data.home} mode="category" slug={slug} />;
}
