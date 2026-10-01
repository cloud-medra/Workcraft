// ID de cada fila de "Detalles OC" cuando el Excel no trae columna ID.
//
// Grupo = admisión + fecha + proveedor + código. No es único (el mismo
// implante puede venir en varias filas, incluso con la misma cantidad), así
// que el ID es el grupo más el número de aparición dentro del archivo:
//   114584_20260915_medtronic_510012_1, ..._510012_2
// El mismo archivo genera siempre los mismos IDs, y reimportarlo actualiza
// las filas en vez de duplicarlas.
//
// Para los grupos que vienen en el archivo, el archivo manda: un ID de ese
// grupo que existía antes y ya no viene es "huérfano" (ver idsHuerfanos).
import { normalizarProveedorId } from './normalizarProveedor';
import { normalizarCodigo } from '../../../shared/ocIndex/normalizacionOC.js';

const fechaCompacta = (fecha) => {
  if (!(fecha instanceof Date) || isNaN(fecha.getTime())) return '';
  return `${fecha.getFullYear()}${String(fecha.getMonth() + 1).padStart(2, '0')}${String(fecha.getDate()).padStart(2, '0')}`;
};

// Firestore no acepta "/" en un ID de documento.
export const grupoFilaDetalleOC = (fila) => [
  fila.admision,
  fechaCompacta(fila.fecha_cx),
  normalizarProveedorId(fila.proveedor),
  normalizarCodigo(fila.codigo).replace(/\//g, '-') || 'SIN_CODIGO'
].join('_');

// Asigna `id` a las filas que no lo traen (en el orden del archivo) y marca
// `_grupo` en esas filas. Las que traen ID desde el Excel quedan igual y no
// participan de la limpieza de huérfanos.
export const asignarIdsFilas = (filas) => {
  const apariciones = new Map();
  return filas.map((fila) => {
    if (fila.id) return fila;
    const grupo = grupoFilaDetalleOC(fila);
    const n = (apariciones.get(grupo) || 0) + 1;
    apariciones.set(grupo, n);
    return { ...fila, id: `${grupo}_${n}`, _grupo: grupo };
  });
};

// IDs de `idsExistentes` (snapshot o índice) que pertenecen a un grupo que
// viene en `filas` pero que ya no están en el archivo. Nunca toca grupos
// que no vienen en el archivo.
export const idsHuerfanos = (idsExistentes, filas) => {
  const grupos = new Set();
  const actuales = new Set();
  filas.forEach((f) => {
    actuales.add(f.id);
    if (f._grupo) grupos.add(f._grupo);
  });
  return [...idsExistentes].filter((id) => {
    if (actuales.has(id)) return false;
    const m = String(id).match(/^(.*)_\d+$/);
    return Boolean(m && grupos.has(m[1]));
  });
};
