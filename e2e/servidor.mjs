// Servidor estático mínimo para las pruebas E2E (sin dependencias).
import { createReadStream, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";

const RAIZ = resolve(import.meta.dirname, "..");
const TIPOS = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".webmanifest": "application/manifest+json",
};
const puerto = Number(process.env.PUERTO ?? 4173);

createServer((peticion, respuesta) => {
    const ruta = decodeURIComponent(new URL(peticion.url, "http://localhost").pathname);
    const archivo = normalize(join(RAIZ, ruta.endsWith("/") ? `${ruta}index.html` : ruta));
    if (archivo !== RAIZ && !archivo.startsWith(RAIZ + sep)) {
        respuesta.writeHead(403).end();
        return;
    }
    try {
        if (!statSync(archivo).isFile()) throw new Error("no es un archivo");
        respuesta.writeHead(200, { "Content-Type": TIPOS[extname(archivo)] ?? "application/octet-stream" });
        createReadStream(archivo).pipe(respuesta);
    } catch {
        respuesta.writeHead(404).end("No encontrado");
    }
}).listen(puerto, "127.0.0.1", () => console.log(`http://127.0.0.1:${puerto}`));
