import { useEffect, useSyncExternalStore } from 'react';
import { collection, query, where } from 'firebase/firestore';
import { db } from '../../../../firebaseConfig';
import { onSnapshotVisible } from '../../../../hooks/useVisibleSnapshot';
import { COLECCIONES } from './constants';

// Estados de cierres_periodos de un año ({ [modulo]: { [mes]: doc } }), con
// UN listener por año compartido entre Control Mensual y Resumen Periodo
// Abierto (antes cada pantalla abría el suyo). Sigue en tiempo real: abrir o
// cerrar un mes debe verse de inmediato.

const INICIAL = Object.freeze({ estadosModulos: null, error: null });
const porAnio = new Map(); // anio -> { estado, cancelar, referencias, suscriptores }

const entrada = (anio) => {
  let e = porAnio.get(anio);
  if (!e) {
    e = { estado: INICIAL, cancelar: null, referencias: 0, suscriptores: new Set() };
    porAnio.set(anio, e);
  }
  return e;
};

const estructurar = (docs) => {
  const datos = {};
  docs.forEach((d) => {
    const data = d.data();
    if (data.modulo && data.mes) {
      if (!datos[data.modulo]) datos[data.modulo] = {};
      datos[data.modulo][data.mes] = { id: d.id, ...data };
    }
  });
  return datos;
};

const publicar = (e, estado) => {
  e.estado = estado;
  e.suscriptores.forEach((cb) => cb());
};

const retener = (anio) => {
  const e = entrada(anio);
  e.referencias += 1;
  if (!e.cancelar) {
    e.cancelar = onSnapshotVisible(
      query(collection(db, COLECCIONES.CIERRES), where('anio', '==', anio)),
      (snap) => publicar(e, { estadosModulos: estructurar(snap.docs), error: null }),
      (error) => {
        console.error('Error al escuchar cierres de períodos:', error);
        publicar(e, { estadosModulos: e.estado.estadosModulos ?? {}, error });
      }
    );
  }
  let soltado = false;
  return () => {
    if (soltado) return;
    soltado = true;
    e.referencias = Math.max(0, e.referencias - 1);
    if (e.referencias === 0 && e.cancelar) {
      e.cancelar();
      e.cancelar = null;
      e.estado = INICIAL;
    }
  };
};

export function useCierresAnio(anio) {
  const e = entrada(anio);
  const estado = useSyncExternalStore(
    (cb) => { e.suscriptores.add(cb); return () => e.suscriptores.delete(cb); },
    () => e.estado
  );
  useEffect(() => retener(anio), [anio]);
  return {
    estadosModulos: estado.estadosModulos ?? {},
    cargando: estado.estadosModulos === null,
    error: estado.error
  };
}
