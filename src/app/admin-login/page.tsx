import { AdminLoginForm } from "@/components/admin/admin-login-form";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminLoginPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const reason = singleParam(params.reason);
  const loggedOut = singleParam(params.loggedOut) === "1";
  const nextPath = normalizeNextPath(singleParam(params.next));

  return (
    <main className="admin-shell min-h-screen px-4 py-10 text-[var(--shresta-logo-text)] sm:px-6 lg:px-8">
      <section className="mx-auto w-full max-w-md rounded-2xl border border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-surface)] p-6 shadow-[0_26px_80px_rgba(0,0,0,0.24)]">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--gold-400)]">SHRESTA Admin</p>
        <h1 className="mt-2 font-serif text-4xl font-light">Please login</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--shresta-logo-muted)]">
          Admin pages are protected. Login once to continue.
        </p>

        {reason === "login_required" ? (
          <p className="mt-4 rounded-lg border border-amber-300/55 bg-amber-100 px-3 py-2 text-sm font-medium text-amber-900">
            Please login to open admin pages.
          </p>
        ) : null}

        {loggedOut ? (
          <p className="mt-4 rounded-lg border border-emerald-300/55 bg-emerald-100 px-3 py-2 text-sm font-medium text-emerald-900">
            Admin session logged out successfully.
          </p>
        ) : null}

        <AdminLoginForm nextPath={nextPath} />
      </section>
    </main>
  );
}

function singleParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

function normalizeNextPath(nextPath: string | undefined): string {
  if (!nextPath || !nextPath.startsWith("/")) {
    return "/admin";
  }
  if (nextPath.startsWith("//") || nextPath.startsWith("/admin-login")) {
    return "/admin";
  }
  return nextPath;
}
