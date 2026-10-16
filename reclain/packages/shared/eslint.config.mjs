import { defineConfig } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  // This package has no pages of its own; the apps that use it do.
  { rules: { "@next/next/no-html-link-for-pages": "off" } },
]);
