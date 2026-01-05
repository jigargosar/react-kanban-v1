import { test, expect } from "@playwright/test";
import { login, resetData } from "./helpers";

test.beforeEach(async ({ page, request }) => {
  await login(page, request);
  await resetData(page);
});

test("board CRUD", async ({ page }) => {
  // Create board
  await page.getByRole("button", { name: "+ New Board" }).click();
  await page.getByRole("textbox").fill("My Board");
  const createResponse = page.waitForResponse((r) => r.url().includes("/rest/v1/boards") && r.status() === 201);
  await page.keyboard.press("Enter");
  await createResponse;

  await expect(page.locator("select option:checked")).toHaveText("My Board");

  // Refresh and verify create persisted
  await page.reload();
  await expect(page.locator("select option:checked")).toHaveText("My Board");

  // Rename board
  await page.getByRole("button", { name: "✎" }).click();
  await page.getByRole("textbox").fill("Renamed Board");
  const updateResponse = page.waitForResponse((r) => r.url().includes("/rest/v1/boards") && r.status() < 300);
  await page.keyboard.press("Enter");
  await updateResponse;

  await expect(page.locator("select option:checked")).toHaveText("Renamed Board");

  // Refresh and verify persistence
  await page.reload();
  await expect(page.locator("select option:checked")).toHaveText("Renamed Board");

  // Delete board
  await page.getByRole("button", { name: "×" }).click();

  // Verify board deleted - should show "+ New Board" only
  await expect(page.locator("select")).toBeHidden();
  await expect(page.getByRole("button", { name: "+ New Board" })).toBeVisible();
});
