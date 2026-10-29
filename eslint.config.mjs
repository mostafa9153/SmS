import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "dist/**",
    "node_modules/**",
    ".agents/**",
    "scratch/**",
    ".claude/**",
    // One-off root artifacts (see CLAUDE.md "Ignore")
    "patch_*.js",
    "next-env.d.ts",
  ]),
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }],
      "@typescript-eslint/no-require-imports": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
      // Size guardrail: split a file by responsibility before it grows past this.
      "max-lines": ["warn", { max: 800, skipBlankLines: true, skipComments: true }],
    },
  },
  // The service-role client bypasses RLS: never import it into UI code.
  {
    files: ["components/**/*.{ts,tsx}", "lib/hooks/**/*.{ts,tsx}", "lib/stores/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", { paths: [{ name: "@/lib/supabase/admin", message: "Service-role client is server only; call an API route instead." }] }],
    },
  },
  // Ratchet: these paths are free of `any`, so a new one is an error. Add a path once it is clean.
  {
    files: [
      "lib/undo/**", "lib/academic/**", "lib/employees/**", "lib/api/**", "lib/notifications/**",
      "lib/supabase/write.ts", "components/sports/**",
    ],
    rules: { "@typescript-eslint/no-explicit-any": "error" },
  },
]);

export default eslintConfig;
