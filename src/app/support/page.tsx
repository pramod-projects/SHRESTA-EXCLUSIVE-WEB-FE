import { StorefrontUtilityPageExperience } from "@/components/storefront/storefront-browse-experience";
import { StorefrontBackendUnavailable } from "@/components/storefront/storefront-home-experience";
import { fetchStorefrontPageData } from "@/features/storefront/storefront-page-data";

export const dynamic = "force-dynamic";

export default async function SupportPage() {
  const data = await fetchStorefrontPageData();
  if (!data) {
    return <StorefrontBackendUnavailable />;
  }

  return (
    <StorefrontUtilityPageExperience
      description="Support for product discovery, delivery questions, care guidance, returns, exchanges, and SHRESTA account help."
      eyebrow="Customer service"
      home={data.home}
      panels={[
        { title: "Contact", body: "Use support@shrestaexclusive.com for customer care while SHRESTA support tooling expands." },
        { title: "Shipping", body: "Review delivery coverage, pickup options, and order readiness before checkout." },
        { title: "Care", body: "Get care guidance for saree drape storage, weave maintenance, and festive wear upkeep." }
      ]}
      primaryHref="/products"
      primaryLabel="Back to Shopping"
      title="How can we help?"
    />
  );
}
