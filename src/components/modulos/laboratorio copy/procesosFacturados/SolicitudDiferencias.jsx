// src/components/facturas/SolicitudDiferencias.jsx
import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../../../firebaseConfig';
import {
  FileWarning,
  Search,
  RefreshCw,
  Eye,
  X
} from 'lucide-react';
import { useToast } from '../../../../context/ToastContext';
import { useGranularPermission } from '../../../../hooks/useGranularPermission';

const SolicitudDiferencias = () => {
  const [facturas, setFacturas] = useState([]);
  const [aniosDisponibles, setAniosDisponibles] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [filtroAnio, setFiltroAnio] = useState('');
  const [loading, setLoading] = useState(false);

  // Estado para controlar la factura que se visualiza en el modal
  const [facturaSeleccionada, setFacturaSeleccionada] = useState(null);

  const { showToast } = useToast();
  const { hasPermission } = useGranularPermission();

  const PATH_VISTA = "/laboratorio/controlFactura";
  const COL_BASE = "laboratorio_facturasXml";

  // Formatear fecha dd/mm/yyyy
  const formatearFechaEmision = (fechaStr) => {
    if (!fechaStr) return '';
    const partes = fechaStr.replace(/-/g, '/').split('/');
    if (partes.length === 3) {
      const [anio, mes, dia] = partes;
      if (anio.length === 4) return `${dia}/${mes}/${anio}`;
    }
    return fechaStr;
  };

  // Cargar Años Disponibles
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

  // Cargar facturas en estado "Diferencia Reportada"
  const cargarFacturasDiferencias = async () => {
    if (!filtroAnio) {
      setFacturas([]);
      return;
    }

    setLoading(true);
    try {
      const mesesSnap = await getDocs(collection(db, COL_BASE, filtroAnio, "meses"));
      let docsAcumulados = [];
      const estadosPermitidos = ["Diferencia Reportada", "DiferenciasReportadas", "Aceptado con Diferencias"];

      for (const mesDoc of mesesSnap.docs) {
        const mesId = mesDoc.id;
        const docsSnap = await getDocs(collection(db, COL_BASE, filtroAnio, "meses", mesId, "documentos"));

        docsSnap.docs.forEach(d => {
          const data = d.data();
          if (estadosPermitidos.includes(data.estado) || data.tieneDiferencias === true) {
            docsAcumulados.push({
              id: d.id,
              mesId,
              ...data
            });
          }
        });
      }

      docsAcumulados.sort((a, b) => new Date(b.fchEmis || 0) - new Date(a.fchEmis || 0));
      setFacturas(docsAcumulados);
    } catch (error) {
      console.error("Error al cargar facturas con diferencias:", error);
      showToast("Error al obtener las facturas con diferencias reportadas", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarFacturasDiferencias();
  }, [filtroAnio]);

  const facturasFiltradas = facturas.filter(f =>
    f.folio?.includes(busqueda) ||
    f.rznSoc?.toLowerCase().includes(busqueda.toLowerCase()) ||
    f.folioRef?.includes(busqueda)
  );

  const renderBadgeEstadoGeneral = (estado) => {
    return (
      <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold border bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800/50">
        {estado || 'Diferencia Reportada'}
      </span>
    );
  };

  return (
    <div className="w-full h-full flex flex-col bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-lg shadow-xs overflow-hidden p-0 relative font-sans">
      {/* CABECERA */}
      <header className="bg-white dark:bg-gray-800 border-b border-slate-200 dark:border-gray-700 px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileWarning size={16} className="text-amber-500" />
          <span className="text-[12px] font-normal text-slate-800 dark:text-gray-100 tracking-wide uppercase">
            Solicitud de Diferencias Reportadas
          </span>
        </div>
      </header>

      {/* FILTROS Y BÚSQUEDA */}
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
          onClick={cargarFacturasDiferencias}
          disabled={!filtroAnio || loading}
          className="h-6 px-2 rounded text-[11px] font-medium bg-white dark:bg-gray-800 border border-slate-300 dark:border-gray-600 text-slate-700 dark:text-gray-200 hover:bg-slate-50 dark:hover:bg-gray-700 flex items-center gap-1 transition-colors"
          title="Recargar datos"
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          <span>Actualizar</span>
        </button>
      </div>

      {/* TABLA PRINCIPAL */}
      {hasPermission(PATH_VISTA, "tabla_facturas") && (
        <div className="flex-grow overflow-auto">
          {loading ? (
            <div className="w-full h-40 flex items-center justify-center text-xs text-slate-500 dark:text-gray-400">
              Cargando solicitudes con diferencias del año {filtroAnio}...
            </div>
          ) : (
            <table className="w-full text-left text-[11px] border-collapse table-fixed min-w-[850px]">
              <thead className="bg-slate-100 dark:bg-gray-900/80 sticky top-0 z-10">
                <tr className="text-slate-600 dark:text-gray-400 uppercase font-normal text-[10px] tracking-wider">
                  <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700 w-[11%]">Folio</th>
                  <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700 w-[11%]">Emisión</th>
                  <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700 w-[11%]">Ref.</th>
                  <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700 w-[33%]">Razón Social</th>
                  <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700 w-[13%] text-right">Total (Neto)</th>
                  <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700 w-[13%] text-center">Estado</th>
                  <th className="px-2 py-1.5 border-b border-slate-200 dark:border-gray-700 w-[8%] text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/60 dark:divide-gray-700/50 bg-white dark:bg-gray-800">
                {facturasFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-3 py-6 text-center text-slate-400 dark:text-gray-500 text-xs">
                      {filtroAnio
                        ? "No hay facturas con diferencias reportadas en este año."
                        : "Seleccione un año para visualizar las facturas."}
                    </td>
                  </tr>
                ) : (
                  facturasFiltradas.map((f) => (
                    <tr
                      key={f.id}
                      onDoubleClick={() => setFacturaSeleccionada(f)}
                      className="border-l-2 border-transparent hover:border-amber-500 hover:bg-amber-50/30 dark:hover:bg-amber-950/20 transition-colors cursor-pointer"
                      title="Doble clic para ver detalles"
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
                      <td className="px-2 py-1 border-b border-r border-slate-200/60 dark:border-gray-700/70 text-center whitespace-nowrap">
                        {renderBadgeEstadoGeneral(f.estado)}
                      </td>
                      <td className="px-2 py-1 border-b border-slate-200/60 dark:border-gray-700/70 text-center whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setFacturaSeleccionada(f);
                          }}
                          className="p-1 text-slate-500 hover:text-amber-600 dark:text-gray-400 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-gray-700 rounded transition-colors"
                          title="Visualizar detalles"
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

      {/* MODAL DE DETALLES DE LA SOLICITUD DE DIFERENCIAS */}
      {facturaSeleccionada && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-slate-200 dark:border-gray-700 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Cabecera Modal */}
            <div className="px-4 py-3 bg-slate-100 dark:bg-gray-900 border-b border-slate-200 dark:border-gray-700 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <FileWarning size={18} className="text-amber-500" />
                <h3 className="text-sm font-semibold text-slate-800 dark:text-gray-100 uppercase">
                  Detalle de Solicitud de Diferencias - Folio N° {facturaSeleccionada.folio}
                </h3>
              </div>
              <button
                onClick={() => setFacturaSeleccionada(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-gray-200 rounded p-1 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Contenido Modal */}
            <div className="p-4 overflow-y-auto flex-grow text-xs text-slate-700 dark:text-gray-300 space-y-4">
              {/* Información General */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 bg-slate-50 dark:bg-gray-900/50 rounded border border-slate-200 dark:border-gray-700">
                <div>
                  <span className="block text-[10px] text-slate-400 dark:text-gray-500 uppercase font-semibold">Razón Social</span>
                  <span className="font-medium text-slate-800 dark:text-gray-200">{facturaSeleccionada.rznSoc || '-'}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400 dark:text-gray-500 uppercase font-semibold">RUT</span>
                  <span className="font-medium text-slate-800 dark:text-gray-200">{facturaSeleccionada.rutEmisor || '-'}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400 dark:text-gray-500 uppercase font-semibold">Fecha Emisión</span>
                  <span className="font-medium text-slate-800 dark:text-gray-200">{formatearFechaEmision(facturaSeleccionada.fchEmis)}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400 dark:text-gray-500 uppercase font-semibold">Referencia (OC)</span>
                  <span className="font-medium text-slate-800 dark:text-gray-200">{facturaSeleccionada.folioRef || 'Sin Referencia'}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400 dark:text-gray-500 uppercase font-semibold">Monto Total</span>
                  <span className="font-medium text-slate-800 dark:text-gray-200">${parseInt(facturaSeleccionada.total || 0).toLocaleString('es-CL')}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400 dark:text-gray-500 uppercase font-semibold">Estado</span>
                  {renderBadgeEstadoGeneral(facturaSeleccionada.estado)}
                </div>
              </div>

              {/* Detalle de Observación / Motivo de la diferencia */}
              <div>
                <h4 className="font-semibold text-slate-800 dark:text-gray-200 mb-1">Motivo / Observaciones del Reporte</h4>
                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded text-slate-800 dark:text-amber-200">
                  {facturaSeleccionada.observacionDiferencia ||
                   facturaSeleccionada.motivo ||
                   "No se especificaron detalles adicionales sobre las diferencias de esta factura."}
                </div>
              </div>
            </div>

            {/* Pie Modal */}
            <div className="px-4 py-2 bg-slate-100 dark:bg-gray-900 border-t border-slate-200 dark:border-gray-700 flex justify-end">
              <button
                onClick={() => setFacturaSeleccionada(null)}
                className="px-3 py-1 bg-slate-200 hover:bg-slate-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-slate-700 dark:text-gray-200 rounded text-xs transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SolicitudDiferencias;