import { test, expect } from "@playwright/test";
import { login, resetData } from "./helpers";

test.beforeEach(async ({ page, request }) => {
  page.on("console", (msg) => console.log(`[BROWSER] ${msg.text()}`));
  await login(page, request);
  await resetData(page);
});

test("board CRUD", async ({ page }) => {
  // Create board
  await page.getByRole("button", { name: "+ New Board" }).click();
  await page.getByRole("textbox").fill("My Board");
  await page.keyboard.press("Enter");

  await expect(page.locator("select option:checked")).toHaveText("My Board");

  // Rename board
  await page.getByRole("button", { name: "✎" }).click();
  await page.getByRole("textbox").fill("Renamed Board");
  await page.keyboard.press("Enter");

  await expect(page.locator("select option:checked")).toHaveText("Renamed Board");

  // Delete board
  await page.getByRole("button", { name: "×" }).click();

  // Verify board deleted - should show "+ New Board" only
  await expect(page.locator("select")).toBeHidden();
  await expect(page.getByRole("button", { name: "+ New Board" })).toBeVisible();
});
