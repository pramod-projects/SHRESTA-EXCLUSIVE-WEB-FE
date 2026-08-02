import { notFound } from "next/navigation";
import { StorefrontUtilityPageExperience } from "@/components/storefront/storefront-browse-experience";
import { StorefrontBackendUnavailable } from "@/components/storefront/storefront-home-experience";
import { fetchStorefrontPageData } from "@/features/storefront/storefront-page-data";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ topic: string }>;
};

const supportTopics: Record<string, { title: string; description: string }> = {
  shipping: {
    title: "Shipping and Delivery",
    description: "Check how SHRESTA handles delivery promises, pickup readiness, and service coverage for your city."
  },
  returns: {
    title: "Returns and Exchanges",
    description: "Understand return windows, exchange support, and what to keep ready when requesting help."
  },
  "size-guide": {
    title: "Size Guide",
    description: "Review fit and sizing guidance for saree drape, blouse pairing, and occasion styling."
  },
  faqs: {
    title: "FAQs",
    description: "Find quick answers for browsing, checkout, delivery, returns, care, and account support."
  }
};

export default async function SupportTopicPage({ params }: PageProps) {
  const data = await fetchStorefrontPageData();
  if (!data) {
    return <StorefrontBackendUnavailable />;
  }

  const { topic } = await params;
  const page = supportTopics[topic];
  if (!page) {
    notFound();
  }

  return (
    <StorefrontUtilityPageExperience
      description={page.description}
      eyebrow="Customer service"
      home={data.home}
      panels={[
        { title: "Quick help", body: "Use this page to understand the next best step before contacting support." },
        { title: "Category aware", body: "Saree guidance stays specific to the weave, drape, and occasion you are shopping." },
        { title: "Order ready", body: "Keep your order number, contact details, and product name ready for faster help." }
      ]}
      primaryHref="/support"
      primaryLabel="Support Home"
      title={page.title}
    />
  );
}
