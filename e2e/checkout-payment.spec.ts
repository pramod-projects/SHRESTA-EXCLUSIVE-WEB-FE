import { expect, test, type Page } from "@playwright/test";

test("first Razorpay attempt places the order from a draft-owned payment", async ({ page }) => {
  test.setTimeout(60_000);
  const draftOrderId = "11111111-1111-4111-8111-111111111111";
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 15 * 60_000).toISOString();
  let createOrderBody: Record<string, unknown> | null = null;
  let placementBody: Record<string, unknown> | null = null;

  await page.route("**/api/customer-profile", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          customerId: "22222222-2222-4222-8222-222222222222",
          identityEmail: "checkout@example.com",
          displayName: "Checkout Customer",
          status: "ACTIVE",
          expiresAt: new Date(now.getTime() + 60 * 60_000).toISOString()
        },
        error: null
      })
    });
  });

  await page.route("**/api/customer-orders/draft", async (route) => {
    const requestBody = route.request().postDataJSON() as { lines: Array<{ productId: string; quantity: number }> };
    const line = requestBody.lines[0];
    if (!line) {
      throw new Error("Checkout draft request must contain a product line.");
    }
    await route.fulfill({
      contentType: "application/json",
      status: 201,
      body: JSON.stringify({
        success: true,
        data: {
          orderId: draftOrderId,
          orderNumber: "DRAFT-E2E-FIRST-ATTEMPT",
          customerId: "22222222-2222-4222-8222-222222222222",
          customerEmail: "checkout@example.com",
          status: "ACTIVE",
          cartSignature: `${line.productId}:${line.quantity}`,
          currency: "INR",
          subtotalPaise: 50_000,
          deliveryPaise: 0,
          discountPaise: 0,
          taxPaise: 0,
          totalPaise: 50_000,
          deliveryMode: "STANDARD",
          expiresAt,
          createdAt: now.toISOString(),
          lines: []
        },
        error: null
      })
    });
  });

  await page.route("**/api/razorpay/create-order", async (route) => {
    createOrderBody = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({
      contentType: "application/json",
      status: 201,
      body: JSON.stringify({
        success: true,
        data: { orderId: "order_provider_bound_to_draft", amount: 50_000, currency: "INR" },
        error: null
      })
    });
  });

  await page.route("**/api/razorpay/verify-payment", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: { verified: true, orderId: "order_provider_bound_to_draft", paymentId: "pay_first_attempt" },
        error: null
      })
    });
  });

  await page.route("**/api/customer-orders", async (route) => {
    placementBody = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({
      contentType: "application/json",
      status: 201,
      body: JSON.stringify({
        success: true,
        data: {
          orderNumber: "SHRESTA-E2E-FIRST",
          customerId: "22222222-2222-4222-8222-222222222222",
          customerEmail: "checkout@example.com",
          orderStatus: "CONFIRMED",
          paymentStatus: "CAPTURED",
          fulfillmentStatus: "PENDING",
          refundRequestStatus: "NONE",
          customerStageCode: "ORDER_CONFIRMED",
          customerStageLabel: "Order confirmed",
          customerStageIndex: 1,
          customerStageMeaning: "Payment captured and order confirmed",
          customerStageTerminal: false,
          currency: "INR",
          subtotalPaise: 50_000,
          deliveryPaise: 0,
          discountPaise: 0,
          taxPaise: 0,
          totalPaise: 50_000,
          deliveryMode: "STANDARD",
          paymentMethod: "UPI",
          lines: [],
          placedAt: now.toISOString(),
          statusEvents: [{
            eventType: "PAYMENT_STATUS",
            fromStatus: "PENDING",
            toStatus: "CAPTURED",
            actorType: "SYSTEM",
            note: null,
            createdAt: now.toISOString()
          }]
        },
        error: null
      })
    });
  });

  await page.route("https://checkout.razorpay.com/v1/checkout.js", async (route) => {
    await route.fulfill({
      contentType: "application/javascript",
      body: `window.__razorpayOpenCount = 0;
        window.Razorpay = class {
          constructor(options) { this.options = options; }
          on() {}
          open() {
            window.__razorpayOpenCount += 1;
            queueMicrotask(() => this.options.handler({
              razorpay_order_id: "order_provider_bound_to_draft",
              razorpay_payment_id: "pay_first_attempt",
              razorpay_signature: "valid_signature"
            }));
          }
        };`
    });
  });

  await reachConfirmedCheckoutReview(page, draftOrderId);
  await page.getByRole("button", { name: "Confirm & Pay" }).click();

  await expect(page.getByRole("heading", { name: "Order placed" })).toBeVisible();
  await expect(page.getByText("CAPTURED", { exact: true }).first()).toBeVisible();
  expect(createOrderBody).toEqual({ draftOrderId });
  expect(placementBody).toMatchObject({
    draftOrderId,
    razorpayPayment: {
      orderId: "order_provider_bound_to_draft",
      paymentId: "pay_first_attempt",
      signature: "valid_signature"
    }
  });
  expect(await page.evaluate(() => (window as typeof window & { __razorpayOpenCount?: number }).__razorpayOpenCount)).toBe(1);
});

test("failed Razorpay payment invalidates its draft and retry creates a fresh draft", async ({ page }) => {
  test.setTimeout(60_000);
  const failedDraftId = "44444444-4444-4444-8444-444444444444";
  const retryDraftId = "55555555-5555-4555-8555-555555555555";
  const now = new Date();
  let draftRequestCount = 0;
  let failedPaymentBody: Record<string, unknown> | null = null;
  let placementRequestCount = 0;

  await page.route("**/api/customer-profile", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          customerId: "22222222-2222-4222-8222-222222222222",
          identityEmail: "checkout@example.com",
          displayName: "Checkout Customer",
          status: "ACTIVE",
          expiresAt: new Date(now.getTime() + 60 * 60_000).toISOString()
        },
        error: null
      })
    });
  });
  await page.route("**/api/customer-orders/draft", async (route) => {
    draftRequestCount += 1;
    const requestBody = route.request().postDataJSON() as { lines: Array<{ productId: string; quantity: number }> };
    const line = requestBody.lines[0];
    if (!line) {
      throw new Error("Checkout draft request must contain a product line.");
    }
    const retry = draftRequestCount > 1;
    await route.fulfill({
      contentType: "application/json",
      status: 201,
      body: JSON.stringify({
        success: true,
        data: {
          orderId: retry ? retryDraftId : failedDraftId,
          orderNumber: retry ? "DRAFT-E2E-RETRY" : "DRAFT-E2E-FAILED",
          customerId: "22222222-2222-4222-8222-222222222222",
          customerEmail: "checkout@example.com",
          status: "ACTIVE",
          cartSignature: `${line.productId}:${line.quantity}`,
          currency: "INR",
          subtotalPaise: 50_000,
          deliveryPaise: 0,
          discountPaise: 0,
          taxPaise: 0,
          totalPaise: 50_000,
          deliveryMode: "STANDARD",
          expiresAt: new Date(now.getTime() + 15 * 60_000).toISOString(),
          createdAt: now.toISOString(),
          lines: []
        },
        error: null
      })
    });
  });
  await page.route("**/api/razorpay/create-order", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      status: 201,
      body: JSON.stringify({
        success: true,
        data: { orderId: "order_failed_attempt", amount: 50_000, currency: "INR" },
        error: null
      })
    });
  });
  await page.route("**/api/customer-orders/draft/*/payment-failed", async (route) => {
    failedPaymentBody = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          orderId: failedDraftId,
          orderNumber: "DRAFT-E2E-FAILED",
          draftStatus: "PAYMENT_FAILED",
          paymentStatus: "FAILED",
          invalidationReason: "Razorpay payment failed: Bank declined.",
          updatedAt: now.toISOString()
        },
        error: null
      })
    });
  });
  await page.route("**/api/customer-orders", async (route) => {
    placementRequestCount += 1;
    await route.abort();
  });
  await page.route("https://checkout.razorpay.com/v1/checkout.js", async (route) => {
    await route.fulfill({
      contentType: "application/javascript",
      body: `window.Razorpay = class {
        constructor(options) { this.options = options; this.listeners = {}; }
        on(event, callback) { this.listeners[event] = callback; }
        open() {
          queueMicrotask(() => this.listeners["payment.failed"]({
            error: {
              description: "Bank declined",
              metadata: { order_id: "order_failed_attempt", payment_id: "pay_failed_attempt" }
            }
          }));
        }
      };`
    });
  });

  await reachConfirmedCheckoutReview(page, failedDraftId);
  await page.getByRole("button", { name: "Confirm & Pay" }).click();

  await expect(page.getByRole("heading", { name: "Payment failed" })).toBeVisible();
  await expect(page.getByText("Backend status: FAILED", { exact: true })).toBeVisible();
  expect(failedPaymentBody).toEqual({
    eventType: "payment.failed",
    failureReason: "Razorpay payment failed: Bank declined.",
    razorpayOrderId: "order_failed_attempt",
    razorpayPaymentId: "pay_failed_attempt"
  });
  expect(placementRequestCount).toBe(0);

  await page.getByRole("button", { name: "Try Payment Again" }).click();
  await expect(page).toHaveURL(new RegExp(`/checkout\\?orderId=${retryDraftId}$`));
  await expect(page.getByText("DRAFT-E2E-RETRY", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Confirm & Pay" })).toBeVisible();
  expect(draftRequestCount).toBe(2);
});

async function reachConfirmedCheckoutReview(page: Page, draftOrderId: string) {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const addToCart = page.getByRole("button", { name: "Add to Cart", exact: true }).first();
  await expect.poll(() => addToCart.evaluate((element) => (
    Object.keys(element).some((key) => key.startsWith("__reactProps"))
  ))).toBe(true);
  await addToCart.click();
  await expect(page.getByRole("link", { name: "Cart with 1 items" })).toBeVisible();
  await page.goto("/cart", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Proceed To Checkout" }).click();
  await expect(page).toHaveURL(new RegExp(`/checkout\\?orderId=${draftOrderId}$`));

  await page.getByLabel("Email").fill("checkout@example.com");
  await page.getByRole("textbox", { name: "10 digit mobile number" }).fill("9876543210");
  await page.getByLabel("Full name").fill("Checkout Customer");
  await page.getByLabel("PIN code").fill("560001");
  await page.getByLabel("Address line 1").fill("1 Production Road");
  await page.getByRole("button", { name: "Continue to Delivery" }).click();
  await page.getByRole("button", { name: "Review Order" }).click();
  await page.getByLabel("I confirm the delivery details and product list for this SHRESTA order.").check();
}