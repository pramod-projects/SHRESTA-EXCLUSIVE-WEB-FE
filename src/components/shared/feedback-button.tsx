"use client";

import { Check, Loader2, XCircle } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";
import { useFeedback } from "@/lib/use-feedback";

type Variant = "storefront" | "admin" | "admin-secondary" | "admin-danger";

type FeedbackButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> & {
  /** Async action to run on click. Result drives the success/error state. */
  onAction: () => Promise<void>;
  /** Label shown while the action is in-flight. Defaults to children. */
  pendingLabel?: string;
  /** Label shown for `resetAfterMs` after success. Defaults to "Done!" */
  successLabel?: string;
  /** Label shown for `resetAfterMs` after an error. Defaults to "Try again" */
  errorLabel?: string;
  /** How long (ms) to hold the success/error state. Default 2 000 ms. */
  resetAfterMs?: number;
  /**
   * Pre-built visual variant.
   *   storefront     — gold pill CTA (matches SHRESTA storefront primary buttons)
   *   admin          — gold admin-button (matches .admin-button)
   *   admin-secondary — muted admin-button
   *   admin-danger   — danger admin-button
   * Omit to bring your own className entirely.
   */
  variant?: Variant;
};

const VARIANT_BASE: Record<Variant, string> = {
  storefront:
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-8 text-sm font-semibold tracking-wide text-white bg-gradient-to-br from-wine-700 to-wine-900 transition-all duration-700 ease-out hover:scale-[1.03] hover:shadow-[0_4px_44px_rgba(212,175,55,0.5)] active:scale-[0.97] active:duration-100 disabled:cursor-not-allowed disabled:opacity-60",
  admin:
    "admin-button",
  "admin-secondary":
    "admin-button secondary",
  "admin-danger":
    "admin-button danger",
};

/**
 * Drop-in button that drives the full feedback lifecycle:
 *   idle → pending (spinner) → success (checkmark, auto-reset) | error (x, auto-reset) → idle
 *
 * The `shresta-btn-success` and `shresta-btn-error` CSS classes (in globals.css) play
 * the pop/shake animation automatically on the relevant state transitions.
 *
 * @example — storefront primary CTA
 *   <FeedbackButton variant="storefront" onAction={handleSubscribe}>
 *     Subscribe
 *   </FeedbackButton>
 *
 * @example — admin form save
 *   <FeedbackButton variant="admin" onAction={handleSave} successLabel="Saved!">
 *     Save changes
 *   </FeedbackButton>
 *
 * @example — bring your own className
 *   <FeedbackButton className="my-custom-btn" onAction={doSomething}>
 *     Click me
 *   </FeedbackButton>
 */
export function FeedbackButton({
  onAction,
  pendingLabel,
  successLabel = "Done!",
  errorLabel = "Try again",
  resetAfterMs = 2000,
  variant,
  className,
  children,
  disabled,
  type = "button",
  ...rest
}: FeedbackButtonProps) {
  const fb = useFeedback(resetAfterMs);

  const variantClass = variant ? VARIANT_BASE[variant] : "";
  const stateClass =
    fb.isSuccess ? "shresta-btn-success" :
    fb.isError   ? "shresta-btn-error"   :
    "";

  const label =
    fb.isPending && pendingLabel ? pendingLabel :
    fb.isSuccess                 ? successLabel :
    fb.isError                   ? errorLabel :
    children;

  const icon =
    fb.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> :
    fb.isSuccess ? <Check   className="h-3.5 w-3.5"              aria-hidden /> :
    fb.isError   ? <XCircle className="h-3.5 w-3.5"              aria-hidden /> :
    null;

  return (
    <button
      type={type}
      disabled={disabled || fb.isPending}
      className={[variantClass, stateClass, className].filter(Boolean).join(" ")}
      onClick={() => fb.trigger(onAction)}
      {...rest}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
