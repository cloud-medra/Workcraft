import { useEffect, useMemo, useRef, useState } from 'react';
import { onSnapshot } from 'firebase/firestore';
import { MESES } from '../../controlMensual/constants';
import {
  aniosDisponiblesPorSondeoImputadas,
  construirQueryAnioImputadas,
  calcularMesPorDefecto
} from './periodoQueryHelpers';
import { normalizarImputadaImplantes, normalizarImputadaConsignacion, normalizarImputadaHemodinamia } from '../utils/normalizarFila';

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
  const [cargandoDatos, setCargandoDatos] = useState(false);
  const [pagina, setPagina] = useState(1);

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

    if (!anio) return;

    setCargandoDatos(true);
    let faltanPorLlegar = 3;
    const unaLlego = () => { faltanPorLlegar -= 1; if (faltanPorLlegar <= 0) setCargandoDatos(false); };

    const unsubImplantes = onSnapshot(
      construirQueryAnioImputadas(RAIZ_IMPLANTES, anio),
      (snap) => { setDocsImplantes(snap.docs.map(d => ({ id: d.id, ...d.data() }))); unaLlego(); },
      (err) => { console.error('Error al escuchar implantes_imputadas por año:', err); unaLlego(); }
    );
    const unsubConsignacion = onSnapshot(
      construirQueryAnioImputadas(RAIZ_CONSIGNACION, anio),
      (snap) => { setDocsConsignacion(snap.docs.map(d => ({ id: d.id, ...d.data() }))); unaLlego(); },
      (err) => { console.error('Error al escuchar consignacion_imputadas por año:', err); unaLlego(); }
    );

    const unsubHemodinamia = onSnapshot(
      construirQueryAnioImputadas(RAIZ_HEMODINAMIA, anio),
      (snap) => { setDocsHemodinamia(snap.docs.map(d => ({ id: d.id, ...d.data() }))); unaLlego(); },
      (err) => { console.error('Error al escuchar hemodinamia_imputadas por año:', err); unaLlego(); }
    );

    return () => { unsubImplantes(); unsubConsignacion(); unsubHemodinamia(); };
  }, [anio]);

  const filasAnio = useMemo(() => [
    ...docsImplantes.map(normalizarImputadaImplantes),
    ...docsConsignacion.map(normalizarImputadaConsignacion),
    ...docsHemodinamia.map(normalizarImputadaHemodinamia)
  ].sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '')), [docsImplantes, docsConsignacion, docsHemodinamia]);

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

  useEffect(() => { setPagina(1); }, [mes]);

  const filas = useMemo(() => {
    if (mes === TODOS_LOS_MESES) return filasAnio;
    return filasAnio.filter(f => f.periodoMes === mes);
  }, [filasAnio, mes]);

  const totalPaginas = Math.max(1, Math.ceil(filas.length / PAGE_SIZE));
  const filasPagina = useMemo(
    () => filas.slice((pagina - 1) * PAGE_SIZE, pagina * PAGE_SIZE),
    [filas, pagina]
  );

  return {
    anio, setAnio,
    mes, setMes,
    aniosDisponibles,
    mesesDisponibles,
    cargandoAnios,
    cargando: cargandoDatos,
    totalFilas: filas.length,
    filasPagina,
    pagina, setPagina,
    totalPaginas
  };
};
