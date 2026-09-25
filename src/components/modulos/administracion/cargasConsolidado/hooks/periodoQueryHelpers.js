import { collection, collectionGroup, query, where, documentId, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../../../../../firebaseConfig';

const ANIOS_A_PROBAR = 8; // año actual + 7 hacia atrás — suficiente para uso real, sin escanear todo el histórico

// Consignación escribe documentos "marcador" livianos (active:true) al
// crear un registro — consignacion_registros/{anio} — así que sus años
// disponibles se listan gratis (unos pocos docs, no los ítems reales).
export const aniosDisponiblesPorMarcador = async (coleccionBase) => {
  const snap = await getDocs(collection(db, coleccionBase));
  return snap.docs
    .map(d => d.id)
    .filter(id => /^\d{4}$/.test(id))
    .sort((a, b) => b.localeCompare(a));
};

// Implantes no tiene ese marcador — en vez de leer toda la colección para
// saber qué años existen, se hacen N consultas chicas (limit 1) acotadas
// por rango de documentId() a cada año candidato: cada una trae como
// máximo 1 documento, nunca el histórico completo. `subcoleccion` es
// "detalles" (implantes_gestiones) o "documentos" (*_imputadas).
const aniosDisponiblesPorSondeoDe = async (raiz, subcoleccion) => {
  const anioActual = new Date().getFullYear();
  const candidatos = Array.from({ length: ANIOS_A_PROBAR }, (_, i) => String(anioActual - i));

  const resultados = await Promise.all(
    candidatos.map(async (anio) => {
      const q = query(
        collectionGroup(db, subcoleccion),
        where(documentId(), '>=', `${raiz}/${anio}`),
        where(documentId(), '<', `${raiz}/${Number(anio) + 1}`),
        orderBy(documentId()),
        limit(1)
      );
      const snap = await getDocs(q);
      return snap.empty ? null : anio;
    })
  );

  return resultados.filter(Boolean).sort((a, b) => b.localeCompare(a));
};

export const aniosDisponiblesPorSondeo = (raiz) => aniosDisponiblesPorSondeoDe(raiz, 'detalles');
export const aniosDisponiblesPorSondeoImputadas = (raiz) => aniosDisponiblesPorSondeoDe(raiz, 'documentos');

// Trae, acotado a un año puntual (rango sobre documentId(), mismo patrón
// que ya usa el resto de la app), todos los "detalles" de una raíz —
// implantes_gestiones o consignacion_registros.
export const construirQueryAnioGestion = (raiz, anio) => query(
  collectionGroup(db, 'detalles'),
  where(documentId(), '>=', `${raiz}/${anio}`),
  where(documentId(), '<', `${raiz}/${Number(anio) + 1}`),
  orderBy(documentId())
);

// Imputadas: mismo rango por año sobre documentId(). El mes se filtra
// SIEMPRE client-side (no con un where('periodoMes','==',...) aparte) —
// necesitamos los meses disponibles del año completo de entrada para
// poder preseleccionar el mes actual/más reciente (ver
// calcularMesPorDefecto), así que no tiene sentido acotar la consulta a
// un mes antes de saber cuál corresponde preseleccionar; una vez cargado
// el año, cambiar de mes es gratis (ya está todo en memoria).
export const construirQueryAnioImputadas = (raiz, anio) => query(
  collectionGroup(db, 'documentos'),
  where(documentId(), '>=', `${raiz}/${anio}`),
  where(documentId(), '<', `${raiz}/${Number(anio) + 1}`),
  orderBy(documentId())
);

// Mes a preseleccionar al elegir un año: el mes en curso si el año
// elegido es el actual y ese mes tiene registros; si no, el mes más
// reciente que sí tenga — nunca "Todos los meses" por defecto.
// `mesesDisponibles` debe venir ya ordenado de más antiguo a más
// reciente. `mesActualValue` es el valor (en el mismo formato que usan
// mesesDisponibles) que representa el mes calendario actual.
export const calcularMesPorDefecto = (anio, mesesDisponibles, mesActualValue) => {
  if (!mesesDisponibles || mesesDisponibles.length === 0) return null;
  const esAnioActual = Number(anio) === new Date().getFullYear();
  if (esAnioActual && mesesDisponibles.includes(mesActualValue)) return mesActualValue;
  return mesesDisponibles[mesesDisponibles.length - 1];
};

// Meses con al menos un documento en `{raiz}/{anio}/meses/{mes}/documentos`,
// sin leer los documentos: recorre el índice de __name__ trayendo 1 solo
// documento por mes y saltando al mes siguiente ("skip scan"). Cuesta
// (meses con datos + 1) lecturas, sin importar cuántos registros tenga cada
// mes, y descubre los IDs de mes tal como están guardados (no asume un
// formato). Devuelve los IDs en orden de string.
const MAX_MESES_SONDEO = 24; // tope de seguridad
export const mesesDisponiblesPorSondeoImputadas = async (raiz, anio) => {
  const meses = [];
  const hasta = `${raiz}/${Number(anio) + 1}`;
  let desde = `${raiz}/${anio}`;
  for (let i = 0; i < MAX_MESES_SONDEO; i++) {
    const snap = await getDocs(query(
      collectionGroup(db, 'documentos'),
      where(documentId(), '>=', desde),
      where(documentId(), '<', hasta),
      orderBy(documentId()),
      limit(1)
    ));
    if (snap.empty) break;
    // {raiz}/{anio}/{subcoleccion}/{mes}/documentos/{id}
    const [, , subcoleccion, mes] = snap.docs[0].ref.path.split('/');
    if (subcoleccion === 'meses') meses.push(mes);
    // '\uf8ff' ordena después de cualquier ruta que cuelgue de ese mes.
    desde = `${raiz}/${anio}/${subcoleccion}/${mes}\uf8ff`;
  }
  return meses;
};
