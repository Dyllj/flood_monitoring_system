import js from "@eslint/js";
import globals from "globals";

export default [
  {
    ignores: ["node_modules/**"],
  },
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "commonjs", // ✅ for require/exports
      globals: {
        ...globals.node,      // ✅ Enables Node.js globals like require, exports
        ...globals.es2021,
      },
    },
    plugins: {},
    rules: {
      "no-undef": "off",      // ✅ Prevent false "require not defined" errors
    },
  },
];
