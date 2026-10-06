// Señal sonora corta al leer, generada en el navegador (Web Audio, sin
// archivos). 'ok' agudo y corto, 'nuevo' dos tonos medios, 'error' grave.
const TONOS = {
  ok: [{ frecuencia: 1320, duracion: 0.09 }],
  nuevo: [{ frecuencia: 880, duracion: 0.08 }, { frecuencia: 660, duracion: 0.1 }],
  error: [{ frecuencia: 220, duracion: 0.25 }]
};

let contexto = null;

export const reproducirSonidoEscaneo = (tipo) => {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    contexto = contexto || new AudioCtx();
    if (contexto.state === 'suspended') contexto.resume();
    let inicio = contexto.currentTime;
    (TONOS[tipo] || TONOS.ok).forEach(({ frecuencia, duracion }) => {
      const osc = contexto.createOscillator();
      const volumen = contexto.createGain();
      osc.type = 'square';
      osc.frequency.value = frecuencia;
      volumen.gain.setValueAtTime(0.08, inicio);
      volumen.gain.exponentialRampToValueAtTime(0.0001, inicio + duracion);
      osc.connect(volumen).connect(contexto.destination);
      osc.start(inicio);
      osc.stop(inicio + duracion);
      inicio += duracion + 0.03;
    });
  } catch {
    // Sin audio disponible: la señal visual sigue funcionando.
  }
};
