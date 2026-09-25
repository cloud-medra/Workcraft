import { useMemo, useRef, useState } from 'react';
import { FolderKanban, BarChart2, FilePlus, ArrowLeft, Save, AlertTriangle, X, ShieldAlert, Loader2, RefreshCw } from 'lucide-react';
import Spinner from '../../../ui/Spinner';
import { useGranularPermission } from '../../../../hooks/useGranularPermission';

import { useGestionesHemodinamia } from '../../operaciones/hemodinamia/gestionHemodinamia/hooks/useGestionesHemodinamia';
import { formatearFecha as formatearFechaHemodinamia } from '../../operaciones/hemodinamia/gestionHemodinamia/utils/gestionesImportExport';
import GestionesHemodinamiaDetalleView from '../../operaciones/hemodinamia/gestionHemodinamia/components/GestionesHemodinamiaDetalleView';
import { useGestionesImplantes } from '../../operaciones/implantes/gestionImplantes/hooks/useGestionesImplantes';
import { formatearFecha } from '../../operaciones/implantes/gestionImplantes/utils/gestionesImportExport';
import GestionesImplantesDetalleView from '../../operaciones/implantes/gestionImplantes/components/GestionesImplantesDetalleView';
import CargasConsignacionDetalleView from '../../operaciones/consignacion/cargasConsignacion/components/CargasConsignacionDetalleView';

import GestionUnificadaTable from './components/GestionUnificadaTable';
import ImputadasUnificadasTable from './components/ImputadasUnificadasTable';
import SolicitudesUnificadasTable from './components/SolicitudesUnificadasTable';
import FiltroAnioMes from './components/FiltroAnioMes';
import FiltrosBusquedaOrigen from './components/FiltrosBusquedaOrigen';
import PaginacionSimple from '../../../ui/PaginacionSimple';
import { useGestionConsolidadaData } from './hooks/useGestionConsolidadaData';
import { useImputadasUnificadasData } from './hooks/useImputadasUnificadasData';
import { ORIGEN } from './utils/normalizarFila';

const PATH_VISTA = '/administracion/cargasConsolidado';

const ALL_TABS = [
  { id: 'gestion', label: 'Gestión', Icon: FolderKanban, path: `${PATH_VISTA}/gestion` },
  { id: 'imputadas', label: 'Imputadas', Icon: BarChart2, path: `${PATH_VISTA}/imputadas` },
  { id: 'solicitudes', label: 'Solicitudes', Icon: FilePlus, path: `${PATH_VISTA}/solicitudes` },
];

// Detalle de un registro de origen IMPLANTES: GestionesImplantesDetalleView
// (Detalles/Información/Cargas/Logs) no trae su propio encabezado de
// "Volver / Guardar Todo" — en GestionImplantes.jsx ese encabezado vive en
// el contenedor padre. Acá se replica esa misma cáscara para que el
// comportamiento sea idéntico al de Implantes.
//
// El hook de gestiones se llama en modo detalle ({ admision }): escucha en
// vivo solo las gestiones de la admisión abierta (lo que usa la vista de
// detalle para agrupar las cotizaciones y para guardar), en vez de la
// ventana de 150 gestiones del listado. Hemodinamia comparte la misma
// cáscara (mismo contrato de hook y de vista), por eso el componente recibe
// hook/vista/título por props.
const DetalleGestionConHeader = ({ fila, onVolver, useGestiones, DetalleView, titulo, formatearFechaFn }) => {
  const raw = fila._raw || {};
  const admision = String(raw.gestionId ?? raw.agendaId ?? '').trim();
  const admisionPendiente = ['', 'P', 'SIN_ADMISION'].includes(admision.toUpperCase());
  const implantesHook = useGestiones(
    admisionPendiente ? { refPath: fila.refPath } : { admision }
  );
  const detalleRef = useRef(null);
  const [showConfirmSalir, setShowConfirmSalir] = useState(false);

  const handleGuardarDetalle = async (datosActualizados) => {
    await implantesHook.guardarDesdeDetalle(datosActualizados);
    onVolver();
  };

  const handleIntentarVolver = () => {
    if (detalleRef.current?.hayCambiosSinGuardar?.()) {
      setShowConfirmSalir(true);
    } else {
      onVolver();
    }
  };

  const itemActual = implantesHook.implantes.find(i => i.refPath === fila.refPath) || fila._raw;

  return (
    <div className="flex-grow flex flex-col overflow-hidden">
      {implantesHook.cargando && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-gray-500/20 dark:bg-black/40 backdrop-blur-[2px]">
          <div className="bg-white/90 dark:bg-gray-800/90 p-4 rounded-xl shadow-xl flex flex-col items-center gap-3">
            <Spinner size="md" color="#2383C2" />
            <h3 className="text-[#2383C2] font-bold text-[13px]">Procesando...</h3>
          </div>
        </div>
      )}

      {showConfirmSalir && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-[1px]">
          <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2 bg-amber-50/60 dark:bg-amber-950/20">
              <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />
              <h3 className="text-[12px] font-bold text-gray-800 dark:text-gray-100">Cambios sin guardar</h3>
              <button onClick={() => setShowConfirmSalir(false)} className="ml-auto text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition">
                <X size={15} />
              </button>
            </div>
            <div className="px-4 py-3">
              <p className="text-[11px] text-gray-600 dark:text-gray-300">Tienes modificaciones que no se han guardado. ¿Qué deseas hacer antes de salir?</p>
            </div>
            <div className="px-4 py-3 bg-gray-50/60 dark:bg-gray-900/40 border-t border-gray-100 dark:border-gray-700 flex flex-col gap-2">
              <button
                onClick={() => { setShowConfirmSalir(false); detalleRef.current?.guardarTodo(); }}
                className="w-full h-8 bg-[#2383C2] hover:bg-[#1d6fa5] text-white rounded font-semibold flex items-center justify-center gap-1.5 transition text-[11px]"
              >
                <Save size={13} /> Guardar y salir
              </button>
              <button
                onClick={() => { setShowConfirmSalir(false); onVolver(); }}
                className="w-full h-8 bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-950/50 text-red-600 dark:text-red-400 rounded font-semibold transition text-[11px]"
              >
                Salir sin guardar
              </button>
              <button
                onClick={() => setShowConfirmSalir(false)}
                className="w-full h-8 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 font-medium transition text-[11px]"
              >
                Seguir editando
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="shrink-0 flex items-center gap-2 px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <button
          onClick={handleIntentarVolver}
          className="p-1 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition shadow-xs"
          title="Volver al listado"
        >
          <ArrowLeft size={13} />
        </button>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-gray-400">
          {titulo}
        </span>
        <button
          onClick={() => detalleRef.current?.guardarTodo()}
          className="ml-auto h-7 px-3 bg-[#2383C2] hover:bg-[#1d6fa5] text-white rounded font-semibold flex items-center gap-1.5 transition text-[11px] shadow-xs active:scale-[0.98]"
        >
          <Save size={13} /> Guardar Todo
        </button>
      </div>

      <DetalleView
        ref={detalleRef}
        item={itemActual}
        todosLosRegistros={implantesHook.implantes}
        onGuardar={handleGuardarDetalle}
        onCancelar={handleIntentarVolver}
        logsList={implantesHook.logsList}
        loadingLogs={implantesHook.loadingLogs}
        cargarLogsDeImplante={implantesHook.cargarLogsDeImplante}
        formatearFecha={formatearFechaFn}
        handleCopiarTexto={implantesHook.handleCopiarTexto}
      />
    </div>
  );
};

// Cada pestaña monta su propio hook: solo la pestaña activa lee Firestore
// (antes CargasConsolidado montaba los hooks de Gestión e Imputadas siempre,
// cada uno con listeners por año, aunque se estuviera mirando otra pestaña).
// Los datos por año quedan en caché de sesión (cacheLecturasAnio.js), así
// que volver a una pestaña no vuelve a leer; "Actualizar" fuerza la lectura.
const PestanaGestion = ({ filaSeleccionada, setFilaSeleccionada, setCargandoConsignacionDetalle }) => {
  const gestionData = useGestionConsolidadaData();

  const handleAbrirDetalle = (fila) => setFilaSeleccionada(fila);
  // Al volver del detalle se relee el año: ahí se pudo editar la gestión.
  const handleVolverDeDetalle = () => {
    setFilaSeleccionada(null);
    gestionData.actualizar();
  };

  return (
    filaSeleccionada ? (
      filaSeleccionada.origen === ORIGEN.IMPLANTES ? (
        <DetalleGestionConHeader
          fila={filaSeleccionada}
          onVolver={handleVolverDeDetalle}
          useGestiones={useGestionesImplantes}
          DetalleView={GestionesImplantesDetalleView}
          titulo="Detalle de Gestión de Implante"
          formatearFechaFn={formatearFecha}
        />
      ) : filaSeleccionada.origen === ORIGEN.HEMODINAMIA ? (
        <DetalleGestionConHeader
          fila={filaSeleccionada}
          onVolver={handleVolverDeDetalle}
          useGestiones={useGestionesHemodinamia}
          DetalleView={GestionesHemodinamiaDetalleView}
          titulo="Detalle de Gestión de Hemodinamia"
          formatearFechaFn={formatearFechaHemodinamia}
        />
      ) : (
        <CargasConsignacionDetalleView
          registro={filaSeleccionada._raw}
          onVolver={handleVolverDeDetalle}
          setCargando={setCargandoConsignacionDetalle}
        />
      )
    ) : (
      <div className="flex-grow flex flex-col overflow-hidden">
        <div className="px-3 py-2 border-b border-slate-200 dark:border-gray-700 flex flex-wrap items-center justify-between gap-2">
          <FiltroAnioMes
            anio={gestionData.anio}
            setAnio={gestionData.setAnio}
            mes={gestionData.mes}
            setMes={gestionData.setMes}
            aniosDisponibles={gestionData.aniosDisponibles}
            mesesDisponibles={gestionData.mesesDisponibles}
            cargandoAnios={gestionData.cargandoAnios}
            labelCampo="fecha"
          />
          <FiltrosBusquedaOrigen
            busqueda={gestionData.busqueda}
            setBusqueda={gestionData.setBusqueda}
            origenesSeleccionados={gestionData.origenesSeleccionados}
            toggleOrigen={gestionData.toggleOrigen}
            limpiarOrigenes={gestionData.limpiarOrigenes}
          />
          <button
            type="button"
            onClick={gestionData.actualizar}
            disabled={!gestionData.anio || gestionData.cargando}
            className="h-7 px-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 rounded font-medium flex items-center gap-1 transition disabled:opacity-50"
            title="Volver a leer los registros del año"
          >
            <RefreshCw size={12} /> Actualizar
          </button>
        </div>
        {!gestionData.anio ? (
          <div className="flex-grow flex items-center justify-center text-slate-400 dark:text-gray-500 text-[10px]">
            Elegí un año para cargar los registros.
          </div>
        ) : gestionData.cargando ? (
          <div className="flex-grow flex items-center justify-center text-slate-400 dark:text-gray-500 text-[10px]">
            <Loader2 size={14} className="animate-spin mr-1.5" /> Cargando registros...
          </div>
        ) : (
          <>
            <GestionUnificadaTable filas={gestionData.filasPagina} onAbrirDetalle={handleAbrirDetalle} />
            <PaginacionSimple
              pagina={gestionData.pagina}
              totalPaginas={gestionData.totalPaginas}
              totalFilas={gestionData.totalFilas}
              setPagina={gestionData.setPagina}
            />
          </>
        )}
      </div>
    )
  );
};

const PestanaImputadas = () => {
  const imputadasData = useImputadasUnificadasData();

  return (
    <div className="flex-grow flex flex-col overflow-hidden">
      <div className="px-3 py-2 border-b border-slate-200 dark:border-gray-700 flex flex-wrap items-center justify-between gap-2">
        <FiltroAnioMes
          anio={imputadasData.anio}
          setAnio={imputadasData.setAnio}
          mes={imputadasData.mes}
          setMes={imputadasData.setMes}
          aniosDisponibles={imputadasData.aniosDisponibles}
          mesesDisponibles={imputadasData.mesesDisponibles}
          cargandoAnios={imputadasData.cargandoAnios}
          labelCampo="período"
        />
        <FiltrosBusquedaOrigen
          busqueda={imputadasData.busqueda}
          setBusqueda={imputadasData.setBusqueda}
          origenesSeleccionados={imputadasData.origenesSeleccionados}
          toggleOrigen={imputadasData.toggleOrigen}
          limpiarOrigenes={imputadasData.limpiarOrigenes}
        />
        <button
          type="button"
          onClick={imputadasData.actualizar}
          disabled={!imputadasData.anio || imputadasData.cargando}
          className="h-7 px-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 rounded font-medium flex items-center gap-1 transition disabled:opacity-50"
          title="Volver a leer los registros del año"
        >
          <RefreshCw size={12} /> Actualizar
        </button>
      </div>
      {!imputadasData.anio ? (
        <div className="flex-grow flex items-center justify-center text-slate-400 dark:text-gray-500 text-[10px]">
          Elegí un año para cargar las imputadas.
        </div>
      ) : imputadasData.cargando ? (
        <div className="flex-grow flex items-center justify-center text-slate-400 dark:text-gray-500 text-[10px]">
          <Loader2 size={14} className="animate-spin mr-1.5" /> Cargando imputadas...
        </div>
      ) : (
        <>
          <ImputadasUnificadasTable filas={imputadasData.filasPagina} />
          <PaginacionSimple
            pagina={imputadasData.pagina}
            totalPaginas={imputadasData.totalPaginas}
            totalFilas={imputadasData.totalFilas}
            setPagina={imputadasData.setPagina}
          />
        </>
      )}
    </div>
  );
};

const CargasConsolidado = () => {
  const { hasAccesoProceso } = useGranularPermission();
  const tabsPermitidas = useMemo(() => ALL_TABS.filter(t => hasAccesoProceso(t.path)), [hasAccesoProceso]);

  const [activeTab, setActiveTab] = useState(() => tabsPermitidas[0]?.id || null);
  const tabActual = useMemo(
    () => tabsPermitidas.find(t => t.id === activeTab) || tabsPermitidas[0] || null,
    [tabsPermitidas, activeTab]
  );

  const [cargandoConsignacionDetalle, setCargandoConsignacionDetalle] = useState(false);
  const [filaSeleccionada, setFilaSeleccionada] = useState(null);

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden p-0 relative text-[11px]">
      {cargandoConsignacionDetalle && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-gray-500/20 dark:bg-black/40 backdrop-blur-[2px]">
          <div className="bg-white/90 dark:bg-gray-800/90 p-4 rounded-xl shadow-xl flex flex-col items-center gap-3">
            <Spinner size="md" color="#2383C2" />
            <h3 className="text-[#2383C2] font-bold text-[13px]">Procesando...</h3>
          </div>
        </div>
      )}

      <div className="px-3 py-2 flex items-center justify-between border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/80">
        <h2 className="text-[12px] font-bold text-gray-700 dark:text-gray-100 flex items-center gap-1.5">
          Cargas Consolidado — Consignación + Implantes + Hemodinamia
        </h2>
      </div>

      {tabsPermitidas.length === 0 ? (
        <div className="flex-grow flex flex-col items-center justify-center text-center p-6 text-slate-500 dark:text-gray-400 text-[10px] gap-1.5">
          <ShieldAlert size={22} className="text-amber-500" />
          Su perfil no tiene acceso a ninguna sección de Cargas Consolidado.
        </div>
      ) : (
        <>
          {!filaSeleccionada && (
            <div className="flex items-center gap-1 px-3 pt-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              {tabsPermitidas.map((tab) => {
                const TabIcon = tab.Icon;
                const isActive = tabActual?.id === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t-md font-semibold transition text-[11px] border-b-2 ${isActive
                      ? 'text-[#2383C2] border-[#2383C2]'
                      : 'text-slate-500 dark:text-gray-400 border-transparent hover:text-slate-700 dark:hover:text-gray-200'
                      }`}
                  >
                    <TabIcon size={13} />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          )}

          {tabActual?.id === 'gestion' && (
            <PestanaGestion
              filaSeleccionada={filaSeleccionada}
              setFilaSeleccionada={setFilaSeleccionada}
              setCargandoConsignacionDetalle={setCargandoConsignacionDetalle}
            />
          )}

          {tabActual?.id === 'imputadas' && <PestanaImputadas />}

          {tabActual?.id === 'solicitudes' && <SolicitudesUnificadasTable />}
        </>
      )}
    </div>
  );
};

export default CargasConsolidado;
