import { StorefrontUtilityPageExperience } from "@/components/storefront/storefront-browse-experience";
import { StorefrontBackendUnavailable } from "@/components/storefront/storefront-home-experience";
import { fetchStorefrontPageData } from "@/features/storefront/storefront-page-data";

export const dynamic = "force-dynamic";

export default async function CookiesPage() {
  const data = await fetchStorefrontPageData();
  if (!data) {
    return <StorefrontBackendUnavailable />;
  }

  return (
    <StorefrontUtilityPageExperience
      description="Cookies help SHRESTA keep your cart, login, and shopping preferences working smoothly."
      eyebrow="Legal"
      home={data.home}
      panels={[
        { title: "Essential", body: "Essential cookies support security, sessions, cart state, and checkout continuity." },
        { title: "Analytics", body: "Analytics should be opt-in where required and never override customer privacy choices." },
        { title: "Marketing", body: "Marketing cookies are used only where permitted and should respect your communication choices." }
      ]}
      primaryHref="/support"
      primaryLabel="Contact Support"
      title="Cookie Policy"
    />
  );
}
