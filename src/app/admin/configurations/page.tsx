import { randomUUID } from "node:crypto";
import { BellRing, ClipboardCheck, Settings2, Undo2 } from "lucide-react";
import { AdminApiUnavailable } from "@/components/admin/admin-api-unavailable";
import { NotificationConfigurationRow } from "@/components/admin/notification-configuration-row";
import { RefundPolicyConfigurationForm } from "@/components/admin/refund-policy-configuration-form";
import { requireAdminModuleAccess } from "@/features/admin/admin-acl";
import { fetchAdminNotificationConfiguration, fetchAdminRefundPolicyConfiguration } from "@/features/admin/admin-api";
import { NOTIFICATION_TYPES } from "@/features/admin/notification-configuration";
import { nullWhenShrestaApiUnavailable } from "@/lib/api-page-fallback";

export const dynamic = "force-dynamic";

export default async function AdminConfigurationsPage() {
  await requireAdminModuleAccess("notifications");
  const data = await nullWhenShrestaApiUnavailable(() => Promise.all([
    fetchAdminRefundPolicyConfiguration(),
    fetchAdminNotificationConfiguration()
  ]));
  if (!data) {
    return <AdminApiUnavailable />;
  }

  const [refundPolicy, notifications] = data;
  const notificationByType = new Map(notifications.map((configuration) => [configuration.type, configuration]));
  const enabledCount = notifications.filter((configuration) => configuration.enabled).length;
  const lockedCount = notifications.filter((configuration) => configuration.productionLocked).length;

  return (
    <div className="space-y-6">
      <header className="border-b border-[var(--shresta-logo-border)] pb-5">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[var(--gold-400)]"><Settings2 aria-hidden="true" size={15} /> Platform Controls</p>
        <h1 className="mt-2 font-serif text-4xl font-light text-[var(--shresta-logo-text)]">Configurations</h1>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-[var(--shresta-logo-muted)]">
          Manage customer refund eligibility and transactional notification delivery through reviewed, audited changes.
        </p>
      </header>

      <section className="flex items-start gap-3 border-l-2 border-sky-400 bg-sky-400/5 px-4 py-3">
        <ClipboardCheck aria-hidden="true" className="mt-0.5 shrink-0 text-sky-300" size={18} />
        <div>
          <h2 className="text-sm font-semibold text-[var(--shresta-logo-text)]">Changes require approval</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--shresta-logo-muted)]">
            Submitting a setting creates or replaces a pending review request. Live behavior changes only after an authorized approver accepts it.
          </p>
        </div>
      </section>

      <details className="admin-panel rounded-lg p-4" open>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 font-serif text-2xl font-light text-[var(--shresta-logo-text)]"><Undo2 aria-hidden="true" size={20} /> Refund Policy</h2>
            <p className="mt-1 text-sm text-[var(--shresta-logo-muted)]">Set how many days after delivery a customer remains eligible for a refund.</p>
          </div>
          <span className="shrink-0 text-xs font-bold uppercase tracking-[0.12em] text-[var(--gold-600)]">{refundPolicy.eligibilityDays} days</span>
        </summary>
        <RefundPolicyConfigurationForm configuration={refundPolicy} idempotencyKey={randomUUID()} />
      </details>

      <details className="admin-panel rounded-lg p-4">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 font-serif text-2xl font-light text-[var(--shresta-logo-text)]"><BellRing aria-hidden="true" size={20} /> Notification Delivery</h2>
            <p className="mt-1 text-sm text-[var(--shresta-logo-muted)]">Control transactional messages independently; security-critical delivery stays locked in production.</p>
          </div>
          <span className="shrink-0 text-xs font-bold uppercase tracking-[0.12em] text-[var(--shresta-logo-muted)]">{enabledCount} enabled · {lockedCount} locked</span>
        </summary>
        <div className="mt-5 border-t border-[var(--shresta-logo-border)] px-1">
          {NOTIFICATION_TYPES.map((type) => (
            <NotificationConfigurationRow configuration={notificationByType.get(type)} idempotencyKey={randomUUID()} key={type} type={type} />
          ))}
        </div>
      </details>
    </div>
  );
}