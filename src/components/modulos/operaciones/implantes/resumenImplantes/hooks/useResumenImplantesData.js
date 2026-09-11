import { useState, useEffect, useMemo } from 'react';
import { collectionGroup, onSnapshot, collection, query, where, orderBy, documentId } from 'firebase/firestore';
import { db } from '../../../../../../firebaseConfig';
import { useToast } from '../../../../../../context/ToastContext';

export const NOMBRES_MESES = {
  "01": "Enero", "02": "Febrero", "03": "Marzo", "04": "Abril",
  "05": "Mayo", "06": "Junio", "07": "Julio", "08": "Agosto",
  "09": "Septiembre", "10": "Octubre", "11": "Noviembre", "12": "Diciembre"
};

export const ESTADO_CARGA_OPTIONS = ['PENDIENTE', 'CARGADO', 'REVISAR', 'S/COTIZACION'];
export const TODOS_LOS_MESES = 'TODOS';

const RAIZ_IMPLANTES_IMPUTADAS = 'implantes_imputadas';

// En un collectionGroup, los límites de documentId() deben ser rutas de
// documento COMPLETAS (número PAR de segmentos) — 'implantes_imputadas/'
// (1 segmento) es inválido y Firestore lo rechaza en tiempo de ejecución.
// La ruta real es 'implantes_imputadas/{anio}/meses/.../documentos/{id}',
// con {anio} variable, así que se acota ese 2do segmento a un rango que
// cubre cualquier año de 4 dígitos.
const RANGO_MIN_IMPUTADAS = `${RAIZ_IMPLANTES_IMPUTADAS}/0000`;
const RANGO_MAX_IMPUTADAS = `${RAIZ_IMPLANTES_IMPUTADAS}/9999`;

export const useResumenImplantesData = () => {
  const [anio, setAnio] = useState('');
  const [mes, setMes] = useState('');  
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstadoCarga, setFiltroEstadoCarga] = useState('');
  const [documentos, setDocumentos] = useState([]);
  const [cargando, setCargando] = useState(false);

  const [periodosDisponibles, setPeriodosDisponibles] = useState({});
  const [cargandoPeriodos, setCargandoPeriodos] = useState(true);

  const { showToast } = useToast();

  // Antes esto escuchaba TODO el collectionGroup "documentos" de la base de
  // datos (cualquier módulo con una subcolección "documentos" bajo su
  // colección de imputadas) y filtraba recién en el cliente por el prefijo
  // 'implantes_imputadas/'. Ahora se acota con un rango sobre el ID de
  // documento (__name__) para que Firestore solo entregue documentos cuyo
  // path empieza con ese prefijo — sin necesidad de un índice compuesto.
  useEffect(() => {
    const q = query(
      collectionGroup(db, 'documentos'),
      where(documentId(), '>=', RANGO_MIN_IMPUTADAS),
      where(documentId(), '<', RANGO_MAX_IMPUTADAS),
      orderBy(documentId())
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docsImplantes = snapshot.docs;

      const mapa = {};
      docsImplantes.forEach(d => {
        const data = d.data();
        const a = data.periodoAnio;
        const m = data.periodoMes;
        if (!a || !m) return;
        if (!mapa[a]) mapa[a] = new Set();
        mapa[a].add(m);
      });
      setPeriodosDisponibles(mapa);
      setCargandoPeriodos(false);
    }, (error) => {
      console.error("Error al obtener períodos disponibles de implantes:", error);
      showToast("Error al cargar períodos: " + error.message, "error");
      setCargandoPeriodos(false);
    });

    return () => unsubscribe();
  }, [showToast]);

  const aniosDisponibles = useMemo(
    () => Object.keys(periodosDisponibles).sort(),
    [periodosDisponibles]
  );

  const mesesDelAnioActual = useMemo(() => {
    if (!anio || !periodosDisponibles[anio]) return [];
    return Array.from(periodosDisponibles[anio]).sort((a, b) => a.localeCompare(b));
  }, [periodosDisponibles, anio]);

  useEffect(() => {
    if (anio && !aniosDisponibles.includes(anio)) {
      setAnio('');
    }
  }, [aniosDisponibles, anio]);

  useEffect(() => {
    setMes('');
  }, [anio]);

  useEffect(() => {
    if (!anio || !mes) {
      setDocumentos([]);
      setCargando(false);
      return;
    }

    setCargando(true);
    let unsubscribe;

    if (mes === TODOS_LOS_MESES) {
      // Acotado directamente a 'implantes_imputadas/{anio}' vía rango de
      // __name__: reemplaza el where('periodoAnio', '==', anio) que antes
      // corría sobre TODO el collectionGroup de la app (todos los módulos)
      // y evita además necesitar un índice compuesto.
      // OJO: sin slash final — 'implantes_imputadas/{anio}/' tendría 3
      // segmentos (impar) y sería inválido; 'implantes_imputadas/{anio}' (2
      // segmentos, año ya es un valor concreto acá) es la ruta de documento
      // válida, y la comparación de strings igual cubre todo lo que cuelga
      // debajo (meses/documentos/...).
      const limiteInferiorAnio = `${RAIZ_IMPLANTES_IMPUTADAS}/${anio}`;
      const limiteSuperiorAnio = `${RAIZ_IMPLANTES_IMPUTADAS}/${anio}`;
      const q = query(
        collectionGroup(db, 'documentos'),
        where(documentId(), '>=', limiteInferiorAnio),
        where(documentId(), '<', limiteSuperiorAnio),
        orderBy(documentId())
      );

      unsubscribe = onSnapshot(q, (snapshot) => {
        setDocumentos(snapshot.docs.map(d => ({ id: d.id, refPath: d.ref.path, ...d.data() })));
        setCargando(false);
      }, (error) => {
        console.error("Error al escuchar implantes_imputadas (año completo):", error);
        showToast("Error al cargar el resumen: " + error.message, "error");
        setCargando(false);
      });
    } else {
      const colRef = collection(db, 'implantes_imputadas', anio, 'meses', mes, 'documentos');
      unsubscribe = onSnapshot(colRef, (snapshot) => {
        setDocumentos(snapshot.docs.map(d => ({ id: d.id, refPath: d.ref.path, ...d.data() })));
        setCargando(false);
      }, (error) => {
        console.error("Error al escuchar implantes_imputadas (mes):", error);
        showToast("Error al cargar el resumen: " + error.message, "error");
        setCargando(false);
      });
    }

    return () => unsubscribe && unsubscribe();
  }, [anio, mes, showToast]);

  const documentosFiltrados = useMemo(() => {
    let lista = documentos;

    if (filtroEstadoCarga) {
      lista = lista.filter(d => (d.estadoCarga || 'PENDIENTE') === filtroEstadoCarga);
    }

    if (busqueda.trim()) {
      const term = busqueda.trim().toLowerCase();
      lista = lista.filter(d =>
        String(d.gestionId || '').toLowerCase().includes(term) ||
        String(d.paciente || '').toLowerCase().includes(term) ||
        String(d.medico || '').toLowerCase().includes(term) ||
        String(d.empresa || '').toLowerCase().includes(term) ||
        String(d.codigo || '').toLowerCase().includes(term) ||
        String(d.referencia || '').toLowerCase().includes(term)
      );
    }

    return [...lista].sort((a, b) => String(b.fecha || '').localeCompare(String(a.fecha || '')));
  }, [documentos, busqueda, filtroEstadoCarga]);

  const totales = useMemo(() => {
    const totalMonto = documentosFiltrados.reduce((acc, d) => acc + (Number(d.total) || 0), 0);
    const totalCantidad = documentosFiltrados.reduce((acc, d) => acc + (Number(d.cantidad) || 0), 0);
    return { totalMonto, totalCantidad, totalRegistros: documentosFiltrados.length };
  }, [documentosFiltrados]);

  return {
    anio, setAnio,
    mes, setMes,
    busqueda, setBusqueda,
    filtroEstadoCarga, setFiltroEstadoCarga,
    aniosDisponibles,
    mesesDelAnioActual,
    documentosFiltrados,
    totales,
    cargando: cargando || cargandoPeriodos
  };
};