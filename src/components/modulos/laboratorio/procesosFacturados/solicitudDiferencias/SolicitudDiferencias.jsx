import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../../../../firebaseConfig';
import {
  FileWarning,
  Search,
  RefreshCw,
  Eye,
  AlertTriangle,
  DollarSign,
  FileText
} from 'lucide-react';
import { useToast } from '../../../../../context/ToastContext';
import { useGranularPermission } from '../../../../../hooks/useGranularPermission';
import DetalleSolicitudDif from './DetalleSolicitudDif';

const SolicitudDiferencias = () => {
  const [facturas, setFacturas] = useState([]);
  const [aniosDisponibles, setAniosDisponibles] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [filtroAnio, setFiltroAnio] = useState('');
  const [loading, setLoading] = useState(false);
  const [facturaSeleccionada, setFacturaSeleccionada] = useState(null);

  const { showToast } = useToast();
  const { hasPermission } = useGranularPermission();

  const PATH_VISTA = "/laboratorio/controlFactura";
  const COL_BASE = "laboratorio_facturasXml";

  const formatearFechaEmision = (fechaStr) => {
    if (!fechaStr) return '';
    const partes = fechaStr.replace(/-/g, '/').split('/');
    if (partes.length === 3) {
      const [anio, mes, dia] = partes;
      if (anio.length === 4) return `${dia}/${mes}/${anio}`;
    }
    return fechaStr;
  };

  const getBadgeStyle = (estado) => {
    const estadoNormalizado = (estado || '').toLowerCase();
    if (estadoNormalizado.includes('vinculación parcial') || estadoNormalizado.includes('vinculacion parcial')) {
      return 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 border-sky-300 dark:border-sky-800';
    }
    return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800/50';
  };

  useEffect(() => {
    const cargarAnios = async () => {
      try {
        const snap = await getDocs(collection(db, COL_BASE));
        const anios = snap.docs.map(d => d.id).sort((a, b) => b - a);
        setAniosDisponibles(anios);
        if (anios.length > 0 && !filtroAnio) {
          setFiltroAnio(anios[0]);
        }
      } catch (error) {
        console.error("Error al cargar años:", error);
      }
    };
    cargarAnios();
  }, []);

  const cargarFacturasDiferencias = async () => {
    if (!filtroAnio) {
      setFacturas([]);
      return;
    }

    setLoading(true);
    try {
      const mesesSnap = await getDocs(collection(db, COL_BASE, filtroAnio, "meses"));
      let docsAcumulados = [];

      const estadosPermitidos = [
        "Diferencia Reportada",
        "DiferenciasReportadas",
        "Aceptado con Diferencias",
        "Vinculación Parcial",
        "Vinculacion Parcial"
      ];

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
      console.error("Error al cargar facturas:", error);
      showToast("Error al obtener las facturas con diferencias o vinculación parcial", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (filtroAnio) {
      cargarFacturasDiferencias();
    }
  }, [filtroAnio]);

  const facturasFiltradas = useMemo(() => {
    const query = busqueda.toLowerCase().trim();
    if (!query) return facturas;
    return facturas.filter(f =>
      (f.folio && String(f.folio).toLowerCase().includes(query)) ||
      (f.rznSoc && f.rznSoc.toLowerCase().includes(query)) ||
      (f.folioRef && String(f.folioRef).toLowerCase().includes(query)) ||
      (f.rutEmisor && f.rutEmisor.toLowerCase().includes(query)) ||
      (f.estado && f.estado.toLowerCase().includes(query)) ||
      (f.mesImputado && String(f.mesImputado).toLowerCase().includes(query)) ||
      (f.mes_imputado && String(f.mes_imputado).toLowerCase().includes(query))
    );
  }, [facturas, busqueda]);

  const totalMontoDiferencias = useMemo(() => {
    return facturasFiltradas.reduce((acc, f) => acc + (parseInt(f.total) || 0), 0);
  }, [facturasFiltradas]);

  return (
    <div className="w-full h-full flex flex-col bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-lg shadow-xs overflow-hidden font-sans">
      {!facturaSeleccionada ? (
        <>
          {/* CABECERA */}
          <header className="bg-white dark:bg-gray-800 border-b border-slate-200 dark:border-gray-700 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800">
                <FileWarning size={18} className="text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h1 className="text-xs font-semibold text-slate-800 dark:text-gray-100 uppercase tracking-wider">
                  Solicitud de Diferencias y Vinculaciones
                </h1>
                <p className="text-[11px] text-slate-500 dark:text-gray-400">
                  Gestión e inspección de facturas con discrepancias o vinculación parcial
                </p>
              </div>
            </div>

            {/* METRICAS RAPIDAS */}
            <div className="flex items-center gap-2 text-xs">
              <div className="px-2.5 py-1 rounded bg-slate-100 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 flex items-center gap-1.5">
                <FileText size={13} className="text-slate-500" />
                <span className="text-slate-600 dark:text-gray-400">Total Casos:</span>
                <span className="font-semibold text-slate-800 dark:text-gray-200">{facturasFiltradas.length}</span>
              </div>
              <div className="px-2.5 py-1 rounded bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-center gap-1.5">
                <DollarSign size={13} className="text-amber-600 dark:text-amber-400" />
                <span className="text-amber-700 dark:text-amber-300">Monto:</span>
                <span className="font-semibold text-amber-900 dark:text-amber-200">
                  ${totalMontoDiferencias.toLocaleString('es-CL')}
                </span>
              </div>
            </div>
          </header>

          {/* FILTROS Y CONTROLES */}
          <div className="bg-slate-100/70 dark:bg-gray-800/50 p-2 flex flex-wrap gap-2 items-center justify-between border-b border-slate-200 dark:border-gray-700">
            <div className="flex flex-wrap gap-2 items-center flex-grow">
              {hasPermission(PATH_VISTA, "filtros_busqueda", "select_anio") && (
                <select
                  value={filtroAnio}
                  onChange={(e) => setFiltroAnio(e.target.value)}
                  className="h-7 border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-slate-800 dark:text-gray-100 rounded text-xs px-2 outline-none focus:border-[#2383C2] transition-colors"
                >
                  <option value="">Seleccionar Año</option>
                  {aniosDisponibles.map((a, idx) => (
                    <option key={`anio-${a}-${idx}`} value={a}>{a}</option>
                  ))}
                </select>
              )}

              {hasPermission(PATH_VISTA, "filtros_busqueda", "input_busqueda") && (
                <div className="relative flex-grow max-w-sm">
                  <Search className="absolute left-2.5 top-2 text-slate-400 dark:text-gray-500" size={13} />
                  <input
                    value={busqueda}
                    onChange={e => setBusqueda(e.target.value)}
                    className="w-full h-7 pl-8 pr-2 border border-slate-300 dark:border-gray-600 rounded text-xs outline-none bg-white dark:bg-gray-900 text-slate-800 dark:text-gray-100 focus:border-[#2383C2] transition-colors"
                    placeholder="Buscar por Folio, RUT, Ref, Mes, Estado..."
                  />
                </div>
              )}
            </div>

            <button
              onClick={cargarFacturasDiferencias}
              disabled={!filtroAnio || loading}
              className="h-7 px-3 rounded text-xs font-medium bg-white dark:bg-gray-800 border border-slate-300 dark:border-gray-600 text-slate-700 dark:text-gray-200 hover:bg-slate-50 dark:hover:bg-gray-700 flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
              title="Recargar datos de Firestore"
            >
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
              <span>Actualizar</span>
            </button>
          </div>

          {/* TABLA DE CONTENIDO */}
          {hasPermission(PATH_VISTA, "tabla_facturas") && (
            <div className="flex-grow overflow-auto">
              {loading ? (
                <div className="w-full h-48 flex flex-col items-center justify-center text-xs text-slate-500 dark:text-gray-400 gap-2">
                  <RefreshCw size={20} className="animate-spin text-amber-500" />
                  <span>Cargando documentos del año {filtroAnio}...</span>
                </div>
              ) : (
                <table className="w-full text-left text-[11px] border-collapse table-fixed min-w-[950px]">
                  <thead className="bg-slate-100 dark:bg-gray-900/90 sticky top-0 z-10 border-b border-slate-200 dark:border-gray-700">
                    <tr className="text-slate-600 dark:text-gray-400 uppercase font-semibold text-[10px] tracking-wider">
                      <th className="px-3 py-2 border-r border-slate-200 dark:border-gray-700 w-[10%]">Folio</th>
                      <th className="px-3 py-2 border-r border-slate-200 dark:border-gray-700 w-[10%]">Emisión</th>
                      <th className="px-3 py-2 border-r border-slate-200 dark:border-gray-700 w-[11%]">Mes Imputado</th>
                      <th className="px-3 py-2 border-r border-slate-200 dark:border-gray-700 w-[10%]">Ref. (OC)</th>
                      <th className="px-3 py-2 border-r border-slate-200 dark:border-gray-700 w-[28%]">Proveedor / Razón Social</th>
                      <th className="px-3 py-2 border-r border-slate-200 dark:border-gray-700 w-[13%] text-right">Total Neto</th>
                      <th className="px-3 py-2 border-r border-slate-200 dark:border-gray-700 w-[12%] text-center">Estado</th>
                      <th className="px-3 py-2 w-[6%] text-center">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/70 dark:divide-gray-700/60 bg-white dark:bg-gray-800">
                    {facturasFiltradas.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="px-3 py-10 text-center text-slate-400 dark:text-gray-500 text-xs">
                          <div className="flex flex-col items-center gap-1.5">
                            <AlertTriangle size={20} className="text-slate-300 dark:text-gray-600" />
                            <span>
                              {filtroAnio
                                ? "No se encontraron registros de diferencias o vinculación parcial para los filtros aplicados."
                                : "Seleccione un año para cargar los documentos."}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      facturasFiltradas.map((f) => (
                        <tr
                          key={f.id}
                          onDoubleClick={() => setFacturaSeleccionada(f)}
                          className="border-l-2 border-transparent hover:border-amber-500 hover:bg-amber-50/40 dark:hover:bg-amber-950/20 transition-colors cursor-pointer group"
                          title="Doble clic para ver el detalle completo"
                        >
                          <td className="px-3 py-1.5 border-r border-slate-200/60 dark:border-gray-700/60 font-semibold text-slate-800 dark:text-gray-100 truncate">
                            #{f.folio}
                          </td>
                          <td className="px-3 py-1.5 border-r border-slate-200/60 dark:border-gray-700/60 text-slate-600 dark:text-gray-400 whitespace-nowrap">
                            {formatearFechaEmision(f.fchEmis)}
                          </td>
                          <td className="px-3 py-1.5 border-r border-slate-200/60 dark:border-gray-700/60 text-slate-700 dark:text-gray-300 font-medium truncate">
                            {f.mesImputado || f.mes_imputado || '-'}
                          </td>
                          <td className="px-3 py-1.5 border-r border-slate-200/60 dark:border-gray-700/60 text-slate-600 dark:text-gray-400 truncate font-mono">
                            {f.folioRef || 'S/R'}
                          </td>
                          <td className="px-3 py-1.5 border-r border-slate-200/60 dark:border-gray-700/60 text-slate-700 dark:text-gray-300 truncate" title={f.rznSoc}>
                            <div className="font-medium truncate">{f.rznSoc || 'Sin Razón Social'}</div>
                            {f.rutEmisor && <div className="text-[10px] text-slate-400">{f.rutEmisor}</div>}
                          </td>
                          <td className="px-3 py-1.5 border-r border-slate-200/60 dark:border-gray-700/60 text-slate-800 dark:text-gray-100 font-semibold text-right whitespace-nowrap">
                            ${parseInt(f.total || 0).toLocaleString('es-CL')}
                          </td>
                          <td className="px-3 py-1.5 border-r border-slate-200/60 dark:border-gray-700/60 text-center whitespace-nowrap">
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold border ${getBadgeStyle(f.estado)}`}>
                              {f.estado || 'Diferencia Reportada'}
                            </span>
                          </td>
                          <td className="px-2 py-1.5 text-center whitespace-nowrap">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setFacturaSeleccionada(f);
                              }}
                              className="p-1 text-slate-500 hover:text-amber-600 dark:text-gray-400 dark:hover:text-amber-400 hover:bg-amber-100 dark:hover:bg-gray-700 rounded transition-colors"
                              title="Inspeccionar detalle"
                            >
                              <Eye size={15} />
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
      ) : (
        /* VISTA DE DETALLES (Ocupa todo el espacio) */
        <DetalleSolicitudDif
          factura={facturaSeleccionada}
          onClose={() => setFacturaSeleccionada(null)}
          formatearFechaEmision={formatearFechaEmision}
          getBadgeStyle={getBadgeStyle}
        />
      )}
    </div>
  );
};

export default SolicitudDiferencias;