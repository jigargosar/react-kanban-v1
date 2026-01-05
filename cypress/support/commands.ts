/// <reference types="cypress" />

const SUPABASE_URL = "https://mbwrlksbjyhgvlwlaoov.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_L4oOlvlOYny8CGcGiv9S1w_Vz9aLjmV";
const SUPABASE_AUTH_KEY = "sb-mbwrlksbjyhgvlwlaoov-auth-token";

const TEST_EMAIL = "cypress@test.local";
const TEST_PASSWORD = "testpassword123";

Cypress.Commands.add("login", () => {
  cy.request({
    method: "POST",
    url: `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      "Content-Type": "application/json",
    },
    body: {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    },
  }).then((response) => {
    cy.visit("/", {
      onBeforeLoad(win) {
        win.localStorage.setItem(SUPABASE_AUTH_KEY, JSON.stringify(response.body));
      },
    });
    cy.contains("Sign in").should("not.exist");
  });
});

Cypress.Commands.add("resetData", () => {
  // Wait for loading to finish
  cy.contains("Loading").should("not.exist");
  cy.contains("button", "Reset").click();
});

declare global {
  namespace Cypress {
    interface Chainable {
      login(): Chainable<void>;
      resetData(): Chainable<void>;
    }
  }
}
