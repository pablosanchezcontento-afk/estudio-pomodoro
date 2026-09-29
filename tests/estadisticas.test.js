import { describe, expect, it } from "vitest";
import {
    DIAS_CONSERVADOS,
    claveDia,
    datosDelDia,
    formatearMinutos,
    minutosSemana,
    normalizarHistorial,
    racha,
    registrarPomodoro,
    ultimosDias,
} from "../js/estadisticas.js";

// Meses en Date empiezan en 0: new Date(2026, 8, 29) es el 29 de septiembre.
const HOY = new Date(2026, 8, 29, 18, 30);

describe("claveDia", () => {
    it("usa la fecha local con ceros a la izquierda", () => {
        expect(claveDia(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
        expect(claveDia(HOY)).toBe("2026-09-29");
    });
});

describe("registrarPomodoro", () => {
    it("suma pomodoros y minutos al día correspondiente", () => {
        let h = registrarPomodoro({}, HOY, 25);
        h = registrarPomodoro(h, HOY, 50);
        expect(h["2026-09-29"]).toEqual({ pomodoros: 2, minutos: 75 });
    });

    it("no modifica el historial original", () => {
        const original = {};
        registrarPomodoro(original, HOY, 25);
        expect(original).toEqual({});
    });

    it("borra los días más antiguos que el límite", () => {
        const antiguo = new Date(HOY);
        antiguo.setDate(antiguo.getDate() - DIAS_CONSERVADOS - 1);
        const h = registrarPomodoro({ [claveDia(antiguo)]: { pomodoros: 3, minutos: 75 } }, HOY, 25);
        expect(Object.keys(h)).toEqual(["2026-09-29"]);
    });
});

describe("normalizarHistorial", () => {
    it("descarta datos corruptos y conserva los válidos", () => {
        const h = normalizarHistorial({
            "2026-09-28": { pomodoros: 2, minutos: 50 },
            "2026-09-27": { pomodoros: "3", minutos: "75.9" },
            "ayer": { pomodoros: 1, minutos: 25 },
            "2026-09-26": { pomodoros: 0, minutos: 0 },
            "2026-09-25": null,
        });
        expect(h).toEqual({
            "2026-09-28": { pomodoros: 2, minutos: 50 },
            "2026-09-27": { pomodoros: 3, minutos: 75 },
        });
    });

    it.each([null, undefined, "texto", 42])("con %s devuelve un historial vacío", (valor) => {
        expect(normalizarHistorial(valor)).toEqual({});
    });
});

describe("consultas", () => {
    const historial = {
        "2026-09-29": { pomodoros: 2, minutos: 50 },
        "2026-09-28": { pomodoros: 4, minutos: 100 },
        "2026-09-27": { pomodoros: 1, minutos: 25 },
        "2026-09-25": { pomodoros: 3, minutos: 75 },
        "2026-09-01": { pomodoros: 8, minutos: 200 },
    };

    it("datosDelDia devuelve ceros si no hubo actividad", () => {
        expect(datosDelDia(historial, HOY)).toEqual({ pomodoros: 2, minutos: 50 });
        expect(datosDelDia(historial, new Date(2026, 8, 26))).toEqual({ pomodoros: 0, minutos: 0 });
    });

    it("ultimosDias devuelve 7 días en orden, rellenando los vacíos", () => {
        const dias = ultimosDias(historial, HOY);
        expect(dias.map((d) => claveDia(d.fecha))).toEqual([
            "2026-09-23", "2026-09-24", "2026-09-25", "2026-09-26",
            "2026-09-27", "2026-09-28", "2026-09-29",
        ]);
        expect(dias.map((d) => d.pomodoros)).toEqual([0, 0, 3, 0, 1, 4, 2]);
    });

    it("ultimosDias cruza correctamente el cambio de mes", () => {
        const dias = ultimosDias({}, new Date(2026, 9, 2), 3);
        expect(dias.map((d) => claveDia(d.fecha))).toEqual(["2026-09-30", "2026-10-01", "2026-10-02"]);
    });

    it("minutosSemana suma los últimos 7 días", () => {
        expect(minutosSemana(historial, HOY)).toBe(250);
    });

    it("racha cuenta días seguidos hasta hoy", () => {
        expect(racha(historial, HOY)).toBe(3);
    });

    it("racha cuenta hasta ayer si hoy aún no hay pomodoros", () => {
        const sinHoy = { ...historial };
        delete sinHoy["2026-09-29"];
        expect(racha(sinHoy, HOY)).toBe(2);
    });

    it("racha es 0 si ayer y hoy no hubo actividad", () => {
        expect(racha({ "2026-09-20": { pomodoros: 1, minutos: 25 } }, HOY)).toBe(0);
    });
});

describe("formatearMinutos", () => {
    it.each([
        [0, "0 min"],
        [40, "40 min"],
        [60, "1 h"],
        [85, "1 h 25 min"],
        [600, "10 h"],
    ])("%i → %s", (minutos, texto) => {
        expect(formatearMinutos(minutos)).toBe(texto);
    });
});
