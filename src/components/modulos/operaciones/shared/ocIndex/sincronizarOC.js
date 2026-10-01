// "Sincronizar OC" de Gestión de Implantes. Lecturas por corrida:
//   1 (ocImport/meta) + las gestiones con ocPendiente == true cuya fecha cae
//   dentro del rango de fechas del índice (las demás no pueden cruzar).
// El índice sale de la caché local o, si cambió la versión, de Storage.
// Escrituras: solo las gestiones que obtuvieron al menos una OC (más su log
// de auditoría en el mismo batch), y las que tenían el flag desactualizado.
import {
  collectionGroup, query, where, getDocs, doc, collection, writeBatch, FieldPath, serverTimestamp
} from 'firebase/firestore';
import { db } from '../../../../../firebaseConfig';
import { agruparIndiceOC, cruzarGestionesOC } from './indiceOC';
import { obtenerIndiceOC, registrarSincronizacionOC, limpiarInvalidacionesPendientes } from './indiceOCRemoto';
import { invalidarOCGestiones } from './invalidarOCGestiones';

const PREFIJO_IMPLANTES = 'implantes_gestiones/';
// 2 operaciones por gestión con OC (update + log): 450 ops = 225 gestiones.
const MAX_OPS_BATCH = 450;

// Paso 1 (barato): meta + índice. Permite avisar "no hay importaciones
// nuevas" antes de consultar las gestiones pendientes.
export const prepararSincronizacionOC = async () => {
  const { meta, indice, desdeCache } = await obtenerIndiceOC();
  if (!meta || Object.keys(indice).length === 0) {
    throw new Error('Aún no hay un índice de OC: importa el Excel en Documentos → Importar Detalles OC.');
  }
  return { meta, indice, desdeCache, sinNovedades: meta.ultimaSyncVersion === meta.version };
};

// Paso 2: consulta pendientes, cruza y escribe.
export const ejecutarSincronizacionOC = async ({ meta, indice }, { userData } = {}) => {
  // OC cambiadas por una reimportación que no se pudieron aplicar a las
  // gestiones (quien importó no tenía permiso de Implantes): se aplican antes
  // de buscar pendientes, para que esas gestiones entren en esta corrida.
  let invalidacion = null;
  const pendientes = meta.ocInvalidacionesPendientes || [];
  if (pendientes.length > 0) {
    invalidacion = { ...(await invalidarOCGestiones(pendientes, { usuario: userData })), correcciones: pendientes.length };
    if (!invalidacion.error) await limpiarInvalidacionesPendientes();
  }

  const q = query(
    collectionGroup(db, 'detalles'),
    where('ocPendiente', '==', true),
    where('fecha', '>=', meta.fechaMin),
    where('fecha', '<=', meta.fechaMax)
  );
  const snap = await getDocs(q);
  const gestiones = snap.docs
    .filter(d => d.ref.path.startsWith(PREFIJO_IMPLANTES))
    .map(d => ({ id: d.id, refPath: d.ref.path, ...d.data() }));

  const { actualizaciones, detalle, contadores } = cruzarGestionesOC(gestiones, agruparIndiceOC(indice));

  const erroresEscritura = [];
  const escritas = [];
  let escrituras = 0;
  let batch = writeBatch(db);
  let ops = 0;
  let pendientesDelBatch = [];

  const confirmar = async () => {
    if (ops === 0) return;
    try {
      await batch.commit();
      escritas.push(...pendientesDelBatch);
      escrituras += ops;
    } catch (err) {
      console.error('Error al guardar OC:', err);
      pendientesDelBatch.forEach(a => erroresEscritura.push({ refPath: a.refPath, error: err.message }));
    }
    batch = writeBatch(db);
    ops = 0;
    pendientesDelBatch = [];
  };

  for (const act of actualizaciones) {
    if (ops + 2 > MAX_OPS_BATCH) await confirmar();
    const ref = doc(db, act.refPath);
    // Rutas de campo puntuales (ocPorItem.<itemId>): no se reescribe el
    // mapa completo ni el arreglo de cotizaciones.
    const pares = Object.entries(act.asignaciones).flatMap(([itemId, oc]) => [new FieldPath('ocPorItem', itemId), oc]);
    batch.update(ref, 'ocPendiente', act.ocPendiente, 'ocActualizadoEn', serverTimestamp(), ...pares);
    ops++;
    if (pares.length > 0) {
      batch.set(doc(collection(ref, 'logs')), {
        accion: 'OC_ASIGNADA',
        detalles: { asignaciones: act.asignaciones, origen: 'SINCRONIZAR_OC' },
        active: true,
        usuario: userData?.nombreCompleto || 'Usuario Desconocido',
        usuarioEmail: userData?.email || '',
        timestamp: serverTimestamp()
      });
      ops++;
    }
    pendientesDelBatch.push(act);
  }
  await confirmar();

  try {
    await registrarSincronizacionOC(meta.version);
    escrituras++;
  } catch (err) {
    console.warn('No se pudo registrar la sincronización en ocImport/meta:', err);
  }

  const asignadasEscritas = escritas.reduce((n, a) => n + Object.keys(a.asignaciones).length, 0);
  return {
    gestionesRevisadas: gestiones.length,
    gestionesActualizadas: escritas.filter(a => Object.keys(a.asignaciones).length > 0).length,
    itemsActualizados: asignadasEscritas,
    contadores,
    detalle,
    erroresEscritura,
    invalidacion,
    lecturasFirestore: 1 + Math.max(1, snap.size) + (invalidacion?.lecturas || 0),
    escriturasFirestore: escrituras + (invalidacion?.escrituras || 0) + (invalidacion && !invalidacion.error ? 1 : 0)
  };
};
