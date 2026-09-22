import { useEffect, useMemo, useRef, useState } from 'react';
import { onSnapshot } from 'firebase/firestore';
import {
  aniosDisponiblesPorMarcador,
  aniosDisponiblesPorSondeo,
  construirQueryAnioGestion,
  calcularMesPorDefecto
} from './periodoQueryHelpers';
import { normalizarFilaGestionImplantes, normalizarFilaGestionConsignacion, normalizarFilaGestionHemodinamia, filtrarPorBusquedaYOrigen } from '../utils/normalizarFila';

const RAIZ_IMPLANTES = 'implantes_gestiones';
const RAIZ_CONSIGNACION = 'consignacion_registros';
const RAIZ_HEMODINAMIA = 'hemodinamia_gestiones';
export const TODOS_LOS_MESES = 'TODOS';
const PAGE_SIZE = 50;

const mesActualGestion = () => String(new Date().getMonth() + 1).padStart(2, '0');

// Filtro Año/Mes de Gestión actúa sobre el campo "fecha" (admisión /
// registro) — deliberadamente distinto del "Período" (periodoAño/Mes,
// contable) que se muestra como columna informativa en la fila, sin
// relación con este filtro (pueden no coincidir).
export const useGestionConsolidadaData = () => {
  const [anio, setAnio] = useState('');
  const [mes, setMes] = useState(TODOS_LOS_MESES);
  const [aniosDisponibles, setAniosDisponibles] = useState([]);
  const [cargandoAnios, setCargandoAnios] = useState(true);

  const [bloquesImplantes, setBloquesImplantes] = useState([]);
  const [itemsConsignacion, setItemsConsignacion] = useState([]);
  const [bloquesHemodinamia, setBloquesHemodinamia] = useState([]);
  const [cargandoDatos, setCargandoDatos] = useState(false);
  const [pagina, setPagina] = useState(1);

  const [busqueda, setBusqueda] = useState('');
  const [origenesSeleccionados, setOrigenesSeleccionados] = useState([]);
  const toggleOrigen = (origen) => setOrigenesSeleccionados(prev =>
    prev.includes(origen) ? prev.filter(o => o !== origen) : [...prev, origen]
  );
  const limpiarOrigenes = () => setOrigenesSeleccionados([]);

  // Al elegir un año hay que esperar a que lleguen sus datos para recién
  // ahí saber qué meses tienen registros y poder preseleccionar el mes
  // actual (o el más reciente disponible) — nunca "Todos los meses" por
  // defecto. Este flag evita que ese cálculo se repita cada vez que el
  // snapshot se actualiza en vivo (solo corre una vez por año elegido; un
  // cambio manual de mes por el usuario no lo vuelve a disparar).
  const necesitaMesPorDefectoRef = useRef(false);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      setCargandoAnios(true);
      try {
        const [aniosConsignacion, aniosImplantes, aniosHemodinamia] = await Promise.all([
          aniosDisponiblesPorMarcador(RAIZ_CONSIGNACION),
          aniosDisponiblesPorSondeo(RAIZ_IMPLANTES),
          aniosDisponiblesPorSondeo(RAIZ_HEMODINAMIA)
        ]);
        if (cancelado) return;
        const union = Array.from(new Set([...aniosConsignacion, ...aniosImplantes, ...aniosHemodinamia])).sort((a, b) => b.localeCompare(a));
        setAniosDisponibles(union);
      } catch (err) {
        console.error('Error al obtener años disponibles de Gestión:', err);
      } finally {
        if (!cancelado) setCargandoAnios(false);
      }
    })();
    return () => { cancelado = true; };
  }, []);

  // Sin año elegido: nada de datos cargados (ni una lectura), tal como se
  // pidió — las tablas quedan vacías hasta que el usuario elige.
  useEffect(() => {
    // Limpia de inmediato los datos del año anterior (si había) para no
    // calcular "meses disponibles" con datos viejos mientras llega el
    // snapshot del año nuevo.
    setBloquesImplantes([]);
    setItemsConsignacion([]);
    setBloquesHemodinamia([]);
    setPagina(1);
    necesitaMesPorDefectoRef.current = true;

    if (!anio) return;

    setCargandoDatos(true);
    let faltanPorLlegar = 3;
    const unaLlego = () => { faltanPorLlegar -= 1; if (faltanPorLlegar <= 0) setCargandoDatos(false); };

    const unsubImplantes = onSnapshot(
      construirQueryAnioGestion(RAIZ_IMPLANTES, anio),
      (snap) => { setBloquesImplantes(snap.docs.map(d => ({ id: d.id, refPath: d.ref.path, ...d.data() }))); unaLlego(); },
      (err) => { console.error('Error al escuchar Gestión de Implantes por año:', err); unaLlego(); }
    );
    const unsubConsignacion = onSnapshot(
      construirQueryAnioGestion(RAIZ_CONSIGNACION, anio),
      (snap) => { setItemsConsignacion(snap.docs.map(d => ({ id: d.id, ref: d.ref, refPath: d.ref.path, ...d.data() }))); unaLlego(); },
      (err) => { console.error('Error al escuchar Gestión de Consignación por año:', err); unaLlego(); }
    );

    const unsubHemodinamia = onSnapshot(
      construirQueryAnioGestion(RAIZ_HEMODINAMIA, anio),
      (snap) => { setBloquesHemodinamia(snap.docs.map(d => ({ id: d.id, refPath: d.ref.path, ...d.data() }))); unaLlego(); },
      (err) => { console.error('Error al escuchar Gestión de Hemodinamia por año:', err); unaLlego(); }
    );

    return () => { unsubImplantes(); unsubConsignacion(); unsubHemodinamia(); };
  }, [anio]);

  const filasAnio = useMemo(() => [
    ...bloquesImplantes.map(normalizarFilaGestionImplantes),
    ...itemsConsignacion.map(normalizarFilaGestionConsignacion),
    ...bloquesHemodinamia.map(normalizarFilaGestionHemodinamia)
  ], [bloquesImplantes, itemsConsignacion, bloquesHemodinamia]);

  const mesesDisponibles = useMemo(() => {
    const set = new Set();
    filasAnio.forEach(f => {
      if (f.fecha && f.fecha.includes('-')) set.add(f.fecha.split('-')[1]);
    });
    return Array.from(set).sort();
  }, [filasAnio]);

  useEffect(() => {
    if (!necesitaMesPorDefectoRef.current || !anio || mesesDisponibles.length === 0) return;
    setMes(calcularMesPorDefecto(anio, mesesDisponibles, mesActualGestion()) || TODOS_LOS_MESES);
    necesitaMesPorDefectoRef.current = false;
  }, [anio, mesesDisponibles]);

  useEffect(() => { setPagina(1); }, [mes, busqueda, origenesSeleccionados]);

  const filas = useMemo(() => {
    if (mes === TODOS_LOS_MESES) return filasAnio;
    return filasAnio.filter(f => f.fecha?.split('-')[1] === mes);
  }, [filasAnio, mes]);

  // Búsqueda por admisión/nombre + Origen se aplican sobre el mes ya
  // filtrado, y ANTES de paginar, para que la paginación siempre corte
  // sobre el conjunto ya reducido por los filtros (no al revés).
  const filasFiltradas = useMemo(
    () => filtrarPorBusquedaYOrigen(filas, { busqueda, origenesSeleccionados }),
    [filas, busqueda, origenesSeleccionados]
  );

  const totalPaginas = Math.max(1, Math.ceil(filasFiltradas.length / PAGE_SIZE));
  const filasPagina = useMemo(
    () => filasFiltradas.slice((pagina - 1) * PAGE_SIZE, pagina * PAGE_SIZE),
    [filasFiltradas, pagina]
  );

  return {
    anio, setAnio,
    mes, setMes,
    aniosDisponibles,
    mesesDisponibles,
    cargandoAnios,
    cargando: cargandoDatos,
    busqueda, setBusqueda,
    origenesSeleccionados, toggleOrigen, limpiarOrigenes,
    totalFilas: filasFiltradas.length,
    filasPagina,
    pagina, setPagina,
    totalPaginas
  };
};
