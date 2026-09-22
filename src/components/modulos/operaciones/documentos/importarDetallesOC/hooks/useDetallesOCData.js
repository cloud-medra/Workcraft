// Lectura paginada de los registros ya importados (documentos_sistema),
// 50 por página. A diferencia de la tabla de Gestiones de Implante (que
// pagina EN MEMORIA sobre un listener ya acotado a ~150 filas), esta
// colección puede tener miles de documentos y sigue creciendo — así que
// acá se pagina del lado de Firestore con cursores (getDocs + limit +
// startAfter), sin listener en vivo y sin traer nunca más de 50 filas de
// una vez.
import { useCallback, useState } from 'react';
import { collectionGroup, query, where, orderBy, limit, startAfter, documentId, getDocs, getCountFromServer } from 'firebase/firestore';
import { db } from '../../../../../../firebaseConfig';

const RANGO_MIN = 'documentos_sistema/0000';
const RANGO_MAX = 'documentos_sistema/9999';
export const TAMANO_PAGINA_DETALLES_OC = 50;

// Mismo truco ya usado para implantes_gestiones: el segmento año/mes del
// path viene con ceros a la izquierda, así que ordenar por documentId()
// descendente entrega los documentos más recientes primero, sin necesitar
// ningún índice compuesto nuevo (el orden por __name__ ya viene soportado
// siempre).
const construirQueryBase = () => [
  where(documentId(), '>=', RANGO_MIN),
  where(documentId(), '<', RANGO_MAX),
  orderBy(documentId(), 'desc')
];

export const useDetallesOCData = () => {
  const [filas, setFilas] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [totalFilas, setTotalFilas] = useState(null);
  const [paginaActual, setPaginaActual] = useState(1);
  const [hayMas, setHayMas] = useState(false);
  // Stack de cursores: cursores[i] = el último doc de la página i (1-based),
  // para poder pedir "la página siguiente" a partir de cualquier página ya
  // visitada sin tener que re-leer desde el principio.
  const [cursores, setCursores] = useState([]);

  const cargarConteoTotal = useCallback(async () => {
    try {
      const q = query(collectionGroup(db, 'detalles'), ...construirQueryBase());
      const snap = await getCountFromServer(q);
      setTotalFilas(snap.data().count);
    } catch (err) {
      console.error('Error al contar registros de Detalles OC:', err);
    }
  }, []);

  const cargarPagina = useCallback(async (numeroPagina) => {
    setCargando(true);
    try {
      const restricciones = [...construirQueryBase()];
      const cursor = numeroPagina > 1 ? cursores[numeroPagina - 2] : null;
      if (cursor) restricciones.push(startAfter(cursor));
      restricciones.push(limit(TAMANO_PAGINA_DETALLES_OC));

      const q = query(collectionGroup(db, 'detalles'), ...restricciones);
      const snap = await getDocs(q);

      setFilas(snap.docs.map(d => ({ id: d.id, refPath: d.ref.path, ...d.data() })));
      setHayMas(snap.docs.length === TAMANO_PAGINA_DETALLES_OC);
      setPaginaActual(numeroPagina);

      const ultimoDoc = snap.docs[snap.docs.length - 1] || null;
      if (ultimoDoc) {
        setCursores(prev => {
          const nuevo = [...prev];
          nuevo[numeroPagina - 1] = ultimoDoc;
          return nuevo;
        });
      }
    } catch (err) {
      console.error('Error al cargar registros de Detalles OC:', err);
    } finally {
      setCargando(false);
    }
  }, [cursores]);

  const irAPrimeraPagina = useCallback(async () => {
    setCursores([]);
    await cargarConteoTotal();
    await cargarPagina(1);
  }, [cargarConteoTotal, cargarPagina]);

  const irASiguiente = () => { if (hayMas) cargarPagina(paginaActual + 1); };
  const irAAnterior = () => { if (paginaActual > 1) cargarPagina(paginaActual - 1); };

  const totalPaginas = totalFilas != null ? Math.max(1, Math.ceil(totalFilas / TAMANO_PAGINA_DETALLES_OC)) : null;

  return {
    filas,
    cargando,
    totalFilas,
    totalPaginas,
    paginaActual,
    hayMas,
    irAPrimeraPagina,
    irASiguiente,
    irAAnterior
  };
};
