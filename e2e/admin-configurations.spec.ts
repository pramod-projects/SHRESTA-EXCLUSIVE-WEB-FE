import { expect, test } from "@playwright/test";
import { ADMIN_SESSION_COOKIE, createAdminSessionToken } from "@/features/admin/admin-auth";

test.beforeEach(async ({ context }) => {
  const baseURL = `http://127.0.0.1:${process.env.PLAYWRIGHT_PORT ?? "3010"}`;
  const token = createAdminSessionToken("e2e.change-manager@shresta.local", "CHANGE_MANAGER");
  await context.addCookies([{
    name: ADMIN_SESSION_COOKIE,
    value: token,
    url: baseURL,
    httpOnly: true,
    sameSite: "Lax"
  }]);
});

test("admin configurations preserve the legacy route and expose reviewed refund controls", async ({ page }) => {
  const failedResponses: string[] = [];
  page.on("response", (response) => {
    if (response.status() >= 500) {
      failedResponses.push(`${response.status()} ${response.url()}`);
    }
  });

  await page.goto("/admin/notifications");

  await expect(page).toHaveURL(/\/admin\/configurations$/);
  await expect(page.getByRole("heading", { name: "Configurations", exact: true })).toBeVisible();
  await expect(page.getByText("Changes require approval", { exact: true })).toBeVisible();

  const refundPanel = page.locator("details").filter({ hasText: "Refund Policy" });
  const notificationPanel = page.locator("details").filter({ hasText: "Notification Delivery" });
  await expect(refundPanel).toHaveAttribute("open", "");
  await expect(refundPanel.getByText("3 days", { exact: true }).first()).toBeVisible();
  await expect(refundPanel.getByLabel("Days after delivery")).toHaveValue("3");
  await expect(refundPanel.getByRole("button", { name: "Create pending review" })).toBeDisabled();
  await expect(notificationPanel).not.toHaveAttribute("open", "");

  await notificationPanel.getByText("Notification Delivery", { exact: true }).click();
  await expect(notificationPanel).toHaveAttribute("open", "");
  await expect(notificationPanel.getByRole("switch")).toHaveCount(13);
  await expect(notificationPanel.getByText("Live: Enabled").first()).toBeVisible();

  const layout = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth
  }));
  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth);
  expect(failedResponses).toEqual([]);
});