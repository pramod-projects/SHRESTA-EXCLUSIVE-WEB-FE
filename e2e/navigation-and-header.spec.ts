import { expect, test } from "@playwright/test";

test("desktop search does not overlap center nav links", async ({ page }) => {
  await page.setViewportSize({ width: 1500, height: 760 });
  await page.goto("/support");

  await page.getByRole("button", { name: "Open search" }).click();

  const overlap = await page.evaluate(() => {
    const navLink = Array.from(document.querySelectorAll("a")).find((a) => (a.textContent || "").trim() === "New Arrivals");
    const searchInput = document.querySelector('input[name="query"]');

    if (!(navLink instanceof HTMLElement) || !(searchInput instanceof HTMLElement)) {
      return { found: false, overlapArea: -1 };
    }

    const navRect = navLink.getBoundingClientRect();
    const searchRect = searchInput.getBoundingClientRect();
    const overlapX = Math.max(0, Math.min(navRect.right, searchRect.right) - Math.max(navRect.left, searchRect.left));
    const overlapY = Math.max(0, Math.min(navRect.bottom, searchRect.bottom) - Math.max(navRect.top, searchRect.top));

    return {
      found: true,
      overlapArea: overlapX * overlapY,
      overlapX,
      overlapY
    };
  });

  expect(overlap.found).toBe(true);
  expect(overlap.overlapArea).toBe(0);
});

test("cart page can navigate to key routes", async ({ page }) => {
  await page.goto("/cart");

  await page.getByRole("link", { name: "View wishlist" }).click();
  await expect(page).toHaveURL(/\/wishlist$/);

  await page.goto("/cart");
  await page.getByRole("link", { name: "SHRESTA EXCLUSIVE home" }).click();
  await expect(page).toHaveURL(/\/$/);

  await page.goto("/cart");
  await page.getByRole("link", { name: "Privacy Policy" }).click();
  await expect(page).toHaveURL(/\/privacy$/);
});

test("admin orders require an authenticated admin session", async ({ page }) => {
  await page.goto("/admin/orders");

  await expect(page).toHaveURL(/\/admin-login\?.*reason=login_required/);
  await expect(page.getByRole("heading", { name: "Please login" })).toBeVisible();
  await expect(page.getByText("Please login to open admin pages.")).toBeVisible();
});
