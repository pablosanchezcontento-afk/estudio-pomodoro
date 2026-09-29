import { afterEach, describe, expect, it, vi } from "vitest";

function audioFalso() {
    const creados = [];
    class AudioContextFalso {
        currentTime = 1;
        destination = {};
        createOscillator() {
            const oscilador = {
                type: "",
                frequency: { value: 0 },
                connect: (nodo) => nodo,
                start: vi.fn(),
                stop: vi.fn(),
            };
            creados.push(oscilador);
            return oscilador;
        }
        createGain() {
            return {
                gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
                connect: (nodo) => nodo,
            };
        }
    }
    return { AudioContextFalso, creados };
}

describe("sonido", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
        vi.resetModules();
    });

    it("toca tres notas ascendentes y reutiliza el contexto", async () => {
        const { AudioContextFalso, creados } = audioFalso();
        const constructor = vi.fn(function () {
            return new AudioContextFalso();
        });
        vi.stubGlobal("AudioContext", constructor);
        const { sonarAviso } = await import("../js/sonido.js");
        sonarAviso();
        sonarAviso();
        expect(constructor).toHaveBeenCalledTimes(1);
        expect(creados.slice(0, 3).map((o) => o.frequency.value)).toEqual([880, 988, 1175]);
        expect(creados.every((o) => o.type === "sine" && o.start.mock.calls.length === 1)).toBe(true);
        const inicios = creados.slice(0, 3).map((o) => o.start.mock.calls[0][0]);
        expect(inicios[1]).toBeGreaterThan(inicios[0]);
    });

    it("no lanza si el navegador no tiene Web Audio", async () => {
        vi.stubGlobal("AudioContext", undefined);
        const { sonarAviso } = await import("../js/sonido.js");
        expect(() => sonarAviso()).not.toThrow();
    });
});
