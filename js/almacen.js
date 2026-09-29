// Lectura y escritura en localStorage a prueba de errores.
//
// En modo privado o con el almacenamiento bloqueado, localStorage puede lanzar
// excepciones: en ese caso la aplicación funciona igual, solo que sin recordar
// nada entre visitas.

const PREFIJO = "estudio-pomodoro:";

export function leer(clave, valorPorDefecto) {
    try {
        const texto = localStorage.getItem(PREFIJO + clave);
        return texto === null ? valorPorDefecto : JSON.parse(texto);
    } catch {
        return valorPorDefecto;
    }
}

export function guardar(clave, valor) {
    try {
        localStorage.setItem(PREFIJO + clave, JSON.stringify(valor));
    } catch {
        // Sin almacenamiento disponible.
    }
}

export function borrar(clave) {
    try {
        localStorage.removeItem(PREFIJO + clave);
    } catch {
        // Sin almacenamiento disponible.
    }
}
