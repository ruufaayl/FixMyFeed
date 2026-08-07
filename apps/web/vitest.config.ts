import { defineConfig } from "vitest/config";

// Application-boundary unit tests (DTO mappers, context resolution) run under
// Vitest in a Node environment, isolated from the backend's node:test suite and
// from the UI component tests. No database or auth runtime is required here.
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
