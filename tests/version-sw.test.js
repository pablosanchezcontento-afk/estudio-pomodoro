import { appendFileSync, cpSync, existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { archivosCacheados, calcularVersion, versionActual } from "../scripts/version-sw.mjs";

describe("versión de la caché del service worker", () => {
    it("coincide con el contenido de los archivos cacheados (si falla: npm run version-sw)", () => {
        expect(versionActual()).toBe(calcularVersion());
    });

    it("solo cachea archivos que existen", () => {
        for (const ruta of archivosCacheados(readFileSync("sw.js", "utf8"))) {
            expect(existsSync(ruta), ruta).toBe(true);
        }
    });

    it("cambia cuando cambia cualquier archivo cacheado", () => {
        const copia = mkdtempSync(join(tmpdir(), "pomodoro-sw-"));
        try {
            cpSync("sw.js", join(copia, "sw.js"));
            for (const ruta of archivosCacheados(readFileSync("sw.js", "utf8"))) {
                cpSync(ruta, join(copia, ruta), { recursive: true });
            }
            const antes = calcularVersion(copia);
            expect(antes).toBe(calcularVersion());
            appendFileSync(join(copia, "css/estilos.css"), "\n/* cambio */\n");
            expect(calcularVersion(copia)).not.toBe(antes);
        } finally {
            rmSync(copia, { recursive: true, force: true });
        }
    });
});
