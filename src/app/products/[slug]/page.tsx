import { notFound } from "next/navigation";
import { StorefrontBackendUnavailable } from "@/components/storefront/storefront-home-experience";
import { StorefrontProductDetailExperience } from "@/components/storefront/storefront-browse-experience";
import { fetchStorefrontPageData, findProductBySlug, relatedProducts } from "@/features/storefront/storefront-page-data";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function ProductDetailPage({ params }: PageProps) {
  const data = await fetchStorefrontPageData();
  if (!data) {
    return <StorefrontBackendUnavailable />;
  }

  const { slug } = await params;
  const product = findProductBySlug(data.home, slug);
  if (!product) {
    notFound();
  }

  return (
    <StorefrontProductDetailExperience
      categories={data.categories}
      home={data.home}
      product={product}
      related={relatedProducts(data.home, product)}
    />
  );
}
