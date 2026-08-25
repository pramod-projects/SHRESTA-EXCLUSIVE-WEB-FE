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
  paymentMethod?: "UPI" | "CARD" | "NETBANKING";
  razorpayPayment: {
    orderId: string;
    paymentId: string;
    signature: string;
  };
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
  refundRequestStatus: string;
  customerStageCode: string;
  customerStageLabel: string;
  customerStageIndex: number;
  customerStageMeaning: string;
  customerStageTerminal: boolean;
  currency: string;
  subtotalPaise: number;
  deliveryPaise: number;
  discountPaise: number;
  taxPaise: number;
  totalPaise: number;
  deliveryMode: string;
  paymentMethod: string;
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
  refundRequestStatus: string;
  customerStageCode: string;
  customerStageLabel: string;
  customerStageIndex: number;
  customerStageMeaning: string;
  customerStageTerminal: boolean;
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

export type CustomerOrderRefundRequestResult =
  | { ok: true; order: CustomerOrderResponse }
  | { ok: false; message: string; status?: number };

export type RazorpayCreateOrderPayload = {
  draftOrderId: string;
};

export type RazorpayCreateOrderResponse = {
  orderId: string;
  amount: number;
  currency: string;
  simulated?: boolean;
};

export type RazorpayVerifyPaymentPayload = {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
};

export type RazorpayVerifyPaymentResponse = {
  verified: boolean;
  orderId: string;
  paymentId: string;
};

export type CustomerOrderDraftPaymentFailedPayload = {
  eventType: "payment.failed";
  failureReason: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
};

export type CustomerOrderDraftPaymentStatusResponse = {
  orderId: string;
  orderNumber: string;
  draftStatus: string;
  paymentStatus: string;
  invalidationReason: string | null;
  updatedAt: string;
};

export type RazorpayCreateOrderResult =
  | { ok: true; order: RazorpayCreateOrderResponse }
  | { ok: false; message: string; status?: number };

export type RazorpayVerifyPaymentResult =
  | { ok: true; verification: RazorpayVerifyPaymentResponse }
  | { ok: false; message: string; status?: number };

export type CustomerOrderDraftPaymentStatusResult =
  | { ok: true; status: CustomerOrderDraftPaymentStatusResponse }
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

export async function fetchCustomerOrder(orderNumber: string): Promise<CustomerOrderResult> {
  try {
    const response = await fetch(`/api/customer-orders/${encodeURIComponent(orderNumber)}`, {
      cache: "no-store",
      method: "GET"
    });
    const envelope = await response.json() as {
      success?: boolean;
      data?: CustomerOrderResponse;
      error?: { message?: string };
    };

    if (!response.ok || !envelope.success || !envelope.data) {
      return {
        ok: false,
        message: envelope.error?.message ?? "Order details are not available right now.",
        status: response.status
      };
    }

    return { ok: true, order: envelope.data };
  } catch {
    return { ok: false, message: "We could not load this order right now. Please try again shortly." };
  }
}

export async function requestCustomerOrderRefund(orderNumber: string, idempotencyKey: string, note?: string): Promise<CustomerOrderRefundRequestResult> {
  try {
    const response = await fetch(`/api/customer-orders/${encodeURIComponent(orderNumber)}/refund-request`, {
      body: JSON.stringify({ note }),
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
        message: envelope.error?.message ?? "Refund request failed. Please try again.",
        status: response.status
      };
    }

    return { ok: true, order: envelope.data };
  } catch {
    return { ok: false, message: "We could not submit your refund request right now. Please try again shortly." };
  }
}

export async function createRazorpayOrder(payload: RazorpayCreateOrderPayload): Promise<RazorpayCreateOrderResult> {
  try {
    const response = await fetch("/api/razorpay/create-order", {
      body: JSON.stringify(payload),
      cache: "no-store",
      headers: {
        "Content-Type": "application/json"
      },
      method: "POST"
    });

    const envelope = await response.json() as {
      success?: boolean;
      data?: RazorpayCreateOrderResponse;
      error?: { message?: string };
    };

    if (!response.ok || !envelope.success || !envelope.data) {
      return {
        ok: false,
        message: envelope.error?.message ?? "Could not create Razorpay order.",
        status: response.status
      };
    }

    return { ok: true, order: envelope.data };
  } catch {
    return { ok: false, message: "Could not start Razorpay checkout right now. Please try again." };
  }
}

export async function verifyRazorpayPayment(payload: RazorpayVerifyPaymentPayload): Promise<RazorpayVerifyPaymentResult> {
  try {
    const response = await fetch("/api/razorpay/verify-payment", {
      body: JSON.stringify(payload),
      cache: "no-store",
      headers: {
        "Content-Type": "application/json"
      },
      method: "POST"
    });

    const envelope = await response.json() as {
      success?: boolean;
      data?: RazorpayVerifyPaymentResponse;
      error?: { message?: string };
    };

    if (!response.ok || !envelope.success || !envelope.data) {
      return {
        ok: false,
        message: envelope.error?.message ?? "Could not verify Razorpay payment.",
        status: response.status
      };
    }

    return { ok: true, verification: envelope.data };
  } catch {
    return { ok: false, message: "Could not verify Razorpay payment right now. Please try again." };
  }
}

export async function markDraftPaymentFailed(
  draftOrderId: string,
  payload: CustomerOrderDraftPaymentFailedPayload
): Promise<CustomerOrderDraftPaymentStatusResult> {
  try {
    const response = await fetch(`/api/customer-orders/draft/${encodeURIComponent(draftOrderId)}/payment-failed`, {
      body: JSON.stringify(payload),
      cache: "no-store",
      headers: {
        "Content-Type": "application/json"
      },
      method: "POST"
    });

    const envelope = await response.json() as {
      success?: boolean;
      data?: CustomerOrderDraftPaymentStatusResponse;
      error?: { message?: string };
    };

    if (!response.ok || !envelope.success || !envelope.data) {
      return {
        ok: false,
        message: envelope.error?.message ?? "Could not update draft payment status.",
        status: response.status
      };
    }

    return { ok: true, status: envelope.data };
  } catch {
    return { ok: false, message: "Could not update draft payment status right now. Please try again." };
  }
}
