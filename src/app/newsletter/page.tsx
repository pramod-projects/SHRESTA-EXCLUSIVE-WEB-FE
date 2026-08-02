import { StorefrontUtilityPageExperience } from "@/components/storefront/storefront-browse-experience";
import { StorefrontBackendUnavailable } from "@/components/storefront/storefront-home-experience";
import { fetchStorefrontPageData } from "@/features/storefront/storefront-page-data";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function NewsletterPage({ searchParams }: PageProps) {
  const data = await fetchStorefrontPageData();
  if (!data) {
    return <StorefrontBackendUnavailable />;
  }

  const params = await searchParams;
  const email = stringParam(params, "email");

  return (
    <StorefrontUtilityPageExperience
      description={email ? `Thanks, ${email}. We will use this address only for SHRESTA updates you choose to receive.` : "Join the SHRESTA EXCLUSIVE list for launch notes, styling edits, and category drops."}
      eyebrow="Newsletter"
      home={data.home}
      panels={[
        { title: "Consent first", body: "You stay in control of the updates and offers you receive from SHRESTA." },
        { title: "Preference center", body: "Choose the saree edits and offers you care about most." },
        { title: "Useful updates", body: "Expect collection drops, styling edits, care notes, and occasion-ready shopping reminders." }
      ]}
      primaryHref="/products"
      primaryLabel="Shop New Arrivals"
      title={email ? "Subscription Request Received" : data.home.newsletter.title}
    />
  );
}

function stringParam(params: Record<string, string | string[] | undefined> | undefined, key: string): string | undefined {
  const value = params?.[key];
  return Array.isArray(value) ? value[0] : value;
}
