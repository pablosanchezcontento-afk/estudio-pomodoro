import { expect, test } from "@playwright/test";

test("funciona sin conexión después de la primera visita", async ({ page, context }) => {
    await page.goto("/");
    await page.evaluate(async () => {
        const registro = await navigator.serviceWorker.ready;
        return registro.active?.state;
    });
    // Espera a que la instalación haya llenado la caché.
    await expect.poll(() => page.evaluate(async () => (await caches.keys()).length)).toBeGreaterThan(0);
    await context.setOffline(true);
    await page.reload();
    await expect(page.locator("#tiempo")).toHaveText("25:00");
    await page.locator("#iniciar").click();
    await expect(page.locator("#iniciar")).toHaveText("Pausar");
});
