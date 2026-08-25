import type { AdminOrderSummary } from "./admin-api";

export type AdminOrderOperationalSummary = {
  active: number;
  cancelled: number;
  delivered: number;
  grossValuePaise: number;
  netRetainedValuePaise: number;
  paid: number;
  paymentFailed: number;
  refundPending: number;
  refundedValuePaise: number;
  refunded: number;
  total: number;
};

export function summarizeAdminOrders(orders: AdminOrderSummary[]): AdminOrderOperationalSummary {
  return orders.reduce<AdminOrderOperationalSummary>((summary, order) => {
    const orderStatus = normalizeStatus(order.orderStatus);
    const paymentStatus = normalizeStatus(order.paymentStatus);
    const fulfillmentStatus = normalizeStatus(order.fulfillmentStatus);
    const refundStatus = normalizeStatus(order.refundRequestStatus);
    const terminal = ["DELIVERED", "CANCELLED", "PAYMENT_FAILED"].includes(orderStatus)
      || paymentStatus === "REFUNDED";

    summary.total += 1;
    summary.grossValuePaise += order.totalPaise;
    summary.refundedValuePaise += paymentStatus === "REFUNDED" ? order.totalPaise : 0;
    summary.netRetainedValuePaise += paymentStatus === "CAPTURED" ? order.totalPaise : 0;
    summary.paid += paymentStatus === "CAPTURED" ? 1 : 0;
    summary.delivered += orderStatus === "DELIVERED" || fulfillmentStatus === "DELIVERED" ? 1 : 0;
    summary.active += terminal ? 0 : 1;
    summary.refundPending += ["REQUESTED", "PROCESSING"].includes(refundStatus) ? 1 : 0;
    summary.refunded += paymentStatus === "REFUNDED" ? 1 : 0;
    summary.paymentFailed += paymentStatus === "FAILED" || orderStatus === "PAYMENT_FAILED" ? 1 : 0;
    summary.cancelled += orderStatus === "CANCELLED" ? 1 : 0;
    return summary;
  }, {
    active: 0,
    cancelled: 0,
    delivered: 0,
    grossValuePaise: 0,
    netRetainedValuePaise: 0,
    paid: 0,
    paymentFailed: 0,
    refundPending: 0,
    refundedValuePaise: 0,
    refunded: 0,
    total: 0
  });
}

function normalizeStatus(status: string): string {
  return status.trim().toUpperCase();
}
