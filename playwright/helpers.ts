import { Page, APIRequestContext, expect } from "@playwright/test";

const SUPABASE_URL = "https://mbwrlksbjyhgvlwlaoov.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_L4oOlvlOYny8CGcGiv9S1w_Vz9aLjmV";
const SUPABASE_AUTH_KEY = "sb-mbwrlksbjyhgvlwlaoov-auth-token";

const TEST_EMAIL = "cypress@test.local";
const TEST_PASSWORD = "testpassword123";

export async function login(page: Page, request: APIRequestContext) {
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

  await page.addInitScript(
    ({ key, session }) => {
      localStorage.setItem(key, JSON.stringify(session));
    },
    { key: SUPABASE_AUTH_KEY, session }
  );

  await page.goto("/");
  await expect(page.getByText("Loading")).toBeHidden({ timeout: 15000 });
}

export async function resetData(page: Page) {
  await page.getByRole("button", { name: "Reset" }).click();
}
