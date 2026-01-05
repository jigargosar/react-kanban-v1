const SUPABASE_AUTH_KEY = "sb-mbwrlksbjyhgvlwlaoov-auth-token";

describe("Auth", () => {
  beforeEach(() => {
    cy.fixture("supabaseSession.json").then((session) => {
      cy.visit("/", {
        onBeforeLoad(win) {
          win.localStorage.setItem(SUPABASE_AUTH_KEY, JSON.stringify(session));
        },
      });
    });
  });

  it("loads app with auth", () => {
    cy.contains("Sign in").should("not.exist");
  });
});
