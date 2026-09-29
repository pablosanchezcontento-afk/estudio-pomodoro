import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
    await page.clock.install({ time: new Date("2026-01-27T10:00:00+01:00") });
    await page.goto("/");
});

test("muestra 25:00 y el primer pomodoro del ciclo", async ({ page }) => {
    await expect(page.locator("#tiempo")).toHaveText("25:00");
    await expect(page.locator("#ciclo")).toHaveText("Pomodoro 1 de 4");
    await expect(page.locator("#iniciar")).toHaveText("Iniciar");
    await expect(page).toHaveTitle("Estudio Pomodoro");
});

test("iniciar, pausar y seguir con el botón", async ({ page }) => {
    await page.locator("#iniciar").click();
    await expect(page.locator("#iniciar")).toHaveText("Pausar");
    await page.clock.runFor(61_000);
    await expect(page.locator("#tiempo")).toHaveText("23:59");
    await expect(page).toHaveTitle(/23:59 · Enfoque/);
    await page.locator("#iniciar").click();
    await expect(page.locator("#iniciar")).toHaveText("Seguir");
    await page.clock.runFor(30_000);
    await expect(page.locator("#tiempo")).toHaveText("23:59");
});

test("un pomodoro completo pasa al descanso y cuenta en las estadísticas", async ({ page }) => {
    await page.locator("#iniciar").click();
    await page.clock.runFor(25 * 60_000 + 500);
    await expect(page.locator("#ciclo")).toHaveText("Descanso");
    await expect(page.locator("#tiempo")).toHaveText("05:00");
    await expect(page.locator("#anuncio")).toHaveText("¡Pomodoro completado! Toca descansar.");
    await expect(page.locator("#hoy-pomodoros")).toHaveText("1");
    await expect(page.locator("#racha")).toHaveText("1");
    await expect(page.locator('.fase[data-fase="descanso-corto"]')).toHaveAttribute("aria-pressed", "true");
});

test("atajos de teclado: espacio, R y S", async ({ page }) => {
    await page.keyboard.press(" ");
    await page.clock.runFor(2_000);
    await expect(page.locator("#iniciar")).toHaveText("Pausar");
    await page.keyboard.press("r");
    await expect(page.locator("#tiempo")).toHaveText("25:00");
    await page.keyboard.press("s");
    await expect(page.locator("#ciclo")).toHaveText("Descanso");
    // Saltar no cuenta como pomodoro completado.
    await expect(page.locator("#hoy-pomodoros")).toHaveText("0");
});

test("los atajos no se disparan mientras se escribe la tarea", async ({ page }) => {
    await page.locator("#tarea").fill("Repasar tema 3 ");
    await page.locator("#tarea").press("s");
    await expect(page.locator("#ciclo")).toHaveText("Pomodoro 1 de 4");
    await page.reload();
    await expect(page.locator("#tarea")).toHaveValue("Repasar tema 3 s");
});

test("los ajustes se guardan y sobreviven a una recarga", async ({ page }) => {
    await page.locator("#abrir-ajustes").click();
    const dialogo = page.locator("#ajustes");
    await expect(dialogo).toBeVisible();
    await dialogo.locator('input[name="enfoque"]').fill("50");
    await dialogo.locator('input[name="descansoCorto"]').fill("10");
    await dialogo.getByRole("button", { name: "Guardar" }).click();
    await expect(dialogo).toBeHidden();
    await expect(page.locator("#tiempo")).toHaveText("50:00");
    await page.reload();
    await expect(page.locator("#tiempo")).toHaveText("50:00");
    await page.locator("#abrir-ajustes").click();
    await expect(page.locator('input[name="descansoCorto"]')).toHaveValue("10");
});

test("cambiar de fase con los botones", async ({ page }) => {
    await page.locator('.fase[data-fase="descanso-largo"]').click();
    await expect(page.locator("#tiempo")).toHaveText("15:00");
    await expect(page.locator("#ciclo")).toHaveText("Descanso largo");
});

test("un temporizador en marcha sigue al recargar la página", async ({ page }) => {
    await page.locator("#iniciar").click();
    await page.clock.runFor(5 * 60_000);
    await page.reload();
    // El reloj simulado sigue corriendo tras recargar: la cuenta continúa desde ~20:00, no vuelve a 25:00.
    await expect(page.locator("#tiempo")).toHaveText(/^(20:00|19:[0-5]\d)$/);
    await expect(page.locator("#iniciar")).toHaveText("Pausar");
});

test("sin errores de accesibilidad (axe, WCAG 2.1 AA)", async ({ page }) => {
    const resultado = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(resultado.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
    await page.locator("#abrir-ajustes").click();
    const conDialogo = await new AxeBuilder({ page }).include("#ajustes").withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(conDialogo.violations.map((v) => v.id)).toEqual([]);
});
