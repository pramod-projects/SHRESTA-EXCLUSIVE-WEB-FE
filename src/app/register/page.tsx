import { CustomerRegisterExperience } from "@/components/storefront/customer-register-experience";
import { StorefrontBackendUnavailable, StorefrontPageChrome } from "@/components/storefront/storefront-home-experience";
import { fetchStorefrontPageData } from "@/features/storefront/storefront-page-data";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function RegisterPage({ searchParams }: PageProps) {
  const [data, params] = await Promise.all([fetchStorefrontPageData(), searchParams]);
  if (!data) {
    return <StorefrontBackendUnavailable />;
  }
  const next = stringParam(params, "next") ?? "/account";

  return (
    <StorefrontPageChrome home={data.home}>
      <CustomerRegisterExperience nextPath={safeNextPath(next)} />
    </StorefrontPageChrome>
  );
}

function stringParam(params: Record<string, string | string[] | undefined> | undefined, key: string): string | undefined {
  const value = params?.[key];
  return Array.isArray(value) ? value[0] : value;
}

function safeNextPath(value: string): string {
  return value.startsWith("/") && !value.startsWith("//") ? value : "/account";
}
