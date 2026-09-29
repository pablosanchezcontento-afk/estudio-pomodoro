import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        include: ["tests/**/*.test.js"],
        coverage: {
            include: ["js/temporizador.js", "js/estadisticas.js"],
            thresholds: { lines: 100, branches: 95, functions: 100 },
        },
    },
});
