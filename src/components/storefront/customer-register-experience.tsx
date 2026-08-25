"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, RefreshCw } from "lucide-react";
import { submitCustomerRegistration } from "@/features/auth/customer-session";
import { INPUT_PATTERNS } from "@/lib/input-patterns";

type CustomerRegisterExperienceProps = {
  nextPath: string;
};

export function CustomerRegisterExperience({ nextPath }: CustomerRegisterExperienceProps) {
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [otpRequested, setOtpRequested] = useState(false);
  const [lockedEmail, setLockedEmail] = useState<string | null>(null);
  const [lockedMobile, setLockedMobile] = useState<string | null>(null);
  const [resendSeconds, setResendSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setSubmitting] = useState(false);
  const loginHref = useMemo(() => `/login?next=${encodeURIComponent(nextPath)}`, [nextPath]);

  useEffect(() => {
    if (resendSeconds <= 0) {
      return;
    }
    const timer = window.setInterval(() => setResendSeconds((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [resendSeconds]);

  function resetOtpVerificationStep() {
    setOtpRequested(false);
    setOtp("");
    setLockedEmail(null);
    setLockedMobile(null);
    setResendSeconds(0);
    setError(null);
    setSuccessMessage(null);
  }

  async function submitRegistration(includeOtp: boolean) {
    setError(null);
    setSuccessMessage(null);
    setSubmitting(true);

    const activeEmail = otpRequested ? (lockedEmail ?? email) : email;
    const activeMobile = otpRequested ? (lockedMobile ?? mobile) : mobile;
    const result = await submitCustomerRegistration(
      firstName,
      middleName,
      lastName,
      activeEmail,
      activeMobile,
      includeOtp ? otp : undefined
    );

    setSubmitting(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }

    if (result.account.registrationStatus === "OTP_SENT") {
      setOtpRequested(true);
      setLockedEmail(result.account.identityEmail);
      setLockedMobile(result.account.identityMobile);
      setOtp("");
      setResendSeconds(60);
      setSuccessMessage("OTP sent to your email and mobile. It is valid for 10 minutes. Enter the code to complete account creation.");
      return;
    }

    setSuccessMessage(`Account created for ${result.account.identityEmail}. You can now log in and continue.`);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitRegistration(otpRequested);
  }

  return (
    <section className="bg-[var(--shresta-logo-bg)] px-4 py-12 sm:px-6 lg:py-16">
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[minmax(0,1fr)_460px] lg:items-center">
        <div className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--gold-400)]">New Customer</p>
          <h1 className="mt-4 font-serif text-5xl font-light leading-tight text-[var(--shresta-logo-text)] md:text-6xl">
            Create your SHRESTA account.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--shresta-logo-muted)]">
            First name, last name, email, and mobile number are required. Middle name is optional. We will verify your email and mobile with one OTP.
          </p>
          <Link className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[var(--gold-600)] transition hover:text-[var(--gold-500)]" href={loginHref}>
            <ArrowLeft className="h-4 w-4" />
            Back to login
          </Link>
        </div>

        <form className="rounded-2xl border border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-surface)] p-5 shadow-[0_24px_60px_rgba(47,33,21,0.14)] sm:p-6" noValidate onSubmit={submit}>
          <h2 className="font-serif text-2xl font-light leading-tight text-[var(--shresta-logo-text)] sm:text-3xl">Register now</h2>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <RegistrationField label="First name" required>
              <input autoComplete="given-name" className="customer-login-input" disabled={otpRequested} name="registration-first-name" onChange={(event) => setFirstName(event.target.value)} pattern={INPUT_PATTERNS.personName} placeholder="First name" required value={firstName} />
            </RegistrationField>
            <RegistrationField label="Last name" required>
              <input autoComplete="family-name" className="customer-login-input" disabled={otpRequested} name="registration-last-name" onChange={(event) => setLastName(event.target.value)} pattern={INPUT_PATTERNS.personName} placeholder="Last name" required value={lastName} />
            </RegistrationField>
          </div>

          <RegistrationField className="mt-4" label="Middle name" optional>
            <input autoComplete="additional-name" className="customer-login-input" disabled={otpRequested} name="registration-middle-name" onChange={(event) => setMiddleName(event.target.value)} pattern={INPUT_PATTERNS.personName} placeholder="Middle name" value={middleName} />
          </RegistrationField>

          <RegistrationField className="mt-4" label="Email" required>
            <input autoComplete="email" className="customer-login-input" disabled={otpRequested} name="registration-email" onChange={(event) => setEmail(event.target.value)} pattern={INPUT_PATTERNS.email} placeholder="you@example.com" required type="email" value={email} />
          </RegistrationField>

          <RegistrationField className="mt-4" label="Mobile number" required>
            <input autoComplete="tel" className="customer-login-input" disabled={otpRequested} inputMode="numeric" maxLength={10} name="registration-mobile" onChange={(event) => setMobile(event.target.value.replace(/\D/g, "").slice(0, 10))} pattern={INPUT_PATTERNS.indianMobile} placeholder="9876543210" required value={mobile} />
          </RegistrationField>

          {otpRequested ? (
            <>
              <div className="mt-4 rounded-lg border border-[var(--shresta-logo-border)] bg-[rgba(248,239,224,0.6)] px-3 py-2 text-xs leading-5 text-[var(--shresta-logo-muted)]">
                OTP requested for <span className="font-semibold text-[var(--shresta-logo-text)]">{lockedEmail}</span> and <span className="font-semibold text-[var(--shresta-logo-text)]">{lockedMobile}</span>.
              </div>
              <RegistrationField className="mt-4" label="OTP verification code" required>
                <input autoComplete="one-time-code" autoFocus className="customer-login-input font-mono" inputMode="numeric" maxLength={6} minLength={6} name="registration-otp" onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))} pattern={INPUT_PATTERNS.otpSixDigits} placeholder="123456" required value={otp} />
              </RegistrationField>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
                <button className="inline-flex min-h-10 items-center gap-2 font-semibold text-[var(--gold-700)] disabled:cursor-not-allowed disabled:text-[var(--shresta-logo-muted)]" disabled={isSubmitting || resendSeconds > 0} onClick={() => void submitRegistration(false)} type="button">
                  <RefreshCw className="h-4 w-4" />
                  {resendSeconds > 0 ? `Resend in ${resendSeconds}s` : "Resend OTP"}
                </button>
                <button className="min-h-10 font-semibold text-[var(--shresta-logo-muted)] hover:text-[var(--gold-600)]" disabled={isSubmitting} onClick={resetOtpVerificationStep} type="button">
                  Change registration details
                </button>
              </div>
              <p className="mt-2 text-xs leading-5 text-[var(--shresta-logo-muted)]">
                Resending is never automatic. You can request up to two replacement codes per hour; each replacement expires the previous code.
              </p>
            </>
          ) : null}

          {error ? <div className="mt-4 rounded-lg border border-rose-400/35 bg-rose-100 px-3 py-2 text-sm leading-6 text-rose-700">{error}</div> : null}
          {successMessage ? (
            <div className="mt-4 rounded-lg border border-emerald-300/40 bg-emerald-50 px-3 py-2 text-sm leading-6 text-emerald-700">
              <span className="inline-flex items-start gap-2"><CheckCircle2 className="mt-1 h-4 w-4 shrink-0" />{successMessage}</span>
            </div>
          ) : null}

          <button className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-[rgba(212,175,55,0.35)] bg-[var(--shresta-logo-surface)] px-4 text-sm font-semibold text-[var(--gold-700)] transition hover:border-[rgba(212,175,55,0.7)] hover:bg-[rgba(212,175,55,0.08)] disabled:cursor-not-allowed disabled:opacity-65" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Processing..." : otpRequested ? "Verify OTP and create account" : "Send verification OTP"}
          </button>

          <p className="mt-4 text-center text-xs leading-5 text-[var(--shresta-logo-muted)]">
            Already have an account? <Link className="font-semibold text-[var(--gold-600)] hover:text-[var(--gold-500)]" href={loginHref}>Login here</Link>
          </p>
        </form>
      </div>
    </section>
  );
}

function RegistrationField({ children, className = "", label, optional, required }: { children: React.ReactNode; className?: string; label: string; optional?: boolean; required?: boolean }) {
  return (
    <label className={`${className} grid gap-2 text-[0.7rem] font-extrabold uppercase tracking-[0.16em] text-[var(--shresta-logo-muted)]`}>
      <span>{label}{required ? " *" : null}{optional ? " (optional)" : null}</span>
      {children}
    </label>
  );
}
