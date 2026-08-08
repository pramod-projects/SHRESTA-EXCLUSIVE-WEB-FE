"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, KeyRound, LogIn, Mail, ShieldCheck, ShoppingBag, type LucideIcon } from "lucide-react";
import { submitCustomerLogin } from "@/features/auth/customer-session";
import { INPUT_PATTERNS } from "@/lib/input-patterns";

type CustomerLoginExperienceProps = {
  nextPath: string;
};

export function CustomerLoginExperience({ nextPath }: CustomerLoginExperienceProps) {
  const router = useRouter();
  const [identity, setIdentity] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setSubmitting] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    const result = await submitCustomerLogin(identity, otp);
    setSubmitting(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    router.push(nextPath);
  }

  return (
    <section className="bg-[var(--shresta-logo-bg)] px-4 py-12 sm:px-6 lg:py-16">
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[minmax(0,1fr)_460px] lg:items-center">
        <div className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--gold-400)]">Customer Login</p>
          <h1 className="mt-4 font-serif text-5xl font-light leading-tight text-[var(--shresta-logo-text)] md:text-6xl">
            Sign in only when you are ready to confirm.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--shresta-logo-muted)]">
            Browse freely, keep your cart intact, then verify your email before the final payment step. Your SHRESTA bag stays saved when you return from login.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <LoginPromise icon={ShoppingBag} label="Cart preserved" />
            <LoginPromise icon={ShieldCheck} label="OTP verified" />
            <LoginPromise icon={KeyRound} label="Checkout unlocked" />
          </div>
        </div>

        <form className="rounded-2xl border border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-surface)] p-5 shadow-[0_24px_60px_rgba(47,33,21,0.14)] sm:p-6" noValidate onSubmit={submit}>
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[rgba(212,175,55,0.24)] bg-[rgba(212,175,55,0.12)] text-[var(--gold-600)] shadow-[0_10px_26px_rgba(47,33,21,0.12)]">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-serif text-2xl font-light leading-tight text-[var(--shresta-logo-text)] sm:text-3xl">Continue securely</h2>
              <p className="mt-1 text-sm leading-6 text-[var(--shresta-logo-muted)]">
                Use the OTP sent to your verified email or mobile channel.
              </p>
            </div>
          </div>

          <label className="mt-6 grid gap-2 text-[0.7rem] font-extrabold uppercase tracking-[0.16em] text-[var(--shresta-logo-muted)]">
            Email or mobile number
            <input
              autoComplete="username"
              className="customer-login-input"
              name="identity"
              onChange={(event) => setIdentity(event.target.value)}
              pattern={INPUT_PATTERNS.loginIdentity}
              placeholder="testuser@gmail.com"
              required
              value={identity}
            />
          </label>
          <label className="mt-4 grid gap-2 text-[0.7rem] font-extrabold uppercase tracking-[0.16em] text-[var(--shresta-logo-muted)]">
            One-time code
            <input
              autoComplete="one-time-code"
              className="customer-login-input font-mono"
              inputMode="numeric"
              maxLength={6}
              minLength={6}
              name="otp"
              onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
              pattern={INPUT_PATTERNS.otpSixDigits}
              placeholder="123456"
              required
              value={otp}
            />
          </label>

          {error ? (
            <div className="mt-4 rounded-lg border border-rose-400/35 bg-rose-100 px-3 py-2 text-sm leading-6 text-rose-700">
              {error}
            </div>
          ) : null}

          <button
            className="group relative mt-6 flex min-h-12 w-full items-center justify-between overflow-hidden rounded-xl border border-[rgba(255,245,194,0.18)] bg-[linear-gradient(135deg,#f1d875_0%,#d4af37_48%,#a97818_100%)] px-4 text-[var(--wine-950)] shadow-[0_16px_38px_rgba(212,175,55,0.24)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_48px_rgba(212,175,55,0.32)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(241,216,117,0.55)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
            disabled={isSubmitting}
            type="submit"
          >
            <span className="pointer-events-none absolute inset-y-0 -left-20 w-20 rotate-12 bg-[rgba(253,246,235,0.35)] blur-xl transition duration-700 group-hover:left-[120%]" />
            <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-[var(--shresta-logo-surface)] text-[var(--wine-950)]">
              <LogIn className="h-4 w-4" />
            </span>
            <span className="relative flex-1 text-center text-sm font-black tracking-[0.01em]">
              {isSubmitting ? "Verifying secure session..." : "Login and Continue"}
            </span>
            <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-[var(--shresta-logo-surface)] transition duration-300 group-hover:translate-x-0.5">
              <ArrowRight className="h-4 w-4" />
            </span>
          </button>
          <Link
            className="mt-3 inline-flex min-h-10 w-full items-center justify-center rounded-xl border border-[rgba(212,175,55,0.35)] bg-[var(--shresta-logo-surface)] px-4 text-sm font-semibold text-[var(--gold-700)] transition hover:border-[rgba(212,175,55,0.7)] hover:bg-[rgba(212,175,55,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(241,216,117,0.35)]"
            href={`/register?next=${encodeURIComponent(nextPath)}`}
          >
            Create new account
          </Link>
          <p className="mt-4 text-center text-xs leading-5 text-[var(--shresta-logo-muted)]">
            Want to keep exploring? <Link className="font-semibold text-[var(--gold-600)] hover:text-[var(--gold-500)]" href="/products">Return to products</Link>
          </p>
        </form>
      </div>
    </section>
  );
}

function LoginPromise({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <div className="flex min-h-14 items-center gap-3 rounded-lg border border-[rgba(212,175,55,0.22)] bg-[rgba(212,175,55,0.08)] px-4 text-sm font-semibold text-[var(--shresta-logo-text)]">
      <Icon className="h-4 w-4 text-[var(--gold-600)]" />
      {label}
    </div>
  );
}
