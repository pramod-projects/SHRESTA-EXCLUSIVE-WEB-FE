"use client";

export type CustomerOrderLinePayload = {
  productId: string;
  quantity: number;
};

export type CustomerOrderDraftPayload = {
  lines: CustomerOrderLinePayload[];
};

export type CustomerOrderDraftResponse = {
  orderId: string;
  orderNumber: string;
  customerId: string;
  customerEmail: string;
  status: string;
  cartSignature: string;
  currency: string;
  subtotalPaise: number;
  deliveryPaise: number;
  discountPaise: number;
  taxPaise: number;
  totalPaise: number;
  deliveryMode: string;
  expiresAt: string;
  createdAt: string;
  lines: Array<{
    productId: string;
    sku: string;
    slug: string;
    name: string;
    familyKey: string;
    productType: string;
    quantity: number;
    unitPricePaise: number;
    lineTotalPaise: number;
    mediaAssetKey: string | null;
    mediaUrl: string | null;
    mediaAltText: string | null;
  }>;
};

export type CustomerOrderPlacementPayload = {
  acceptedTerms: boolean;
  contact: {
    email: string;
    phone: string;
  };
  deliveryMode: "STANDARD" | "EXPRESS" | "SAME_DAY";
  draftOrderId: string;
  lines: CustomerOrderLinePayload[];
  paymentMethod: "UPI" | "CARD" | "NETBANKING";
  shippingAddress: {
    addressLine1: string;
    addressLine2: string;
    addressType: "HOME" | "WORK" | "OTHER";
    city: string;
    country: string;
    fullName: string;
    landmark: string;
    phone: string;
    postalCode: string;
    state: string;
  };
};

export type CustomerOrderResponse = {
  orderNumber: string;
  customerId: string;
  customerEmail: string;
  orderStatus: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  currency: string;
  subtotalPaise: number;
  deliveryPaise: number;
  discountPaise: number;
  taxPaise: number;
  totalPaise: number;
  deliveryMode: string;
  paymentMethod: string;
  placedAt: string;
  statusEvents: Array<{
    eventType: string;
    fromStatus: string | null;
    toStatus: string;
    actorType: string;
    note: string | null;
    createdAt: string;
  }>;
};

export type CustomerOrderSummary = {
  orderNumber: string;
  orderStatus: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  currency: string;
  totalPaise: number;
  deliveryMode: string;
  paymentMethod: string;
  itemCount: number;
  placedAt: string;
};

export type CustomerOrderResult =
  | { ok: true; order: CustomerOrderResponse }
  | { ok: false; message: string; status?: number };

export type CustomerOrderDraftResult =
  | { ok: true; draft: CustomerOrderDraftResponse }
  | { ok: false; message: string; status?: number };

export type CustomerOrdersResult =
  | { ok: true; orders: CustomerOrderSummary[] }
  | { ok: false; message: string; status?: number };

export async function createCustomerOrderDraft(payload: CustomerOrderDraftPayload, idempotencyKey: string): Promise<CustomerOrderDraftResult> {
  try {
    const response = await fetch("/api/customer-orders/draft", {
      body: JSON.stringify(payload),
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey
      },
      method: "POST"
    });
    const envelope = await response.json() as {
      success?: boolean;
      data?: CustomerOrderDraftResponse;
      error?: { message?: string };
    };

    if (!response.ok || !envelope.success || !envelope.data) {
      return {
        ok: false,
        message: envelope.error?.message ?? "Checkout order ID could not be created. Please try again.",
        status: response.status
      };
    }

    return { ok: true, draft: envelope.data };
  } catch {
    return { ok: false, message: "We could not start checkout right now. Please try again shortly." };
  }
}

export async function placeCustomerOrder(payload: CustomerOrderPlacementPayload, idempotencyKey: string): Promise<CustomerOrderResult> {
  try {
    const response = await fetch("/api/customer-orders", {
      body: JSON.stringify(payload),
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey
      },
      method: "POST"
    });
    const envelope = await response.json() as {
      success?: boolean;
      data?: CustomerOrderResponse;
      error?: { message?: string };
    };

    if (!response.ok || !envelope.success || !envelope.data) {
      return {
        ok: false,
        message: envelope.error?.message ?? "Order placement failed. Please try again.",
        status: response.status
      };
    }

    return { ok: true, order: envelope.data };
  } catch {
    return { ok: false, message: "We could not place your order right now. Please try again shortly." };
  }
}

export async function fetchCustomerOrders(): Promise<CustomerOrdersResult> {
  try {
    const response = await fetch("/api/customer-orders", {
      cache: "no-store",
      method: "GET"
    });
    const envelope = await response.json() as {
      success?: boolean;
      data?: CustomerOrderSummary[];
      error?: { message?: string };
    };

    if (!response.ok || !envelope.success || !Array.isArray(envelope.data)) {
      return {
        ok: false,
        message: envelope.error?.message ?? "Order history is not available right now.",
        status: response.status
      };
    }

    return { ok: true, orders: envelope.data };
  } catch {
    return { ok: false, message: "We could not load your orders right now. Please try again shortly." };
  }
}
