// Lógica del temporizador Pomodoro, sin DOM ni almacenamiento.
//
// El estado es un objeto inmutable: cada función devuelve un estado nuevo.
// El tiempo restante se calcula a partir de una marca de fin (`finEn`) y no
// contando "ticks", así el temporizador sigue siendo exacto aunque el
// navegador ralentice la pestaña cuando está en segundo plano.

/** Fases del ciclo Pomodoro. */
export const FASES = Object.freeze({
    ENFOQUE: "enfoque",
    DESCANSO_CORTO: "descanso-corto",
    DESCANSO_LARGO: "descanso-largo",
});

/** Configuración por defecto (minutos). */
export const CONFIG_POR_DEFECTO = Object.freeze({
    enfoque: 25,
    descansoCorto: 5,
    descansoLargo: 15,
    pomodorosHastaLargo: 4,
    autoIniciar: false,
});

const LIMITES = {
    enfoque: [1, 120],
    descansoCorto: [1, 60],
    descansoLargo: [1, 60],
    pomodorosHastaLargo: [2, 10],
};

/**
 * Devuelve una configuración válida a partir de datos de cualquier origen
 * (formulario, localStorage...). Los valores ausentes, no numéricos o fuera
 * de rango se sustituyen o se ajustan al límite más cercano.
 */
export function normalizarConfig(datos = {}) {
    const config = { ...CONFIG_POR_DEFECTO };
    for (const [clave, [min, max]] of Object.entries(LIMITES)) {
        const valor = Math.round(Number(datos?.[clave]));
        if (Number.isFinite(valor)) {
            config[clave] = Math.min(max, Math.max(min, valor));
        }
    }
    config.autoIniciar = datos?.autoIniciar === true;
    return config;
}

/** Duración de una fase en milisegundos. */
export function duracionDe(fase, config) {
    const minutos = {
        [FASES.ENFOQUE]: config.enfoque,
        [FASES.DESCANSO_CORTO]: config.descansoCorto,
        [FASES.DESCANSO_LARGO]: config.descansoLargo,
    }[fase];
    if (minutos === undefined) {
        throw new Error(`Fase desconocida: ${fase}`);
    }
    return minutos * 60_000;
}

/** Estado inicial: fase de enfoque, parado y con el tiempo completo. */
export function crearEstado(config) {
    return {
        fase: FASES.ENFOQUE,
        restanteMs: duracionDe(FASES.ENFOQUE, config),
        finEn: null,
        completadosEnCiclo: 0,
    };
}

/** Indica si el temporizador está corriendo. */
export function enMarcha(estado) {
    return estado.finEn !== null;
}

/** Milisegundos que faltan en el instante `ahora`. Nunca es negativo. */
export function restante(estado, ahora) {
    return enMarcha(estado) ? Math.max(0, estado.finEn - ahora) : estado.restanteMs;
}

/** Indica si la fase actual ha llegado a cero. */
export function haTerminado(estado, ahora) {
    return restante(estado, ahora) === 0;
}

/** Arranca o reanuda la cuenta atrás. */
export function iniciar(estado, ahora) {
    if (enMarcha(estado)) {
        return estado;
    }
    return { ...estado, finEn: ahora + estado.restanteMs };
}

/** Pausa la cuenta atrás conservando el tiempo que falta. */
export function pausar(estado, ahora) {
    if (!enMarcha(estado)) {
        return estado;
    }
    return { ...estado, restanteMs: restante(estado, ahora), finEn: null };
}

/** Vuelve a poner la fase actual a su duración completa, parada. */
export function reiniciar(estado, config) {
    return { ...estado, restanteMs: duracionDe(estado.fase, config), finEn: null };
}

/** Cambia a otra fase manualmente (pestañas de la interfaz). */
export function cambiarFase(estado, fase, config) {
    return { ...estado, fase, restanteMs: duracionDe(fase, config), finEn: null };
}

/**
 * Pasa a la fase siguiente del ciclo.
 *
 * - Tras un enfoque **completado** se suma un pomodoro; cada
 *   `pomodorosHastaLargo` toca descanso largo y si no, corto.
 * - Tras un enfoque **saltado** se pasa a descanso corto sin sumar.
 * - Tras cualquier descanso se vuelve al enfoque.
 *
 * Si `config.autoIniciar` es verdadero, la nueva fase arranca sola en `ahora`.
 *
 * @returns {{estado: object, pomodoroCompletado: boolean}}
 */
export function avanzar(estado, config, { completado, ahora }) {
    let fase;
    let completadosEnCiclo = estado.completadosEnCiclo;
    const pomodoroCompletado = estado.fase === FASES.ENFOQUE && completado;

    if (estado.fase === FASES.ENFOQUE) {
        if (pomodoroCompletado) {
            completadosEnCiclo += 1;
        }
        const tocaLargo = pomodoroCompletado && completadosEnCiclo >= config.pomodorosHastaLargo;
        fase = tocaLargo ? FASES.DESCANSO_LARGO : FASES.DESCANSO_CORTO;
    } else {
        fase = FASES.ENFOQUE;
        if (estado.fase === FASES.DESCANSO_LARGO) {
            completadosEnCiclo = 0;
        }
    }

    let siguiente = { fase, restanteMs: duracionDe(fase, config), finEn: null, completadosEnCiclo };
    if (config.autoIniciar) {
        siguiente = iniciar(siguiente, ahora);
    }
    return { estado: siguiente, pomodoroCompletado };
}

/** Fracción de la fase ya transcurrida, entre 0 y 1 (para la barra de progreso). */
export function progreso(estado, config, ahora) {
    const total = duracionDe(estado.fase, config);
    return 1 - restante(estado, ahora) / total;
}

/**
 * Formatea milisegundos como `MM:SS`, redondeando hacia arriba para que
 * nunca se muestre `00:00` mientras quede tiempo.
 */
export function formatear(ms) {
    const totalSegundos = Math.ceil(Math.max(0, ms) / 1000);
    const minutos = Math.floor(totalSegundos / 60);
    const segundos = totalSegundos % 60;
    return `${String(minutos).padStart(2, "0")}:${String(segundos).padStart(2, "0")}`;
}
