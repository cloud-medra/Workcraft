import { useEffect } from 'react';
import { onSnapshot } from 'firebase/firestore';

// Tiempo con la pestaña oculta tras el cual se pausan los listeners pesados.
export const PAUSA_PESTANA_OCULTA_MS = 10 * 60 * 1000;

/**
 * Abre una suscripción (p. ej. `() => onSnapshot(...)`) que se pausa cuando
 * la pestaña lleva `pausarTrasMs` oculta y se reabre al volver a ella.
 * Mientras está pausada no llegan cambios (ni se cobran); al reanudar, el
 * SDK trae lo que cambió. Si estuvo pausada más de 30 min, Firestore cobra
 * la consulta completa otra vez: por eso NO conviene para listeners muy
 * grandes con pocos cambios (ej. maestros_codigos en catalogosStore).
 *
 * Devuelve la función para cerrar definitivamente.
 */
export const suscribirConVisibilidad = (abrir, { pausarTrasMs = PAUSA_PESTANA_OCULTA_MS } = {}) => {
  if (typeof document === 'undefined') return abrir();

  let cancelar = abrir();
  let temporizador = null;
  let cerrado = false;

  const pausar = () => {
    temporizador = null;
    if (cancelar) { cancelar(); cancelar = null; }
  };

  const alCambiarVisibilidad = () => {
    if (document.visibilityState === 'hidden') {
      if (cancelar && !temporizador) temporizador = setTimeout(pausar, pausarTrasMs);
      return;
    }
    if (temporizador) { clearTimeout(temporizador); temporizador = null; }
    if (!cancelar && !cerrado) cancelar = abrir();
  };

  document.addEventListener('visibilitychange', alCambiarVisibilidad);
  // Pestaña abierta en segundo plano: se programa la pausa igual.
  if (document.visibilityState === 'hidden') temporizador = setTimeout(pausar, pausarTrasMs);

  return () => {
    cerrado = true;
    document.removeEventListener('visibilitychange', alCambiarVisibilidad);
    if (temporizador) clearTimeout(temporizador);
    if (cancelar) cancelar();
    cancelar = null;
  };
};

/**
 * Versión hook: `useVisibleSnapshot(() => onSnapshot(q, ...), [dep1, dep2])`.
 * Usar en listeners pesados (colecciones que crecen o ventanas de cientos de
 * documentos). No usar en los que deben seguir recibiendo cambios con la
 * pestaña oculta.
 */
export function useVisibleSnapshot(abrir, deps, opciones) {
  useEffect(
    () => suscribirConVisibilidad(abrir, opciones),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    deps
  );
}

/**
 * Igual que onSnapshot(ref, ...args) pero con pausa por pestaña oculta
 * (suscribirConVisibilidad). Reemplazo directo para listeners pesados.
 */
export const onSnapshotVisible = (ref, ...args) =>
  suscribirConVisibilidad(() => onSnapshot(ref, ...args));
