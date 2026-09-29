// Aviso sonoro generado con la Web Audio API (no necesita archivos de audio).

let contexto;

/** Toca tres notas cortas y suaves. No hace nada si el navegador no lo permite. */
export function sonarAviso() {
    try {
        contexto ??= new AudioContext();
        const inicio = contexto.currentTime + 0.05;
        [880, 988, 1175].forEach((frecuencia, i) => {
            const oscilador = contexto.createOscillator();
            const volumen = contexto.createGain();
            oscilador.type = "sine";
            oscilador.frequency.value = frecuencia;
            const t = inicio + i * 0.22;
            volumen.gain.setValueAtTime(0.0001, t);
            volumen.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
            volumen.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
            oscilador.connect(volumen).connect(contexto.destination);
            oscilador.start(t);
            oscilador.stop(t + 0.4);
        });
    } catch {
        // Sin sonido: la notificación visual sigue funcionando.
    }
}
