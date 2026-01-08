import { test, expect } from "@playwright/test";
import { login, resetData } from "./helpers";

test("error notification shows and can be dismissed", async ({ page, request }) => {
  // Capture console logs
  page.on('console', msg => {
    console.log(`[BROWSER ${msg.type()}] ${msg.text()}`);
  });

  // Capture network requests
  page.on('request', req => {
    console.log(`[NET REQUEST] ${req.method()} ${req.url()}`);
  });
  page.on('response', res => {
    console.log('[NET RESPONSE]', res.status(), res.url());
  });

  await login(page, request);
  await resetData(page);

  // Intercept Supabase REST calls with error response
  console.log('[TEST] Setting up route intercept');
  await page.route('**/rest/**', async route => {
    console.log(`[TEST ROUTE] Intercepted: ${route.request().method()} ${route.request().url()}`);
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Mocked server error' })
    });
    console.log(`[TEST ROUTE] Fulfilled`);
  });
  console.log('[TEST] Route intercept ready');

  // Trigger mutation (create board - will fail)
  console.log('[TEST] Clicking add-board-button');
  await page.getByTestId("add-board-button").click();
  console.log('[TEST] Filling textbox');
  await page.getByRole("textbox").fill("Test");
  console.log('[TEST] Pressing Enter');
  await page.keyboard.press("Enter");
  console.log('[TEST] Enter pressed, waiting for error notification');

  // Assert error visible
  const notification = page.getByTestId('error-notification');
  await expect(notification).toBeVisible();

  // Dismiss all errors (multiple API calls may fail, showing sequential errors)
  while (await notification.isVisible()) {
    await notification.getByRole('button').click();
  }

  await expect(notification).toHaveCount(0);

  // Cleanup
  await page.unroute('**/rest/**');
});
