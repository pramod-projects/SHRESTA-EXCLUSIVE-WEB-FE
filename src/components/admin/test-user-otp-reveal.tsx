"use client";

import { useState, useTransition } from "react";
import { revealTestUserOtpAction, type TestUserOtpRevealResult } from "@/app/admin/actions";

export function TestUserOtpReveal({ customerId }: { customerId: string }) {
  const [result, setResult] = useState<TestUserOtpRevealResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <div>
      {result?.ok === true ? (
        <div className="rounded-lg border border-amber-700/50 bg-amber-950/40 px-4 py-3">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-amber-300">One-time OTP</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <span className="font-mono text-lg font-semibold tracking-[0.2em] text-amber-100">{result.otp}</span>
            <button
              className="admin-button secondary"
              onClick={() => {
                void navigator.clipboard?.writeText(result.otp);
                setCopied(true);
              }}
              type="button"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <p className="mt-1.5 text-xs text-amber-300/80">
            This OTP is shown exactly once and is never stored by the application. It will never be displayed again.
          </p>
        </div>
      ) : (
        <>
          <button
            className="admin-button secondary"
            disabled={pending}
            onClick={() => {
              startTransition(async () => {
                const formData = new FormData();
                formData.set("customerId", customerId);
                setResult(await revealTestUserOtpAction(formData));
              });
            }}
            type="button"
          >
            {pending ? "Revealing…" : "Reveal OTP (one time)"}
          </button>
          {result?.ok === false ? (
            <div className="mt-3 flex items-start gap-2.5 rounded-lg border border-rose-700/50 bg-rose-950/40 px-4 py-3 text-sm text-rose-300">
              <span className="mt-0.5 shrink-0 font-bold leading-none">✕</span>
              <span>{result.error}</span>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
