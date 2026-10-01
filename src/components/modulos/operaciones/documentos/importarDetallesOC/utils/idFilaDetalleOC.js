// ID de cada fila de "Detalles OC" cuando el Excel no trae columna ID.
//
// Grupo = admisión + fecha + proveedor + código. No es único (el mismo
// implante puede venir en varias filas, incluso con la misma cantidad), así
// que el ID es el grupo más el número de aparición dentro del archivo:
//   114584_20260915_medtronic_510012_1, ..._510012_2
// El mismo archivo genera siempre los mismos IDs, y reimportarlo actualiza
// las filas en vez de duplicarlas.
//
// Al importar, planificarImportacion.js vuelve a emparejar las filas
// repetidas contra lo ya guardado (por parecido, no por orden), así que
// reordenar el archivo no cambia los IDs.
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
