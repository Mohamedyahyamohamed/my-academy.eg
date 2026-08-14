import nextVitals from "eslint-config-next/core-web-vitals";

const config = [
  ...nextVitals,
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "coverage/**",
      "playwright-report/**",
      "test-results/**",
    ],
  },
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      // These React Compiler diagnostics are not actionable for the current
      // React 18 codebase and would turn established effect patterns into
      // release-blocking errors.
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/incompatible-library": "off",
      "react-hooks/purity": "off",
    },
  },
  {
    files: ["e2e/**/*.ts", "tests/**/*.ts"],
    rules: {
      // Playwright/Vitest fixtures intentionally call test's `use` helper;
      // React's hook naming rule does not apply to these functions.
      "react-hooks/rules-of-hooks": "off",
    },
  },
];

export default config;

