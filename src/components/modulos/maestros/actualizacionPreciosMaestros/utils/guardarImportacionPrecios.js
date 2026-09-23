import { collection, doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import {
  COL_CODIGOS,
  COL_IMPORTACIONES,
  ACCION_LOG_IMPORTACION,
  normalizarTexto,
  precioActualDe
} from './formatoPrecios';

// Tope de filas con error que se guardan en el documento de la importación
// (el detalle completo se puede descargar en la pantalla al importar); evita
// acercarse al límite de 1 MiB por documento con archivos muy defectuosos.
export const MAX_ERRORES_GUARDADOS = 300;

export class ConflictoPreciosError extends Error {
  constructor(conflictos) {
    super('Algunos códigos cambiaron después de la vista previa. No se actualizó ningún precio.');
    this.name = 'ConflictoPreciosError';
    this.conflictos = conflictos;
  }
}

const formatearPrecio = (n) => `$${Number(n || 0).toLocaleString('es-CL')}`;

// Guarda en UNA transacción todas las filas "actualizar" del análisis:
// actualiza precioNeto, agrega un log por código en maestros_codigos/{id}/logs
// y crea el registro de la importación en maestros_codigos_importaciones_precios.
// Antes de escribir vuelve a leer cada código: si alguno ya no existe, cambió
// de empresa o su precio ya no es el de la vista previa, aborta sin escribir
// nada (ConflictoPreciosError). Cualquier otro fallo también revierte todo.
export const guardarImportacionPrecios = async ({ db, empresa, archivo, analisis, usuario }) => {
  const { actualizar, omitidos, errores } = analisis;
  const importacionRef = doc(collection(db, COL_IMPORTACIONES));
  const fechaIso = new Date().toISOString();
  const empresaNorm = normalizarTexto(empresa.nombre);

  await runTransaction(db, async (tx) => {
    const refs = actualizar.map(a => doc(db, COL_CODIGOS, a.id));
    const snaps = await Promise.all(refs.map(ref => tx.get(ref)));

    const conflictos = [];
    snaps.forEach((snap, i) => {
      const { referencia, precioAnterior } = actualizar[i];
      if (!snap.exists()) {
        conflictos.push(`${referencia}: el código ya no existe`);
      } else if (normalizarTexto(snap.data().empresa) !== empresaNorm) {
        conflictos.push(`${referencia}: el código ya no pertenece a ${empresa.nombre}`);
      } else if (precioActualDe(snap.data()) !== precioAnterior) {
        conflictos.push(`${referencia}: el precio cambió a ${formatearPrecio(precioActualDe(snap.data()))} después de la vista previa`);
      }
    });
    if (conflictos.length > 0) throw new ConflictoPreciosError(conflictos);

    refs.forEach((ref, i) => {
      const a = actualizar[i];
      tx.update(ref, {
        precioNeto: a.precioNuevo,
        modificadoPor: usuario.nombre,
        fechaActualizacionPrecio: serverTimestamp()
      });
      tx.set(doc(collection(ref, 'logs')), {
        accion: ACCION_LOG_IMPORTACION,
        fecha: fechaIso,
        usuario: usuario.nombre,
        importacionId: importacionRef.id,
        detalles: {
          precioNetoAnterior: a.precioAnterior,
          precioNetoNuevo: a.precioNuevo,
          referencia: a.referencia,
          codigo: a.codigo,
          empresa: empresa.nombre,
          archivo
        }
      });
    });

    tx.set(importacionRef, {
      empresaId: empresa.id,
      empresa: empresa.nombre,
      archivo,
      usuario: usuario.nombre,
      usuarioEmail: usuario.email || '',
      fecha: serverTimestamp(),
      fechaIso,
      totalActualizados: actualizar.length,
      totalOmitidos: omitidos.length,
      totalErrores: errores.length,
      cambios: actualizar.map(({ id, codigo, referencia, precioAnterior, precioNuevo }) => ({
        id, codigo, referencia, precioAnterior, precioNuevo
      })),
      errores: errores.slice(0, MAX_ERRORES_GUARDADOS)
    });
  });

  return { importacionId: importacionRef.id, fechaIso };
};
