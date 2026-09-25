import { useEffect, useMemo, useRef, useState } from 'react';
import { getDocs } from 'firebase/firestore';
import { leerConCache } from './cacheLecturasAnio';
import { MESES } from '../../controlMensual/constants';
import {
  aniosDisponiblesPorSondeoImputadas,
  construirQueryAnioImputadas,
  calcularMesPorDefecto
} from './periodoQueryHelpers';
import { normalizarImputadaImplantes, normalizarImputadaConsignacion, normalizarImputadaHemodinamia, ordenarPorAdmisionYOC, filtrarPorBusquedaYOrigen } from '../utils/normalizarFila';

const RAIZ_IMPLANTES = 'implantes_imputadas';
const RAIZ_CONSIGNACION = 'consignacion_imputadas';
const RAIZ_HEMODINAMIA = 'hemodinamia_imputadas';
export const TODOS_LOS_MESES = 'TODOS';
const PAGE_SIZE = 50;

const mesActualImputadas = () => MESES.find(m => m.num === new Date().getMonth() + 1)?.id;

// A diferencia de Gestión (que filtra por "fecha"), Imputadas filtra por
// PERÍODO (periodoAño/Mes) — es la clave natural de esta colección (así
// está organizada en Firestore) y el mismo criterio que ya usan
// ResumenImplantes/ResumenConsignacion.
export const useImputadasUnificadasData = () => {
  const [anio, setAnio] = useState('');
  const [mes, setMes] = useState(TODOS_LOS_MESES);
  const [aniosDisponibles, setAniosDisponibles] = useState([]);
  const [cargandoAnios, setCargandoAnios] = useState(true);

  const [docsImplantes, setDocsImplantes] = useState([]);
  const [docsConsignacion, setDocsConsignacion] = useState([]);
  const [docsHemodinamia, setDocsHemodinamia] = useState([]);
  // Qué lectura (año + versión) terminó; `cargando` se deriva de ahí.
  const [lecturaLista, setLecturaLista] = useState({ anio: null, version: null });
  const [pagina, setPagina] = useState(1);
  const [version, setVersion] = useState(0);
  const forzarLecturaRef = useRef(false);
  const actualizar = () => {
    forzarLecturaRef.current = true;
    setVersion(v => v + 1);
  };

  const [busqueda, setBusqueda] = useState('');
  const [origenesSeleccionados, setOrigenesSeleccionados] = useState([]);
  const toggleOrigen = (origen) => setOrigenesSeleccionados(prev =>
    prev.includes(origen) ? prev.filter(o => o !== origen) : [...prev, origen]
  );
  const limpiarOrigenes = () => setOrigenesSeleccionados([]);

  const necesitaMesPorDefectoRef = useRef(false);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      setCargandoAnios(true);
      try {
        const [aniosImplantes, aniosConsignacion, aniosHemodinamia] = await Promise.all([
          aniosDisponiblesPorSondeoImputadas(RAIZ_IMPLANTES),
          aniosDisponiblesPorSondeoImputadas(RAIZ_CONSIGNACION),
          aniosDisponiblesPorSondeoImputadas(RAIZ_HEMODINAMIA)
        ]);
        if (cancelado) return;
        const union = Array.from(new Set([...aniosImplantes, ...aniosConsignacion, ...aniosHemodinamia])).sort((a, b) => b.localeCompare(a));
        setAniosDisponibles(union);
      } catch (err) {
        console.error('Error al obtener años disponibles de Imputadas:', err);
      } finally {
        if (!cancelado) setCargandoAnios(false);
      }
    })();
    return () => { cancelado = true; };
  }, []);

  useEffect(() => {
    setDocsImplantes([]);
    setDocsConsignacion([]);
    setDocsHemodinamia([]);
    setPagina(1);
    necesitaMesPorDefectoRef.current = true;
  }, [anio]);

  // Lectura única por año (con caché de sesión, ver cacheLecturasAnio.js).
  // `version` la sube "Actualizar" para forzar una nueva lectura sin
  // resetear el mes elegido.
  useEffect(() => {
    if (!anio) return undefined;
    const forzar = forzarLecturaRef.current;
    forzarLecturaRef.current = false;
    let cancelado = false;

    const leer = (raiz, mapear) => leerConCache(
      `imputadas|${raiz}|${anio}`,
      () => getDocs(construirQueryAnioImputadas(raiz, anio)).then(snap => snap.docs.map(mapear)),
      { forzar }
    );

    Promise.allSettled([
      leer(RAIZ_IMPLANTES, d => ({ id: d.id, ...d.data() })),
      leer(RAIZ_CONSIGNACION, d => ({ id: d.id, ...d.data() })),
      leer(RAIZ_HEMODINAMIA, d => ({ id: d.id, ...d.data() }))
    ]).then(([r0, r1, r2]) => {
      if (cancelado) return;
      if (r0.status === 'fulfilled') setDocsImplantes(r0.value);
      else console.error('Error al leer implantes_imputadas por año:', r0.reason);
      if (r1.status === 'fulfilled') setDocsConsignacion(r1.value);
      else console.error('Error al leer consignacion_imputadas por año:', r1.reason);
      if (r2.status === 'fulfilled') setDocsHemodinamia(r2.value);
      else console.error('Error al leer hemodinamia_imputadas por año:', r2.reason);
      setLecturaLista({ anio, version });
    });

    return () => { cancelado = true; };
  }, [anio, version]);

  // Antes esto solo ordenaba por fecha (descendente) — no agrupaba por
  // admisión en absoluto, así que filas de una misma admisión podían
  // aparecer separadas y mezcladas con las de otras admisiones distintas
  // que cayeran en fechas intermedias. Ahora usa el criterio compuesto
  // compartido del Consolidado: admisión ascendente, y dentro de cada
  // admisión, código de OC primero y "No lleva OC" al final.
  const filasAnio = useMemo(() => ordenarPorAdmisionYOC([
    ...docsImplantes.map(normalizarImputadaImplantes),
    ...docsConsignacion.map(normalizarImputadaConsignacion),
    ...docsHemodinamia.map(normalizarImputadaHemodinamia)
  ]), [docsImplantes, docsConsignacion, docsHemodinamia]);

  // Meses disponibles del año elegido, ya ordenados de enero a diciembre
  // (se recorre MESES, que ya está en ese orden) — se derivan de lo ya
  // traído (todo el año), sin ninguna consulta extra.
  const mesesDisponibles = useMemo(() => {
    const set = new Set();
    filasAnio.forEach(f => { if (f.periodoMes) set.add(f.periodoMes); });
    return MESES.filter(m => set.has(m.id)).map(m => m.id);
  }, [filasAnio]);

  useEffect(() => {
    if (!necesitaMesPorDefectoRef.current || !anio || mesesDisponibles.length === 0) return;
    setMes(calcularMesPorDefecto(anio, mesesDisponibles, mesActualImputadas()) || TODOS_LOS_MESES);
    necesitaMesPorDefectoRef.current = false;
  }, [anio, mesesDisponibles]);

  useEffect(() => { setPagina(1); }, [mes, busqueda, origenesSeleccionados]);

  const filas = useMemo(() => {
    if (mes === TODOS_LOS_MESES) return filasAnio;
    return filasAnio.filter(f => f.periodoMes === mes);
  }, [filasAnio, mes]);

  // Igual que en Gestión: búsqueda por admisión/nombre + Origen se aplican
  // sobre el mes ya filtrado y ANTES de paginar.
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
    cargando: Boolean(anio) && (lecturaLista.anio !== anio || lecturaLista.version !== version),
    actualizar,
    busqueda, setBusqueda,
    origenesSeleccionados, toggleOrigen, limpiarOrigenes,
    totalFilas: filasFiltradas.length,
    filasPagina,
    pagina, setPagina,
    totalPaginas
  };
};
