"use client";

import Link from "next/link";

type AppErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function AppErrorPage({ reset }: AppErrorPageProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--wine-950)] px-4 text-[var(--shresta-text-primary)]">
      <section className="max-w-xl rounded-lg border border-[var(--wine-800)] bg-[var(--wine-900)] p-8 text-center shadow-[0_20px_70px_rgba(0,0,0,0.35)]">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--gold-400)]">SHRESTA EXCLUSIVE</p>
        <h1 className="mt-4 font-serif text-4xl font-light text-white">Page could not be loaded</h1>
        <p className="mt-4 text-sm leading-6 text-[var(--shresta-text-secondary)]">
          Something prevented this page from loading. Try again, or return to the shopping experience.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <button className="admin-button inline-flex items-center justify-center" onClick={reset} type="button">
            Try Again
          </button>
          <Link className="admin-button secondary inline-flex items-center justify-center" href="/">
            Go to Home
          </Link>
        </div>
      </section>
    </main>
  );
}
