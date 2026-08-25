import React, { useState, useEffect } from 'react';
import { collection, deleteDoc, doc, query, orderBy, getDocs, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../../../../../../../firebaseConfig';
import { FileText, Trash2, Search, Eye, Settings, History } from 'lucide-react';
import { useToast } from '../../../../../../../context/ToastContext';
import { useModal } from '../../../../../../../context/ModalContext';
import { useGranularPermission } from '../../../../../../../hooks/useGranularPermission';

import VizualizadorDetallesImputados from './VizualizadorDetallesImputados';
import EdicionComponent from './EdicionComponent';
import HistorialDocumentos from '../documentosRecibidos/HistorialDocumentos';

const DocumentosEditor = () => {
  const [documentos, setDocumentos] = useState([]);
  const [aniosDisponibles, setAniosDisponibles] = useState([]);
  const [mesesDisponibles, setMesesDisponibles] = useState([]);
  const [busqueda, setBusqueda] = useState('');

  const [documentoSeleccionado, setDocumentoSeleccionado] = useState(null);
  const [documentoParaConfigurar, setDocumentoParaConfigurar] = useState(null);

  const [showLogModal, setShowLogModal] = useState(false);
  const [selectedDocumentoForLog, setSelectedDocumentoForLog] = useState(null);
  const [logsList, setLogsList] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const [filtroAnio, setFiltroAnio] = useState("");
  const [filtroMes, setFiltroMes] = useState("");

  const { showToast } = useToast();
  const { confirmAction } = useModal();
  const { hasPermission } = useGranularPermission();

  const PATH_VISTA = "/laboratorio/archivosControl";
  const COL_BASE = "laboratorio_documentos";

  const formatearFechaEmision = (fechaStr) => {
    if (!fechaStr) return '-';
    const partes = fechaStr.replace(/-/g, '/').split('/');
    if (partes.length === 3) {
      const [anio, mes, dia] = partes;
      if (anio.length === 4) {
        return `${dia}/${mes}/${anio}`;
      }
    }
    return fechaStr;
  };

  const getEstadoBadgeClass = (estado) => {
    switch (estado?.toLowerCase()) {
      case 'iniciar ingreso':
        return 'bg-slate-100 text-slate-800 dark:bg-slate-800/60 dark:text-slate-300 border-slate-200 dark:border-slate-700';
      case 'proceso iniciado':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800/50';
      case 'procesar oc':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/50';
      case 'falta vinculación':
      case 'falta vinculacion':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800/50';
      case 'diferencia precios':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800/50';
      case 'listo para ingreso':
        return 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 border-teal-200 dark:border-teal-800/50';
      case 'diferencia reportada':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300 border-orange-200 dark:border-orange-800/50';
      case 'rechazada':
      case 'rechazado':
        return 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800/50';
      case 'solicitud enviada':
        return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800/50';
      case 'finalizado':
      case 'completado':
      case 'aprobado':
      case 'ingresado':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700';
    }
  };

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

  useEffect(() => {
    if (!filtroAnio || !filtroMes) { setDocumentos([]); return; }
    const path = `${COL_BASE}/${filtroAnio}/meses/${filtroMes}/documentos`;
    const q = query(collection(db, path), orderBy("fchEmis", "desc"));
    return onSnapshot(q, (snapshot) => setDocumentos(snapshot.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, [filtroAnio, filtroMes]);

  const handleDelete = (id) => {
    confirmAction("Eliminar Documento", "¿Estás seguro de eliminar este registro?", async () => {
      await deleteDoc(doc(db, COL_BASE, filtroAnio, "meses", filtroMes, "documentos", id));
      showToast("Documento eliminado", "info");
    });
  };

  const handleGuardarEdicion = async (formData) => {
    try {
      const { id, ...dataToUpdate } = formData;
      const ref = doc(db, COL_BASE, filtroAnio, "meses", filtroMes, "documentos", formData.id);
      await updateDoc(ref, dataToUpdate);
      showToast("Documento actualizado correctamente", "success");
    } catch (error) {
      console.error("Error al actualizar documento:", error);
      showToast("Error al guardar los cambios", "error");
    }
  };

  const abrirHistorialLogs = async (documento) => {
    setSelectedDocumentoForLog(documento);
    setShowLogModal(true);
    setLoadingLogs(true);

    try {
      const logsRef = collection(db, COL_BASE, filtroAnio, "meses", filtroMes, "documentos", documento.id, "logs");
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

  const documentosFiltrados = documentos.filter(doc =>
    doc.folio?.toLowerCase().includes(busqueda.toLowerCase()) ||
    doc.rznSoc?.toLowerCase().includes(busqueda.toLowerCase()) ||
    doc.folioRef?.toLowerCase().includes(busqueda.toLowerCase()) ||
    doc.estado?.toLowerCase().includes(busqueda.toLowerCase()) ||
    (doc.orden || doc.numOrden)?.toString().toLowerCase().includes(busqueda.toLowerCase()) ||
    (doc.acta || doc.numActa)?.toString().toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="w-full h-full flex flex-col bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-lg shadow-xs overflow-hidden p-0 relative font-sans">
      <header className="bg-white dark:bg-gray-800 border-b border-slate-200 dark:border-gray-700 px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-[#2383C2]" />
          <span className="text-[12px] font-normal text-slate-800 dark:text-gray-100 tracking-wide uppercase">
            Documentos Imputados
          </span>
        </div>
      </header>

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
              placeholder="Buscar por Folio, Ref, Orden, Acta, Razón Social..."
            />
          </div>
        )}
      </div>

      {hasPermission(PATH_VISTA, "tabla_documentos") && (
        <div className="flex-grow overflow-auto">
          <table className="w-full text-left text-[11px] border-collapse table-fixed min-w-[950px]">
            <thead className="bg-slate-100 dark:bg-gray-900/80 sticky top-0 z-10">
              <tr className="text-slate-600 dark:text-gray-400 uppercase font-normal text-[10px] tracking-wider">
                <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700 w-[9%]">Folio</th>
                <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700 w-[9%]">Emisión</th>
                <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700 w-[9%]">Ref.</th>
                <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700 w-[22%]">Razón Social</th>
                <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700 w-[10%] text-right">Total (Neto)</th>
                <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700 w-[11%] text-center">Estado</th>
                <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700 w-[7%] text-center">Orden</th>
                <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700 w-[7%] text-center">Acta</th>
                <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700 w-[7%] text-center">Salida</th>
                <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700 w-[9%] text-center">Mes imputado</th>
                <th className="px-2 py-1.5 border-b border-slate-200 dark:border-gray-700 w-[8%] text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60 dark:divide-gray-700/50 bg-white dark:bg-gray-800">
              {documentosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-slate-400 dark:text-gray-500 text-[11px]">
                    {!filtroAnio || !filtroMes ? "Selecciona un año y mes para cargar registros." : "No se encontraron documentos con los criterios seleccionados."}
                  </td>
                </tr>
              ) : (
                documentosFiltrados.map((docItem) => (
                  <tr
                    key={docItem.id}
                    className="border-l-2 border-transparent hover:border-[#2383C2] hover:bg-gray-50/80 dark:hover:bg-gray-700/40 transition-colors"
                  >
                    <td className="px-2 py-1 border-b border-r border-slate-200/60 dark:border-gray-700/70 font-normal text-slate-800 dark:text-gray-100 truncate">
                      {docItem.folio || '-'}
                    </td>
                    <td className="px-2 py-1 border-b border-r border-slate-200/60 dark:border-gray-700/70 text-slate-600 dark:text-gray-400 whitespace-nowrap">
                      {formatearFechaEmision(docItem.fchEmis)}
                    </td>
                    <td className="px-2 py-1 border-b border-r border-slate-200/60 dark:border-gray-700/70 text-slate-600 dark:text-gray-400 truncate">
                      {docItem.folioRef || '-'}
                    </td>
                    <td className="px-2 py-1 border-b border-r border-slate-200/60 dark:border-gray-700/70 text-slate-700 dark:text-gray-300 truncate" title={docItem.rznSoc}>
                      {docItem.rznSoc || '-'}
                    </td>
                    <td className="px-2 py-1 border-b border-r border-slate-200/60 dark:border-gray-700/70 text-slate-800 dark:text-gray-100 font-normal text-right whitespace-nowrap">
                      ${Math.round(Number(docItem.total) || 0).toLocaleString('es-CL')}
                    </td>
                    <td className="px-2 py-1 border-b border-r border-slate-200/60 dark:border-gray-700/70 text-center whitespace-nowrap">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getEstadoBadgeClass(docItem.estado)}`}>
                        {docItem.estado || "Iniciar Ingreso"}
                      </span>
                    </td>
                    <td className="px-2 py-1 border-b border-r border-slate-200/60 dark:border-gray-700/70 text-center text-slate-700 dark:text-gray-300 truncate" title={docItem.numeroOrden}>
                      {docItem.numeroOrden || '-'}
                    </td>
                    <td className="px-2 py-1 border-b border-r border-slate-200/60 dark:border-gray-700/70 text-center text-slate-700 dark:text-gray-300 truncate" title={docItem.numeroActa || docItem.acta || docItem.numActa}>
                      {docItem.numeroActa || '-'}
                    </td>
                    <td className="px-2 py-1 border-b border-r border-slate-200/60 dark:border-gray-700/70 text-center text-slate-700 dark:text-gray-300 truncate" title={docItem.numeroSalida || docItem.salida || docItem.numSalida}>
                      {docItem.numeroSalida || '-'}
                    </td>
                    <td className="px-2 py-1 border-b border-r border-slate-200/60 dark:border-gray-700/70 text-center text-slate-700 dark:text-gray-300 capitalize truncate">
                      {docItem.mesImputado || docItem.mesImputacion || '-'}
                    </td>
                    <td className="px-2 py-1 border-b border-slate-200/60 dark:border-gray-700 text-center">
                      <div className="flex justify-center gap-1.5">
                        {hasPermission(PATH_VISTA, "tabla_documentos", "btn_log") && (
                          <button
                            onClick={() => abrirHistorialLogs(docItem)}
                            className="text-slate-400 hover:text-[#2383C2] transition inline-flex items-center justify-center p-0.5 rounded hover:bg-slate-100 dark:hover:bg-gray-700"
                            title="Ver Historial / Logs"
                          >
                            <History size={13} />
                          </button>
                        )}
                        {hasPermission(PATH_VISTA, "tabla_documentos", "btn_ver") && (
                          <button
                            onClick={() => setDocumentoSeleccionado(docItem)}
                            className="text-slate-400 hover:text-[#2383C2] transition inline-flex items-center justify-center p-0.5 rounded hover:bg-slate-100 dark:hover:bg-gray-700"
                            title="Ver Detalle"
                          >
                            <Eye size={13} />
                          </button>
                        )}
                        {hasPermission(PATH_VISTA, "tabla_documentos", "btn_configurar") && (
                          <button
                            onClick={() => setDocumentoParaConfigurar(docItem)}
                            className="text-slate-400 hover:text-amber-600 transition inline-flex items-center justify-center p-0.5 rounded hover:bg-slate-100 dark:hover:bg-gray-700"
                            title="Configurar"
                          >
                            <Settings size={13} />
                          </button>
                        )}
                        {hasPermission(PATH_VISTA, "tabla_documentos", "btn_eliminar") && (
                          <button
                            onClick={() => handleDelete(docItem.id)}
                            className="text-slate-400 hover:text-red-500 transition inline-flex items-center justify-center p-0.5 rounded hover:bg-slate-100 dark:hover:bg-gray-700"
                            title="Eliminar"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {documentoSeleccionado && (
        <VizualizadorDetallesImputados
          documento={documentoSeleccionado}
          onClose={() => setDocumentoSeleccionado(null)}
        />
      )}

      {documentoParaConfigurar && (
        <EdicionComponent
          documento={documentoParaConfigurar}
          filtroAnio={filtroAnio}
          filtroMes={filtroMes}
          onClose={() => setDocumentoParaConfigurar(null)}
          onGuardar={handleGuardarEdicion}
        />
      )}

      <HistorialDocumentos
        showLogModal={showLogModal}
        onClose={() => setShowLogModal(false)}
        selectedDocumentoForLog={selectedDocumentoForLog}
        logsList={logsList}
        loadingLogs={loadingLogs}
      />
    </div>
  );
};

export default DocumentosEditor;