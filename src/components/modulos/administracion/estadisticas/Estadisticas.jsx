import { useEffect, useMemo, useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import {
  BarChart3, CalendarDays, Clock, FileSpreadsheet, Stethoscope, ClipboardList, Building2, Users,
  AlertTriangle, RefreshCw, Loader2, Lock, Activity, Info,
} from 'lucide-react';
import { functions } from '../../../../firebaseConfig';
import { useGranularPermission } from '../../../../hooks/useGranularPermission';
import { useUser } from '../../../../context/UserContext';
import { useModal } from '../../../../context/ModalContext';
import { useToast } from '../../../../context/ToastContext';
import { BLOQUES, DIMENSIONES, CRUCES, periodoAnterior, etiquetaPeriodo, desdeClave } from './estadisticasConfig';
import { obtenerIndice, obtenerPeriodo, invalidarPeriodo } from './estadisticasStore';
import { unirDatos, indicadores, filasComparadas, filasCruce, filtrarFilas, ordenarFilas } from './agregados';
import { exportarEstadisticas, filasParaExcel } from './exportarEstadisticas';
import TarjetaIndicador from './components/TarjetaIndicador';
import TablaDimension from './components/TablaDimension';
import BarrasTop from './components/BarrasTop';
import PanelDetalle from './components/PanelDetalle';
import { formatoNumero } from './components/formato';

// Administración → Estadísticas. Bloque 1: Implantes, Consignación y
// Hemodinamia, por período de imputación (el de Período Actual y el cierre).
// Lee solo los documentos precalculados de la colección `estadisticas`
// (índice + 1 documento por módulo y período), con getDoc y caché de sesión:
// cambiar de pestaña, filtro, orden o abrir un detalle no lee nada.

const PATH_VISTA = '/administracion/estadisticas'; // = RUTA_VISTA_ESTADISTICAS
const BLOQUE = BLOQUES[0];
const ICONOS = { m: Stethoscope, c: ClipboardList, e: Building2 };

const fechaHora = (ts) => {
  const d = ts?.toDate ? ts.toDate() : null;
  return d ? d.toLocaleString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
};

const Estadisticas = () => {
  const { hasPermission } = useGranularPermission();
  const { userData } = useUser();
  const { confirmAction } = useModal();
  const { showToast } = useToast();

  const modulosPermitidos = BLOQUE.modulos.filter((m) => hasPermission(PATH_VISTA, 'filtros', m.permiso));
  const dimensionesPermitidas = BLOQUE.dimensiones.filter((d) => hasPermission(PATH_VISTA, 'pestanas', DIMENSIONES[d].permiso));
  const puede = {
    elegirPeriodo: hasPermission(PATH_VISTA, 'filtros', 'select_periodo'),
    exportar: hasPermission(PATH_VISTA, 'acciones', 'btn_exportar'),
    // El servidor vuelve a exigir rol admin/dev.
    recalcular: ['admin', 'dev'].includes(userData?.rol) && hasPermission(PATH_VISTA, 'acciones', 'btn_recalcular'),
  };

  const [indice, setIndice] = useState(null);
  const [errorIndice, setErrorIndice] = useState(null);
  const [periodo, setPeriodo] = useState(null);
  const [filtro, setFiltro] = useState('todos');
  const [tab, setTab] = useState(null);
  const [datos, setDatos] = useState({ clave: null, actual: [], anterior: [] });
  const [error, setError] = useState(null);
  const [busquedas, setBusquedas] = useState({});
  const [ordenes, setOrdenes] = useState({});
  const [seleccion, setSeleccion] = useState(null);
  const [recalculando, setRecalculando] = useState(null);
  const [version, setVersion] = useState(0);

  const idsPermitidos = modulosPermitidos.map((m) => m.id).join(',');
  const modulosVista = filtro === 'todos' ? idsPermitidos.split(',').filter(Boolean) : [filtro];
  const dimension = tab && dimensionesPermitidas.includes(tab) ? tab : dimensionesPermitidas[0];

  // Índice de períodos (1 lectura por sesión).
  useEffect(() => {
    let activo = true;
    obtenerIndice()
      .then((d) => { if (activo) setIndice(d || { periodos: {} }); })
      .catch((err) => { console.error('Error al leer el índice de estadísticas:', err); if (activo) setErrorIndice('No se pudo cargar la lista de períodos.'); });
    return () => { activo = false; };
  }, [version]);

  // Períodos con estadísticas de los módulos permitidos (más reciente primero).
  const periodos = (() => {
    if (!indice) return [];
    const mapa = new Map();
    idsPermitidos.split(',').filter(Boolean).forEach((m) => {
      Object.entries(indice.periodos?.[m] || {}).forEach(([clave, info]) => {
        const previo = mapa.get(clave) || { clave, definitivo: true };
        mapa.set(clave, { clave, definitivo: previo.definitivo && Boolean(info.definitivo) });
      });
    });
    return [...mapa.values()].sort((a, b) => b.clave.localeCompare(a.clave));
  })();

  // Por defecto: el período en curso más reciente; si no hay, el último.
  const periodoVista = periodo && periodos.some((p) => p.clave === periodo)
    ? periodo
    : (periodos.find((p) => !p.definitivo) || periodos[0])?.clave || null;
  const anterior = periodoVista ? periodoAnterior(periodoVista) : null;
  const claveDatos = periodoVista ? `${periodoVista}|${modulosVista.join(',')}|${version}` : null;

  // Documentos del período elegido y del anterior (caché de sesión).
  useEffect(() => {
    if (!claveDatos) return undefined;
    let activo = true;
    const leer = (clave) => Promise.all(modulosVista.map((m) => obtenerPeriodo(m, clave)));
    Promise.all([leer(periodoVista), leer(anterior)])
      .then(([actual, previo]) => { if (activo) { setDatos({ clave: claveDatos, actual, anterior: previo }); setError(null); } })
      .catch((err) => { console.error('Error al leer estadísticas:', err); if (activo) { setDatos({ clave: claveDatos, actual: [], anterior: [] }); setError('No se pudieron cargar las estadísticas de este período.'); } });
    return () => { activo = false; };
    // claveDatos resume período + módulos + versión.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claveDatos]);

  const cargando = !errorIndice && (!indice || (claveDatos && datos.clave !== claveDatos));
  const actual = useMemo(() => unirDatos(datos.actual), [datos.actual]);
  const previo = useMemo(() => unirDatos(datos.anterior), [datos.anterior]);
  const kActual = indicadores(actual.tuplas);
  const kPrevio = indicadores(previo.tuplas);
  const docsActuales = datos.actual.filter(Boolean);
  const etiquetaActual = periodoVista ? etiquetaPeriodo(periodoVista) : '';
  const etiquetaAnterior = anterior ? etiquetaPeriodo(anterior) : '';

  const filasTodas = dimension ? filasComparadas(dimension, actual, previo) : [];
  const orden = ordenes[dimension] || { columna: 'actual', sentido: 'desc' };
  const busqueda = busquedas[dimension] || '';
  const filasVisibles = ordenarFilas(filtrarFilas(filasTodas, busqueda), orden.columna, orden.sentido);
  const filaSeleccionada = seleccion && seleccion.dimension === dimension ? filasTodas.find((f) => f.clave === seleccion.clave) : null;
  const cruces = filaSeleccionada
    ? CRUCES[dimension].map((otra) => ({
      titulo: DIMENSIONES[otra].nombre,
      dim: otra,
      filas: ordenarFilas(filasCruce(dimension, filaSeleccionada.clave, otra, actual, previo).filter((f) => f.actual > 0 || f.anterior > 0)),
    }))
    : [];

  const ordenar = (columna) => setOrdenes((prev) => {
    const o = prev[dimension] || { columna: 'actual', sentido: 'desc' };
    const sentido = o.columna === columna ? (o.sentido === 'desc' ? 'asc' : 'desc') : (columna === 'nombre' ? 'asc' : 'desc');
    return { ...prev, [dimension]: { columna, sentido } };
  });

  const nombreFiltro = filtro === 'todos' ? 'Todos' : BLOQUE.modulos.find((m) => m.id === filtro)?.nombre;
  const contexto = `Período: ${etiquetaActual} (vs. ${etiquetaAnterior}) · Módulo: ${nombreFiltro}${busqueda ? ` · Búsqueda: "${busqueda}"` : ''}`;
  const sufijoArchivo = `${periodoVista}_${filtro}`;

  const exportarTabla = () => exportarEstadisticas({
    archivo: `estadisticas_${DIMENSIONES[dimension].nombre.toLowerCase()}_${sufijoArchivo}`,
    contexto,
    hojas: [{ titulo: DIMENSIONES[dimension].nombre, filas: filasParaExcel(filasVisibles, { singular: DIMENSIONES[dimension].singular, periodo: periodoVista, anterior }) }],
  });
  const exportarDetalle = () => exportarEstadisticas({
    archivo: `estadisticas_${DIMENSIONES[dimension].singular.toLowerCase()}_${sufijoArchivo}`,
    contexto: `${DIMENSIONES[dimension].singular}: ${filaSeleccionada.nombre} · ${contexto}`,
    hojas: cruces.map((c) => ({ titulo: c.titulo, filas: filasParaExcel(c.filas, { singular: DIMENSIONES[c.dim].singular, periodo: periodoVista, anterior }) })),
  });

  const recalcular = (doc) => {
    const p = desdeClave(periodoVista);
    const nombre = BLOQUE.modulos.find((m) => m.id === doc.modulo)?.nombre;
    confirmAction(
      'Recalcular período cerrado',
      `Se volverán a calcular las estadísticas de ${nombre} para ${etiquetaActual} con los datos actuales, incluidos los ${doc.cambiosTrasCierre || 0} cambio(s) posteriores al cierre. El período seguirá cerrado.`,
      async () => {
        setRecalculando(doc.modulo);
        try {
          await httpsCallable(functions, 'recalcularEstadisticasPeriodo')({ modulo: doc.modulo, anio: p.anio, mes: p.mes });
          invalidarPeriodo(doc.modulo, periodoVista);
          setVersion((v) => v + 1);
          showToast(`Estadísticas de ${nombre} recalculadas.`, 'success');
        } catch (err) {
          console.error(err);
          showToast(err?.code === 'functions/permission-denied' ? 'Solo un administrador puede recalcular un período.' : 'No se pudo recalcular el período.', 'error');
        } finally {
          setRecalculando(null);
        }
      },
      { confirmText: 'Recalcular', type: 'warning' }
    );
  };

  const ultimaActualizacion = docsActuales.reduce((max, d) => (d.actualizadoEl?.toMillis?.() > (max?.toMillis?.() || 0) ? d.actualizadoEl : max), null);
  const conCambios = docsActuales.filter((d) => d.definitivo && d.cambiosTrasCierre > 0);
  const sinDatos = modulosVista.filter((m, i) => !datos.actual[i]);

  if (modulosPermitidos.length === 0) {
    return <div className="p-8 text-center text-[13px] text-gray-500">No tienes permiso para ver las estadísticas de ningún módulo.</div>;
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-[1500px] mx-auto space-y-3 pb-6">
        {/* Encabezado */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-3">
          <span className="w-9 h-9 rounded-lg bg-[#2383C2] text-white flex items-center justify-center shrink-0"><BarChart3 size={18} /></span>
          <div className="min-w-0 mr-auto">
            <h2 className="text-[15px] font-bold text-gray-800 dark:text-gray-100">Estadísticas</h2>
            <p className="text-[11.5px] text-gray-500 dark:text-gray-400">{BLOQUE.nombre} · admisiones distintas por período de imputación</p>
          </div>

          <label className="flex items-center gap-2 text-[11.5px] font-semibold text-gray-600 dark:text-gray-300">
            <CalendarDays size={15} className="text-[#2383C2]" /> Período
            <select value={periodoVista || ''} onChange={(e) => { setPeriodo(e.target.value); setSeleccion(null); }} disabled={!puede.elegirPeriodo || periodos.length === 0}
              className="h-8 px-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-[12px] font-normal text-gray-800 dark:text-gray-100 focus:outline-none focus:border-[#2383C2] disabled:opacity-60">
              {periodos.length === 0 && <option value="">Sin períodos</option>}
              {periodos.map((p) => <option key={p.clave} value={p.clave}>{etiquetaPeriodo(p.clave)}{p.definitivo ? '' : ' (en curso)'}</option>)}
            </select>
          </label>

          {modulosPermitidos.length > 0 && (
            <div className="grid grid-cols-2 sm:flex gap-px w-full sm:w-auto rounded-md overflow-hidden border border-gray-300 dark:border-gray-600 bg-gray-300 dark:bg-gray-600 text-[12px] font-semibold" role="group" aria-label="Filtrar por módulo">
              {[...(modulosPermitidos.length > 1 ? [{ id: 'todos', nombre: 'Todos' }] : []), ...modulosPermitidos].map((m) => (
                <button key={m.id} type="button" onClick={() => { setFiltro(m.id); setSeleccion(null); }} aria-pressed={filtro === m.id || (modulosPermitidos.length === 1)}
                  className={`h-8 px-3 whitespace-nowrap ${filtro === m.id || modulosPermitidos.length === 1 ? 'bg-[#2383C2] text-white' : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 hover:text-[#2383C2]'}`}>
                  {m.nombre}
                </button>
              ))}
            </div>
          )}

          <div className="w-full sm:w-auto flex items-center gap-2 text-[11.5px] text-gray-500 dark:text-gray-400">
            <Clock size={14} /> Última actualización: <b className="text-gray-700 dark:text-gray-200">{fechaHora(ultimaActualizacion)}</b>
          </div>
        </div>

        {/* Estado del período por módulo */}
        {!cargando && docsActuales.length > 0 && (
          <div className="flex flex-wrap gap-2 text-[11.5px]">
            {docsActuales.map((d) => (
              <span key={d.modulo} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${d.definitivo ? 'bg-gray-50 border-gray-200 text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300' : 'bg-[#2383C2]/10 border-[#2383C2]/30 text-[#1d6fa5] dark:text-blue-300'}`}>
                {d.definitivo ? <Lock size={12} /> : <Activity size={12} />}
                {BLOQUE.modulos.find((m) => m.id === d.modulo)?.nombre}: {d.definitivo ? 'Definitivo (período cerrado)' : 'En curso'}
              </span>
            ))}
          </div>
        )}

        {conCambios.map((d) => (
          <div key={d.modulo} className="flex flex-wrap items-center gap-3 px-4 py-2.5 rounded-lg border border-amber-300 bg-amber-50 text-amber-900 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-200 text-[12px]" role="status">
            <AlertTriangle size={16} className="shrink-0" />
            <span className="flex-1 min-w-0">
              Hay <b>{d.cambiosTrasCierre}</b> {d.cambiosTrasCierre === 1 ? 'cambio posterior' : 'cambios posteriores'} al cierre en {BLOQUE.modulos.find((m) => m.id === d.modulo)?.nombre}. Las estadísticas muestran los datos al momento del cierre.
            </span>
            {puede.recalcular && (
              <button type="button" onClick={() => recalcular(d)} disabled={recalculando === d.modulo}
                className="h-7 px-3 rounded-md bg-amber-600 hover:bg-amber-700 text-white font-semibold inline-flex items-center gap-1.5 disabled:opacity-60">
                {recalculando === d.modulo ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />} Recalcular período
              </button>
            )}
          </div>
        ))}

        {(errorIndice || error) && <div className="px-4 py-3 rounded-lg border border-red-200 bg-red-50 text-red-700 text-[12px]">{errorIndice || error}</div>}

        {cargando ? (
          <div className="py-20 text-center text-gray-400 text-[12.5px]"><Loader2 size={18} className="inline animate-spin mr-2" />Cargando estadísticas…</div>
        ) : periodos.length === 0 ? (
          <div className="py-16 text-center text-[12.5px] text-gray-500 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
            Aún no hay estadísticas calculadas. Se generan al imputar ítems en un período abierto (o con el script inicial para los períodos anteriores).
          </div>
        ) : (
          <>
            {sinDatos.length > 0 && filtro === 'todos' && (
              <p className="text-[11.5px] text-gray-500 dark:text-gray-400 flex items-center gap-1.5"><Info size={13} /> Sin estadísticas en {etiquetaActual} para: {sinDatos.map((m) => BLOQUE.modulos.find((x) => x.id === m)?.nombre).join(', ')}.</p>
            )}

            {/* Indicadores */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
              <TarjetaIndicador titulo="Admisiones" icono={Users} actual={kActual.admisiones} anterior={kPrevio.admisiones} etiquetaAnterior={etiquetaAnterior}
                pie={kActual.sinId > 0 ? <span className="text-amber-700 dark:text-amber-400" title="Gestiones sin ID / N° de Admisión: cada una cuenta como una admisión (se identifican por paciente y fecha)">Sin ID: <b>{formatoNumero(kActual.sinId)}</b></span> : null} />
              <TarjetaIndicador titulo="Médicos activos" icono={Stethoscope} actual={kActual.m} anterior={kPrevio.m} etiquetaAnterior={etiquetaAnterior} />
              <TarjetaIndicador titulo="Cirugías distintas" icono={ClipboardList} actual={kActual.c} anterior={kPrevio.c} etiquetaAnterior={etiquetaAnterior} />
              <TarjetaIndicador titulo="Empresas" icono={Building2} actual={kActual.e} anterior={kPrevio.e} etiquetaAnterior={etiquetaAnterior} />
            </div>

            {/* Pestañas */}
            {dimensionesPermitidas.length === 0 ? (
              <p className="py-10 text-center text-[12px] text-gray-400">No tienes permiso para ver el detalle por médico, cirugía o empresa.</p>
            ) : (
              <>
                <div className="flex flex-wrap items-end gap-2 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex gap-1" role="tablist">
                    {dimensionesPermitidas.map((d) => {
                      const Icono = ICONOS[d];
                      return (
                        <button key={d} type="button" role="tab" aria-selected={dimension === d} onClick={() => { setTab(d); setSeleccion(null); }}
                          className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-[12.5px] font-semibold border-b-2 -mb-px ${dimension === d ? 'border-[#2383C2] text-[#2383C2]' : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'}`}>
                          <Icono size={15} /> {DIMENSIONES[d].nombre}
                          <span className={`ml-0.5 px-1.5 rounded-full text-[10.5px] ${dimension === d ? 'bg-[#2383C2]/10' : 'bg-gray-100 dark:bg-gray-700'}`}>{formatoNumero(kActual[d])}</span>
                        </button>
                      );
                    })}
                  </div>
                  {puede.exportar && (
                    <button type="button" onClick={exportarTabla} disabled={filasVisibles.length === 0}
                      className="ml-auto mb-1.5 h-8 px-3 rounded-md bg-[#2383C2] hover:bg-[#1d6fa5] text-white text-[12px] font-semibold inline-flex items-center gap-1.5 disabled:opacity-50">
                      <FileSpreadsheet size={14} /> Exportar Excel
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] gap-3 items-start">
                  <TablaDimension
                    singular={DIMENSIONES[dimension].singular}
                    filas={filasVisibles}
                    total={{ actual: kActual.admisiones, anterior: kPrevio.admisiones }}
                    etiquetaActual={etiquetaActual}
                    etiquetaAnterior={etiquetaAnterior}
                    busqueda={busqueda}
                    onBuscar={(v) => setBusquedas((prev) => ({ ...prev, [dimension]: v }))}
                    orden={orden}
                    onOrdenar={ordenar}
                    seleccionada={filaSeleccionada?.clave}
                    onSeleccionar={(f) => setSeleccion({ dimension, clave: f.clave })}
                  />
                  <BarrasTop filas={filasTodas} titulo={`Top 10 ${DIMENSIONES[dimension].nombre.toLowerCase()} por admisiones`}
                    etiquetaActual={etiquetaActual} etiquetaAnterior={etiquetaAnterior}
                    onSeleccionar={(f) => setSeleccion({ dimension, clave: f.clave })} />
                </div>
              </>
            )}
          </>
        )}
      </div>

      {filaSeleccionada && (
        <PanelDetalle
          singular={DIMENSIONES[dimension].singular}
          fila={filaSeleccionada}
          cruces={cruces}
          etiquetaActual={etiquetaActual}
          etiquetaAnterior={etiquetaAnterior}
          puedeExportar={puede.exportar}
          onExportar={exportarDetalle}
          onCerrar={() => setSeleccion(null)}
        />
      )}
    </div>
  );
};

export default Estadisticas;
