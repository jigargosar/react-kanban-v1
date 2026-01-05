import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:5173",
    experimentalStudio: true,
    excludeSpecPattern: ["**/1-getting-started/**", "**/2-advanced-examples/**"],
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
  },
});
