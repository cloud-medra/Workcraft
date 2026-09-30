// ¿Existen estas admisiones en Implantes? Una consulta por id con limit(1):
// exactamente 1 lectura por admisión, exista o no (una consulta vacía cobra
// 1 lectura mínima), en vez de traer todos sus registros (uno por
// empresa/fecha).
//
// El collectionGroup "detalles" lo comparten Implantes, Hemodinamia y otros
// módulos con el mismo campo gestionId, así que se acota por ruta al rango
// de implantes_gestiones (mismo truco de documentId() que
// useGestionesImplantesData.js); sin eso limit(1) podría devolver un
// registro de Hemodinamia. gestionId + rango de __name__ necesita el índice
// compuesto (gestionId, __name__) COLLECTION_GROUP de firestore.indexes.json.
//
// Todos los que escriben gestiones guardan gestionId (y agendaId con el
// mismo valor), así que basta con gestionId. Puede estar como texto o
// número: se prueban ambos, pero el número solo si el texto es su forma
// exacta ("02030" no busca 2030 — la comparación de id es exacta).
import { collectionGroup, query, where, documentId, limit, getDocs } from 'firebase/firestore';
import { db } from '../../../../../../firebaseConfig';

const RANGO_MIN_GESTIONES = 'implantes_gestiones/0000';
const RANGO_MAX_GESTIONES = 'implantes_gestiones/9999';
const CONSULTAS_EN_PARALELO = 10;

const valoresId = (id) => (String(Number(id)) === id ? [id, Number(id)] : [id]);

const buscarUna = async (id) => {
  const snap = await getDocs(query(
    collectionGroup(db, 'detalles'),
    where('gestionId', 'in', valoresId(id)),
    where(documentId(), '>=', RANGO_MIN_GESTIONES),
    where(documentId(), '<', RANGO_MAX_GESTIONES),
    limit(1)
  ));
  if (snap.empty) return null;
  const data = snap.docs[0].data();
  return { nombre: data.nombre || data.paciente || '' };
};

// Devuelve Map id -> { nombre } | null (null = no existe). Si una consulta
// falla, su id queda en `fallidos` (no se cachea como inexistente).
export const buscarAdmisionesImplantes = async (ids) => {
  const encontradas = new Map();
  const fallidos = [];
  for (let i = 0; i < ids.length; i += CONSULTAS_EN_PARALELO) {
    const lote = ids.slice(i, i + CONSULTAS_EN_PARALELO);
    const resultados = await Promise.allSettled(lote.map(buscarUna));
    resultados.forEach((r, idx) => {
      if (r.status === 'fulfilled') encontradas.set(lote[idx], r.value);
      else {
        console.error(`Error al verificar la admisión ${lote[idx]}:`, r.reason);
        fallidos.push(lote[idx]);
      }
    });
  }
  return { encontradas, fallidos };
};
