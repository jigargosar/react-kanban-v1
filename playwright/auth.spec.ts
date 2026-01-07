import { test, expect } from "@playwright/test";
import { login, expectNoErrors } from "./helpers";

test.afterEach(async ({ page }) => {
  await expectNoErrors(page);
});

test.beforeEach(async ({ page, request }) => {
  await login(page, request);
});

test("loads app with auth", async ({ page }) => {
  await expect(page.getByText("Sign in")).not.toBeVisible();
  await expect(page.getByText("Kanban")).toBeVisible();
});
