// Service worker: guarda la aplicación en caché para que funcione sin conexión.
// VERSION es un hash del contenido de ARCHIVOS: lo calcula `npm run version-sw`
// y un test falla si queda desactualizado, así que no hay que subirla a mano.

const VERSION = "estudio-pomodoro-bc0e35d0477b";
const ARCHIVOS = [
    "./",
    "index.html",
    "css/estilos.css",
    "js/app.js",
    "js/almacen.js",
    "js/estadisticas.js",
    "js/sonido.js",
    "js/temporizador.js",
    "manifest.webmanifest",
    "iconos/icono.svg",
    "iconos/icono-192.png",
    "iconos/icono-512.png",
];

self.addEventListener("install", (evento) => {
    evento.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(ARCHIVOS)));
    self.skipWaiting();
});

self.addEventListener("activate", (evento) => {
    evento.waitUntil(
        caches.keys().then((claves) =>
            Promise.all(claves.filter((clave) => clave !== VERSION).map((clave) => caches.delete(clave))),
        ),
    );
    self.clients.claim();
});

// Primero la caché; si no está, la red.
self.addEventListener("fetch", (evento) => {
    if (evento.request.method !== "GET") {
        return;
    }
    evento.respondWith(
        caches.match(evento.request, { ignoreSearch: true }).then((respuesta) => respuesta ?? fetch(evento.request)),
    );
});
