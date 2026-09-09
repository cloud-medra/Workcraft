import { useState, useEffect, useMemo } from 'react';
import { collectionGroup, onSnapshot, collection, query, where } from 'firebase/firestore';
import { db } from '../../../../../../firebaseConfig'; // AJUSTAR según la ubicación real de este archivo
import { useToast } from '../../../../../../context/ToastContext'; // AJUSTAR ruta

export const NOMBRES_MESES = {
  "01": "Enero", "02": "Febrero", "03": "Marzo", "04": "Abril",
  "05": "Mayo", "06": "Junio", "07": "Julio", "08": "Agosto",
  "09": "Septiembre", "10": "Octubre", "11": "Noviembre", "12": "Diciembre"
};

export const ATRIBUTO_OPTIONS = ['CONSIGNACION', 'COTIZACION'];

// Sentinel para "el usuario eligió explícitamente ver todos los meses del
// año". Distinto de '' (que significa "todavía no ha elegido nada").
export const TODOS_LOS_MESES = 'TODOS';

// "documentos" es el mismo nombre de subcolección que usa Implantes
// (implantes_imputadas/{anio}/meses/{mes}/documentos) y collectionGroup no
// distingue por colección padre. Por eso cada documento que escribimos en
// consignacion_imputadas trae el campo "modulo: 'CONSIGNACION'" — acá se
// filtra por él para no mezclar datos de otros módulos.
const FILTRO_MODULO = where('modulo', '==', 'CONSIGNACION');

export const useResumenConsignacionData = () => {
  const [anio, setAnio] = useState('');   // '' = sin elegir todavía
  const [mes, setMes] = useState('');     // '' = sin elegir, TODOS_LOS_MESES = todos, o '01'..'12'
  const [busqueda, setBusqueda] = useState('');
  const [filtroAtributo, setFiltroAtributo] = useState('');
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
    const q = query(collectionGroup(db, 'documentos'), FILTRO_MODULO);

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
      console.error("Error al obtener períodos disponibles de consignación:", error);
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
      const q = query(
        collectionGroup(db, 'documentos'),
        where('periodoAnio', '==', anio),
        FILTRO_MODULO
      );

      unsubscribe = onSnapshot(q, (snapshot) => {
        setDocumentos(snapshot.docs.map(d => ({ id: d.id, refPath: d.ref.path, ...d.data() })));
        setCargando(false);
      }, (error) => {
        console.error("Error al escuchar consignacion_imputadas (año completo):", error);
        showToast("Error al cargar el resumen: " + error.message, "error");
        setCargando(false);
      });
    } else {
      const colRef = collection(db, 'consignacion_imputadas', anio, 'meses', mes, 'documentos');
      unsubscribe = onSnapshot(colRef, (snapshot) => {
        setDocumentos(snapshot.docs.map(d => ({ id: d.id, refPath: d.ref.path, ...d.data() })));
        setCargando(false);
      }, (error) => {
        console.error("Error al escuchar consignacion_imputadas (mes):", error);
        showToast("Error al cargar el resumen: " + error.message, "error");
        setCargando(false);
      });
    }

    return () => unsubscribe && unsubscribe();
  }, [anio, mes, showToast]);

  const documentosFiltrados = useMemo(() => {
    let lista = documentos;

    if (filtroAtributo) {
      lista = lista.filter(d => (d.atributo || '').toUpperCase() === filtroAtributo);
    }

    if (busqueda.trim()) {
      const term = busqueda.trim().toLowerCase();
      lista = lista.filter(d =>
        String(d.gestionId || '').toLowerCase().includes(term) ||
        String(d.nombre || '').toLowerCase().includes(term) ||
        String(d.medico || '').toLowerCase().includes(term) ||
        String(d.empresa || '').toLowerCase().includes(term) ||
        String(d.codigo || '').toLowerCase().includes(term) ||
        String(d.referencia || '').toLowerCase().includes(term)
      );
    }

    return [...lista].sort((a, b) => String(b.fecha || '').localeCompare(String(a.fecha || '')));
  }, [documentos, busqueda, filtroAtributo]);

  const totales = useMemo(() => {
    const totalVenta = documentosFiltrados.reduce((acc, d) => acc + (Number(d.venta) || 0), 0);
    const totalCantidad = documentosFiltrados.reduce((acc, d) => acc + (Number(d.cantidad) || 0), 0);
    return { totalVenta, totalCantidad, totalRegistros: documentosFiltrados.length };
  }, [documentosFiltrados]);

  return {
    anio, setAnio,
    mes, setMes,
    busqueda, setBusqueda,
    filtroAtributo, setFiltroAtributo,
    aniosDisponibles,
    mesesDelAnioActual,
    documentosFiltrados,
    totales,
    cargando: cargando || cargandoPeriodos
  };
};