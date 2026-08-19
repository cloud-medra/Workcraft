import React, { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../../../../../../../firebaseConfig';
import {
  ClipboardList,
  Search,
  RefreshCw,
  Eye
} from 'lucide-react';
import { useToast } from '../../../../../../../context/ToastContext';
import { useModal } from '../../../../../../../context/ModalContext';
import { useGranularPermission } from '../../../../../../../hooks/useGranularPermission';
import DetalleDocumento from './DetalleDocu';

const VinculacionCodigos = () => {
  const [documentos, setDocumentos] = useState([]);
  const [aniosDisponibles, setAniosDisponibles] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [filtroAnio, setFiltroAnio] = useState('');
  const [loading, setLoading] = useState(false);
  const [vinculando, setVinculando] = useState(false);

  const [documentoSeleccionado, setDocumentoSeleccionado] = useState(null);

  const { showToast } = useToast();
  const { confirmAction } = useModal();
  const { hasPermission } = useGranularPermission();

  const PATH_VISTA = "/vacunatorio/archivosControl";
  const COL_BASE = "vacunatorio_documentos";
  const COL_MAESTRO = "vacunatorio_codigos";
  const ESTADOS_PERMITIDOS = ["Proceso Iniciado", "Falta Vinculación", "Diferencia Precios"];

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

  const obtenerMesImputacion = (documento) => {
    const valor = documento?.mesImputado;
    if (!valor) return '—';

    if (typeof valor === 'string') {
      if (valor.includes('-')) {
        const [anio, mes] = valor.split('-');
        return `${mes}/${anio}`;
      }
      return valor;
    }

    const fecha = valor.toDate ? valor.toDate() : new Date(valor);
    if (isNaN(fecha.getTime())) return '—';

    return fecha.toLocaleDateString('es-CL', { month: '2-digit', year: 'numeric' });
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

  const cargarDocumentosEnProceso = useCallback(async () => {
    if (!filtroAnio) {
      setDocumentos([]);
      return;
    }

    setLoading(true);
    try {
      const mesesSnap = await getDocs(collection(db, COL_BASE, filtroAnio, "meses"));

      const promesasMeses = mesesSnap.docs.map(async (mesDoc) => {
        const mesId = mesDoc.id;
        const docsSnap = await getDocs(collection(db, COL_BASE, filtroAnio, "meses", mesId, "documentos"));

        return docsSnap.docs
          .map(d => ({ id: d.id, mesId, anio: filtroAnio, ...d.data() }))
          .filter(data => ESTADOS_PERMITIDOS.includes(data.estado));
      });

      const resultadosPorMes = await Promise.all(promesasMeses);
      const docsAcumulados = resultadosPorMes.flat();

      docsAcumulados.sort((a, b) => new Date(b.fchEmis || 0) - new Date(a.fchEmis || 0));
      setDocumentos(docsAcumulados);
    } catch (error) {
      console.error("Error al cargar documentos:", error);
      showToast("Error al obtener los documentos pendientes de vinculación", "error");
    } finally {
      setLoading(false);
    }
  }, [filtroAnio, showToast]);

  useEffect(() => {
    cargarDocumentosEnProceso();
  }, [cargarDocumentosEnProceso]);

  const handleVerDetalles = (documento) => setDocumentoSeleccionado(documento);
  const handleVolverALista = () => setDocumentoSeleccionado(null);

  const handleVincularDocumento = () => {
    if (!documentoSeleccionado || !documentoSeleccionado.detalles?.length) {
      showToast("El documento no contiene ítems para vincular", "error");
      return;
    }

    confirmAction(
      "Confirmar Vinculación",
      `¿Está seguro de procesar la vinculación para el folio ${documentoSeleccionado.folio}?`,
      async () => {
        setVinculando(true);
        try {
          const estadoAnteriorGeneral = documentoSeleccionado.estado || "Proceso Iniciado";
          const codigosSnap = await getDocs(collection(db, COL_MAESTRO));

          const refMap = new Map();
          codigosSnap.docs.forEach(d => {
            const itemMaestro = d.data();
            if (itemMaestro.referencia) {
              refMap.set(String(itemMaestro.referencia).trim().toLowerCase(), itemMaestro);
            }
          });

          let faltantesCount = 0;
          let diferenciasCount = 0;
          let sinDiferenciasCount = 0;

          const nuevosDetalles = documentoSeleccionado.detalles.map(item => {
            const codDocumento = item.codigo ? String(item.codigo).trim().toLowerCase() : '';
            const coincidencia = refMap.get(codDocumento);

            if (!coincidencia) {
              faltantesCount++;
              return {
                ...item,
                codigoMaestro: '-',
                descripcionMaestro: '-',
                precioMaestro: 0,
                estadoItem: 'No Vinculado'
              };
            }

            const precioDocumento = Math.round(Number(item.precio || 0));
            const precioMaestro = Math.round(Number(coincidencia.precio || 0));
            const descMaestro = coincidencia.descripcion || coincidencia.descripcion_articulo || coincidencia.nombre || '-';

            if (precioDocumento !== precioMaestro) {
              diferenciasCount++;
              return {
                ...item,
                codigoMaestro: coincidencia.codigo || '-',
                descripcionMaestro: descMaestro,
                precioMaestro: precioMaestro,
                estadoItem: 'Con Diferencias'
              };
            }

            sinDiferenciasCount++;
            return {
              ...item,
              codigoMaestro: coincidencia.codigo || '-',
              descripcionMaestro: descMaestro,
              precioMaestro: precioMaestro,
              estadoItem: 'Sin Diferencias'
            };
          });

          let nuevoEstadoGeneral = "Procesar OC";
          if (faltantesCount > 0) {
            nuevoEstadoGeneral = "Falta Vinculación";
          } else if (diferenciasCount > 0) {
            nuevoEstadoGeneral = "Diferencia Precios";
          }

          const currentUser = auth.currentUser;
          const usuarioInfo = {
            uid: currentUser?.uid || "desconocido",
            email: currentUser?.email || "usuario_anonimo",
            nombre: currentUser?.displayName || currentUser?.email?.split('@')[0] || "Usuario"
          };

          const docRef = doc(
            db,
            COL_BASE,
            filtroAnio,
            "meses",
            documentoSeleccionado.mesId,
            "documentos",
            documentoSeleccionado.id
          );

          await updateDoc(docRef, {
            detalles: nuevosDetalles,
            estado: nuevoEstadoGeneral
          });

          try {
            const logsRef = collection(docRef, "logs");
            await addDoc(logsRef, {
              accion: "VINCULACION_CODIGOS",
              detalle: `Vinculación procesada para el folio ${documentoSeleccionado.folio || documentoSeleccionado.id}`,
              estadoAnterior: estadoAnteriorGeneral,
              nuevoEstado: nuevoEstadoGeneral,
              resumen: {
                sinDiferencias: sinDiferenciasCount,
                conDiferencias: diferenciasCount,
                sinVincular: faltantesCount
              },
              fechaHora: new Date().toLocaleString('es-CL'),
              timestamp: serverTimestamp(),
              usuario: usuarioInfo
            });
          } catch (logError) {
            console.error("Error al escribir log de vinculación:", logError);
          }

          const documentoActualizado = {
            ...documentoSeleccionado,
            detalles: nuevosDetalles,
            estado: nuevoEstadoGeneral
          };

          setDocumentoSeleccionado(documentoActualizado);

          setDocumentos(prev => {
            if (nuevoEstadoGeneral === "Procesar OC") {
              return prev.filter(f => f.id !== documentoActualizado.id);
            }
            return prev.map(f => f.id === documentoActualizado.id ? documentoActualizado : f);
          });

          showToast(
            `Vinculación guardada: Estado "${nuevoEstadoGeneral}" (${sinDiferenciasCount} Sin Dif., ${diferenciasCount} Con Dif., ${faltantesCount} Sin Vincular).`,
            nuevoEstadoGeneral === "Procesar OC" ? "success" : "info"
          );

        } catch (error) {
          console.error("Error al vincular documento:", error);
          showToast("Error al procesar la vinculación con Códigos Maestro", "error");
        } finally {
          setVinculando(false);
        }
      }
    );
  };

  const documentosFiltrados = documentos.filter(f =>
    f.folio?.includes(busqueda) ||
    f.rznSoc?.toLowerCase().includes(busqueda.toLowerCase()) ||
    f.folioRef?.includes(busqueda)
  );

  const renderBadgeEstadoGeneral = (estado) => {
    switch (estado) {
      case 'Procesar OC':
        return (
          <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50">
            Procesar OC
          </span>
        );
      case 'Falta Vinculación':
        return (
          <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50">
            Falta Vinculación
          </span>
        );
      case 'Diferencia Precios':
        return (
          <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50">
            Diferencia Precios
          </span>
        );
      default:
        return (
          <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50">
            {estado || 'Proceso Iniciado'}
          </span>
        );
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-lg shadow-xs overflow-hidden p-0 relative font-sans">

      {documentoSeleccionado ? (
        <DetalleDocumento
          documento={documentoSeleccionado}
          vinculando={vinculando}
          puedeVincular={hasPermission(PATH_VISTA, "acciones_detalle", "btn_vincular")}
          formatearFechaEmision={formatearFechaEmision}
          renderBadgeEstadoGeneral={renderBadgeEstadoGeneral}
          onVolver={handleVolverALista}
          onVincular={handleVincularDocumento}
        />
      ) : (
        <>
          <header className="bg-white dark:bg-gray-800 border-b border-slate-200 dark:border-gray-700 px-3 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ClipboardList size={16} className="text-[#2383C2]" />
              <span className="text-[12px] font-normal text-slate-800 dark:text-gray-100 tracking-wide uppercase">
                Vinculación de Códigos (Documentos Pendientes)
              </span>
            </div>
          </header>

          <div className="bg-slate-100/70 dark:bg-gray-800/40 p-1.5 flex flex-wrap gap-1.5 items-center justify-between border-b border-slate-200 dark:border-gray-700">
            <div className="flex flex-wrap gap-1.5 items-center flex-grow">
              {hasPermission(PATH_VISTA, "filtros_busqueda", "select_anio") && (
                <select
                  value={filtroAnio}
                  onChange={(e) => setFiltroAnio(e.target.value)}
                  className="h-6 border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-slate-800 dark:text-gray-100 rounded text-[11px] px-1.5 outline-none focus:border-[#2383C2]"
                >
                  <option value="">Seleccionar Año</option>
                  {aniosDisponibles.map((a, idx) => (
                    <option key={`anio-${a}-${idx}`} value={a}>{a}</option>
                  ))}
                </select>
              )}

              {hasPermission(PATH_VISTA, "filtros_busqueda", "input_busqueda") && (
                <div className="relative flex-grow max-w-xs">
                  <Search className="absolute left-2 top-1.5 text-slate-400 dark:text-gray-500" size={12} />
                  <input
                    value={busqueda}
                    onChange={e => setBusqueda(e.target.value)}
                    className="w-full h-6 pl-7 pr-2 border border-slate-300 dark:border-gray-600 rounded text-[11px] outline-none bg-white dark:bg-gray-900 text-slate-800 dark:text-gray-100 focus:border-[#2383C2]"
                    placeholder="Buscar por Folio, Ref o Razón Social..."
                  />
                </div>
              )}
            </div>

            <button
              onClick={cargarDocumentosEnProceso}
              disabled={!filtroAnio || loading}
              className="h-6 px-2 rounded text-[11px] font-medium bg-white dark:bg-gray-800 border border-slate-300 dark:border-gray-600 text-slate-700 dark:text-gray-200 hover:bg-slate-50 dark:hover:bg-gray-700 flex items-center gap-1 transition-colors"
              title="Recargar datos"
            >
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
              <span>Actualizar</span>
            </button>
          </div>

          {hasPermission(PATH_VISTA, "tabla_documentos") && (
            <div className="flex-grow overflow-auto">
              {loading ? (
                <div className="w-full h-40 flex items-center justify-center text-xs text-slate-500 dark:text-gray-400">
                  Cargando documentos del año {filtroAnio}...
                </div>
              ) : (
                <table className="w-full text-left text-[11px] border-collapse table-fixed min-w-[950px]">
                  <thead className="bg-slate-100 dark:bg-gray-900/80 sticky top-0 z-10">
                    <tr className="text-slate-600 dark:text-gray-400 uppercase font-normal text-[10px] tracking-wider">
                      <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700 w-[10%]">Folio</th>
                      <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700 w-[10%]">Emisión</th>
                      <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700 w-[11%] text-center">Mes Imputación</th>
                      <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700 w-[10%]">Ref.</th>
                      <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700 w-[27%]">Razón Social</th>
                      <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700 w-[12%] text-right">Total (Neto)</th>
                      <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700 w-[12%] text-center">Estado</th>
                      <th className="px-2 py-1.5 border-b border-slate-200 dark:border-gray-700 w-[8%] text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/60 dark:divide-gray-700/50 bg-white dark:bg-gray-800">
                    {documentosFiltrados.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="px-3 py-6 text-center text-slate-400 dark:text-gray-500 text-xs">
                          {filtroAnio
                            ? "No hay documentos pendientes de vinculación para este año."
                            : "Seleccione un año para visualizar los documentos."}
                        </td>
                      </tr>
                    ) : (
                      documentosFiltrados.map((f) => (
                        <tr
                          key={f.id}
                          onDoubleClick={() => handleVerDetalles(f)}
                          className="border-l-2 border-transparent hover:border-[#2383C2] hover:bg-gray-50/80 dark:hover:bg-gray-700/40 transition-colors cursor-pointer"
                          title="Doble clic para ver el detalle"
                        >
                          <td className="px-2 py-1 border-b border-r border-slate-200/60 dark:border-gray-700/70 font-normal text-slate-800 dark:text-gray-100 truncate">
                            {f.folio}
                          </td>
                          <td className="px-2 py-1 border-b border-r border-slate-200/60 dark:border-gray-700/70 text-slate-600 dark:text-gray-400 whitespace-nowrap">
                            {formatearFechaEmision(f.fchEmis)}
                          </td>
                          <td className="px-2 py-1 border-b border-r border-slate-200/60 dark:border-gray-700/70 text-slate-700 dark:text-gray-300 text-center font-medium whitespace-nowrap">
                            {obtenerMesImputacion(f)}
                          </td>
                          <td className="px-2 py-1 border-b border-r border-slate-200/60 dark:border-gray-700/70 text-slate-600 dark:text-gray-400 truncate">
                            {f.folioRef}
                          </td>
                          <td className="px-2 py-1 border-b border-r border-slate-200/60 dark:border-gray-700/70 text-slate-700 dark:text-gray-300 truncate" title={f.rznSoc}>
                            {f.rznSoc}
                          </td>
                          <td className="px-2 py-1 border-b border-r border-slate-200/60 dark:border-gray-700/70 text-slate-800 dark:text-gray-100 font-normal text-right whitespace-nowrap">
                            ${Math.round(Number(f.total || 0)).toLocaleString('es-CL')}
                          </td>
                          <td className="px-2 py-1 border-b border-r border-slate-200/60 dark:border-gray-700/70 text-center whitespace-nowrap">
                            {renderBadgeEstadoGeneral(f.estado)}
                          </td>
                          <td className="px-2 py-1 border-b border-slate-200/60 dark:border-gray-700/70 text-center whitespace-nowrap">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleVerDetalles(f);
                              }}
                              className="p-1 text-slate-500 hover:text-[#2383C2] dark:text-gray-400 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-gray-700 rounded transition-colors"
                              title="Visualizar documento"
                            >
                              <Eye size={14} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default VinculacionCodigos;