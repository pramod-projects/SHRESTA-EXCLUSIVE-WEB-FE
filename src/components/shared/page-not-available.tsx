import Link from "next/link";

type PageNotAvailableProps = {
  eyebrow?: string;
  title?: string;
  description?: string;
};

export function PageNotAvailable({
  eyebrow = "SHRESTA EXCLUSIVE",
  title = "Page is not available",
  description = "This page is not part of the current SHRESTA experience, or the link may have changed."
}: PageNotAvailableProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--shresta-logo-bg)] px-4 text-[var(--shresta-logo-text)]">
      <section className="max-w-xl rounded-lg border border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-surface)] p-8 text-center shadow-[0_20px_70px_rgba(47,33,21,0.18)]">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--gold-400)]">{eyebrow}</p>
        <h1 className="mt-4 font-serif text-4xl font-light text-[var(--shresta-logo-text)]">{title}</h1>
        <p className="mt-4 text-sm leading-6 text-[var(--shresta-logo-muted)]">{description}</p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Link className="admin-button inline-flex items-center justify-center" href="/">
            Go to Home
          </Link>
          <Link className="admin-button secondary inline-flex items-center justify-center" href="/products">
            Browse Products
          </Link>
        </div>
      </section>
    </main>
  );
}
