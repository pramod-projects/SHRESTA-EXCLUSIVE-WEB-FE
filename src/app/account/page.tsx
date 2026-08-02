import { CustomerAccountExperience } from "@/components/storefront/customer-account-experience";
import { StorefrontBackendUnavailable } from "@/components/storefront/storefront-home-experience";
import { fetchStorefrontPageData } from "@/features/storefront/storefront-page-data";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const data = await fetchStorefrontPageData();
  if (!data) {
    return <StorefrontBackendUnavailable />;
  }

  return <CustomerAccountExperience home={data.home} />;
}
