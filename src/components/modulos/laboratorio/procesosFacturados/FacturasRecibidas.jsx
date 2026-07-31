// src/components/facturas/FacturasRecibidas.jsx
import React, { useState, useEffect } from 'react';
import { collection, deleteDoc, doc, query, orderBy, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../../../../firebaseConfig';
import { FileText, Trash2, Search, Eye, Settings, History, X } from 'lucide-react';
import { useToast } from '../../../../context/ToastContext';
import { useModal } from '../../../../context/ModalContext';
import { useGranularPermission } from '../../../../hooks/useGranularPermission';
import DetalleFacturaModal from '../XmlDetallesFacturas';
import ConfigDetallesFacturas from './ConfigDetallesFacturas';

const FacturasRecibidas = () => {
  const [facturas, setFacturas] = useState([]);
  const [aniosDisponibles, setAniosDisponibles] = useState([]);
  const [mesesDisponibles, setMesesDisponibles] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  
  // Estados para controlar los modales
  const [facturaSeleccionada, setFacturaSeleccionada] = useState(null);
  const [facturaParaConfigurar, setFacturaParaConfigurar] = useState(null);

  // Estados para el Drawer Lateral de Historial / Logs
  const [showLogModal, setShowLogModal] = useState(false);
  const [selectedFacturaForLog, setSelectedFacturaForLog] = useState(null);
  const [logsList, setLogsList] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const [filtroAnio, setFiltroAnio] = useState("");
  const [filtroMes, setFiltroMes] = useState("");

  const { showToast } = useToast();
  const { confirmAction } = useModal();
  const { hasPermission } = useGranularPermission();

  const PATH_VISTA = "/laboratorio/controlFactura";
  const COL_BASE = "laboratorio_facturasXml";

  // Función para formatear fechas de emisión a dd/mm/yyyy
  const formatearFechaEmision = (fechaStr) => {
    if (!fechaStr) return '';
    const partes = fechaStr.replace(/-/g, '/').split('/');
    if (partes.length === 3) {
      const [anio, mes, dia] = partes;
      if (anio.length === 4) {
        return `${dia}/${mes}/${anio}`;
      }
    }
    return fechaStr;
  };

  // Cargar Años
  useEffect(() => {
    const cargarAnios = async () => {
      try {
        const snap = await getDocs(collection(db, COL_BASE));
        const anios = snap.docs.map(d => d.id).sort((a, b) => b - a);
        setAniosDisponibles(anios);
      } catch (error) {
        console.error("Error al cargar años:", error);
      }
    };
    cargarAnios();
  }, []);

  // Cargar Meses al seleccionar Año
  useEffect(() => {
    if (!filtroAnio) { setMesesDisponibles([]); return; }
    const cargarMeses = async () => {
      try {
        const snap = await getDocs(collection(db, COL_BASE, filtroAnio, "meses"));
        const meses = snap.docs.map(d => d.id);
        setMesesDisponibles(meses);
      } catch (error) {
        console.error("Error al cargar meses:", error);
      }
    };
    cargarMeses();
  }, [filtroAnio]);

  // Escuchar Facturas del Mes
  useEffect(() => {
    if (!filtroAnio || !filtroMes) { setFacturas([]); return; }
    const path = `${COL_BASE}/${filtroAnio}/meses/${filtroMes}/documentos`;
    const q = query(collection(db, path), orderBy("fchEmis", "desc"));
    return onSnapshot(q, (snapshot) => setFacturas(snapshot.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, [filtroAnio, filtroMes]);

  // Eliminar factura
  const handleDelete = (id) => {
    confirmAction("Eliminar Factura", "¿Estás seguro de eliminar este registro?", async () => {
      await deleteDoc(doc(db, COL_BASE, filtroAnio, "meses", filtroMes, "documentos", id));
      showToast("Factura eliminada", "info");
    });
  };

  // Abrir Panel Lateral de Logs
  const abrirHistorialLogs = async (factura) => {
    setSelectedFacturaForLog(factura);
    setShowLogModal(true);
    setLoadingLogs(true);

    try {
      const logsRef = collection(db, COL_BASE, filtroAnio, "meses", filtroMes, "documentos", factura.id, "logs");
      const q = query(logsRef, orderBy("timestamp", "desc"));
      
      const snapshot = await getDocs(q);
      const logsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLogsList(logsData);
    } catch (error) {
      console.error("Error cargando logs:", error);
      setLogsList([]);
    } finally {
      setLoadingLogs(false);
    }
  };

  const formatearFechaLog = (log) => {
    if (log.fechaHora) return log.fechaHora;
    if (log.timestamp?.toDate) return log.timestamp.toDate().toLocaleString('es-CL');
    return 'N/A';
  };

  const facturasFiltradas = facturas.filter(f => 
    f.folio?.includes(busqueda) || 
    f.rznSoc?.toLowerCase().includes(busqueda.toLowerCase()) || 
    f.folioRef?.includes(busqueda) ||
    f.estado?.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="w-full h-full flex flex-col bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-lg shadow-xs overflow-hidden p-0 relative font-sans">
      
      {/* CABECERA */}
      <header className="bg-white dark:bg-gray-800 border-b border-slate-200 dark:border-gray-700 px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-[#2383C2]" />
          <span className="text-[12px] font-normal text-slate-800 dark:text-gray-100 tracking-wide uppercase">
            Facturas Recibidas (XML)
          </span>
        </div>
      </header>

      {/* FILTROS Y BÚSQUEDA */}
      <div className="bg-slate-100/70 dark:bg-gray-800/40 p-1.5 flex flex-wrap gap-1.5 items-center border-b border-slate-200 dark:border-gray-700">
        {hasPermission(PATH_VISTA, "filtros_busqueda", "select_anio") && (
          <select
            value={filtroAnio}
            onChange={(e) => { setFiltroAnio(e.target.value); setFiltroMes(""); }}
            className="h-6 border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-slate-800 dark:text-gray-100 rounded text-[11px] px-1.5 outline-none focus:border-[#2383C2]"
          >
            <option value="">Año</option>
            {aniosDisponibles.map((a, idx) => <option key={`anio-${a}-${idx}`} value={a}>{a}</option>)}
          </select>
        )}

        {hasPermission(PATH_VISTA, "filtros_busqueda", "select_mes") && (
          <select
            value={filtroMes}
            onChange={(e) => setFiltroMes(e.target.value)}
            className="h-6 border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-slate-800 dark:text-gray-100 rounded text-[11px] px-1.5 outline-none capitalize focus:border-[#2383C2]"
          >
            <option value="">Mes</option>
            {mesesDisponibles.map((m, idx) => <option key={`mes-${m}-${idx}`} value={m}>{m}</option>)}
          </select>
        )}

        {hasPermission(PATH_VISTA, "filtros_busqueda", "input_busqueda") && (
          <div className="relative flex-grow max-w-xs">
            <Search className="absolute left-2 top-1.5 text-slate-400 dark:text-gray-500" size={12} />
            <input
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              className="w-full h-6 pl-7 pr-2 border border-slate-300 dark:border-gray-600 rounded text-[11px] outline-none bg-white dark:bg-gray-900 text-slate-800 dark:text-gray-100 focus:border-[#2383C2]"
              placeholder="Buscar por Folio, Ref, Razón Social o Estado..."
            />
          </div>
        )}
      </div>

      {/* TABLA DE FACTURAS */}
      {hasPermission(PATH_VISTA, "tabla_facturas") && (
        <div className="flex-grow overflow-auto">
          <table className="w-full text-left text-[11px] border-collapse table-fixed min-w-[900px]">
            <thead className="bg-slate-100 dark:bg-gray-900/80 sticky top-0 z-10">
              <tr className="text-slate-600 dark:text-gray-400 uppercase font-normal text-[10px] tracking-wider">
                <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700 w-[10%]">Folio</th>
                <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700 w-[10%]">Emisión</th>
                <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700 w-[10%]">Ref.</th>
                <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700 w-[24%]">Razón Social</th>
                <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700 w-[10%] text-right">Total (Neto)</th>
                
                {/* Columnas de Control */}
                <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700 w-[11%] text-center">Estado</th>
                <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700 w-[6%] text-center">Orden</th>
                <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700 w-[6%] text-center">Acta</th>
                <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700 w-[6%] text-center">Salida</th>
                <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700 w-[9%] text-center">Mes imputado</th>
                
                <th className="px-2 py-1.5 border-b border-slate-200 dark:border-gray-700 w-[8%] text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60 dark:divide-gray-700/50 bg-white dark:bg-gray-800">
              {facturasFiltradas.map((f) => (
                <tr 
                  key={f.id} 
                  className="border-l-2 border-transparent hover:border-[#2383C2] hover:bg-gray-50/80 dark:hover:bg-gray-700/40 transition-colors"
                >
                  <td className="px-2 py-1 border-b border-r border-slate-200/60 dark:border-gray-700/70 font-normal text-slate-800 dark:text-gray-100 truncate">
                    {f.folio}
                  </td>
                  <td className="px-2 py-1 border-b border-r border-slate-200/60 dark:border-gray-700/70 text-slate-600 dark:text-gray-400 whitespace-nowrap">
                    {formatearFechaEmision(f.fchEmis)}
                  </td>
                  <td className="px-2 py-1 border-b border-r border-slate-200/60 dark:border-gray-700/70 text-slate-600 dark:text-gray-400 truncate">
                    {f.folioRef}
                  </td>
                  <td className="px-2 py-1 border-b border-r border-slate-200/60 dark:border-gray-700/70 text-slate-700 dark:text-gray-300 truncate" title={f.rznSoc}>
                    {f.rznSoc}
                  </td>
                  <td className="px-2 py-1 border-b border-r border-slate-200/60 dark:border-gray-700/70 text-slate-800 dark:text-gray-100 font-normal text-right whitespace-nowrap">
                    ${parseInt(f.total || 0).toLocaleString('es-CL')}
                  </td>
                  
                  {/* Celda de Estado */}
                  <td className="px-2 py-1 border-b border-r border-slate-200/60 dark:border-gray-700/70 text-center whitespace-nowrap">
                    <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50">
                      {f.estado || "Iniciar Ingreso"}
                    </span>
                  </td>

                  {/* Resto de Celdas de Control */}
                  <td className="px-2 py-1 border-b border-r border-slate-200/60 dark:border-gray-700/70 text-center text-slate-400 dark:text-gray-500"></td>
                  <td className="px-2 py-1 border-b border-r border-slate-200/60 dark:border-gray-700/70 text-center text-slate-400 dark:text-gray-500"></td>
                  <td className="px-2 py-1 border-b border-r border-slate-200/60 dark:border-gray-700/70 text-center text-slate-400 dark:text-gray-500"></td>
                  <td className="px-2 py-1 border-b border-r border-slate-200/60 dark:border-gray-700/70 text-center text-slate-400 dark:text-gray-500"></td>

                  <td className="px-2 py-1 border-b border-slate-200/60 dark:border-gray-700 text-center">
                    <div className="flex justify-center gap-1.5">
                      {hasPermission(PATH_VISTA, "tabla_facturas", "btn_log") && (
                        <button 
                          onClick={() => abrirHistorialLogs(f)} 
                          className="text-slate-400 hover:text-[#2383C2] transition inline-flex items-center justify-center p-0.5 rounded hover:bg-slate-100 dark:hover:bg-gray-700"
                          title="Ver Historial / Logs"
                        >
                          <History size={13} />
                        </button>
                      )}
                      {hasPermission(PATH_VISTA, "tabla_facturas", "btn_ver") && (
                        <button 
                          onClick={() => setFacturaSeleccionada(f)} 
                          className="text-slate-400 hover:text-[#2383C2] transition inline-flex items-center justify-center p-0.5 rounded hover:bg-slate-100 dark:hover:bg-gray-700"
                          title="Ver Detalle"
                        >
                          <Eye size={13} />
                        </button>
                      )}
                      {hasPermission(PATH_VISTA, "tabla_facturas", "btn_configurar") && (
                        <button 
                          onClick={() => setFacturaParaConfigurar(f)} 
                          className="text-slate-400 hover:text-amber-600 transition inline-flex items-center justify-center p-0.5 rounded hover:bg-slate-100 dark:hover:bg-gray-700"
                          title="Configurar"
                        >
                          <Settings size={13} />
                        </button>
                      )}
                      {hasPermission(PATH_VISTA, "tabla_facturas", "btn_eliminar") && (
                        <button 
                          onClick={() => handleDelete(f.id)} 
                          className="text-slate-400 hover:text-red-500 transition inline-flex items-center justify-center p-0.5 rounded hover:bg-slate-100 dark:hover:bg-gray-700"
                          title="Eliminar"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL DETALLE DE FACTURA */}
      {facturaSeleccionada && (
        <DetalleFacturaModal 
          factura={facturaSeleccionada} 
          onClose={() => setFacturaSeleccionada(null)} 
        />
      )}

      {/* MODAL DE CONFIGURACIÓN DE FACTURA */}
      {facturaParaConfigurar && (
        <ConfigDetallesFacturas 
          factura={facturaParaConfigurar} 
          filtroAnio={filtroAnio}
          filtroMes={filtroMes}
          onClose={() => setFacturaParaConfigurar(null)} 
        />
      )}

      {/* BACKDROP Y PANEL LATERAL DERECHA (DRAWER DE LOGS) */}
      <div 
        className={`fixed inset-0 z-50 bg-black/30 backdrop-blur-[1px] transition-opacity duration-300 ${
          showLogModal ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setShowLogModal(false)}
      />

      <aside 
        className={`fixed top-0 right-0 z-50 h-full w-full max-w-md bg-white dark:bg-gray-800 shadow-2xl border-l border-gray-200 dark:border-gray-700 flex flex-col transition-transform duration-300 ease-in-out text-[11px] ${
          showLogModal ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Cabecera Fija del Panel */}
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50/80 dark:bg-gray-900/80 shrink-0">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="p-1.5 rounded-md bg-[#2383C2]/10 dark:bg-[#2383C2]/20 text-[#2383C2]">
              <History size={16} />
            </div>
            <div className="truncate">
              <h3 className="text-[12px] font-bold text-gray-800 dark:text-gray-100 truncate">
                Historial de Cambios
              </h3>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                Folio: {selectedFacturaForLog?.folio} - {selectedFacturaForLog?.rznSoc}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full font-semibold">
              {logsList.length} logs
            </span>
            <button 
              onClick={() => setShowLogModal(false)} 
              className="p-1 rounded-md text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Contenido con Scroll Vertical */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loadingLogs ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-500 dark:text-gray-400">
              <div className="w-6 h-6 border-2 border-[#2383C2] border-t-transparent rounded-full animate-spin mb-2" />
              <p className="text-[10px]">Cargando historial...</p>
            </div>
          ) : logsList.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400 dark:text-gray-500 text-center px-4">
              <History size={32} className="mb-2 opacity-30" />
              <p className="text-[11px] font-medium">Sin registros</p>
              <p className="text-[10px]">No hay actividad documentada para esta factura.</p>
            </div>
          ) : (
            logsList.map((log) => (
              <div key={log.id} className="p-3 border border-gray-200 dark:border-gray-700/80 rounded-lg bg-gray-50/50 dark:bg-gray-900/30 text-[10px] space-y-2">
                <div className="flex justify-between items-center">
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                    log.accion === 'INICIO_PROCESO' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400' :
                    log.accion === 'CREACION' ? 'bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400' :
                    log.accion === 'EDICION' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400' :
                    log.accion === 'VINCULACION_CODIGOS' ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300' :
                    'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                  }`}>
                    {log.accion}
                  </span>
                  <span className="text-gray-400 dark:text-gray-500 text-[9px] font-mono">
                    {formatearFechaLog(log)}
                  </span>
                </div>

                <p className="text-gray-700 dark:text-gray-300 font-semibold">
                  Usuario: <span className="font-normal text-gray-600 dark:text-gray-400">{log.usuario?.nombre || log.usuario?.email || "Usuario"}</span>
                </p>

                <div className="text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 p-2 rounded border border-gray-200/80 dark:border-gray-700 text-[10px] space-y-1">
                  {log.detalle && <p>{log.detalle}</p>}

                  {log.estadoAnterior && log.nuevoEstado && (
                    <div className="font-medium text-slate-700 dark:text-slate-200 pt-1 border-t border-slate-100 dark:border-gray-700">
                      Estado: <span className="text-amber-600 dark:text-amber-400">{log.estadoAnterior}</span> ➔ <span className="text-emerald-600 dark:text-emerald-400">{log.nuevoEstado}</span>
                    </div>
                  )}

                  {log.resumen && (
                    <div className="text-[9px] text-slate-500 dark:text-gray-400 pt-1 flex gap-2">
                      <span>✅ OK: {log.resumen.vinculadosOK}</span>
                      <span>⚠️ Dif: {log.resumen.conDiferencias}</span>
                      <span>❌ Sin vincular: {log.resumen.sinVincular}</span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pie Fijo del Panel */}
        <div className="px-4 py-2.5 border-t border-gray-200 dark:border-gray-700 flex justify-end bg-gray-50 dark:bg-gray-900/80 shrink-0">
          <button 
            onClick={() => setShowLogModal(false)} 
            className="px-4 py-1.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded text-[10px] font-bold transition"
          >
            Cerrar
          </button>
        </div>
      </aside>
    </div>
  );
};

export default FacturasRecibidas;