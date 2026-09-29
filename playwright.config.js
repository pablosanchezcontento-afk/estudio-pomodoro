import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
    testDir: "e2e",
    fullyParallel: true,
    retries: process.env.CI ? 1 : 0,
    reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
    use: {
        baseURL: "http://127.0.0.1:4173",
        locale: "es-ES",
        timezoneId: "Europe/Madrid",
        // Permite usar un Chromium ya instalado (p. ej. PW_CHROMIUM=/ruta/chrome).
        launchOptions: process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {},
    },
    projects: [
        { name: "escritorio", use: { ...devices["Desktop Chrome"] } },
        { name: "movil", use: { ...devices["Pixel 7"] } },
    ],
    webServer: {
        command: "node e2e/servidor.mjs",
        url: "http://127.0.0.1:4173",
        reuseExistingServer: !process.env.CI,
    },
});
