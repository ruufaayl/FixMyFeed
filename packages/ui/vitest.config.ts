import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Frontend component tests run under Vitest + jsdom, isolated from the backend's
// node:test suite. Tests exercise the built dist (matching the repo convention).
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    include: ["tests/**/*.test.tsx"],
    globals: true,
  },
});
