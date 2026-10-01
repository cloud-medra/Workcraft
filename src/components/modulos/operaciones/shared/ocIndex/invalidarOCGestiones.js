// Cuando una reimportación de Detalles OC cambia la OC de una fila ya
// registrada, las gestiones de Implantes que tenían la OC antigua asignada
// deben volver a sincronizarse: se quita la OC antigua de ocPorItem en los
// ítems de ese código (misma admisión, fecha y empresa) y se marca
// ocPendiente: true. "Sincronizar OC" les asigna después la nueva.
//
// Lecturas: 1 por gestión encontrada (consultas por gestionId, de a 15
// admisiones: cada una va como texto y como número). Escrituras: 2 por
// gestión corregida (update + log de auditoría).
import { collectionGroup, query, where, getDocs, doc, collection, writeBatch, FieldPath, deleteField, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../../../firebaseConfig';
import { itemsDeGestion } from './indiceOC';
import { normalizarCodigo, normalizarFecha, empresasCoinciden } from './normalizacionOC.js';

const PREFIJO_IMPLANTES = 'implantes_gestiones/';
const ADMISIONES_POR_CONSULTA = 15; // 'in' admite 30 valores: texto + número
const MAX_OPS_BATCH = 450;

const valoresAdmision = (a) => (/^\d+$/.test(a) ? [a, Number(a)] : [a]);

// Pura: gestiones (data cruda) x OC cambiadas -> [{ refPath, itemIds, cambios }].
export const planificarInvalidacion = (gestiones, ocCambiadas) => {
  const resultado = [];
  gestiones.forEach((g) => {
    const admision = String(g.gestionId || g.agendaId || g.admision || '').trim();
    const ocPorItem = g.ocPorItem || {};
    const itemIds = new Set();
    const aplicados = [];
    ocCambiadas.forEach((c) => {
      if (c.admision !== admision) return;
      if (normalizarFecha(g.fecha) !== c.fecha) return;
      if (!empresasCoinciden(g.empresa, c.proveedor)) return;
      const codigo = normalizarCodigo(c.codigo);
      const ids = itemsDeGestion(g)
        .filter(it => normalizarCodigo(it.codigo) === codigo && ocPorItem[it.id] === c.ocAntes)
        .map(it => it.id);
      if (ids.length) { ids.forEach(id => itemIds.add(id)); aplicados.push(c); }
    });
    if (itemIds.size) resultado.push({ refPath: g.refPath, itemIds: [...itemIds], cambios: aplicados });
  });
  return resultado;
};

export const invalidarOCGestiones = async (ocCambiadas, { usuario } = {}) => {
  const res = { lecturas: 0, escrituras: 0, gestionesActualizadas: 0, itemsLiberados: 0, error: null };
  if (ocCambiadas.length === 0) return res;

  const admisiones = [...new Set(ocCambiadas.map(c => c.admision))];
  const gestiones = [];
  try {
    for (let i = 0; i < admisiones.length; i += ADMISIONES_POR_CONSULTA) {
      const valores = admisiones.slice(i, i + ADMISIONES_POR_CONSULTA).flatMap(valoresAdmision);
      const snap = await getDocs(query(collectionGroup(db, 'detalles'), where('gestionId', 'in', valores)));
      res.lecturas += Math.max(1, snap.size);
      snap.docs
        .filter(d => d.ref.path.startsWith(PREFIJO_IMPLANTES))
        .forEach(d => gestiones.push({ refPath: d.ref.path, ...d.data() }));
    }

    const correcciones = planificarInvalidacion(gestiones, ocCambiadas);
    for (let i = 0; i < correcciones.length; i += MAX_OPS_BATCH / 2) {
      const batch = writeBatch(db);
      const lote = correcciones.slice(i, i + MAX_OPS_BATCH / 2);
      lote.forEach(({ refPath, itemIds, cambios }) => {
        const ref = doc(db, refPath);
        const pares = itemIds.flatMap(id => [new FieldPath('ocPorItem', id), deleteField()]);
        batch.update(ref, 'ocPendiente', true, 'ocActualizadoEn', serverTimestamp(), ...pares);
        batch.set(doc(collection(ref, 'logs')), {
          accion: 'OC_INVALIDADA',
          detalles: {
            items: itemIds,
            cambios: cambios.map(c => ({ codigo: c.codigo, ocAntes: c.ocAntes, ocDespues: c.ocDespues })),
            origen: 'IMPORTAR_DETALLES_OC'
          },
          active: true,
          usuario: usuario?.nombreCompleto || 'Usuario Desconocido',
          usuarioEmail: usuario?.email || '',
          timestamp: serverTimestamp()
        });
      });
      await batch.commit();
      res.escrituras += lote.length * 2;
      res.gestionesActualizadas += lote.length;
      res.itemsLiberados += lote.reduce((n, c) => n + c.itemIds.length, 0);
    }
  } catch (err) {
    console.error('No se pudieron marcar las gestiones con OC cambiada:', err);
    res.error = err?.code === 'permission-denied'
      ? 'Sin permiso de Implantes para corregir las gestiones ahora: quedan pendientes y se aplican en el próximo "Sincronizar OC".'
      : 'No se pudieron corregir las gestiones de Implantes: ' + (err?.message || err);
  }
  return res;
};
