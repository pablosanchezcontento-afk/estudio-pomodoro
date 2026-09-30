import js from "@eslint/js";
import globals from "globals";

export default [
    { ignores: ["node_modules/", "coverage/", "playwright-report/", "test-results/"] },
    js.configs.recommended,
    {
        files: ["js/**/*.js"],
        languageOptions: { globals: globals.browser },
    },
    {
        files: ["sw.js"],
        languageOptions: { globals: globals.serviceworker },
    },
    {
        files: ["tests/**/*.js", "e2e/**/*.{js,mjs}", "scripts/**/*.mjs", "*.config.js"],
        languageOptions: { globals: { ...globals.node, ...globals.browser } },
    },
    {
        rules: {
            eqeqeq: "error",
            "no-var": "error",
            "prefer-const": "error",
        },
    },
];
