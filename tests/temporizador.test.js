import { describe, expect, it } from "vitest";
import {
    CONFIG_POR_DEFECTO,
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
} from "../js/temporizador.js";

const config = normalizarConfig();
const MIN = 60_000;

describe("normalizarConfig", () => {
    it("sin datos devuelve la configuración por defecto", () => {
        expect(normalizarConfig()).toEqual(CONFIG_POR_DEFECTO);
        expect(normalizarConfig(null)).toEqual(CONFIG_POR_DEFECTO);
    });

    it("acepta valores válidos y convierte texto a número", () => {
        expect(normalizarConfig({ enfoque: "50", descansoCorto: 10, autoIniciar: true })).toMatchObject({
            enfoque: 50,
            descansoCorto: 10,
            autoIniciar: true,
        });
    });

    it("ajusta los valores fuera de rango al límite", () => {
        const c = normalizarConfig({ enfoque: 500, descansoCorto: 0, pomodorosHastaLargo: 1 });
        expect(c.enfoque).toBe(120);
        expect(c.descansoCorto).toBe(1);
        expect(c.pomodorosHastaLargo).toBe(2);
    });

    it("ignora valores no numéricos y redondea decimales", () => {
        const c = normalizarConfig({ enfoque: "mucho", descansoLargo: 14.6, autoIniciar: "sí" });
        expect(c.enfoque).toBe(25);
        expect(c.descansoLargo).toBe(15);
        expect(c.autoIniciar).toBe(false);
    });
});

describe("duracionDe", () => {
    it("devuelve la duración de cada fase en ms", () => {
        expect(duracionDe(FASES.ENFOQUE, config)).toBe(25 * MIN);
        expect(duracionDe(FASES.DESCANSO_CORTO, config)).toBe(5 * MIN);
        expect(duracionDe(FASES.DESCANSO_LARGO, config)).toBe(15 * MIN);
    });

    it("lanza un error con una fase desconocida", () => {
        expect(() => duracionDe("siesta", config)).toThrow("Fase desconocida");
    });
});

describe("cuenta atrás", () => {
    it("empieza parado en la fase de enfoque", () => {
        const estado = crearEstado(config);
        expect(estado.fase).toBe(FASES.ENFOQUE);
        expect(enMarcha(estado)).toBe(false);
        expect(restante(estado, 0)).toBe(25 * MIN);
    });

    it("descuenta el tiempo real transcurrido", () => {
        const estado = iniciar(crearEstado(config), 1_000);
        expect(enMarcha(estado)).toBe(true);
        expect(restante(estado, 1_000 + 90_000)).toBe(25 * MIN - 90_000);
    });

    it("pausar conserva el tiempo y reanudar continúa desde ahí", () => {
        let estado = iniciar(crearEstado(config), 0);
        estado = pausar(estado, 10 * MIN);
        expect(enMarcha(estado)).toBe(false);
        expect(restante(estado, 99 * MIN)).toBe(15 * MIN); // en pausa no corre

        estado = iniciar(estado, 100 * MIN);
        expect(restante(estado, 105 * MIN)).toBe(10 * MIN);
    });

    it("iniciar dos veces o pausar parado no cambia nada", () => {
        const enCurso = iniciar(crearEstado(config), 0);
        expect(iniciar(enCurso, 5_000)).toBe(enCurso);
        const parado = crearEstado(config);
        expect(pausar(parado, 5_000)).toBe(parado);
    });

    it("nunca devuelve tiempo negativo y detecta el final", () => {
        const estado = iniciar(crearEstado(config), 0);
        expect(haTerminado(estado, 25 * MIN - 1)).toBe(false);
        expect(haTerminado(estado, 25 * MIN)).toBe(true);
        expect(restante(estado, 30 * MIN)).toBe(0);
    });

    it("reiniciar vuelve a la duración completa y para", () => {
        const estado = reiniciar(iniciar(crearEstado(config), 0), config);
        expect(enMarcha(estado)).toBe(false);
        expect(restante(estado, 0)).toBe(25 * MIN);
    });

    it("cambiarFase pone la duración de la nueva fase", () => {
        const estado = cambiarFase(iniciar(crearEstado(config), 0), FASES.DESCANSO_LARGO, config);
        expect(estado.fase).toBe(FASES.DESCANSO_LARGO);
        expect(enMarcha(estado)).toBe(false);
        expect(restante(estado, 0)).toBe(15 * MIN);
    });

    it("progreso va de 0 a 1", () => {
        const estado = iniciar(crearEstado(config), 0);
        expect(progreso(estado, config, 0)).toBe(0);
        expect(progreso(estado, config, 12.5 * MIN)).toBeCloseTo(0.5);
        expect(progreso(estado, config, 25 * MIN)).toBe(1);
    });
});

describe("avanzar por el ciclo", () => {
    function completar(estado, cfg = config) {
        return avanzar(estado, cfg, { completado: true, ahora: 0 });
    }

    it("tras un enfoque completado toca descanso corto y suma un pomodoro", () => {
        const { estado, pomodoroCompletado } = completar(crearEstado(config));
        expect(pomodoroCompletado).toBe(true);
        expect(estado.fase).toBe(FASES.DESCANSO_CORTO);
        expect(estado.completadosEnCiclo).toBe(1);
    });

    it("tras el cuarto pomodoro toca descanso largo y luego se reinicia el ciclo", () => {
        let estado = crearEstado(config);
        const fases = [];
        for (let i = 0; i < 8; i++) {
            estado = completar(estado).estado;
            fases.push(estado.fase);
        }
        expect(fases).toEqual([
            FASES.DESCANSO_CORTO, FASES.ENFOQUE,
            FASES.DESCANSO_CORTO, FASES.ENFOQUE,
            FASES.DESCANSO_CORTO, FASES.ENFOQUE,
            FASES.DESCANSO_LARGO, FASES.ENFOQUE,
        ]);
        expect(estado.completadosEnCiclo).toBe(0);
    });

    it("respeta pomodorosHastaLargo", () => {
        const cfg = normalizarConfig({ pomodorosHastaLargo: 2 });
        let estado = completar(crearEstado(cfg), cfg).estado; // corto
        estado = completar(estado, cfg).estado; // enfoque
        estado = completar(estado, cfg).estado;
        expect(estado.fase).toBe(FASES.DESCANSO_LARGO);
    });

    it("saltar un enfoque no cuenta como pomodoro", () => {
        const { estado, pomodoroCompletado } = avanzar(crearEstado(config), config, {
            completado: false,
            ahora: 0,
        });
        expect(pomodoroCompletado).toBe(false);
        expect(estado.fase).toBe(FASES.DESCANSO_CORTO);
        expect(estado.completadosEnCiclo).toBe(0);
    });

    it("terminar un descanso no cuenta como pomodoro", () => {
        const descanso = cambiarFase(crearEstado(config), FASES.DESCANSO_CORTO, config);
        expect(completar(descanso).pomodoroCompletado).toBe(false);
    });

    it("con autoIniciar la siguiente fase arranca sola", () => {
        const cfg = normalizarConfig({ autoIniciar: true });
        const { estado } = avanzar(crearEstado(cfg), cfg, { completado: true, ahora: 1_000 });
        expect(enMarcha(estado)).toBe(true);
        expect(restante(estado, 1_000)).toBe(5 * MIN);
    });

    it("sin autoIniciar la siguiente fase queda parada", () => {
        expect(enMarcha(completar(crearEstado(config)).estado)).toBe(false);
    });
});

describe("formatear", () => {
    it.each([
        [25 * MIN, "25:00"],
        [90_000, "01:30"],
        [59_001, "01:00"],
        [1, "00:01"],
        [0, "00:00"],
        [-5_000, "00:00"],
        [120 * MIN, "120:00"],
    ])("%i ms → %s", (ms, texto) => {
        expect(formatear(ms)).toBe(texto);
    });
});
