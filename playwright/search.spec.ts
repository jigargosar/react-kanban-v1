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

  // Create column
  await page.getByRole("button", { name: "+ Add column" }).click();
  await page.getByRole("textbox").last().fill("Todo");
  await page.keyboard.press("Enter");

  // Create cards
  await page.getByRole("button", { name: "+ Add card", exact: true }).click();
  for (const title of ["Apple", "Banana", "Cherry"]) {
    await page.getByPlaceholder("Card title...").fill(title);
    await page.keyboard.press("Enter");
  }
  await page.keyboard.press("Escape");
});

test("search filters cards by title", async ({ page }) => {
  // All cards visible initially
  await expect(page.getByText("Apple")).toBeVisible();
  await expect(page.getByText("Banana")).toBeVisible();
  await expect(page.getByText("Cherry")).toBeVisible();

  // Search for "an" - matches Banana
  await page.getByPlaceholder("Search cards...").fill("an");
  await expect(page.getByText("Banana")).toBeVisible();
  await expect(page.getByText("Apple")).toBeHidden();
  await expect(page.getByText("Cherry")).toBeHidden();

  // Clear search
  await page.getByPlaceholder("Search cards...").fill("");
  await expect(page.getByText("Apple")).toBeVisible();
  await expect(page.getByText("Banana")).toBeVisible();
  await expect(page.getByText("Cherry")).toBeVisible();
});

test("search shows 'No cards match' when no results", async ({ page }) => {
  await page.getByPlaceholder("Search cards...").fill("xyz");
  await expect(page.getByText("No cards match")).toBeVisible();
});

test("search clear button works", async ({ page }) => {
  const searchInput = page.getByPlaceholder("Search cards...");
  await searchInput.fill("test");

  // Click clear button
  await searchInput.locator("..").getByRole("button").click();

  await expect(searchInput).toHaveValue("");
});
