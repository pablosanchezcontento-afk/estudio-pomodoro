// Estadísticas de estudio: cuántos pomodoros y minutos se completan cada día.
//
// El historial es un objeto { "AAAA-MM-DD": { pomodoros, minutos } }.
// Todas las funciones son puras: reciben el historial y devuelven uno nuevo.

/** Días que se conservan en el historial (unos dos años). */
export const DIAS_CONSERVADOS = 730;

/** Clave `AAAA-MM-DD` de una fecha en la hora local del usuario. */
export function claveDia(fecha) {
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, "0");
    const dia = String(fecha.getDate()).padStart(2, "0");
    return `${anio}-${mes}-${dia}`;
}

function sumarDias(fecha, dias) {
    const copia = new Date(fecha);
    copia.setDate(copia.getDate() + dias);
    return copia;
}

/** Devuelve un historial válido a partir de datos de cualquier origen. */
export function normalizarHistorial(datos) {
    const historial = {};
    if (!datos || typeof datos !== "object") {
        return historial;
    }
    for (const [dia, valor] of Object.entries(datos)) {
        const pomodoros = Number(valor?.pomodoros);
        const minutos = Number(valor?.minutos);
        if (/^\d{4}-\d{2}-\d{2}$/.test(dia) && pomodoros > 0 && minutos >= 0) {
            historial[dia] = { pomodoros: Math.floor(pomodoros), minutos: Math.floor(minutos) };
        }
    }
    return historial;
}

/**
 * Añade un pomodoro completado en `fecha` y elimina los días más antiguos
 * que {@link DIAS_CONSERVADOS}.
 */
export function registrarPomodoro(historial, fecha, minutos) {
    const clave = claveDia(fecha);
    const actual = historial[clave] ?? { pomodoros: 0, minutos: 0 };
    const nuevo = { ...historial, [clave]: { pomodoros: actual.pomodoros + 1, minutos: actual.minutos + minutos } };

    const limite = claveDia(sumarDias(fecha, -DIAS_CONSERVADOS));
    for (const dia of Object.keys(nuevo)) {
        if (dia < limite) {
            delete nuevo[dia];
        }
    }
    return nuevo;
}

/** Datos de un día (ceros si no hubo actividad). */
export function datosDelDia(historial, fecha) {
    return historial[claveDia(fecha)] ?? { pomodoros: 0, minutos: 0 };
}

/** Los últimos `n` días hasta `hoy` incluido, del más antiguo al más reciente. */
export function ultimosDias(historial, hoy, n = 7) {
    return Array.from({ length: n }, (_, i) => {
        const fecha = sumarDias(hoy, i - n + 1);
        return { fecha, ...datosDelDia(historial, fecha) };
    });
}

/**
 * Días seguidos con al menos un pomodoro. Si hoy todavía no hay ninguno, la
 * racha cuenta hasta ayer (no se pierde hasta que termina el día).
 */
export function racha(historial, hoy) {
    let fecha = datosDelDia(historial, hoy).pomodoros > 0 ? hoy : sumarDias(hoy, -1);
    let dias = 0;
    while (datosDelDia(historial, fecha).pomodoros > 0) {
        dias += 1;
        fecha = sumarDias(fecha, -1);
    }
    return dias;
}

/** Minutos totales de los últimos `n` días. */
export function minutosSemana(historial, hoy, n = 7) {
    return ultimosDias(historial, hoy, n).reduce((total, dia) => total + dia.minutos, 0);
}

/** Formatea minutos como "1 h 25 min", "40 min" o "0 min". */
export function formatearMinutos(minutos) {
    const horas = Math.floor(minutos / 60);
    const resto = minutos % 60;
    if (horas === 0) {
        return `${resto} min`;
    }
    return resto === 0 ? `${horas} h` : `${horas} h ${resto} min`;
}
