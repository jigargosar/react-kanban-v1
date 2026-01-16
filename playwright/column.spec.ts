import { test, expect } from "@playwright/test";
import { login, resetData, expectNoErrors } from "./helpers";

test.afterEach(async ({ page }) => {
  await expectNoErrors(page);
});

test.beforeEach(async ({ page, request }) => {
  await login(page, request);
  await resetData(page);

  // Create a board first
  await page.getByRole("button", { name: "+ New Board" }).click();
  await page.getByRole("textbox").fill("Test Board");
  await page.keyboard.press("Enter");

  // Wait for board to be fully selected and "+ Add column" visible
  await expect(page.locator("select option:checked")).toHaveText("Test Board");
  await expect(page.getByRole("button", { name: "+ Add column" })).toBeVisible();
});

test("column CRUD", async ({ page }) => {
  // Create column
  await page.getByRole("button", { name: "+ Add column" }).click();
  await page.getByRole("textbox").last().fill("Todo");
  await page.keyboard.press("Enter");

  await expect(page.getByText("Todo")).toBeVisible();

  // Rename column (double-click to edit)
  await page.getByText("Todo").dblclick();
  await page.getByTestId("edit-column-input").fill("Done");
  await page.keyboard.press("Enter");

  await expect(page.getByText("Done")).toBeVisible();

  // Delete column
  await page.getByRole("button", { name: "×" }).first().click();

  // Verify column deleted
  await expect(page.getByText("Done")).toBeHidden();
});
