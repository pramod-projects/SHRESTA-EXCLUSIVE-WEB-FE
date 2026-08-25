import { randomUUID } from "node:crypto";
import { approveAdminOrderRefundAction, checkAdminOrderRefundStatusAction, updateAdminOrderStatusAction } from "@/app/admin/actions";
import { AdminApiUnavailable } from "@/components/admin/admin-api-unavailable";
import { AdminActionForm, AdminSubmitButton } from "@/components/admin/admin-action-form";
import { requireAdminModuleAccess } from "@/features/admin/admin-acl";
import { fetchAdminOrder, fetchAdminOrderCustomers, fetchAdminOrders, type AdminOrderDetail } from "@/features/admin/admin-api";
import { summarizeAdminOrders } from "@/features/admin/admin-order-summary";
import { nullWhenShrestaApiUnavailable } from "@/lib/api-page-fallback";
import { asPriceInPaise, formatPaise } from "@/lib/currency";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{
    customerEmail?: string;
    orderNumber?: string;
  }>;
};

const FULFILLMENT_WORKFLOW_OPTIONS = ["", "PENDING", "PACKING", "OUT_FOR_DELIVERY", "DELIVERED"];
const TERMINAL_ORDER_STATUSES = new Set(["DELIVERED", "CANCELLED", "PAYMENT_FAILED"]);
const TERMINAL_FULFILLMENT_STATUSES = new Set(["DELIVERED", "CANCELLED"]);

export default async function AdminOrdersPage({ searchParams }: PageProps) {
  await requireAdminModuleAccess("orders");

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

  const summary = summarizeAdminOrders(orders);

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

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <Metric label="Orders in View" value={String(summary.total)} note="Current filtered result set" />
        <Metric label="Payments Captured" value={String(summary.paid)} note="Currently CAPTURED, excludes refunds" />
        <Metric label="Delivered" value={String(summary.delivered)} note="Completed fulfillment" />
        <Metric label="Active Pipeline" value={String(summary.active)} note="Still being fulfilled" />
        <Metric label="Refund Pending" value={String(summary.refundPending)} note="Requested or processing" />
        <Metric label="Refunded" value={String(summary.refunded)} note="Payment status REFUNDED" />
        <Metric label="Refunded Value" value={formatPaise(asPriceInPaise(summary.refundedValuePaise))} note="Value of fully refunded orders" />
        <Metric label="Payment Failed" value={String(summary.paymentFailed)} note="Failed payment attempts" />
        <Metric label="Cancelled" value={String(summary.cancelled)} note="Cancelled orders" />
        <Metric label="Gross Order Value" value={formatPaise(asPriceInPaise(summary.grossValuePaise))} note="Before refund deductions" />
        <Metric label="Net Retained Value" value={formatPaise(asPriceInPaise(summary.netRetainedValuePaise))} note="Gross value less full refunds" />
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
                <th className="py-2 pr-4">Gross Order Value</th>
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
                const allowedFulfillmentStatuses = selectableFulfillmentWorkflowStatuses(order.fulfillmentStatus, order.orderStatus, order.paymentStatus);
                const normalizedPaymentStatus = normalizeStatus(order.paymentStatus);
                const normalizedRefundRequestStatus = normalizeStatus(order.refundRequestStatus);
                const canEditStatuses = !isTerminalOrder(order.orderStatus) && !TERMINAL_FULFILLMENT_STATUSES.has(normalizeStatus(order.fulfillmentStatus));
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

              {order.isTest ? (
                <div className="mt-3">
                  <span className="inline-flex items-center gap-1 rounded border border-amber-500/35 bg-amber-500/10 px-2 py-1 text-xs font-semibold text-amber-300">TEST</span>
                </div>
              ) : null}

              {order.refundRequestStatus !== "NONE" ? (
                <div className="mt-3 rounded-lg border border-[rgba(212,175,55,0.25)] bg-[rgba(212,175,55,0.08)] px-3 py-2">
                  <p className="text-[0.68rem] font-bold uppercase tracking-[0.12em] text-[var(--shresta-logo-muted)]">Refund request</p>
                  <p className="mt-1 text-sm font-semibold text-[var(--gold-600)]">{order.refundRequestStatus}</p>
                </div>
              ) : null}

              {canEditStatuses ? (
                <>
                  <AdminActionForm action={updateAdminOrderStatusAction} className="mt-4 grid gap-3 lg:grid-cols-[1fr_1fr_1.25fr_auto]">
                    <input name="orderNumber" type="hidden" value={order.orderNumber} />
                    <input name="idempotencyKey" type="hidden" value={randomUUID()} />
                    <label className="admin-label">
                      Fulfillment Status
                      <select className="admin-input" defaultValue="" name="fulfillmentStatus">
                        {FULFILLMENT_WORKFLOW_OPTIONS.map((status) => (
                          <option disabled={status !== "" && !allowedFulfillmentStatuses.has(status)} key={`fulfillment-${status || "none"}`} value={status}>{status || "No change"}</option>
                        ))}
                      </select>
                    </label>
                    <label className="admin-label">
                      Note
                      <input className="admin-input" maxLength={240} name="note" placeholder="Reason for status update" />
                    </label>
                    <label className="admin-label">
                      Ops reference
                      <input className="admin-input" maxLength={80} name="opsReference" placeholder="Runner/dispatch reference" />
                    </label>
                    <div className="flex items-end">
                      <AdminSubmitButton className="w-full" label="Update Status" />
                    </div>
                  </AdminActionForm>

                  <p className="mt-2 text-xs text-[var(--shresta-logo-muted)]">
                    Admin can only update fulfillment workflow. Manual payment/order status edits are disabled.
                  </p>
                </>
              ) : (
                <p className="mt-4 text-xs text-[var(--shresta-logo-muted)]">
                  Fulfillment workflow is complete for this order.
                </p>
              )}

              {normalizedRefundRequestStatus === "REQUESTED" && normalizedPaymentStatus === "CAPTURED" ? (
                <div className="mt-4 rounded-lg border border-[rgba(212,175,55,0.25)] bg-[rgba(212,175,55,0.08)] p-3">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--gold-600)]">Customer Refund Request</p>
                  <p className="mt-1 text-sm text-[var(--shresta-logo-text)]">Approve to initiate refund in Razorpay. Mark REFUNDED/CANCELLED only after Razorpay reports success.</p>
                  <AdminActionForm action={approveAdminOrderRefundAction} className="mt-3 grid gap-3 lg:grid-cols-[1fr_1fr_auto]">
                    <input name="orderNumber" type="hidden" value={order.orderNumber} />
                    <input name="idempotencyKey" type="hidden" value={randomUUID()} />
                    <label className="admin-label">
                      Note
                      <input className="admin-input" maxLength={240} name="note" placeholder="Refund approval note" />
                    </label>
                    <label className="admin-label">
                      Ops reference
                      <input className="admin-input" maxLength={80} name="opsReference" placeholder="Refund batch/reference" />
                    </label>
                    <div className="flex items-end">
                      <AdminSubmitButton className="w-full" label="Approve Refund" />
                    </div>
                  </AdminActionForm>
                </div>
              ) : null}

              {normalizedPaymentStatus === "CAPTURED" && ["REQUESTED", "PROCESSING"].includes(normalizedRefundRequestStatus) ? (
                <div className="mt-4 rounded-lg border border-[rgba(212,175,55,0.25)] bg-[rgba(212,175,55,0.08)] p-3">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--gold-600)]">Razorpay Refund Reconciliation</p>
                  <p className="mt-1 text-sm text-[var(--shresta-logo-text)]">Check latest Razorpay refund status. If Razorpay reports success, payment status will be auto-synced to REFUNDED.</p>
                  <AdminActionForm action={checkAdminOrderRefundStatusAction} className="mt-3 grid gap-3 lg:grid-cols-[1fr_auto]">
                    <input name="orderNumber" type="hidden" value={order.orderNumber} />
                    <p className="text-xs text-[var(--shresta-logo-muted)]">Use this if refund appears stuck in PROCESSING even after Razorpay dashboard shows success.</p>
                    <div className="flex items-end">
                      <AdminSubmitButton className="w-full" label="Check Refund Status" />
                    </div>
                  </AdminActionForm>
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
      <p className="mt-2 text-3xl font-semibold tabular-nums text-[var(--shresta-logo-text)]">{value}</p>
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

function isTerminalOrder(status: string): boolean {
  return TERMINAL_ORDER_STATUSES.has(normalizeStatus(status));
}

function OrderTimeline({ detail }: { detail: AdminOrderDetail }) {
  return (
    <details className="mt-4 rounded-lg border border-[var(--shresta-logo-border)] bg-[var(--shresta-logo-surface)] p-3" open>
      <summary className="cursor-pointer text-sm font-semibold text-[var(--shresta-logo-text)]">
        Order Event Timeline
        {detail.isTest ? (
          <span className="ml-2 inline-flex items-center gap-1 rounded border border-amber-500/35 bg-amber-500/10 px-2 py-1 text-xs font-semibold text-amber-300">TEST</span>
        ) : null}
      </summary>
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

function selectableFulfillmentWorkflowStatuses(currentFulfillmentStatus: string, currentOrderStatus: string, currentPaymentStatus: string): Set<string> {
  const normalizedFulfillmentStatus = normalizeStatus(currentFulfillmentStatus);
  const normalizedOrderStatus = normalizeStatus(currentOrderStatus);
  const normalizedPaymentStatus = normalizeStatus(currentPaymentStatus);
  const allowed = new Set<string>();
  if (TERMINAL_FULFILLMENT_STATUSES.has(normalizedFulfillmentStatus) || isTerminalOrder(normalizedOrderStatus)) {
    return allowed;
  }

  if (["PLACED", "PAYMENT_PENDING", "CONFIRMED"].includes(normalizedOrderStatus)) {
    allowed.add("PENDING");
  }

  if (normalizedPaymentStatus !== "CAPTURED") {
    return allowed;
  }

  if (["PENDING", "ALLOCATED"].includes(normalizedFulfillmentStatus)) {
    allowed.add("PACKING");
  }
  if (["PACKING", "READY"].includes(normalizedFulfillmentStatus)) {
    allowed.add("OUT_FOR_DELIVERY");
  }
  if (normalizedFulfillmentStatus === "SHIPPED") {
    allowed.add("DELIVERED");
  }

  if (normalizedFulfillmentStatus === "DELIVERED") {
    allowed.add("DELIVERED");
  }

  return allowed;
}

function normalizeStatus(value: string): string {
  return value.trim().toUpperCase();
}
