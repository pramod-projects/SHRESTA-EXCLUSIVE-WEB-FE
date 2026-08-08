"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

export type AdminActionResult = { ok: true; message: string } | { ok: false; error: string };

type ServerAction = (prev: AdminActionResult | null, formData: FormData) => Promise<AdminActionResult>;

export function AdminActionForm({
  action,
  children,
  className,
}: {
  action: ServerAction;
  children: React.ReactNode;
  className?: string;
}) {
  const [state, formAction] = useActionState(action, null);

  return (
    <form action={formAction} className={className}>
      {children}
      {state?.ok === false && (
        <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-rose-700/50 bg-rose-950/40 px-4 py-3 text-sm text-rose-300">
          <span className="mt-0.5 shrink-0 font-bold leading-none">✕</span>
          <span>{state.error}</span>
        </div>
      )}
      {state?.ok === true && (
        <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-emerald-700/50 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-300">
          <span className="mt-0.5 shrink-0 font-bold leading-none">✓</span>
          <span>{state.message}</span>
        </div>
      )}
    </form>
  );
}

export function AdminSubmitButton({
  label = "Submit for Review",
  className,
  confirmMessage,
  disabled = false,
}: {
  label?: string;
  className?: string;
  confirmMessage?: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  const isDisabled = pending || disabled;
  return (
    <button
      className={`admin-button ${className ?? ""}`}
      disabled={isDisabled}
      type="submit"
      onClick={confirmMessage && !isDisabled ? (e) => {
        if (!window.confirm(confirmMessage)) {
          e.preventDefault();
        }
      } : undefined}
    >
      {pending ? (
        <span className="flex items-center gap-2">
          <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
          Submitting…
        </span>
      ) : (
        label
      )}
    </button>
  );
}
