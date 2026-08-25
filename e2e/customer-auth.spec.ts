import { expect, test, type Locator } from "@playwright/test";

const customerSession = {
  customerId: "22222222-2222-4222-8222-222222222222",
  identityEmail: "customer@example.com",
  displayName: "Production Customer",
  status: "ACTIVE",
  expiresAt: "2099-01-01T00:00:00.000Z"
};

test("customer requests an OTP, logs in, and continues to the requested page", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-08-18T12:00:00.000Z") });
  let loggedIn = false;
  const otpRequestBodies: Array<Record<string, unknown>> = [];
  let loginBody: Record<string, unknown> | null = null;

  await page.route("**/api/customer-profile", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      status: loggedIn ? 200 : 401,
      body: JSON.stringify(loggedIn
        ? { success: true, data: customerSession, authenticated: true }
        : { success: false, data: null, authenticated: false })
    });
  });
  await page.route("**/api/customer-otp/request", async (route) => {
    otpRequestBodies.push(route.request().postDataJSON() as Record<string, unknown>);
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: { destination: "c***@example.com", expiresAt: "2099-01-01T00:05:00.000Z" },
        error: null
      })
    });
  });
  await page.route("**/api/customer-login", async (route) => {
    loginBody = route.request().postDataJSON() as Record<string, unknown>;
    loggedIn = true;
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: customerSession, error: null })
    });
  });

  await page.goto("/login?next=%2Fproducts", { waitUntil: "domcontentloaded" });
  const sendOtp = page.getByRole("button", { name: "Send OTP" });
  await waitForReactHandler(sendOtp);
  await page.getByLabel("Email or mobile number").fill(" Customer@Example.com ");
  await expect(page.getByRole("link", { name: "Create an account" }))
    .toHaveAttribute("href", "/register?next=%2Fproducts");
  await sendOtp.click();

  await expect(page.getByText("Enter the code sent to c***@example.com. It is valid for 10 minutes.")).toBeVisible();
  await expect(page.getByText(/Resending is never automatic/)).toBeVisible();
  await page.clock.runFor(60_000);
  await page.getByRole("button", { name: "Resend OTP" }).click();
  await expect.poll(() => otpRequestBodies.length).toBe(2);
  await page.getByLabel("One-time code").fill("123456");
  await page.getByRole("button", { name: "Login and Continue" }).click();

  await expect(page).toHaveURL(/\/products$/);
  expect(otpRequestBodies).toEqual([
    { identity: "customer@example.com" },
    { identity: "customer@example.com" }
  ]);
  expect(loginBody).toEqual({ identity: "customer@example.com", otp: "123456" });
});

test("registration keeps all required fields, resends OTP, and leaves middle name optional", async ({ page }) => {
  test.setTimeout(60_000);
  await page.clock.install({ time: new Date("2026-08-18T12:00:00.000Z") });
  const registrationBodies: Array<Record<string, unknown>> = [];

  await page.route("**/api/customer-register", async (route) => {
    const body = route.request().postDataJSON() as Record<string, unknown>;
    registrationBodies.push(body);
    const verified = body.otp === "654321";
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          registrationStatus: verified ? "VERIFIED" : "OTP_SENT",
          customerId: "33333333-3333-4333-8333-333333333333",
          identityEmail: "new.customer@example.com",
          identityMobile: "9876543210",
          displayName: "New Customer"
        },
        error: null
      })
    });
  });

  await page.goto("/register", { waitUntil: "domcontentloaded" });
  const sendVerificationOtp = page.getByRole("button", { name: "Send verification OTP" });
  await waitForReactHandler(sendVerificationOtp);
  await page.getByLabel("First name *").fill("New");
  await page.getByLabel("Last name *").fill("Customer");
  await page.getByLabel("Email *").fill("New.Customer@Example.com");
  await page.getByLabel("Mobile number *").fill("9876543210");
  await sendVerificationOtp.click();

  await expect(page.getByText("OTP sent to your email and mobile. It is valid for 10 minutes. Enter the code to complete account creation.")).toBeVisible();
  await expect(page.getByText(/Resending is never automatic/)).toBeVisible();
  await expect(page.getByRole("button", { name: /Resend in 60s/ })).toBeDisabled();
  await page.clock.runFor(60_000);
  const resendOtp = page.getByRole("button", { name: "Resend OTP" });
  await expect(resendOtp).toBeEnabled();
  await resendOtp.click();
  await expect.poll(() => registrationBodies.length).toBe(2);
  await expect(page.getByRole("button", { name: /Resend in 60s/ })).toBeDisabled();

  await page.getByLabel("OTP verification code *").fill("654321");
  await page.getByRole("button", { name: "Verify OTP and create account" }).click();

  await expect(page.getByText("Account created for new.customer@example.com. You can now log in and continue.")).toBeVisible();
  expect(registrationBodies).toHaveLength(3);
  expect(registrationBodies[0]).toEqual({
    firstName: "New",
    lastName: "Customer",
    email: "new.customer@example.com",
    mobile: "9876543210"
  });
  expect(registrationBodies[1]).toEqual(registrationBodies[0]);
  expect(registrationBodies[2]).toEqual({ ...registrationBodies[0], otp: "654321" });
});

async function waitForReactHandler(locator: Locator) {
  await expect.poll(() => locator.evaluate((element) => (
    Object.keys(element).some((key) => key.startsWith("__reactProps"))
  ))).toBe(true);
}