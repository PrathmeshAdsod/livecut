import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    "dist/**",
    ".vinext/**",
    ".wrangler/**",
    ".sites-runtime/**",
    "outputs/**",
    "work/**",
    ".local/**",
    "test-results/**",
    "playwright-report/**",
  ]),
  {
    // This Vinext app uses deliberate full document navigation, including OAuth.
    // SVG scenes and tiny avatars need no image optimization service.
    files: ["app/**/*.{ts,tsx}", "components/**/*.{ts,tsx}"],
    rules: {
      "@next/next/no-html-link-for-pages": "off",
      "@next/next/no-img-element": "off",
      "@next/next/no-location-assign-relative-destination": "off",
      // Initial browser-only state is synchronized after SSR to avoid hydration mismatch.
      "react-hooks/set-state-in-effect": "off",
    },
  },
]);

export default eslintConfig;
