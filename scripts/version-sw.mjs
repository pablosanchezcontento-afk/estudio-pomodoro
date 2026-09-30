// Calcula la versión de la caché del service worker a partir del contenido de los
// archivos que guarda. Si cambia cualquiera, cambia la versión y los usuarios
// reciben la copia nueva sin tener que acordarse de subirla a mano.
//
//   node scripts/version-sw.mjs          reescribe VERSION en sw.js
//   node scripts/version-sw.mjs --check  sale con error si sw.js está desactualizado

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const SW = join(RAIZ, "sw.js");
const PATRON_VERSION = /const VERSION = "([^"]*)";/;

export function archivosCacheados(codigoSw) {
    const lista = codigoSw.match(/const ARCHIVOS = \[([\s\S]*?)\];/);
    if (!lista) {
        throw new Error("sw.js no declara const ARCHIVOS = [...]");
    }
    // "./" es la página de inicio, que ya está en la lista como index.html.
    return [...lista[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]).filter((ruta) => ruta !== "./");
}

export function calcularVersion(raiz = RAIZ) {
    const hash = createHash("sha256");
    for (const ruta of archivosCacheados(readFileSync(join(raiz, "sw.js"), "utf8"))) {
        hash.update(ruta);
        hash.update("\0");
        hash.update(readFileSync(join(raiz, ruta)));
        hash.update("\0");
    }
    return `estudio-pomodoro-${hash.digest("hex").slice(0, 12)}`;
}

export function versionActual(raiz = RAIZ) {
    const coincidencia = readFileSync(join(raiz, "sw.js"), "utf8").match(PATRON_VERSION);
    return coincidencia ? coincidencia[1] : null;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
    const esperada = calcularVersion();
    const actual = versionActual();
    if (process.argv.includes("--check")) {
        if (actual !== esperada) {
            console.error(`sw.js tiene ${actual}; los archivos cacheados corresponden a ${esperada}. Ejecuta: npm run version-sw`);
            process.exit(1);
        }
        console.log(`sw.js al día (${actual})`);
    } else {
        const codigo = readFileSync(SW, "utf8").replace(PATRON_VERSION, `const VERSION = "${esperada}";`);
        writeFileSync(SW, codigo);
        console.log(`VERSION = ${esperada}`);
    }
}
