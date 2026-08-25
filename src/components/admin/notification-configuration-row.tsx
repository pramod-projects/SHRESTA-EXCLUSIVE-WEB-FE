"use client";

import { useState } from "react";
import { LockKeyhole } from "lucide-react";
import { updateNotificationConfigurationAction } from "@/app/admin/actions";
import { AdminActionForm, AdminSubmitButton } from "@/components/admin/admin-action-form";
import {
  notificationTypeLabel,
  type NotificationConfiguration,
  type NotificationType
} from "@/features/admin/notification-configuration";

export function NotificationConfigurationRow({
  configuration,
  idempotencyKey,
  type
}: {
  configuration: NotificationConfiguration | undefined;
  idempotencyKey: string;
  type: NotificationType;
}) {
  const [enabled, setEnabled] = useState(configuration?.enabled ?? false);

  if (!configuration) {
    return (
      <div className="grid gap-3 border-t border-[var(--shresta-logo-border)] py-5 lg:grid-cols-[minmax(15rem,1fr)_2fr]">
        <div>
          <h2 className="font-semibold text-[var(--shresta-logo-text)]">{notificationTypeLabel(type)}</h2>
          <p className="mt-1 font-mono text-xs text-[var(--shresta-logo-muted)]">{type}</p>
        </div>
        <p className="text-sm text-rose-300">This type was not returned by the configuration API. Changes are unavailable.</p>
      </div>
    );
  }

  const locked = configuration.productionLocked;
  return (
    <div className="grid gap-4 border-b border-[var(--shresta-logo-border)] py-5 last:border-b-0 lg:grid-cols-[minmax(15rem,1fr)_2fr] lg:gap-8">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-semibold text-[var(--shresta-logo-text)]">{notificationTypeLabel(type)}</h2>
          {locked && (
            <span className="inline-flex items-center gap-1 rounded border border-amber-500/35 bg-amber-500/10 px-2 py-1 text-xs font-semibold text-amber-300">
              <LockKeyhole aria-hidden="true" size={13} /> Production locked
            </span>
          )}
        </div>
        <div className="mt-2 flex items-center gap-2">
          <span className={`size-2 rounded-full ${configuration.enabled ? "bg-emerald-400" : "bg-zinc-500"}`} />
          <span className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--shresta-logo-muted)]">Live: {configuration.enabled ? "Enabled" : "Disabled"}</span>
        </div>
        <dl className="mt-3 space-y-1 text-xs text-[var(--shresta-logo-muted)]">
          <div className="flex gap-2"><dt>Version</dt><dd className="text-[var(--shresta-logo-text)]">{configuration.version}</dd></div>
          <div className="flex gap-2"><dt>Updated by</dt><dd className="break-all text-[var(--shresta-logo-text)]">{configuration.updatedBy ?? "System default"}</dd></div>
          <div className="flex gap-2"><dt>Updated</dt><dd className="text-[var(--shresta-logo-text)]">{formatTimestamp(configuration.updatedAt)}</dd></div>
        </dl>
      </div>

      {locked ? (
        <div className="flex min-h-28 items-center justify-between gap-4 border-l-2 border-amber-500/45 pl-4">
          <div>
            <p className="text-sm font-semibold text-[var(--shresta-logo-text)]">Enabled</p>
            <p className="mt-1 max-w-xl text-sm leading-6 text-[var(--shresta-logo-muted)]">
              Security-critical delivery cannot be disabled in production. No disable request can be submitted.
            </p>
          </div>
          <Switch checked disabled label={`${notificationTypeLabel(type)} enabled and locked`} />
        </div>
      ) : (
        <AdminActionForm action={updateNotificationConfigurationAction} className="grid gap-4 md:grid-cols-[minmax(12rem,0.7fr)_minmax(16rem,1.3fr)_auto] md:items-end">
          <input name="idempotencyKey" type="hidden" value={idempotencyKey} />
          <input name="type" type="hidden" value={type} />
          {enabled && <input name="enabled" type="hidden" value="on" />}
          <div>
            <span className="admin-label">Requested state</span>
            <div className={`mt-2 flex h-11 items-center justify-between rounded-lg border px-3 ${enabled ? "border-emerald-500/35 bg-emerald-500/5" : "border-[var(--shresta-logo-border)] bg-black/10"}`}>
              <span className="text-sm font-semibold text-[var(--shresta-logo-text)]">{enabled ? "Enabled" : "Disabled"}</span>
              <Switch checked={enabled} label={`Set ${notificationTypeLabel(type)} ${enabled ? "disabled" : "enabled"}`} onChange={setEnabled} />
            </div>
          </div>
          <label className="admin-label">
            Reason for change
            <textarea className="admin-input min-h-11 resize-y" name="reason" placeholder="Required for approver review" required rows={1} />
          </label>
          <AdminSubmitButton disabled={enabled === configuration.enabled} label="Create pending review" />
        </AdminActionForm>
      )}
      {configuration.updateReason && (
        <p className="text-xs leading-5 text-[var(--shresta-logo-muted)] lg:col-start-2">Last reason: {configuration.updateReason}</p>
      )}
    </div>
  );
}

function Switch({ checked, disabled = false, label, onChange }: { checked: boolean; disabled?: boolean; label: string; onChange?: (checked: boolean) => void }) {
  return (
    <button
      aria-checked={checked}
      aria-label={label}
      className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors ${checked ? "border-emerald-400/60 bg-emerald-500" : "border-[var(--shresta-logo-border)] bg-black/30"} ${disabled ? "cursor-not-allowed opacity-80" : "cursor-pointer"}`}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      role="switch"
      type="button"
    >
      <span className={`absolute top-0.5 size-4 rounded-full bg-white transition-transform ${checked ? "translate-x-5" : "translate-x-1"}`} />
    </button>
  );
}

function formatTimestamp(value: string): string {
  const timestamp = new Date(value);
  return Number.isNaN(timestamp.getTime()) ? "Unknown" : timestamp.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}