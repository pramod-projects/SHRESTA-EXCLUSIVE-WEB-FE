import { randomUUID } from "node:crypto";
import { updateAdminOrderStatusAction } from "@/app/admin/actions";
import { AdminApiUnavailable } from "@/components/admin/admin-api-unavailable";
import { AdminActionForm, AdminSubmitButton } from "@/components/admin/admin-action-form";
import { fetchAdminOrder, fetchAdminOrderCustomers, fetchAdminOrders, type AdminOrderDetail } from "@/features/admin/admin-api";
import { nullWhenShrestaApiUnavailable } from "@/lib/api-page-fallback";
import { asPriceInPaise, formatPaise } from "@/lib/currency";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{
    customerEmail?: string;
    orderNumber?: string;
  }>;
};

const ORDER_STATUS_OPTIONS = ["", "PLACED", "PAYMENT_PENDING", "CONFIRMED", "PACKING", "READY_FOR_PICKUP", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED", "PAYMENT_FAILED"];
const PAYMENT_STATUS_OPTIONS = ["", "PENDING", "AUTHORIZED", "CAPTURED", "FAILED", "REFUNDED"];
const FULFILLMENT_STATUS_OPTIONS = ["", "PENDING", "ALLOCATED", "PACKING", "READY", "SHIPPED", "DELIVERED", "CANCELLED"];
const TERMINAL_ORDER_STATUSES = new Set(["DELIVERED", "CANCELLED", "PAYMENT_FAILED"]);
const TERMINAL_FULFILLMENT_STATUSES = new Set(["DELIVERED", "CANCELLED"]);
const ORDER_STATUS_RANK: Record<string, number> = {
  PLACED: 0,
  PAYMENT_PENDING: 1,
  CONFIRMED: 2,
  PACKING: 3,
  READY_FOR_PICKUP: 4,
  OUT_FOR_DELIVERY: 5,
  DELIVERED: 6,
  CANCELLED: 6,
  PAYMENT_FAILED: 6
};
const FULFILLMENT_STATUS_RANK: Record<string, number> = {
  PENDING: 0,
  ALLOCATED: 1,
  PACKING: 2,
  READY: 3,
  SHIPPED: 4,
  DELIVERED: 5,
  CANCELLED: 5
};

export default async function AdminOrdersPage({ searchParams }: PageProps) {
  const resolved = await searchParams;
  const customerEmail = resolved?.customerEmail?.trim() ?? "";
  const orderNumber = resolved?.orderNumber?.trim() ?? "";

  const data = await nullWhenShrestaApiUnavailable(async () => {
    const [orders, customers] = await Promise.all([
      fetchAdminOrders({ limit: 120, offset: 0, customerEmail: customerEmail || undefined, orderNumber: orderNumber || undefined }),
      fetchAdminOrderCustomers({ limit: 120, offset: 0 })
    ]);
    return { customers, orders };
  });

  if (!data) {
    return <AdminApiUnavailable />;
  }

  const { customers, orders } = data;
  const detailOrderNumbers = orderNumber ? orders.map((order) => order.orderNumber) : [];
  const orderDetailsByNumber = new Map<string, AdminOrderDetail>();
  if (detailOrderNumbers.length > 0) {
    const details = await Promise.all(detailOrderNumbers.map((value) => fetchAdminOrder(value)));
    for (const detail of details) {
      orderDetailsByNumber.set(detail.orderNumber, detail);
    }
  }

  const totalOrders = orders.length;
  const totalValuePaise = orders.reduce((sum, order) => sum + order.totalPaise, 0);
  const activeOrders = orders.filter((order) => !["DELIVERED", "CANCELLED", "PAYMENT_FAILED"].includes(order.orderStatus)).length;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 border-b border-[var(--shresta-logo-border)] pb-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--gold-400)]">Order Control</p>
          <h1 className="mt-2 font-serif text-4xl font-light text-[var(--shresta-logo-text)]">Orders & Fulfillment</h1>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-[var(--shresta-logo-muted)]">
            Monitor all customer orders, payment state, and fulfillment flow in one operations screen. Every status change writes to order history and reflects in customer profile order tracking.
          </p>
        </div>
      </header>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Metric label="Orders in View" value={String(totalOrders)} note="Filtered list results" />
        <Metric label="Order Value" value={formatPaise(asPriceInPaise(totalValuePaise))} note="Gross total across listed orders" />
        <Metric label="Active Pipeline" value={String(activeOrders)} note="Not delivered/cancelled yet" />
        <Metric label="Customers" value={String(customers.length)} note="Customers with at least one order" />
      </section>

      <section className="admin-panel rounded-lg p-4">
        <h2 className="font-serif text-2xl font-light text-[var(--shresta-logo-text)]">Filter Orders</h2>
        <form className="mt-4 grid gap-3 md:grid-cols-3" method="GET">
          <label className="admin-label">
            Customer Email
            <input className="admin-input" defaultValue={customerEmail} name="customerEmail" placeholder="customer@example.com" type="email" />
          </label>
          <label className="admin-label">
            Order Number
            <input className="admin-input" defaultValue={orderNumber} name="orderNumber" placeholder="SHRESTA-20260808-ABCDEF12" />
          </label>
          <div className="flex items-end gap-2">
            <button className="admin-button" type="submit">Apply</button>
            <a className="admin-button secondary" href="/admin/orders">Reset</a>
          </div>
        </form>
      </section>

      <section className="admin-panel rounded-lg p-4">
        <h2 className="font-serif text-2xl font-light text-[var(--shresta-logo-text)]">Customer Order Rollup</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.12em] text-[var(--shresta-logo-muted)]">
              <tr>
                <th className="py-2 pr-4">Customer</th>
                <th className="py-2 pr-4">Email</th>
                <th className="py-2 pr-4">Total Orders</th>
                <th className="py-2 pr-4">Delivered</th>
                <th className="py-2 pr-4">Cancelled</th>
                <th className="py-2 pr-4">Active</th>
                <th className="py-2 pr-4">Lifetime Value</th>
                <th className="py-2">Last Order</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr className="border-t border-[var(--shresta-logo-border)]" key={customer.customerId}>
                  <td className="py-3 pr-4 font-semibold text-[var(--shresta-logo-text)]">{customer.customerDisplayName}</td>
                  <td className="py-3 pr-4 text-[var(--shresta-logo-muted)]">{customer.customerEmail}</td>
                  <td className="py-3 pr-4 text-[var(--shresta-logo-muted)]">{customer.totalOrders}</td>
                  <td className="py-3 pr-4 text-[var(--shresta-logo-muted)]">{customer.deliveredOrders}</td>
                  <td className="py-3 pr-4 text-[var(--shresta-logo-muted)]">{customer.cancelledOrders}</td>
                  <td className="py-3 pr-4 text-[var(--shresta-logo-muted)]">{customer.activeOrders}</td>
                  <td className="py-3 pr-4 text-[var(--gold-600)]">{formatPaise(asPriceInPaise(customer.grossOrderValuePaise))}</td>
                  <td className="py-3 text-[var(--shresta-logo-muted)]">{customer.lastOrderAt ? new Date(customer.lastOrderAt).toLocaleString() : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-panel rounded-lg p-4">
        <h2 className="font-serif text-2xl font-light text-[var(--shresta-logo-text)]">All Orders</h2>
        <div className="mt-4 space-y-4">
          {orders.map((order) => (
            <article className="rounded-lg border border-[var(--shresta-logo-border)] p-4" key={order.orderNumber}>
              {(() => {
                const allowedOrderStatuses = selectableOrderStatuses(order.orderStatus, order.fulfillmentStatus, order.paymentStatus);
                const allowedPaymentStatuses = selectablePaymentStatuses(order.paymentStatus);
                const allowedFulfillmentStatuses = selectableFulfillmentStatuses(order.fulfillmentStatus, order.orderStatus, order.paymentStatus);
                const canEditStatuses = !isTerminalOrder(order.orderStatus);
                const suggestedAction = suggestedPreset(order.orderStatus, order.paymentStatus, order.fulfillmentStatus);
                return (
                  <>
              <div className="flex flex-col gap-3 border-b border-[var(--shresta-logo-border)] pb-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--gold-400)]">{order.orderNumber}</p>
                  <p className="mt-1 text-sm text-[var(--shresta-logo-muted)]">{order.customerDisplayName} • {order.customerEmail}</p>
                  <p className="mt-1 text-xs text-[var(--shresta-logo-muted)]">{order.itemCount} item{order.itemCount === 1 ? "" : "s"} • {new Date(order.placedAt).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-[var(--shresta-logo-text)]">{formatPaise(asPriceInPaise(order.totalPaise))}</p>
                  <p className="text-xs text-[var(--shresta-logo-muted)]">{order.deliveryMode} • {order.paymentMethod}</p>
                </div>
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <StatusPill label="Order" value={order.orderStatus} />
                <StatusPill label="Payment" value={order.paymentStatus} />
                <StatusPill label="Fulfillment" value={order.fulfillmentStatus} />
              </div>

              <AdminActionForm action={updateAdminOrderStatusAction} className="mt-4 grid gap-3 lg:grid-cols-[1fr_1fr_1fr_1.5fr_auto]">
                <input name="orderNumber" type="hidden" value={order.orderNumber} />
                <input name="idempotencyKey" type="hidden" value={randomUUID()} />
                <label className="admin-label">
                  Order Status
                  <select className="admin-input" defaultValue="" name="orderStatus">
                    {ORDER_STATUS_OPTIONS.map((status) => (
                      <option disabled={status !== "" && !allowedOrderStatuses.has(status)} key={`order-${status || "none"}`} value={status}>{status || "No change"}</option>
                    ))}
                  </select>
                </label>
                <label className="admin-label">
                  Payment Status
                  <select className="admin-input" defaultValue="" name="paymentStatus">
                    {PAYMENT_STATUS_OPTIONS.map((status) => (
                      <option disabled={status !== "" && !allowedPaymentStatuses.has(status)} key={`payment-${status || "none"}`} value={status}>{status || "No change"}</option>
                    ))}
                  </select>
                </label>
                <label className="admin-label">
                  Fulfillment Status
                  <select className="admin-input" defaultValue="" name="fulfillmentStatus">
                    {FULFILLMENT_STATUS_OPTIONS.map((status) => (
                      <option disabled={status !== "" && !allowedFulfillmentStatuses.has(status)} key={`fulfillment-${status || "none"}`} value={status}>{status || "No change"}</option>
                    ))}
                  </select>
                </label>
                <label className="admin-label">
                  Note
                  <input className="admin-input" maxLength={240} name="note" placeholder="Reason for status update" />
                </label>
                <div className="flex items-end">
                  <AdminSubmitButton className="w-full" disabled={!canEditStatuses} label="Update Status" />
                </div>
              </AdminActionForm>

              <p className="mt-2 text-xs text-[var(--shresta-logo-muted)]">
                Guardrails: only forward transitions are selectable. Use presets for coordinated multi-field updates.
              </p>

              {!isTerminalOrder(order.orderStatus) ? (
                <div className="mt-4 rounded-lg border border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-surface)] p-3">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--shresta-logo-muted)]">Manual SHRESTA Pipeline Presets</p>
                  <p className="mt-1 text-xs text-[var(--shresta-logo-muted)]">Use one-click actions for valid stage updates without delivery-agency integrations.</p>

                  <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
                    <PresetUpdateForm
                      disabled={!canApplyPreset(order.orderStatus, order.paymentStatus, order.fulfillmentStatus, "PACKING", "PACKING")}
                      fulfillmentStatus="PACKING"
                      label="Mark Packing"
                      note="Manual SHRESTA ops: packing started."
                      orderNumber={order.orderNumber}
                      orderStatus="PACKING"
                    />
                    <PresetUpdateForm
                      disabled={!canApplyPreset(order.orderStatus, order.paymentStatus, order.fulfillmentStatus, "READY_FOR_PICKUP", "READY")}
                      fulfillmentStatus="READY"
                      label="Ready For Pickup"
                      note="Manual SHRESTA ops: ready for pickup/dispatch."
                      orderNumber={order.orderNumber}
                      orderStatus="READY_FOR_PICKUP"
                    />
                    <PresetUpdateForm
                      disabled={!canApplyPreset(order.orderStatus, order.paymentStatus, order.fulfillmentStatus, "OUT_FOR_DELIVERY", "SHIPPED")}
                      fulfillmentStatus="SHIPPED"
                      label="Out For Delivery"
                      note="Manual SHRESTA ops: out for delivery."
                      orderNumber={order.orderNumber}
                      orderStatus="OUT_FOR_DELIVERY"
                    />
                    <PresetUpdateForm
                      disabled={!canApplyPreset(order.orderStatus, order.paymentStatus, order.fulfillmentStatus, "DELIVERED", "DELIVERED", "CAPTURED")}
                      fulfillmentStatus="DELIVERED"
                      label="Mark Delivered"
                      note="Manual SHRESTA ops: delivered to customer."
                      orderNumber={order.orderNumber}
                      orderStatus="DELIVERED"
                      paymentStatus="CAPTURED"
                    />
                    <PresetUpdateForm
                      disabled={!canApplyPreset(order.orderStatus, order.paymentStatus, order.fulfillmentStatus, "CANCELLED", "CANCELLED", order.paymentStatus === "CAPTURED" ? "REFUNDED" : undefined)}
                      fulfillmentStatus="CANCELLED"
                      label="Cancel Order"
                      note="Manual SHRESTA ops: order cancelled."
                      orderNumber={order.orderNumber}
                      orderStatus="CANCELLED"
                      paymentStatus={order.paymentStatus === "CAPTURED" ? "REFUNDED" : undefined}
                    />
                  </div>
                </div>
              ) : null}

              {suggestedAction ? (
                <div className="mt-4 rounded-lg border border-[rgba(212,175,55,0.25)] bg-[rgba(212,175,55,0.08)] p-3">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--gold-600)]">Suggested Next Action</p>
                  <p className="mt-1 text-sm text-[var(--shresta-logo-text)]">{suggestedAction.description}</p>
                  <div className="mt-3 max-w-sm">
                    <PresetUpdateForm
                      disabled={!canApplyPreset(order.orderStatus, order.paymentStatus, order.fulfillmentStatus, suggestedAction.orderStatus, suggestedAction.fulfillmentStatus, suggestedAction.paymentStatus)}
                      fulfillmentStatus={suggestedAction.fulfillmentStatus}
                      label={suggestedAction.label}
                      note={suggestedAction.note}
                      orderNumber={order.orderNumber}
                      orderStatus={suggestedAction.orderStatus}
                      paymentStatus={suggestedAction.paymentStatus}
                    />
                  </div>
                </div>
              ) : null}

              {orderDetailsByNumber.has(order.orderNumber) ? (
                <OrderTimeline detail={orderDetailsByNumber.get(order.orderNumber)!} />
              ) : null}
                  </>
                );
              })()}
            </article>
          ))}
          {orders.length === 0 ? <p className="text-sm text-[var(--shresta-logo-muted)]">No orders found for this filter.</p> : null}
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-lg border border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-surface)] p-4">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--shresta-logo-muted)]">{label}</p>
      <p className="mt-2 font-serif text-3xl font-light text-[var(--shresta-logo-text)]">{value}</p>
      <p className="mt-1 text-xs text-[var(--shresta-logo-muted)]">{note}</p>
    </div>
  );
}

function StatusPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[rgba(212,175,55,0.18)] bg-[rgba(212,175,55,0.08)] px-3 py-2">
      <p className="text-[0.68rem] font-bold uppercase tracking-[0.12em] text-[var(--shresta-logo-muted)]">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[var(--gold-600)]">{value}</p>
    </div>
  );
}

function PresetUpdateForm({
  orderNumber,
  orderStatus,
  fulfillmentStatus,
  label,
  note,
  paymentStatus,
  disabled = false
}: {
  orderNumber: string;
  orderStatus: string;
  fulfillmentStatus: string;
  label: string;
  note: string;
  paymentStatus?: string;
  disabled?: boolean;
}) {
  return (
    <AdminActionForm action={updateAdminOrderStatusAction} className="contents">
      <input name="orderNumber" type="hidden" value={orderNumber} />
      <input name="idempotencyKey" type="hidden" value={randomUUID()} />
      <input name="orderStatus" type="hidden" value={orderStatus} />
      <input name="fulfillmentStatus" type="hidden" value={fulfillmentStatus} />
      <input name="note" type="hidden" value={note} />
      {paymentStatus ? <input name="paymentStatus" type="hidden" value={paymentStatus} /> : null}
      <AdminSubmitButton className="w-full" disabled={disabled} label={label} />
    </AdminActionForm>
  );
}

function isTerminalOrder(status: string): boolean {
  return TERMINAL_ORDER_STATUSES.has(normalizeStatus(status));
}

function OrderTimeline({ detail }: { detail: AdminOrderDetail }) {
  return (
    <details className="mt-4 rounded-lg border border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-surface)] p-3" open>
      <summary className="cursor-pointer text-sm font-semibold text-[var(--shresta-logo-text)]">Order Event Timeline</summary>
      <p className="mt-2 text-xs text-[var(--shresta-logo-muted)]">Sourced from live backend order detail; use this audit trail for manual SHRESTA operations.</p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-xs">
          <thead className="uppercase tracking-[0.12em] text-[var(--shresta-logo-muted)]">
            <tr>
              <th className="py-2 pr-3">Time</th>
              <th className="py-2 pr-3">Type</th>
              <th className="py-2 pr-3">From</th>
              <th className="py-2 pr-3">To</th>
              <th className="py-2 pr-3">Actor</th>
              <th className="py-2">Note</th>
            </tr>
          </thead>
          <tbody>
            {detail.statusEvents.map((event, index) => (
              <tr className="border-t border-[var(--shresta-logo-border)]" key={`${event.eventType}-${event.createdAt}-${index}`}>
                <td className="py-2 pr-3 text-[var(--shresta-logo-muted)]">{new Date(event.createdAt).toLocaleString()}</td>
                <td className="py-2 pr-3 font-semibold text-[var(--shresta-logo-text)]">{event.eventType}</td>
                <td className="py-2 pr-3 text-[var(--shresta-logo-muted)]">{event.fromStatus ?? "-"}</td>
                <td className="py-2 pr-3 text-[var(--gold-600)]">{event.toStatus}</td>
                <td className="py-2 pr-3 text-[var(--shresta-logo-muted)]">{event.actorType}</td>
                <td className="py-2 text-[var(--shresta-logo-muted)]">{event.note ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

function selectableOrderStatuses(currentOrderStatus: string, currentFulfillmentStatus: string, currentPaymentStatus: string): Set<string> {
  const normalizedOrderStatus = normalizeStatus(currentOrderStatus);
  const normalizedFulfillmentStatus = normalizeStatus(currentFulfillmentStatus);
  const normalizedPaymentStatus = normalizeStatus(currentPaymentStatus);
  const allowed = new Set<string>();
  if (isTerminalOrder(normalizedOrderStatus)) {
    return allowed;
  }

  const currentRank = ORDER_STATUS_RANK[normalizedOrderStatus] ?? -1;
  for (const status of ORDER_STATUS_OPTIONS) {
    if (!status) {
      continue;
    }
    const targetRank = ORDER_STATUS_RANK[status];
    if (targetRank === undefined || targetRank < currentRank) {
      continue;
    }
    if (status === "CANCELLED" && normalizedFulfillmentStatus === "DELIVERED") {
      continue;
    }
    if (status === "DELIVERED" && normalizedFulfillmentStatus !== "DELIVERED") {
      continue;
    }
    if (requiresCompletedPayment(status, normalizedFulfillmentStatus) && normalizedPaymentStatus !== "CAPTURED") {
      continue;
    }
    allowed.add(status);
  }

  return allowed;
}

function selectableFulfillmentStatuses(currentFulfillmentStatus: string, currentOrderStatus: string, currentPaymentStatus: string): Set<string> {
  const normalizedFulfillmentStatus = normalizeStatus(currentFulfillmentStatus);
  const normalizedOrderStatus = normalizeStatus(currentOrderStatus);
  const normalizedPaymentStatus = normalizeStatus(currentPaymentStatus);
  const allowed = new Set<string>();
  if (TERMINAL_FULFILLMENT_STATUSES.has(normalizedFulfillmentStatus)) {
    return allowed;
  }

  const currentRank = FULFILLMENT_STATUS_RANK[normalizedFulfillmentStatus] ?? -1;
  for (const status of FULFILLMENT_STATUS_OPTIONS) {
    if (!status) {
      continue;
    }
    const targetRank = FULFILLMENT_STATUS_RANK[status];
    if (targetRank === undefined || targetRank < currentRank) {
      continue;
    }
    if (status === "CANCELLED" && normalizedOrderStatus !== "CANCELLED") {
      continue;
    }
    if (requiresCompletedPayment(normalizedOrderStatus, status) && normalizedPaymentStatus !== "CAPTURED") {
      continue;
    }
    allowed.add(status);
  }

  return allowed;
}

function selectablePaymentStatuses(currentPaymentStatus: string): Set<string> {
  const normalizedPaymentStatus = normalizeStatus(currentPaymentStatus);
  const nextByCurrent: Record<string, string[]> = {
    PENDING: ["AUTHORIZED", "CAPTURED", "FAILED"],
    AUTHORIZED: ["CAPTURED", "FAILED"],
    CAPTURED: ["REFUNDED"],
    FAILED: [],
    REFUNDED: []
  };
  return new Set(nextByCurrent[normalizedPaymentStatus] ?? []);
}

type PresetSuggestion = {
  label: string;
  description: string;
  note: string;
  orderStatus: string;
  fulfillmentStatus: string;
  paymentStatus?: string;
};

function suggestedPreset(currentOrderStatus: string, currentPaymentStatus: string, currentFulfillmentStatus: string): PresetSuggestion | null {
  const normalizedOrderStatus = normalizeStatus(currentOrderStatus);
  const normalizedPaymentStatus = normalizeStatus(currentPaymentStatus);
  const normalizedFulfillmentStatus = normalizeStatus(currentFulfillmentStatus);

  if (isTerminalOrder(normalizedOrderStatus) || TERMINAL_FULFILLMENT_STATUSES.has(normalizedFulfillmentStatus)) {
    return null;
  }

  if (normalizedOrderStatus === "PLACED") {
    if (normalizedPaymentStatus !== "CAPTURED") {
      return {
        label: "Capture Payment",
        description: "Payment must be completed before packing or any fulfillment movement.",
        note: "Manual SHRESTA ops: payment captured before fulfillment.",
        orderStatus: "PLACED",
        fulfillmentStatus: normalizedFulfillmentStatus,
        paymentStatus: "CAPTURED"
      };
    }
    return {
      label: "Mark Packing",
      description: "Move this order into warehouse packing.",
      note: "Manual SHRESTA ops: packing started.",
      orderStatus: "PACKING",
      fulfillmentStatus: "PACKING"
    };
  }

  if (normalizedOrderStatus === "PACKING") {
    if (normalizedPaymentStatus !== "CAPTURED") {
      return {
        label: "Capture Payment",
        description: "Payment must be completed before dispatch or delivery progression.",
        note: "Manual SHRESTA ops: payment captured before dispatch.",
        orderStatus: normalizedOrderStatus,
        fulfillmentStatus: normalizedFulfillmentStatus,
        paymentStatus: "CAPTURED"
      };
    }
    return {
      label: "Out For Delivery",
      description: "Packing is complete. Move to dispatch and out-for-delivery.",
      note: "Manual SHRESTA ops: out for delivery.",
      orderStatus: "OUT_FOR_DELIVERY",
      fulfillmentStatus: "SHIPPED"
    };
  }

  if (normalizedOrderStatus === "OUT_FOR_DELIVERY") {
    return {
      label: "Mark Delivered",
      description: "Customer has received the order. Close fulfillment and capture payment.",
      note: "Manual SHRESTA ops: delivered to customer.",
      orderStatus: "DELIVERED",
      fulfillmentStatus: "DELIVERED",
      paymentStatus: normalizedPaymentStatus === "AUTHORIZED" || normalizedPaymentStatus === "PENDING" ? "CAPTURED" : undefined
    };
  }

  if (normalizedOrderStatus === "CONFIRMED" || normalizedOrderStatus === "PAYMENT_PENDING" || normalizedOrderStatus === "READY_FOR_PICKUP") {
    if (normalizedPaymentStatus !== "CAPTURED") {
      return {
        label: "Capture Payment",
        description: "Payment must be completed before fulfillment progresses.",
        note: "Manual SHRESTA ops: payment captured before fulfillment.",
        orderStatus: normalizedOrderStatus,
        fulfillmentStatus: normalizedFulfillmentStatus,
        paymentStatus: "CAPTURED"
      };
    }
    return {
      label: "Out For Delivery",
      description: "Advance this order to delivery movement in one coordinated step.",
      note: "Manual SHRESTA ops: out for delivery.",
      orderStatus: "OUT_FOR_DELIVERY",
      fulfillmentStatus: "SHIPPED"
    };
  }

  return null;
}

function canApplyPreset(
  currentOrderStatus: string,
  currentPaymentStatus: string,
  currentFulfillmentStatus: string,
  targetOrderStatus: string,
  targetFulfillmentStatus: string,
  targetPaymentStatus?: string
): boolean {
  const normalizedOrderStatus = normalizeStatus(currentOrderStatus);
  const normalizedPaymentStatus = normalizeStatus(currentPaymentStatus);
  const normalizedFulfillmentStatus = normalizeStatus(currentFulfillmentStatus);
  const normalizedTargetOrderStatus = normalizeStatus(targetOrderStatus);
  const normalizedTargetFulfillmentStatus = normalizeStatus(targetFulfillmentStatus);
  const normalizedTargetPaymentStatus = targetPaymentStatus ? normalizeStatus(targetPaymentStatus) : undefined;

  const effectiveTargetPaymentStatus = normalizedTargetPaymentStatus ?? normalizedPaymentStatus;
  const isNoOp = normalizedTargetOrderStatus === normalizedOrderStatus
    && normalizedTargetFulfillmentStatus === normalizedFulfillmentStatus
    && effectiveTargetPaymentStatus === normalizedPaymentStatus;
  if (isNoOp) {
    return false;
  }

  if (isTerminalOrder(normalizedOrderStatus) || TERMINAL_FULFILLMENT_STATUSES.has(normalizedFulfillmentStatus)) {
    return false;
  }

  const currentOrderRank = ORDER_STATUS_RANK[normalizedOrderStatus] ?? -1;
  const targetOrderRank = ORDER_STATUS_RANK[normalizedTargetOrderStatus] ?? -1;
  if (targetOrderRank < currentOrderRank) {
    return false;
  }

  const currentFulfillmentRank = FULFILLMENT_STATUS_RANK[normalizedFulfillmentStatus] ?? -1;
  const targetFulfillmentRank = FULFILLMENT_STATUS_RANK[normalizedTargetFulfillmentStatus] ?? -1;
  if (targetFulfillmentRank < currentFulfillmentRank) {
    return false;
  }

  if (normalizedTargetOrderStatus === "DELIVERED" && normalizedTargetFulfillmentStatus !== "DELIVERED") {
    return false;
  }
  if (isProgressingIntoPaymentRequiredStage(normalizedOrderStatus, normalizedFulfillmentStatus, normalizedTargetOrderStatus, normalizedTargetFulfillmentStatus)) {
    if (normalizedPaymentStatus !== "CAPTURED") {
      return false;
    }
  }
  if (normalizedTargetOrderStatus === "CANCELLED" && normalizedFulfillmentStatus === "DELIVERED") {
    return false;
  }
  if (normalizedTargetFulfillmentStatus === "CANCELLED" && normalizedTargetOrderStatus !== "CANCELLED") {
    return false;
  }

  if (!targetPaymentStatus) {
    return true;
  }
  return selectablePaymentStatuses(normalizedPaymentStatus).has(normalizedTargetPaymentStatus!);
}

function normalizeStatus(value: string): string {
  return value.trim().toUpperCase();
}

function requiresCompletedPayment(targetOrderStatus: string, targetFulfillmentStatus: string): boolean {
  const normalizedOrderStatus = normalizeStatus(targetOrderStatus);
  const normalizedFulfillmentStatus = normalizeStatus(targetFulfillmentStatus);
  const orderRequiresPayment = new Set(["PACKING", "READY_FOR_PICKUP", "OUT_FOR_DELIVERY", "DELIVERED"]).has(normalizedOrderStatus);
  const fulfillmentRank = FULFILLMENT_STATUS_RANK[normalizedFulfillmentStatus] ?? -1;
  const packingFulfillmentRank = FULFILLMENT_STATUS_RANK.PACKING ?? Number.MAX_SAFE_INTEGER;
  const fulfillmentRequiresPayment = fulfillmentRank >= packingFulfillmentRank && normalizedFulfillmentStatus !== "CANCELLED";
  return orderRequiresPayment || fulfillmentRequiresPayment;
}

function isProgressingIntoPaymentRequiredStage(
  currentOrderStatus: string,
  currentFulfillmentStatus: string,
  targetOrderStatus: string,
  targetFulfillmentStatus: string
): boolean {
  if (!requiresCompletedPayment(targetOrderStatus, targetFulfillmentStatus)) {
    return false;
  }
  const currentOrderRank = ORDER_STATUS_RANK[normalizeStatus(currentOrderStatus)] ?? -1;
  const targetOrderRank = ORDER_STATUS_RANK[normalizeStatus(targetOrderStatus)] ?? -1;
  const currentFulfillmentRank = FULFILLMENT_STATUS_RANK[normalizeStatus(currentFulfillmentStatus)] ?? -1;
  const targetFulfillmentRank = FULFILLMENT_STATUS_RANK[normalizeStatus(targetFulfillmentStatus)] ?? -1;
  return targetOrderRank > currentOrderRank || targetFulfillmentRank > currentFulfillmentRank;
}
