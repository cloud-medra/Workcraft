// src/components/modulos/laboratorio/procesosFacturados/IniciarProceso.jsx (hoy)
import React, { useState, useEffect } from 'react';
import { collection, deleteDoc, doc, query, orderBy, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../../../../firebaseConfig';
import { FileText, Trash2, Search, Eye, Settings, History, X, Play, AlertTriangle } from 'lucide-react';
import { useToast } from '../../../../context/ToastContext';
import { useModal } from '../../../../context/ModalContext';
import { useGranularPermission } from '../../../../hooks/useGranularPermission';
import DetalleFacturaModal from '../XmlDetallesFacturas';
import ConfigDetallesFacturas from './ConfigDetallesFacturas';

const IniciarProceso = () => {
  const [facturas, setFacturas] = useState([]);
  const [aniosDisponibles, setAniosDisponibles] = useState([]);
  const [mesesDisponibles, setMesesDisponibles] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  
  // Selección múltiple y ejecución
  const [facturasSeleccionadas, setFacturasSeleccionadas] = useState([]);
  const [showModalIniciar, setShowModalIniciar] = useState(false);
  const [procesando, setProcesando] = useState(false);

  // Modales adicionales
  const [facturaSeleccionada, setFacturaSeleccionada] = useState(null);
  const [facturaParaConfigurar, setFacturaParaConfigurar] = useState(null);

  // Logs / Historial
  const [showLogModal, setShowLogModal] = useState(false);
  const [selectedFacturaForLog, setSelectedFacturaForLog] = useState(null);
  const [logsList, setLogsList] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Filtros de navegación
  const [filtroAnio, setFiltroAnio] = useState("");
  const [filtroMes, setFiltroMes] = useState("");

  // ESTADO REAL DEL PERÍODO ABIERTO EN EL SISTEMA
  const [periodoAbierto, setPeriodoAbierto] = useState({ mes: '', anio: '', cargando: true });

  const { showToast } = useToast();
  const { confirmAction } = useModal();
  const { hasPermission } = useGranularPermission();

  const PATH_VISTA = "/laboratorio/controlFactura";
  const COL_BASE = "laboratorio_facturasXml";

  // 1. OBTENER EL PERÍODO DE IMPUTACIÓN ABIERTO DESDE FIREBASE (en tiempo real)
  // Escucha configuracion_periodos/periodo_activo, que es actualizado exclusivamente
  // por CierreMes.jsx al abrir/cerrar un mes. Así este componente siempre refleja
  // el período vigente sin depender de los filtros de año/mes que el usuario navega.
  useEffect(() => {
    const docRef = doc(db, "configuracion_periodos", "periodo_activo");
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setPeriodoAbierto({
          mes: data.mes || '',
          anio: data.anio || '',
          cargando: false
        });
      } else {
        setPeriodoAbierto({ mes: '', anio: '', cargando: false });
      }
    }, (error) => {
      console.error("Error al obtener el período abierto:", error);
      setPeriodoAbierto({ mes: '', anio: '', cargando: false });
    });

    return () => unsubscribe();
  }, []);

  // Formateador de mes/año
  const formatearPeriodo = (mes, anio) => {
    if (!mes || !anio) return 'No especificado';
    const mesNom = mes.charAt(0).toUpperCase() + mes.slice(1);
    return `${mesNom} ${anio}`;
  };

  const formatearFechaEmision = (fechaStr) => {
    if (!fechaStr) return '-';
    const partes = fechaStr.replace(/-/g, '/').split('/');
    if (partes.length === 3) {
      const [anio, mes, dia] = partes;
      if (anio.length === 4) return `${dia}/${mes}/${anio}`;
    }
    return fechaStr;
  };

  const getEstadoBadgeClass = (estado) => {
    switch (estado?.toLowerCase()) {
      case 'ingresado':
      case 'completado':
      case 'aprobado':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50';
      case 'en proceso':
      case 'en revision':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800/50';
      case 'con diferencias':
      case 'rechazado':
        return 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800/50';
      default:
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800/50';
    }
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
    if (!filtroAnio) { setMesesDisponibles([]); setFacturasSeleccionadas([]); return; }
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
    if (!filtroAnio || !filtroMes) { setFacturas([]); setFacturasSeleccionadas([]); return; }
    const path = `${COL_BASE}/${filtroAnio}/meses/${filtroMes}/documentos`;
    const q = query(collection(db, path), orderBy("fchEmis", "desc"));
    return onSnapshot(q, (snapshot) => {
      setFacturas(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      setFacturasSeleccionadas([]);
    });
  }, [filtroAnio, filtroMes]);

  // Filtrado y Selección
  const facturasFiltradas = facturas.filter(f => 
    f.folio?.toLowerCase().includes(busqueda.toLowerCase()) || 
    f.rznSoc?.toLowerCase().includes(busqueda.toLowerCase()) || 
    f.folioRef?.toLowerCase().includes(busqueda.toLowerCase()) ||
    f.estado?.toLowerCase().includes(busqueda.toLowerCase()) ||
    (f.orden || f.numOrden)?.toString().toLowerCase().includes(busqueda.toLowerCase()) ||
    (f.acta || f.numActa)?.toString().toLowerCase().includes(busqueda.toLowerCase())
  );

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setFacturasSeleccionadas(facturasFiltradas.map(f => f.id));
    } else {
      setFacturasSeleccionadas([]);
    }
  };

  const handleSelectRow = (id) => {
    setFacturasSeleccionadas(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Indica si actualmente existe un período de imputación abierto en el sistema
  const hayPeriodoActivo = !!(periodoAbierto.mes && periodoAbierto.anio);

  // Confirmar la ejecución
  const handleConfirmarInicioProceso = async () => {
    // Guarda de seguridad: aunque el botón ya está bloqueado sin período activo,
    // evitamos que se ejecute el proceso si por alguna razón se llegó a llamar igual.
    if (!hayPeriodoActivo) {
      showToast("No hay ningún período de imputación abierto actualmente", "error");
      return;
    }

    setProcesando(true);
    try {
      showToast(
        `Proceso iniciado para ${facturasSeleccionadas.length} documento(s) con imputación en ${formatearPeriodo(periodoAbierto.mes, periodoAbierto.anio)}`, 
        "success"
      );
      setShowModalIniciar(false);
      setFacturasSeleccionadas([]);
    } catch (error) {
      console.error("Error al iniciar proceso:", error);
      showToast("Ocurrió un error al iniciar el proceso", "error");
    } finally {
      setProcesando(false);
    }
  };

  const handleDelete = (id) => {
    confirmAction("Eliminar Factura", "¿Estás seguro de eliminar este registro?", async () => {
      await deleteDoc(doc(db, COL_BASE, filtroAnio, "meses", filtroMes, "documentos", id));
      showToast("Factura eliminada", "info");
    });
  };

  const abrirHistorialLogs = async (factura) => {
    setSelectedFacturaForLog(factura);
    setShowLogModal(true);
    setLoadingLogs(true);

    try {
      const logsRef = collection(db, COL_BASE, filtroAnio, "meses", filtroMes, "documentos", factura.id, "logs");
      const q = query(logsRef, orderBy("timestamp", "desc"));
      const snapshot = await getDocs(q);
      setLogsList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
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

  // Verificar si se navega en un período distinto al abierto
  const esPeriodoDiferente = (filtroMes.toLowerCase() !== periodoAbierto.mes.toLowerCase()) || (filtroAnio !== periodoAbierto.anio);

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
      <div className="bg-slate-100/70 dark:bg-gray-800/40 p-1.5 flex flex-wrap gap-1.5 items-center justify-between border-b border-slate-200 dark:border-gray-700">
        <div className="flex items-center gap-1.5 flex-wrap">
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
                placeholder="Buscar por Folio, Ref, Orden, Acta, Razón Social..."
              />
            </div>
          )}
        </div>

        {/* BOTÓN INICIAR PROCESO — bloqueado si no hay período de imputación abierto */}
        {facturasSeleccionadas.length > 0 && (
          hayPeriodoActivo ? (
            <button
              onClick={() => setShowModalIniciar(true)}
              className="h-6 px-3 bg-[#2383C2] hover:bg-[#1d6fa5] text-white rounded text-[11px] font-semibold flex items-center gap-1.5 transition shadow-xs animate-fade-in"
            >
              <Play size={12} className="fill-current" />
              Iniciar Proceso ({facturasSeleccionadas.length})
            </button>
          ) : (
            <span className="h-6 px-3 flex items-center gap-1.5 text-[10px] font-semibold text-rose-600 dark:text-rose-400 animate-fade-in">
              <AlertTriangle size={12} />
              No hay período de imputación abierto
            </span>
          )
        )}
      </div>

      {/* TABLA DE FACTURAS */}
      {hasPermission(PATH_VISTA, "tabla_facturas") && (
        <div className="flex-grow overflow-auto">
          <table className="w-full text-left text-[11px] border-collapse table-fixed min-w-[980px]">
            <thead className="bg-slate-100 dark:bg-gray-900/80 sticky top-0 z-10">
              <tr className="text-slate-600 dark:text-gray-400 uppercase font-normal text-[10px] tracking-wider">
                <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700 w-[3%] text-center">
                  <input
                    type="checkbox"
                    checked={facturasFiltradas.length > 0 && facturasSeleccionadas.length === facturasFiltradas.length}
                    onChange={handleSelectAll}
                    disabled={facturasFiltradas.length === 0}
                    className="rounded border-gray-300 text-[#2383C2] focus:ring-[#2383C2] cursor-pointer"
                  />
                </th>
                <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700 w-[9%]">Folio</th>
                <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700 w-[9%]">Emisión</th>
                <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700 w-[9%]">Ref.</th>
                <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700 w-[20%]">Razón Social</th>
                <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700 w-[10%] text-right">Total (Neto)</th>
                <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700 w-[11%] text-center">Estado</th>
                <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700 w-[7%] text-center">Orden</th>
                <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700 w-[7%] text-center">Acta</th>
                <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700 w-[7%] text-center">Salida</th>
                <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700 w-[8%] text-center">Mes imputado</th>
                <th className="px-2 py-1.5 border-b border-slate-200 dark:border-gray-700 w-[8%] text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60 dark:divide-gray-700/50 bg-white dark:bg-gray-800">
              {facturasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-8 text-center text-slate-400 dark:text-gray-500 text-[11px]">
                    {!filtroAnio || !filtroMes ? "Selecciona un año y mes para cargar registros." : "No se encontraron facturas con los criterios seleccionados."}
                  </td>
                </tr>
              ) : (
                facturasFiltradas.map((f) => {
                  const isSelected = facturasSeleccionadas.includes(f.id);
                  return (
                    <tr 
                      key={f.id} 
                      className={`border-l-2 transition-colors ${
                        isSelected 
                          ? 'border-[#2383C2] bg-blue-50/50 dark:bg-blue-950/30' 
                          : 'border-transparent hover:border-[#2383C2] hover:bg-gray-50/80 dark:hover:bg-gray-700/40'
                      }`}
                    >
                      <td className="px-2 py-1 border-b border-r border-slate-200/60 dark:border-gray-700/70 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectRow(f.id)}
                          className="rounded border-gray-300 text-[#2383C2] focus:ring-[#2383C2] cursor-pointer"
                        />
                      </td>
                      <td className="px-2 py-1 border-b border-r border-slate-200/60 dark:border-gray-700/70 font-normal text-slate-800 dark:text-gray-100 truncate">
                        {f.folio || '-'}
                      </td>
                      <td className="px-2 py-1 border-b border-r border-slate-200/60 dark:border-gray-700/70 text-slate-600 dark:text-gray-400 whitespace-nowrap">
                        {formatearFechaEmision(f.fchEmis)}
                      </td>
                      <td className="px-2 py-1 border-b border-r border-slate-200/60 dark:border-gray-700/70 text-slate-600 dark:text-gray-400 truncate">
                        {f.folioRef || '-'}
                      </td>
                      <td className="px-2 py-1 border-b border-r border-slate-200/60 dark:border-gray-700/70 text-slate-700 dark:text-gray-300 truncate" title={f.rznSoc}>
                        {f.rznSoc || '-'}
                      </td>
                      <td className="px-2 py-1 border-b border-r border-slate-200/60 dark:border-gray-700/70 text-slate-800 dark:text-gray-100 font-normal text-right whitespace-nowrap">
                        ${Math.round(Number(f.total) || 0).toLocaleString('es-CL')}
                      </td>
                      <td className="px-2 py-1 border-b border-r border-slate-200/60 dark:border-gray-700/70 text-center whitespace-nowrap">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getEstadoBadgeClass(f.estado)}`}>
                          {f.estado || "Iniciar Ingreso"}
                        </span>
                      </td>
                      <td className="px-2 py-1 border-b border-r border-slate-200/60 dark:border-gray-700/70 text-center font-mono text-slate-700 dark:text-gray-300 truncate">
                        {f.orden || f.numOrden || f.ordenCompra || '-'}
                      </td>
                      <td className="px-2 py-1 border-b border-r border-slate-200/60 dark:border-gray-700/70 text-center font-mono text-slate-700 dark:text-gray-300 truncate">
                        {f.acta || f.numActa || '-'}
                      </td>
                      <td className="px-2 py-1 border-b border-r border-slate-200/60 dark:border-gray-700/70 text-center font-mono text-slate-700 dark:text-gray-300 truncate">
                        {f.salida || f.numSalida || '-'}
                      </td>
                      <td className="px-2 py-1 border-b border-r border-slate-200/60 dark:border-gray-700/70 text-center text-slate-700 dark:text-gray-300 capitalize truncate">
                        {f.mesImputado || f.mesImputacion || '-'}
                      </td>
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
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL PARA INICIAR PROCESO */}
      {showModalIniciar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-slate-200 dark:border-gray-700 max-w-md w-full p-4 space-y-4 font-sans text-slate-800 dark:text-gray-100">
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-gray-700 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-[#2383C2]/10 text-[#2383C2]">
                  <Play size={18} className="fill-current" />
                </div>
                <div>
                  <h3 className="text-[13px] font-bold uppercase tracking-wide">Iniciar Proceso</h3>
                  <p className="text-[10px] text-slate-500 dark:text-gray-400">Confirmación de procesamiento de facturas</p>
                </div>
              </div>
              <button 
                onClick={() => setShowModalIniciar(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-gray-200 p-1"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-[11px]">
              <p className="text-slate-600 dark:text-gray-300 leading-relaxed">
                ¿Desea iniciar el proceso para <span className="font-bold text-[#2383C2]">{facturasSeleccionadas.length} documento(s)</span> seleccionado(s)?
              </p>

              {/* MUESTRA EL PERÍODO DE IMPUTACIÓN CORRECTO (ABIERTO) */}
              <div className="p-3 bg-blue-50/50 dark:bg-blue-950/30 rounded-md border border-blue-200 dark:border-blue-800/50 space-y-1">
                <p className="text-[10px] text-blue-600 dark:text-blue-400 uppercase font-semibold">
                  Mes / Período de Imputación Abierto:
                </p>
                <p className="text-[13px] font-bold text-slate-800 dark:text-gray-100 capitalize">
                  {formatearPeriodo(periodoAbierto.mes, periodoAbierto.anio)}
                </p>
              </div>

              {/* ADVERTENCIA SI ESTÁ VISUALIZANDO UN MES DISTINTO AL ABIERTO */}
              {esPeriodoDiferente && (
                <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 rounded border border-amber-200 dark:border-amber-800/50 flex items-start gap-2 text-amber-800 dark:text-amber-300">
                  <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                  <p className="text-[10px]">
                    <strong>Atención:</strong> Estás visualizando el historial de <strong>{formatearPeriodo(filtroMes, filtroAnio)}</strong>, pero la imputación quedará registrada en el período abierto actual (<strong>{formatearPeriodo(periodoAbierto.mes, periodoAbierto.anio)}</strong>).
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-gray-700">
              <button
                onClick={() => setShowModalIniciar(false)}
                disabled={procesando}
                className="px-3 py-1.5 rounded bg-slate-200 dark:bg-gray-700 text-slate-700 dark:text-gray-300 text-[11px] font-medium hover:bg-slate-300 dark:hover:bg-gray-600 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmarInicioProceso}
                disabled={procesando}
                className="px-3 py-1.5 rounded bg-[#2383C2] hover:bg-[#1d6fa5] text-white text-[11px] font-bold flex items-center gap-1.5 transition disabled:opacity-50"
              >
                {procesando ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <Play size={12} className="fill-current" />
                    Confirmar e Iniciar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OTROS MODALES Y DRAWER */}
      {facturaSeleccionada && (
        <DetalleFacturaModal 
          factura={facturaSeleccionada} 
          onClose={() => setFacturaSeleccionada(null)} 
        />
      )}

      {facturaParaConfigurar && (
        <ConfigDetallesFacturas 
          factura={facturaParaConfigurar} 
          filtroAnio={filtroAnio}
          filtroMes={filtroMes}
          onClose={() => setFacturaParaConfigurar(null)} 
        />
      )}

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
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50/80 dark:bg-gray-900/80 shrink-0">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="p-1.5 rounded-md bg-[#2383C2]/10 dark:bg-[#2383C2]/20 text-[#2383C2]">
              <History size={16} />
            </div>
            <div className="truncate">
              <h3 className="text-[12px] font-bold text-gray-800 dark:text-gray-100 truncate">Historial de Cambios</h3>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                Folio: {selectedFacturaForLog?.folio} - {selectedFacturaForLog?.rznSoc}
              </p>
            </div>
          </div>
          <button onClick={() => setShowLogModal(false)} className="p-1 rounded text-gray-400 hover:text-gray-700">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loadingLogs ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-500">
              <div className="w-6 h-6 border-2 border-[#2383C2] border-t-transparent rounded-full animate-spin mb-2" />
              <p className="text-[10px]">Cargando historial...</p>
            </div>
          ) : logsList.length === 0 ? (
            <p className="text-center text-gray-400 py-8">Sin registros de actividad.</p>
          ) : (
            logsList.map((log) => (
              <div key={log.id} className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50/50 dark:bg-gray-900/30 text-[10px] space-y-2">
                <div className="flex justify-between items-center">
                  <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400">
                    {log.accion}
                  </span>
                  <span className="text-gray-400 text-[9px]">{formatearFechaLog(log)}</span>
                </div>
                <p className="text-gray-700 dark:text-gray-300 font-semibold">Usuario: {log.usuario?.nombre || log.usuario?.email || "Usuario"}</p>
                <p className="text-gray-600 dark:text-gray-400">{log.detalle}</p>
              </div>
            ))
          )}
        </div>

        <div className="px-4 py-2.5 border-t border-gray-200 dark:border-gray-700 flex justify-end bg-gray-50 dark:bg-gray-900/80 shrink-0">
          <button onClick={() => setShowLogModal(false)} className="px-4 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded text-[10px] font-bold">
            Cerrar
          </button>
        </div>
      </aside>
    </div>
  );a
};

export default IniciarProceso;