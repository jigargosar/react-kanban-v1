import { test, expect } from "@playwright/test";
import { login, resetData } from "./helpers";

test.beforeEach(async ({ page, request }) => {
  await login(page, request);
  await resetData(page);

  // Create board
  await page.getByRole("button", { name: "+ New Board" }).click();
  await page.getByRole("textbox").fill("Test Board");
  const boardResponse = page.waitForResponse((r) => r.url().includes("/rest/v1/boards") && r.status() === 201);
  await page.keyboard.press("Enter");
  await boardResponse;
  await expect(page.locator("select option:checked")).toHaveText("Test Board");
  await expect(page.getByRole("button", { name: "+ Add column" })).toBeVisible();

  // Create column
  await page.getByRole("button", { name: "+ Add column" }).click();
  await page.getByRole("textbox").last().fill("Todo");
  const colResponse = page.waitForResponse((r) => r.url().includes("/rest/v1/columns") && r.status() === 201);
  await page.keyboard.press("Enter");
  await colResponse;
  await expect(page.getByRole("button", { name: "+ Add card", exact: true })).toBeVisible();
});

test("card CRUD", async ({ page }) => {
  // Create card
  await page.getByRole("button", { name: "+ Add card", exact: true }).click();
  await page.getByRole("textbox").last().fill("My Task");
  const createResponse = page.waitForResponse((r) => r.url().includes("/rest/v1/cards") && r.status() === 201);
  await page.keyboard.press("Enter");
  await createResponse;

  await expect(page.getByText("My Task")).toBeVisible();

  // Refresh and verify persistence
  await page.reload();
  await expect(page.getByText("My Task")).toBeVisible();

  // Rename card (double-click to edit)
  await page.getByText("My Task").dblclick();
  await page.getByRole("textbox").fill("Updated Task");
  const updateResponse = page.waitForResponse((r) => r.url().includes("/rest/v1/cards") && r.status() < 300);
  await page.keyboard.press("Enter");
  await updateResponse;

  await expect(page.getByText("Updated Task")).toBeVisible();

  // Refresh and verify rename persisted
  await page.reload();
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
    const response = page.waitForResponse((r) => r.url().includes("/rest/v1/cards") && r.status() === 201);
    await page.keyboard.press("Enter");
    await response;
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

  // Drag Task 3 above Task 1 using pointer events (dnd-kit uses pointer, not mouse)
  const source = cards.nth(2);
  const target = cards.nth(0);
  const sourceBox = await source.boundingBox();
  const targetBox = await target.boundingBox();

  await page.mouse.move(sourceBox!.x + sourceBox!.width / 2, sourceBox!.y + sourceBox!.height / 2);
  await page.mouse.down();
  await page.mouse.move(targetBox!.x + targetBox!.width / 2, targetBox!.y + targetBox!.height / 2, { steps: 10 });
  await page.mouse.up();

  // Verify new order before refresh
  await expect(cards.nth(0)).toContainText("Task 3");
  await expect(cards.nth(1)).toContainText("Task 1");
  await expect(cards.nth(2)).toContainText("Task 2");

  // Verify order persists after refresh
  await page.reload();
  const reloadedContainer = page.locator('.bg-gray-800').first().locator('> div:nth-child(2)');
  const reloadedCards = reloadedContainer.locator('> div[role="button"]');
  await expect(reloadedCards.nth(0)).toContainText("Task 3");
  await expect(reloadedCards.nth(1)).toContainText("Task 1");
  await expect(reloadedCards.nth(2)).toContainText("Task 2");
});
