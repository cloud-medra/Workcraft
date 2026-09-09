import { useState, useEffect, useMemo } from 'react';
import { collectionGroup, onSnapshot, collection, query, where } from 'firebase/firestore';
import { db } from '../../../../../../firebaseConfig';
import { useToast } from '../../../../../../context/ToastContext';

export const NOMBRES_MESES = {
  "01": "Enero", "02": "Febrero", "03": "Marzo", "04": "Abril",
  "05": "Mayo", "06": "Junio", "07": "Julio", "08": "Agosto",
  "09": "Septiembre", "10": "Octubre", "11": "Noviembre", "12": "Diciembre"
};

export const ESTADO_CARGA_OPTIONS = ['PENDIENTE', 'CARGADO', 'REVISAR', 'S/COTIZACION'];

// Sentinel para "el usuario eligió explícitamente ver todos los meses del
// año". Distinto de '' (que significa "todavía no ha elegido nada").
export const TODOS_LOS_MESES = 'TODOS';

// TEMPORAL: sin filtro por 'atributo' — los documentos existentes en
// implantes_imputadas no tienen ese campo guardado (confirmado: 314 docs
// aparecen sin el filtro). Si más adelante otro módulo también escribe en
// una subcolección "documentos", retomar esto con un backfill previo.
const FILTRO_MODULO = null; // antes: where('atributo', '==', 'IMPLANTES')

export const useResumenImplantesData = () => {
  const [anio, setAnio] = useState('');   // '' = sin elegir todavía
  const [mes, setMes] = useState('');     // '' = sin elegir, TODOS_LOS_MESES = todos, o '01'..'12'
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstadoCarga, setFiltroEstadoCarga] = useState('');
  const [documentos, setDocumentos] = useState([]);
  const [cargando, setCargando] = useState(false);

  const [periodosDisponibles, setPeriodosDisponibles] = useState({});
  const [cargandoPeriodos, setCargandoPeriodos] = useState(true);

  const { showToast } = useToast();

  // --- Metadata: qué años/meses tienen datos realmente registrados ---
  // Es la única lectura que se hace siempre al entrar a la vista, y solo
  // sirve para poblar los selects. Los datos completos de cada ítem (la
  // consulta pesada) solo se piden cuando el usuario elige año Y mes.
  useEffect(() => {
    const constraints = [collectionGroup(db, 'documentos')];
    if (FILTRO_MODULO) constraints.push(FILTRO_MODULO);
    const q = query(...constraints);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const mapa = {};
      snapshot.docs.forEach(d => {
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

  // Si el año elegido deja de existir en la metadata (caso borde), se limpia
  // — pero no se auto-selecciona ningún año por defecto.
  useEffect(() => {
    if (anio && !aniosDisponibles.includes(anio)) {
      setAnio('');
    }
  }, [aniosDisponibles, anio]);

  // Al cambiar de año, se resetea el mes (obliga a elegir de nuevo dentro
  // del nuevo año).
  useEffect(() => {
    setMes('');
  }, [anio]);

  // --- Datos de la tabla ---
  // Solo se consulta cuando hay año Y mes elegidos explícitamente (mes puede
  // ser un mes puntual o el sentinel TODOS_LOS_MESES). Mientras mes === '',
  // la tabla queda vacía sin gastar lecturas.
  useEffect(() => {
    if (!anio || !mes) {
      setDocumentos([]);
      setCargando(false);
      return;
    }

    setCargando(true);
    let unsubscribe;

    if (mes === TODOS_LOS_MESES) {
      const constraints = [collectionGroup(db, 'documentos'), where('periodoAnio', '==', anio)];
      if (FILTRO_MODULO) constraints.push(FILTRO_MODULO);
      const q = query(...constraints);

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