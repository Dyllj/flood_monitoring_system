import js from "@eslint/js";
import globals from "globals";

export default [
  {
    files: ["**/*.js"],
    ignores: ["node_modules/**"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "script", // CommonJS
      globals: { ...globals.node, ...globals.es2021 },
    },
    rules: {
      "no-undef": "off", // Prevent false undefined errors
      "no-console": "off", // Allow console.log
    },
  },
];
