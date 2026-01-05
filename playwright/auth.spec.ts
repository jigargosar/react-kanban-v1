import { test, expect } from "@playwright/test";

const SUPABASE_URL = "https://mbwrlksbjyhgvlwlaoov.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_L4oOlvlOYny8CGcGiv9S1w_Vz9aLjmV";
const SUPABASE_AUTH_KEY = "sb-mbwrlksbjyhgvlwlaoov-auth-token";

const TEST_EMAIL = "cypress@test.local";
const TEST_PASSWORD = "testpassword123";

test.beforeEach(async ({ page, request }) => {
  // Login via API
  const response = await request.post(
    `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
      },
      data: {
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      },
    }
  );
  const session = await response.json();

  // Set session in localStorage before navigating
  await page.addInitScript(
    ({ key, session }) => {
      localStorage.setItem(key, JSON.stringify(session));
    },
    { key: SUPABASE_AUTH_KEY, session }
  );

  await page.goto("/");
});

test("loads app with auth", async ({ page }) => {
  await expect(page.getByText("Sign in")).not.toBeVisible();
  await expect(page.getByText("Kanban")).toBeVisible();
});
