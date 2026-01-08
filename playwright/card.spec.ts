import { test, expect } from "@playwright/test";
import { login, resetData, expectNoErrors } from "./helpers";

test.afterEach(async ({ page }) => {
  await expectNoErrors(page);
});

test.beforeEach(async ({ page, request }) => {
  await login(page, request);
  await resetData(page);

  // Create board
  await page.getByRole("button", { name: "+ New Board" }).click();
  await page.getByRole("textbox").fill("Test Board");
  await page.keyboard.press("Enter");
  await expect(page.locator("select option:checked")).toHaveText("Test Board");
  await expect(page.getByRole("button", { name: "+ Add column" })).toBeVisible();

  // Create column
  await page.getByRole("button", { name: "+ Add column" }).click();
  await page.getByRole("textbox").last().fill("Todo");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "+ Add card", exact: true })).toBeVisible();
});

test("card CRUD", async ({ page }) => {
  // Create card
  await page.getByRole("button", { name: "+ Add card", exact: true }).click();
  await page.getByRole("textbox").last().fill("My Task");
  await page.keyboard.press("Enter");

  await expect(page.getByText("My Task")).toBeVisible();

  // Rename card (double-click to edit)
  await page.getByText("My Task").dblclick();
  await page.getByRole("textbox").fill("Updated Task");
  await page.keyboard.press("Enter");

  await expect(page.getByText("Updated Task")).toBeVisible();

  // Delete card
  await page.getByText("Updated Task").hover();
  await page.getByRole("button", { name: "×" }).last().click();

  // Verify card deleted
  await expect(page.getByText("Updated Task")).toBeHidden();
});

test("multiple cards", async ({ page }) => {
  // Click Add card once, then add multiple cards via same input
  await page.getByRole("button", { name: "+ Add card", exact: true }).click();

  for (const title of ["Task 1", "Task 2", "Task 3"]) {
    await page.getByPlaceholder("Card title...").fill(title);
    await page.keyboard.press("Enter");
    await expect(page.getByText(title)).toBeVisible();
  }

  // Close input
  await page.keyboard.press("Escape");

  // Verify original order - cards have role="button" from dnd-kit
  const cardContainer = page.locator('.bg-gray-800').first().locator('> div:nth-child(2)');
  const cards = cardContainer.locator('> div[role="button"]');
  await expect(cards).toHaveCount(3);
  await expect(cards.nth(0)).toContainText("Task 1");
  await expect(cards.nth(1)).toContainText("Task 2");
  await expect(cards.nth(2)).toContainText("Task 3");

  // Drag Task 3 above Task 1
  await cards.nth(2).dragTo(cards.nth(0), { steps: 10 });

  // Verify new order
  await expect(cards.nth(0)).toContainText("Task 3");
  await expect(cards.nth(1)).toContainText("Task 1");
  await expect(cards.nth(2)).toContainText("Task 2");
});
