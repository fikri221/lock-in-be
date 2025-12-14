import js from "@eslint/js";
import globals from "globals";
import { defineConfig } from "eslint/config";

export default defineConfig([
  { files: ["**/*.{js,mjs,cjs}"], plugins: { js }, rules: { ...js.configs.recommended.rules }, languageOptions: { globals: { ...globals.node, ...globals.jest } } },
]);
