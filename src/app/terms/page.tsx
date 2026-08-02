import { StorefrontUtilityPageExperience } from "@/components/storefront/storefront-browse-experience";
import { StorefrontBackendUnavailable } from "@/components/storefront/storefront-home-experience";
import { fetchStorefrontPageData } from "@/features/storefront/storefront-page-data";

export const dynamic = "force-dynamic";

export default async function TermsPage() {
  const data = await fetchStorefrontPageData();
  if (!data) {
    return <StorefrontBackendUnavailable />;
  }

  return (
    <StorefrontUtilityPageExperience
      description="These terms outline how SHRESTA EXCLUSIVE orders, deliveries, returns, and customer support are handled."
      eyebrow="Legal"
      home={data.home}
      panels={[
        { title: "Orders", body: "Order confirmation, cancellation, refund, and payment timelines are shown during checkout and order tracking." },
        { title: "Catalog", body: "Product prices, images, and category details may change as SHRESTA refreshes availability and catalog quality." },
        { title: "Service", body: "Delivery promises and customer support commitments are based on SHRESTA service coverage, store capacity, and local availability." }
      ]}
      primaryHref="/products"
      primaryLabel="Continue Shopping"
      title="Terms of Service"
    />
  );
}
