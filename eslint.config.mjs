// ESLint 9 flat config for the FixMyFeed monorepo (task T001).
// Lints workspace TypeScript and repository tooling scripts. Formatting is owned
// by Prettier; eslint-config-prettier disables any rules that would conflict.
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";
import globals from "globals";

export default tseslint.config(
  {
    // Not owned by tooling: dependencies, build output, lockfiles, and the
    // authoritative specification documents.
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/*.tsbuildinfo",
      "feed-doctor-implementation-specifications-v1.0.0/**",
      "feed-doctor-specifications-foundation-v0.1.0/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // Workspace source.
    files: ["apps/**/*.ts", "packages/**/*.ts"],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
      globals: { ...globals.node },
    },
    rules: {
      "no-console": "warn",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    // Repository tooling and tests (plain ESM, no type info required).
    files: ["tests/**/*.mjs", "tools/**/*.mjs", "*.mjs"],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
      globals: { ...globals.node },
    },
  },
  prettier,
);
