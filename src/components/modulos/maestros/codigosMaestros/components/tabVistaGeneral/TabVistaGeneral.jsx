import React, { useState, useEffect, useMemo } from 'react';
import {
  collection,
  query,
  orderBy,
  getDocs,
  doc,
  updateDoc,
  addDoc
} from 'firebase/firestore';
import { db } from '../../../../../../firebaseConfig';
import { Search, History, Filter, RefreshCw, Layers, XCircle, Edit3, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { useToast } from '../../../../../../context/ToastContext';
import { useUser } from '../../../../../../context/UserContext';
import { useGranularPermission } from '../../../../../../hooks/useGranularPermission';
import { useCollectionCache } from '../../../../../../hooks/useCollectionCache';
import { useColumnResize } from '../../../../../../hooks/useColumnResize';
import { ManijaRedimension } from '../../../../../ui/ManijaRedimension';
import Spinner from '../../../../../ui/Spinner';
import { DrawersOverlay, LogDrawer } from './TabConCodigoDrawers';
import ModificarRegistroDrawer from './ModificarRegistroDrawer';

const COL_BASE = "maestros_codigos";
const PAGE_SIZE = 50;

const CAMPOS_BUSQUEDA = [
  { value: 'referencia', label: 'Referencia' },
  { value: 'codigo', label: 'Código' },
  { value: 'descriptorAuto', label: 'Descripción' }
];

const COLUMNAS = [
  { key: 'numero', label: '#', ancho: 40, min: 28, align: 'center' },
  { key: 'codigo', label: 'Código', ancho: 90, min: 60 },
  { key: 'referencia', label: 'Referencia', ancho: 150, min: 80 },
  { key: 'descEmpresa', label: 'Desc. Empresa', ancho: 300, min: 80 },
  { key: 'empresa', label: 'Empresa', ancho: 300, min: 80 },
  { key: 'tipo', label: 'Tipo', ancho: 100, min: 60 },
  { key: 'segmento', label: 'Segmento', ancho: 110, min: 60 },
  { key: 'clase', label: 'Clase', ancho: 90, min: 60 },
  { key: 'precioNeto', label: 'Precio Neto', ancho: 100, min: 70 },
  { key: 'registradoPor', label: 'Registrado por', ancho: 150, min: 70 },
  { key: 'fecha', label: 'Fecha', ancho: 130, min: 90 },
  { key: 'acciones', label: 'Acciones', ancho: 90, min: 70, align: 'center' }
];

const TabVistaGeneral = () => {
  const [cargandoAccion, setCargandoAccion] = useState(false);

  const [campoBusqueda, setCampoBusqueda] = useState('referencia');
  const [busqueda, setBusqueda] = useState('');

  const [filtroEmpresa, setFiltroEmpresa] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroSegmento, setFiltroSegmento] = useState('');
  const [filtroClase, setFiltroClase] = useState('');

  const [showLogDrawer, setShowLogDrawer] = useState(false);
  const [selectedItemForLog, setSelectedItemForLog] = useState(null);
  const [logsList, setLogsList] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const [showModificarDrawer, setShowModificarDrawer] = useState(false);
  const [itemSeleccionado, setItemSeleccionado] = useState(null);

  const { showToast } = useToast();
  const { userData } = useUser();
  const { hasPermission } = useGranularPermission();

  const PATH_VISTA = "/maestros/codigosMaestros/vistaGeneral";

  const { allDocs, loading: cargando, reload } = useCollectionCache(COL_BASE);

  const { anchos, handleResize, restablecerAnchos, anchoTotalTabla } = useColumnResize(COLUMNAS);

  const listaEmpresas = useMemo(
    () => [...new Set(allDocs.map(d => d.empresa).filter(Boolean))].sort(),
    [allDocs]
  );

  const registrosFiltrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    return allDocs.filter(item => {
      if (filtroEmpresa && item.empresa !== filtroEmpresa) return false;
      if (filtroTipo && item.tipo !== filtroTipo) return false;
      if (filtroSegmento && item.segmento !== filtroSegmento) return false;
      if (filtroClase && item.clase !== filtroClase) return false;
      if (termino) {
        const valor = String(item[campoBusqueda] || '').toLowerCase();
        if (!valor.includes(termino)) return false;
      }
      return true;
    });
  }, [allDocs, busqueda, campoBusqueda, filtroEmpresa, filtroTipo, filtroSegmento, filtroClase]);

  const [pageIndex, setPageIndex] = useState(0);
  const totalPages = Math.max(1, Math.ceil(registrosFiltrados.length / PAGE_SIZE));

  useEffect(() => {
    setPageIndex(0);
  }, [busqueda, campoBusqueda, filtroEmpresa, filtroTipo, filtroSegmento, filtroClase]);

  useEffect(() => {
    if (pageIndex > 0 && pageIndex >= totalPages) {
      setPageIndex(totalPages - 1);
    }
  }, [totalPages, pageIndex]);

  const registros = useMemo(
    () => registrosFiltrados.slice(pageIndex * PAGE_SIZE, pageIndex * PAGE_SIZE + PAGE_SIZE),
    [registrosFiltrados, pageIndex]
  );

  const hasNext = pageIndex < totalPages - 1;
  const hasPrev = pageIndex > 0;
  const goNext = () => hasNext && setPageIndex(p => p + 1);
  const goPrev = () => hasPrev && setPageIndex(p => p - 1);

  const handleLimpiarFiltros = () => {
    setBusqueda('');
    setFiltroEmpresa('');
    setFiltroTipo('');
    setFiltroSegmento('');
    setFiltroClase('');
  };

  const formatearFecha = (fecha) => {
    if (!fecha) return 'N/A';
    const date = fecha.toDate ? fecha.toDate() : new Date(fecha);
    return date.toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const abrirHistorialLogs = async (item) => {
    setSelectedItemForLog(item);
    setShowLogDrawer(true);
    setLoadingLogs(true);

    try {
      const q = query(
        collection(db, COL_BASE, item.id, "logs"),
        orderBy("fecha", "desc")
      );
      const snapshot = await getDocs(q);
      const logsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLogsList(logsData);
    } catch (error) {
      console.error("Error cargando logs:", error);
      showToast("Error al cargar el historial", "error");
    } finally {
      setLoadingLogs(false);
    }
  };

  const abrirModificarRegistro = (item) => {
    setItemSeleccionado(item);
    setShowModificarDrawer(true);
  };

  const handleActualizarRegistro = async (idRegistro, datosConLog) => {
    setCargandoAccion(true);
    try {
      const { logAuditoria, ...datosActualizacion } = datosConLog;

      const datosFinales = {
        ...datosActualizacion,
        modificadoPor: userData?.nombre || userData?.email || 'Sistema'
      };

      const docRef = doc(db, COL_BASE, idRegistro);
      await updateDoc(docRef, datosFinales);

      if (logAuditoria) {
        await addDoc(collection(db, COL_BASE, idRegistro, "logs"), {
          ...logAuditoria,
          usuario: userData?.nombre || userData?.email || 'Sistema'
        });
      }

      showToast("Registro y precios actualizados correctamente", "success");
      setShowModificarDrawer(false);
      reload();
    } catch (error) {
      console.error("Error al actualizar el registro:", error);
      showToast("Error al guardar los cambios", "error");
    } finally {
      setCargandoAccion(false);
    }
  };

  const hayFiltrosActivos = filtroEmpresa || filtroTipo || filtroSegmento || filtroClase || busqueda;

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden p-0 relative text-[11px]">
      {cargandoAccion && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-gray-500/20 dark:bg-black/40 backdrop-blur-[2px]">
          <div className="bg-white/90 dark:bg-gray-800/90 p-4 rounded-xl shadow-xl flex flex-col items-center gap-3">
            <Spinner size="md" color="#2383C2" />
            <h3 className="text-[#2383C2] font-bold text-[13px]">Guardando...</h3>
          </div>
        </div>
      )}

      <div className="px-3 py-2 flex items-center justify-between border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/80">
        <div className="flex items-center gap-2">
          <Layers size={15} className="text-[#2383C2]" />
          <h2 className="text-[12px] font-bold text-gray-700 dark:text-gray-100">
            Vista General Consolidada
          </h2>
        </div>

        <button
          onClick={reload}
          className="flex items-center gap-1 px-2.5 py-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded text-[10px] font-semibold transition cursor-pointer"
          title="Refrescar datos"
        >
          <RefreshCw size={12} />
          <span>Actualizar</span>
        </button>
      </div>

      <div className="bg-gray-50 dark:bg-gray-800/50 px-3 py-1.5 flex flex-wrap gap-2 items-center justify-between border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={campoBusqueda}
            onChange={e => setCampoBusqueda(e.target.value)}
            className="h-7 px-1.5 border border-gray-300 dark:border-gray-600 rounded text-[10px] outline-none bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 font-semibold"
          >
            {CAMPOS_BUSQUEDA.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>

          <div className="relative w-48">
            <Search className="absolute left-2 top-1.5 text-gray-400 dark:text-gray-500" size={13} />
            <input
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              className="w-full h-7 pl-7 pr-2 border border-gray-300 dark:border-gray-600 rounded text-[11px] outline-none bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 focus:border-[#2383C2]"
              placeholder={`Buscar por ${CAMPOS_BUSQUEDA.find(c => c.value === campoBusqueda)?.label.toLowerCase()}...`}
            />
          </div>

          <div className="flex items-center gap-1.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded px-2 h-7">
            <Filter size={11} className="text-gray-400" />
            <select
              value={filtroEmpresa}
              onChange={e => setFiltroEmpresa(e.target.value)}
              className="bg-transparent text-[10px] outline-none text-gray-700 dark:text-gray-200 cursor-pointer max-w-[130px]"
            >
              <option value="">Todas las Empresas</option>
              {listaEmpresas.map((emp, idx) => (
                <option key={idx} value={emp}>{emp}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded px-2 h-7">
            <select
              value={filtroTipo}
              onChange={e => setFiltroTipo(e.target.value)}
              className="bg-transparent text-[10px] outline-none text-gray-700 dark:text-gray-200 cursor-pointer"
            >
              <option value="">Todos los Tipos</option>
              <option value="COTIZACION">COTIZACION</option>
              <option value="CONSIGNACION">CONSIGNACION</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded px-2 h-7">
            <select
              value={filtroSegmento}
              onChange={e => setFiltroSegmento(e.target.value)}
              className="bg-transparent text-[10px] outline-none text-gray-700 dark:text-gray-200 cursor-pointer"
            >
              <option value="">Todos los Segmentos</option>
              <option value="IMPLANTES">IMPLANTES</option>
              <option value="CONSIGNACION">CONSIGNACION</option>
              <option value="HEMODINAMIA">HEMODINAMIA</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded px-2 h-7">
            <select
              value={filtroClase}
              onChange={e => setFiltroClase(e.target.value)}
              className="bg-transparent text-[10px] outline-none text-gray-700 dark:text-gray-200 cursor-pointer"
            >
              <option value="">Todas las Clases</option>
              <option value="IMPLANTE">IMPLANTE</option>
              <option value="INSUMOS">INSUMOS</option>
              <option value="PAD">PAD</option>
            </select>
          </div>

          {hayFiltrosActivos && (
            <button
              onClick={handleLimpiarFiltros}
              className="flex items-center gap-1 px-2 py-1 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950/40 dark:hover:bg-red-900/60 dark:text-red-400 rounded text-[10px] font-semibold transition cursor-pointer"
              title="Limpiar filtros"
            >
              <XCircle size={12} />
              <span>Limpiar</span>
            </button>
          )}
        </div>

        <div className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">
          Página <span className="font-bold text-gray-700 dark:text-gray-200">{pageIndex + 1}</span> de {totalPages} · {registrosFiltrados.length} registros
        </div>
      </div>

      <div className="flex-grow min-h-0 overflow-auto relative">
        {cargando && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/60 dark:bg-gray-900/60">
            <Spinner size="md" color="#2383C2" />
          </div>
        )}
        <div className="sticky top-0 z-20 flex justify-end px-1 py-0.5 bg-gray-100 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={restablecerAnchos}
            title="Restablecer ancho de columnas"
            className="flex items-center gap-1 text-[9px] font-medium text-gray-400 hover:text-[#2383C2] dark:text-gray-500 dark:hover:text-[#2383C2] transition px-1.5 py-0.5 rounded hover:bg-white dark:hover:bg-gray-800"
          >
            <RotateCcw size={10} /> Restablecer columnas
          </button>
        </div>
        <table
          className="text-left text-[11px] border-collapse"
          style={{ tableLayout: 'fixed', width: anchoTotalTabla, minWidth: anchoTotalTabla }}
        >
          <colgroup>
            {COLUMNAS.map(col => (
              <col key={col.key} style={{ width: anchos[col.key] }} />
            ))}
          </colgroup>
          <thead className="bg-gray-100 dark:bg-gray-900 sticky top-[22px] z-10">
            <tr className="text-gray-600 dark:text-gray-400 uppercase font-bold text-[10px]">
              {COLUMNAS.map(col => (
                <th
                  key={col.key}
                  className={`relative py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700 overflow-hidden ${col.align === 'center' ? 'text-center' : ''}`}
                  title={col.label}
                >
                  <span className="block truncate">{col.label}</span>
                  <ManijaRedimension
                    colKey={col.key}
                    anchoActual={anchos[col.key]}
                    anchoMin={col.min}
                    onResize={handleResize}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!cargando && registros.length === 0 ? (
              <tr>
                <td colSpan={COLUMNAS.length} className="text-center py-12 text-gray-400 text-[11px]">
                  No se encontraron registros con los filtros seleccionados.
                </td>
              </tr>
            ) : (
              registros.map((item, index) => (
                <tr key={item.id} className="border-l-2 border-transparent hover:border-[#2383C2] hover:bg-gray-50/80 dark:hover:bg-gray-700/45 transition-colors">
                  <td className="py-1 px-2 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-500 font-bold text-center overflow-hidden text-ellipsis whitespace-nowrap">{pageIndex * PAGE_SIZE + index + 1}</td>
                  <td className="py-1 px-2 border-b border-r border-gray-200 dark:border-gray-700/70 font-bold text-emerald-600 dark:text-emerald-400 overflow-hidden text-ellipsis whitespace-nowrap">{item.codigo || 'S/C'}</td>
                  <td className="py-1 px-2 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-700 dark:text-gray-200 font-medium overflow-hidden text-ellipsis whitespace-nowrap" title={item.referencia}>{item.referencia}</td>
                  <td className="py-1 px-2 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-600 dark:text-gray-300 overflow-hidden text-ellipsis whitespace-nowrap" title={item.descriptorAuto}>{item.descriptorAuto || 'N/A'}</td>
                  <td className="py-1 px-2 border-b border-r border-gray-200 dark:border-gray-700/70 font-semibold text-gray-800 dark:text-gray-100 overflow-hidden text-ellipsis whitespace-nowrap" title={item.empresa}>{item.empresa}</td>
                  <td className="py-1 px-2 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-600 dark:text-gray-300 overflow-hidden text-ellipsis whitespace-nowrap">{item.tipo || 'N/A'}</td>
                  <td className="py-1 px-2 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-600 dark:text-gray-300 overflow-hidden text-ellipsis whitespace-nowrap">{item.segmento || 'N/A'}</td>
                  <td className="py-1 px-2 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-600 dark:text-gray-300 overflow-hidden text-ellipsis whitespace-nowrap">{item.clase || 'N/A'}</td>
                  <td className="py-1 px-2 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-600 dark:text-gray-300 font-bold overflow-hidden text-ellipsis whitespace-nowrap">
                    ${new Intl.NumberFormat('es-ES').format(item.precioNeto || 0)}
                  </td>
                  <td className="py-1 px-2 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-500 dark:text-gray-400 overflow-hidden text-ellipsis whitespace-nowrap" title={item.registradoPor}>{item.registradoPor || 'N/A'}</td>
                  <td className="py-1 px-2 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-500 dark:text-gray-400 overflow-hidden text-ellipsis whitespace-nowrap">{formatearFecha(item.fechaRegistro)}</td>
                  <td className="py-1 px-2 border-b border-gray-200 dark:border-gray-700 text-center overflow-hidden">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => abrirModificarRegistro(item)}
                        title="Modificar registro o precio"
                        className="text-gray-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition cursor-pointer"
                      >
                        <Edit3 size={13} />
                      </button>
                      <button
                        onClick={() => abrirHistorialLogs(item)}
                        title="Ver Historial / Logs"
                        className="text-gray-500 hover:text-[#2383C2] dark:hover:text-[#2383C2] transition cursor-pointer"
                      >
                        <History size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="px-3 py-1.5 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex items-center justify-between">
        <span className="text-[10px] text-gray-500 dark:text-gray-400">
          Página {pageIndex + 1} de {totalPages} · {registros.length} registro{registros.length !== 1 ? 's' : ''} en esta página
        </span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={goPrev}
            disabled={!hasPrev || cargando}
            className="h-7 w-7 flex items-center justify-center rounded border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            title="Página anterior"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            onClick={goNext}
            disabled={!hasNext || cargando}
            className="h-7 w-7 flex items-center justify-center rounded border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            title="Página siguiente"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      <DrawersOverlay
        show={showLogDrawer || showModificarDrawer}
        onClick={() => {
          setShowLogDrawer(false);
          setShowModificarDrawer(false);
        }}
      />

      <LogDrawer
        show={showLogDrawer}
        onClose={() => setShowLogDrawer(false)}
        selectedPendiente={selectedItemForLog}
        logsList={logsList}
        loadingLogs={loadingLogs}
        formatearFecha={formatearFecha}
      />

      <ModificarRegistroDrawer
        show={showModificarDrawer}
        onClose={() => setShowModificarDrawer(false)}
        itemSeleccionado={itemSeleccionado}
        empresasMaestro={listaEmpresas.map(nombre => ({ id: nombre, nombre }))}
        onActualizarRegistro={handleActualizarRegistro}
        cargando={cargandoAccion}
      />
    </div>
  );
};

export default TabVistaGeneral;