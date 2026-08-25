import { describe, expect, it } from "vitest";
import type { AdminOrderSummary } from "./admin-api";
import { summarizeAdminOrders } from "./admin-order-summary";

function order(overrides: Partial<AdminOrderSummary>): AdminOrderSummary {
  return {
    customerDisplayName: "Customer",
    customerEmail: "customer@example.com",
    customerId: "customer-1",
    deliveryMode: "STANDARD",
    fulfillmentStatus: "PENDING",
    isTest: false,
    itemCount: 1,
    orderNumber: "SHRESTA-20260818-ABCDEF12",
    orderStatus: "CONFIRMED",
    paymentMethod: "CARD",
    paymentStatus: "CAPTURED",
    placedAt: "2026-08-18T00:00:00Z",
    refundRequestStatus: "NONE",
    totalPaise: 10_000,
    ...overrides
  };
}

describe("admin order operational summary", () => {
  it("reports paid, delivered, refund, failed, cancelled, active, and value counts independently", () => {
    const summary = summarizeAdminOrders([
      order({ orderNumber: "paid", totalPaise: 10_000 }),
      order({ fulfillmentStatus: "DELIVERED", orderNumber: "delivered", orderStatus: "DELIVERED", totalPaise: 20_000 }),
      order({ orderNumber: "refund-pending", refundRequestStatus: "PROCESSING", totalPaise: 30_000 }),
      order({ orderNumber: "refunded", paymentStatus: "REFUNDED", refundRequestStatus: "SUCCESS", totalPaise: 40_000 }),
      order({ orderNumber: "failed", orderStatus: "PAYMENT_FAILED", paymentStatus: "FAILED", totalPaise: 50_000 }),
      order({ orderNumber: "cancelled", orderStatus: "CANCELLED", totalPaise: 60_000 })
    ]);

    expect(summary).toEqual({
      active: 2,
      cancelled: 1,
      delivered: 1,
      grossValuePaise: 210_000,
      netRetainedValuePaise: 120_000,
      paid: 4,
      paymentFailed: 1,
      refundPending: 1,
      refunded: 1,
      refundedValuePaise: 40_000,
      total: 6
    });
  });

  it("shows zero retained value for a single fully refunded order", () => {
    const summary = summarizeAdminOrders([
      order({
        fulfillmentStatus: "DELIVERED",
        orderStatus: "DELIVERED",
        paymentStatus: "REFUNDED",
        refundRequestStatus: "SUCCESS",
        totalPaise: 1_499_900
      })
    ]);

    expect(summary).toMatchObject({
      grossValuePaise: 1_499_900,
      netRetainedValuePaise: 0,
      paid: 0,
      refunded: 1,
      refundedValuePaise: 1_499_900,
      total: 1
    });
  });
});
