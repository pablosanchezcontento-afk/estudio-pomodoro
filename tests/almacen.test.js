import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { borrar, guardar, leer } from "../js/almacen.js";

function almacenEnMemoria() {
    const datos = new Map();
    return {
        getItem: (clave) => (datos.has(clave) ? datos.get(clave) : null),
        setItem: (clave, valor) => datos.set(clave, String(valor)),
        removeItem: (clave) => datos.delete(clave),
        datos,
    };
}

describe("almacen", () => {
    let almacen;

    beforeEach(() => {
        almacen = almacenEnMemoria();
        vi.stubGlobal("localStorage", almacen);
    });
    afterEach(() => vi.unstubAllGlobals());

    it("guarda y lee JSON con prefijo propio", () => {
        guardar("config", { enfoque: 30 });
        expect(almacen.datos.get("estudio-pomodoro:config")).toBe('{"enfoque":30}');
        expect(leer("config", null)).toEqual({ enfoque: 30 });
    });

    it("devuelve el valor por defecto si no existe o está corrupto", () => {
        expect(leer("nada", 42)).toBe(42);
        almacen.setItem("estudio-pomodoro:roto", "{no es json");
        expect(leer("roto", "defecto")).toBe("defecto");
    });

    it("borra claves", () => {
        guardar("tarea", "x");
        borrar("tarea");
        expect(leer("tarea", "")).toBe("");
    });

    it("no falla si el almacenamiento está bloqueado (modo privado)", () => {
        const fallo = () => {
            throw new DOMException("bloqueado", "SecurityError");
        };
        vi.stubGlobal("localStorage", { getItem: fallo, setItem: fallo, removeItem: fallo });
        expect(() => guardar("a", 1)).not.toThrow();
        expect(() => borrar("a")).not.toThrow();
        expect(leer("a", "defecto")).toBe("defecto");
    });
});
