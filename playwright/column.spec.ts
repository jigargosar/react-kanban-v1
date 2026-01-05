import { test, expect } from "@playwright/test";
import { login, resetData } from "./helpers";

test.beforeEach(async ({ page, request }) => {
  await login(page, request);
  await resetData(page);

  // Create a board first
  await page.getByRole("button", { name: "+ New Board" }).click();
  await page.getByRole("textbox").fill("Test Board");
  const boardResponse = page.waitForResponse((r) => r.url().includes("/rest/v1/boards") && r.status() === 201);
  await page.keyboard.press("Enter");
  await boardResponse;

  // Wait for board to be fully selected and "+ Add column" visible
  await expect(page.locator("select option:checked")).toHaveText("Test Board");
  await expect(page.getByRole("button", { name: "+ Add column" })).toBeVisible();
});

test("column CRUD", async ({ page }) => {
  // Create column
  await page.getByRole("button", { name: "+ Add column" }).click();
  await page.getByRole("textbox").last().fill("Todo");
  const createResponse = page.waitForResponse((r) => r.url().includes("/rest/v1/columns") && r.status() === 201);
  await page.keyboard.press("Enter");
  await createResponse;

  await expect(page.getByText("Todo")).toBeVisible();

  // Refresh and verify persistence
  await page.reload();
  await expect(page.getByText("Todo")).toBeVisible();

  // Rename column (double-click to edit)
  await page.getByText("Todo").dblclick();
  await page.getByRole("textbox").fill("Done");
  const updateResponse = page.waitForResponse((r) => r.url().includes("/rest/v1/columns") && (r.status() === 200 || r.status() === 204));
  await page.keyboard.press("Enter");
  await updateResponse;

  await expect(page.getByText("Done")).toBeVisible();

  // Refresh and verify rename persisted
  await page.reload();
  await expect(page.getByText("Done")).toBeVisible();

  // Delete column
  await page.getByRole("button", { name: "×" }).first().click();

  // Verify column deleted
  await expect(page.getByText("Done")).toBeHidden();
});
