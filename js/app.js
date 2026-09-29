// Interfaz: conecta la lógica del temporizador con el DOM, el almacenamiento,
// las notificaciones y el sonido.

import { borrar, guardar, leer } from "./almacen.js";
import {
    formatearMinutos,
    datosDelDia,
    minutosSemana,
    normalizarHistorial,
    racha,
    registrarPomodoro,
    ultimosDias,
} from "./estadisticas.js";
import { sonarAviso } from "./sonido.js";
import {
    FASES,
    avanzar,
    cambiarFase,
    crearEstado,
    duracionDe,
    enMarcha,
    formatear,
    haTerminado,
    iniciar,
    normalizarConfig,
    pausar,
    progreso,
    reiniciar,
    restante,
} from "./temporizador.js";

const NOMBRES_FASE = {
    [FASES.ENFOQUE]: "Enfoque",
    [FASES.DESCANSO_CORTO]: "Descanso",
    [FASES.DESCANSO_LARGO]: "Descanso largo",
};
const DIAS_SEMANA = ["D", "L", "M", "X", "J", "V", "S"];

const $ = (selector) => document.querySelector(selector);

// ---------- Estado ----------

let config = normalizarConfig(leer("config", {}));
let preferencias = { sonido: true, ...leer("preferencias", {}) };
let historial = normalizarHistorial(leer("historial", {}));
let estado = cargarEstado();

function cargarEstado() {
    const guardado = leer("estado", null);
    const valido =
        guardado &&
        Object.values(FASES).includes(guardado.fase) &&
        Number.isFinite(guardado.restanteMs) &&
        (guardado.finEn === null || Number.isFinite(guardado.finEn));
    return valido ? guardado : crearEstado(config);
}

function persistir() {
    guardar("estado", estado);
}

// ---------- Pintar ----------

function pintarTemporizador() {
    const ahora = Date.now();
    const ms = restante(estado, ahora);
    const texto = formatear(ms);

    document.body.dataset.fase = estado.fase;
    $("#tiempo").textContent = texto;
    const avance = progreso(estado, config, ahora);
    $("#avance").style.strokeDashoffset = String(100 - avance * 100);
    // Con el trazo redondeado, un progreso 0 dejaría un punto suelto.
    $("#avance").style.opacity = avance > 0 ? "1" : "0";
    $("#iniciar").textContent = enMarcha(estado) ? "Pausar" : ms < duracionDe(estado.fase, config) ? "Seguir" : "Iniciar";

    const numero = Math.min(estado.completadosEnCiclo + 1, config.pomodorosHastaLargo);
    $("#ciclo").textContent =
        estado.fase === FASES.ENFOQUE ? `Pomodoro ${numero} de ${config.pomodorosHastaLargo}` : NOMBRES_FASE[estado.fase];

    for (const boton of document.querySelectorAll(".fase")) {
        boton.setAttribute("aria-pressed", String(boton.dataset.fase === estado.fase));
    }

    document.title = enMarcha(estado) ? `${texto} · ${NOMBRES_FASE[estado.fase]}` : "Estudio Pomodoro";
}

function pintarEstadisticas() {
    const hoy = new Date();
    const deHoy = datosDelDia(historial, hoy);
    $("#hoy-pomodoros").textContent = deHoy.pomodoros;
    $("#hoy-minutos").textContent = formatearMinutos(deHoy.minutos);
    $("#racha").textContent = racha(historial, hoy);
    $("#semana-minutos").textContent = formatearMinutos(minutosSemana(historial, hoy));

    const dias = ultimosDias(historial, hoy);
    const maximo = Math.max(1, ...dias.map((d) => d.pomodoros));
    const barras = dias.map((dia, i) => {
        const barra = document.createElement("div");
        barra.className = i === dias.length - 1 ? "barra hoy" : "barra";
        barra.innerHTML = `
            <span class="barra-valor">${dia.pomodoros || ""}</span>
            <div class="barra-relleno" style="height: ${(dia.pomodoros / maximo) * 100}%"></div>
            <span class="barra-dia">${DIAS_SEMANA[dia.fecha.getDay()]}</span>`;
        return barra;
    });
    $("#grafica").replaceChildren(...barras);
    const resumen = dias.map((d) => `${DIAS_SEMANA[d.fecha.getDay()]}: ${d.pomodoros}`).join(", ");
    $("#grafica").setAttribute("aria-label", `Pomodoros de los últimos 7 días. ${resumen}`);
}

// ---------- Acciones ----------

function alternar() {
    const ahora = Date.now();
    estado = enMarcha(estado) ? pausar(estado, ahora) : iniciar(estado, ahora);
    persistir();
    pintarTemporizador();
}

function reiniciarFase() {
    estado = reiniciar(estado, config);
    persistir();
    pintarTemporizador();
}

function pasarDeFase(completado) {
    const faseAnterior = estado.fase;
    const resultado = avanzar(estado, config, { completado, ahora: Date.now() });
    estado = resultado.estado;

    if (resultado.pomodoroCompletado) {
        historial = registrarPomodoro(historial, new Date(), config.enfoque);
        guardar("historial", historial);
        pintarEstadisticas();
    }
    if (completado) {
        avisar(faseAnterior);
    }
    persistir();
    pintarTemporizador();
}

function avisar(faseTerminada) {
    const mensaje =
        faseTerminada === FASES.ENFOQUE ? "¡Pomodoro completado! Toca descansar." : "Fin del descanso. ¡A por el siguiente!";
    $("#anuncio").textContent = mensaje;
    if (preferencias.sonido) {
        sonarAviso();
    }
    if ("Notification" in window && Notification.permission === "granted" && document.hidden) {
        const tarea = $("#tarea").value.trim();
        new Notification("Estudio Pomodoro", {
            body: tarea && faseTerminada === FASES.ENFOQUE ? `${mensaje}\n${tarea}` : mensaje,
            icon: "iconos/icono-192.png",
            tag: "estudio-pomodoro",
        });
    }
}

function tic() {
    if (enMarcha(estado) && haTerminado(estado, Date.now())) {
        pasarDeFase(true);
    } else {
        pintarTemporizador();
    }
}

// ---------- Ajustes ----------

function abrirAjustes() {
    const form = $("#form-ajustes");
    for (const clave of ["enfoque", "descansoCorto", "descansoLargo", "pomodorosHastaLargo"]) {
        form.elements[clave].value = config[clave];
    }
    form.elements.autoIniciar.checked = config.autoIniciar;
    form.elements.sonido.checked = preferencias.sonido;
    pintarEstadoNotificaciones();
    $("#ajustes").showModal();
}

function guardarAjustes(evento) {
    const form = evento.currentTarget;
    const datos = Object.fromEntries(new FormData(form));
    const anterior = config;
    config = normalizarConfig({ ...datos, autoIniciar: form.elements.autoIniciar.checked });
    preferencias = { ...preferencias, sonido: form.elements.sonido.checked };
    guardar("config", config);
    guardar("preferencias", preferencias);

    // Si la fase actual está parada y sin empezar, se ajusta a la nueva duración.
    if (!enMarcha(estado) && estado.restanteMs === duracionDe(estado.fase, anterior)) {
        estado = reiniciar(estado, config);
        persistir();
    }
    pintarTemporizador();
}

function pintarEstadoNotificaciones() {
    const boton = $("#permitir-notificaciones");
    const texto = $("#estado-notificaciones");
    if (!("Notification" in window)) {
        boton.hidden = true;
        texto.textContent = "Tu navegador no admite notificaciones.";
        return;
    }
    const estados = {
        granted: "Activadas: te avisaré aunque estés en otra pestaña.",
        denied: "Bloqueadas en la configuración del navegador.",
        default: "",
    };
    boton.hidden = Notification.permission !== "default";
    texto.textContent = estados[Notification.permission];
}

// ---------- Inicio ----------

function alPulsarTecla(evento) {
    const enCampo = evento.target.closest("input, textarea, select, button, dialog");
    if (enCampo || evento.ctrlKey || evento.metaKey || evento.altKey) {
        return;
    }
    const acciones = { " ": alternar, r: reiniciarFase, s: () => pasarDeFase(false) };
    const accion = acciones[evento.key.toLowerCase()];
    if (accion) {
        evento.preventDefault();
        accion();
    }
}

$("#iniciar").addEventListener("click", alternar);
$("#reiniciar").addEventListener("click", reiniciarFase);
$("#saltar").addEventListener("click", () => pasarDeFase(false));
for (const boton of document.querySelectorAll(".fase")) {
    boton.addEventListener("click", () => {
        estado = cambiarFase(estado, boton.dataset.fase, config);
        persistir();
        pintarTemporizador();
    });
}

$("#tarea").value = leer("tarea", "");
$("#tarea").addEventListener("input", (e) => guardar("tarea", e.target.value));

$("#abrir-ajustes").addEventListener("click", abrirAjustes);
$("#form-ajustes").addEventListener("submit", guardarAjustes);
$("#cancelar-ajustes").addEventListener("click", () => $("#ajustes").close());
$("#permitir-notificaciones").addEventListener("click", async () => {
    await Notification.requestPermission();
    pintarEstadoNotificaciones();
});
$("#borrar-estadisticas").addEventListener("click", () => {
    if (confirm("¿Borrar todas tus estadísticas? No se puede deshacer.")) {
        historial = {};
        borrar("historial");
        pintarEstadisticas();
    }
});

document.addEventListener("keydown", alPulsarTecla);
document.addEventListener("visibilitychange", tic);

// Si se cerró la página con el temporizador en marcha y ya terminó, se
// completa la fase al volver.
tic();
pintarEstadisticas();
setInterval(tic, 250);

if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    navigator.serviceWorker.register("sw.js").catch(() => {
        // Sin modo sin conexión, la aplicación funciona igual.
    });
}
