import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sw = readFileSync(new URL("../sw.js", import.meta.url), "utf8");
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const listaEnCache = [...sw.matchAll(/^\s+"([^"]+)",$/gm)].map((m) => m[1]);

describe("service worker", () => {
    it("guarda en caché todos los módulos JavaScript de la app", () => {
        const modulos = readdirSync(new URL("../js", import.meta.url)).map((archivo) => `js/${archivo}`);
        for (const modulo of modulos) {
            expect(listaEnCache).toContain(modulo);
        }
    });

    it("guarda en caché los recursos que carga index.html", () => {
        const recursos = [...html.matchAll(/(?:href|src)="([^"#:]+)"/g)].map((m) => m[1].replace(/^\.\//, ""));
        for (const recurso of recursos) {
            expect(listaEnCache).toContain(recurso);
        }
    });
});
