"use client";

import { useState } from "react";
import { CalendarClock } from "lucide-react";
import { updateRefundPolicyConfigurationAction } from "@/app/admin/actions";
import { AdminActionForm, AdminSubmitButton } from "@/components/admin/admin-action-form";
import type { RefundPolicyConfiguration } from "@/features/admin/refund-policy-configuration";

export function RefundPolicyConfigurationForm({
  configuration,
  idempotencyKey
}: {
  configuration: RefundPolicyConfiguration;
  idempotencyKey: string;
}) {
  const [eligibilityDays, setEligibilityDays] = useState(configuration.eligibilityDays);

  return (
    <div className="mt-5 grid gap-6 border-t border-[var(--shresta-logo-border)] pt-5 lg:grid-cols-[minmax(15rem,0.8fr)_minmax(22rem,1.2fr)]">
      <div>
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-lg border border-[rgba(212,175,55,0.24)] bg-[rgba(212,175,55,0.09)] text-[var(--gold-600)]">
            <CalendarClock aria-hidden="true" size={20} />
          </span>
          <div>
            <p className="text-sm text-[var(--shresta-logo-muted)]">Current refund window</p>
            <p className="text-2xl font-semibold tabular-nums text-[var(--shresta-logo-text)]">
              {configuration.eligibilityDays} {configuration.eligibilityDays === 1 ? "day" : "days"}
            </p>
          </div>
        </div>
        <dl className="mt-4 space-y-1 text-xs text-[var(--shresta-logo-muted)]">
          <div className="flex gap-2"><dt>Version</dt><dd className="text-[var(--shresta-logo-text)]">{configuration.version}</dd></div>
          <div className="flex gap-2"><dt>Updated by</dt><dd className="break-all text-[var(--shresta-logo-text)]">{configuration.updatedBy ?? "System default"}</dd></div>
          <div className="flex gap-2"><dt>Updated</dt><dd className="text-[var(--shresta-logo-text)]">{formatTimestamp(configuration.updatedAt)}</dd></div>
        </dl>
      </div>

      <AdminActionForm action={updateRefundPolicyConfigurationAction} className="grid gap-4 md:grid-cols-[minmax(11rem,0.55fr)_minmax(16rem,1fr)_auto] md:items-end">
        <input name="idempotencyKey" type="hidden" value={idempotencyKey} />
        <label className="admin-label">
          Days after delivery
          <input
            className="admin-input tabular-nums"
            max="365"
            min="0"
            name="eligibilityDays"
            onChange={(event) => setEligibilityDays(event.currentTarget.valueAsNumber)}
            required
            type="number"
            value={Number.isNaN(eligibilityDays) ? "" : eligibilityDays}
          />
        </label>
        <label className="admin-label">
          Reason for change
          <textarea className="admin-input min-h-11 resize-y" name="reason" placeholder="Required for approver review" required rows={1} />
        </label>
        <AdminSubmitButton disabled={eligibilityDays === configuration.eligibilityDays || Number.isNaN(eligibilityDays)} label="Create pending review" />
      </AdminActionForm>
      {configuration.updateReason && (
        <p className="text-xs leading-5 text-[var(--shresta-logo-muted)] lg:col-start-2">Last reason: {configuration.updateReason}</p>
      )}
    </div>
  );
}

function formatTimestamp(value: string): string {
  const timestamp = new Date(value);
  return Number.isNaN(timestamp.getTime()) ? "Unknown" : timestamp.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}