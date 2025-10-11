module.exports = {
  env: {
    node: true,       // ✅ Enable Node.js globals like require, exports
    es2021: true,     // ✅ Allow modern JS features
  },
  extends: [
    "eslint:recommended",
  ],
  parserOptions: {
    ecmaVersion: "latest",
  },
  rules: {
    "no-undef": "off", // ✅ Prevent false warnings for Node globals
  },
};
