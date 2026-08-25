import Link from "next/link";
import { adminModuleLabel, allowedRolesForAdminModule, firstAdminPathForRole, isAdminModule, requireAdminSession, type AdminModule } from "@/features/admin/admin-acl";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function queryParam(params: Record<string, string | string[] | undefined> | undefined, key: string): string | undefined {
  const value = params?.[key];
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

export default async function AdminAccessDeniedPage({ searchParams }: PageProps) {
  const session = await requireAdminSession();
  const params = await searchParams;
  const moduleParam = queryParam(params, "module");
  const from = queryParam(params, "from") ?? "/admin";
  const fallback = queryParam(params, "fallback") ?? firstAdminPathForRole(session.role);
  const blockedModule: AdminModule | null = isAdminModule(moduleParam) ? moduleParam : null;
  const moduleLabel = blockedModule ? adminModuleLabel(blockedModule) : "this section";
  const allowedRoles = blockedModule ? allowedRolesForAdminModule(blockedModule) : [];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="border-b border-[var(--shresta-logo-border)] pb-5">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--gold-400)]">Admin Access Control</p>
        <h1 className="mt-2 font-serif text-4xl font-light text-[var(--shresta-logo-text)]">Access denied</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--shresta-logo-muted)]">
          This role does not have access to this panel.
          {" "}You are signed in as <span className="font-semibold text-[var(--shresta-logo-text)]">{session.role}</span>,
          and <span className="font-semibold text-[var(--shresta-logo-text)]">{moduleLabel}</span> is not allowed for this role.
          {" "}Please sign in with an admin account that has the required access.
        </p>
      </header>

      <section className="admin-panel rounded-lg p-4 text-sm">
        <p><span className="font-semibold text-[var(--shresta-logo-text)]">Signed in role:</span> <span className="text-[var(--gold-600)]">{session.role}</span></p>
        <p className="mt-2"><span className="font-semibold text-[var(--shresta-logo-text)]">Requested path:</span> <span className="text-[var(--shresta-logo-muted)]">{from}</span></p>
      </section>

      {blockedModule ? (
        <section className="admin-panel rounded-lg p-4 text-sm">
          <p className="font-semibold text-[var(--shresta-logo-text)]">Who can access {moduleLabel}</p>
          <p className="mt-1 text-[var(--shresta-logo-muted)]">Use one of the roles below to open this module.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {allowedRoles.map((role) => (
              <span className="rounded-full border border-[var(--shresta-logo-border)] bg-[rgba(212,175,55,0.08)] px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-[var(--gold-600)]" key={role}>{role}</span>
            ))}
          </div>
        </section>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Link className="admin-button" href={fallback}>Go to allowed section</Link>
        <Link className="admin-button secondary" href="/admin-login?reason=login_required">Login with different admin</Link>
      </div>
    </div>
  );
}
