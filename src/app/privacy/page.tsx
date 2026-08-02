import { StorefrontUtilityPageExperience } from "@/components/storefront/storefront-browse-experience";
import { StorefrontBackendUnavailable } from "@/components/storefront/storefront-home-experience";
import { fetchStorefrontPageData } from "@/features/storefront/storefront-page-data";

export const dynamic = "force-dynamic";

export default async function PrivacyPage() {
  const data = await fetchStorefrontPageData();
  if (!data) {
    return <StorefrontBackendUnavailable />;
  }

  return (
    <StorefrontUtilityPageExperience
      description="We keep customer information limited to what SHRESTA needs for checkout, delivery, payments, fraud controls, and support."
      eyebrow="Legal"
      home={data.home}
      panels={[
        { title: "Data minimization", body: "Collect only the customer data required for fulfillment, payments, fraud controls, and support." },
        { title: "Consent", body: "Marketing, analytics, and communication preferences stay clear, optional, and easy to review." },
        { title: "Retention", body: "Customer information is kept only for as long as it is needed for shopping, service, safety, and legal requirements." }
      ]}
      primaryHref="/support"
      primaryLabel="Contact Support"
      title="Privacy Policy"
    />
  );
}
