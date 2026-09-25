import { useCallback, useEffect, useState } from 'react';
import { getDocs, limit as limitar, onSnapshot, query } from 'firebase/firestore';
import { suscribirConVisibilidad } from './useVisibleSnapshot';

/**
 * Helper estándar para leer una consulta de Firestore en un componente
 * (ver docs/firestore-buenas-practicas.md).
 *
 *   const { docs, cargando, error, recargar } = useFirestoreQuery({
 *     clave: `ordenes|${anio}|${mes}`,            // identifica la consulta
 *     crearConsulta: () => query(collection(db, ...), where(...)),
 *     limite: 100,                               // obligatorio
 *     modo: 'unica',                             // 'unica' (default) | 'vivo'
 *   });
 *
 * - `limite` es obligatorio: se agrega como limit(limite). Si de verdad se
 *   necesita la consulta completa, pasar `sinLimite: 'motivo'` (el motivo
 *   queda escrito en el código para la revisión).
 * - `modo: 'vivo'` usa onSnapshot con pausa tras 10 min de pestaña oculta
 *   (`pausarOculta: false` para desactivarla). Reservarlo para los datos que
 *   deben verse en tiempo real (ver la guía).
 * - `modo: 'unica'` usa getDocs; `recargar()` vuelve a leer.
 * - `clave` null/undefined o `habilitado: false` → no lee nada.
 * - Devuelve docs como [{ id, refPath, ...data }].
 */
export function useFirestoreQuery({
  clave,
  crearConsulta,
  limite,
  sinLimite,
  modo = 'unica',
  pausarOculta = true,
  habilitado = true
}) {
  if (limite == null && !sinLimite) {
    throw new Error(`useFirestoreQuery(${clave}): 'limite' es obligatorio (o 'sinLimite' con el motivo).`);
  }

  const [version, setVersion] = useState(0);
  const [resultado, setResultado] = useState({ clave: null, version: null, docs: [], error: null });
  const activo = habilitado && clave != null;

  useEffect(() => {
    if (!activo) return undefined;
    const base = crearConsulta();
    const consulta = limite != null ? query(base, limitar(limite)) : base;
    const mapear = (snap) => snap.docs.map((d) => ({ id: d.id, refPath: d.ref.path, ...d.data() }));
    const guardar = (docs, error = null) => setResultado({ clave, version, docs, error });
    const alError = (error) => {
      console.error(`Error en la consulta ${clave}:`, error);
      guardar([], error);
    };

    if (modo === 'vivo') {
      const abrir = () => onSnapshot(consulta, (snap) => guardar(mapear(snap)), alError);
      return pausarOculta ? suscribirConVisibilidad(abrir) : abrir();
    }

    let cancelado = false;
    getDocs(consulta)
      .then((snap) => { if (!cancelado) guardar(mapear(snap)); })
      .catch((error) => { if (!cancelado) alError(error); });
    return () => { cancelado = true; };
    // crearConsulta se identifica por `clave` (los objetos query no son estables).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activo, clave, limite, modo, pausarOculta, version]);

  const recargar = useCallback(() => setVersion((v) => v + 1), []);
  const vigente = resultado.clave === clave;

  return {
    docs: activo && vigente ? resultado.docs : [],
    cargando: activo && (!vigente || (modo === 'unica' && resultado.version !== version)),
    error: vigente ? resultado.error : null,
    // Si trajo exactamente `limite` documentos puede haber más.
    posiblementeHayMas: limite != null && vigente && resultado.docs.length >= limite,
    recargar
  };
}
