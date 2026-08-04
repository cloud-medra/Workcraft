// src/components/facturas/SolicitudDiferencias.jsx
import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../../../firebaseConfig';
import {
  FileWarning,
  Search,
  RefreshCw,
  Eye,
  ArrowLeft,
  FileText,
  Calendar,
  Hash,
  Building2,
  Tag,
  DollarSign,
  Activity
} from 'lucide-react';
import { useToast } from '../../../../context/ToastContext';
import { useGranularPermission } from '../../../../hooks/useGranularPermission';

// COMPONENTE DE DETALLE BASADO EN DETALLEVINCULACIONOC (MODO LECTURA)
const DetalleSolicitudDiferencias = ({
  factura,
  onVolver,
  formatearFechaEmision,
  renderBadgeEstadoGeneral
}) => {
  const [detallesProcesados, setDetallesProcesados] = useState([]);

  useEffect(() => {
    if (factura && factura.detalles) {
      setDetallesProcesados(factura.detalles);
    }
  }, [factura]);

  if (!factura) return null;

  return (
    <div className="relative flex flex-col h-full w-full bg-white dark:bg-gray-800 overflow-hidden">
      {/* CABECERA VISTA DETALLE */}
      <header className="bg-white dark:bg-gray-800 border-b border-slate-200 dark:border-gray-700 px-3 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={onVolver}
            className="p-1 hover:bg-slate-100 dark:hover:bg-gray-700 rounded text-slate-600 dark:text-gray-300 flex items-center gap-1 text-[11px] font-medium transition-colors"
            title="Volver a la lista"
          >
            <ArrowLeft size={15} className="text-[#2383C2]" />
            <span>Volver</span>
          </button>
          <span className="text-slate-300 dark:text-gray-600">|</span>
          <FileText className="text-[#2383C2]" size={15} />
          <span className="text-[12px] font-bold text-slate-800 dark:text-gray-100 tracking-wide uppercase">
            Detalle Solicitud Diferencias — Folio {factura.folio}
          </span>
        </div>
      </header>

      {/* MÉTRICAS PRINCIPALES */}
      <div className="px-3 py-2 bg-slate-100/60 dark:bg-gray-900/40 border-b border-slate-200 dark:border-gray-700 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 shrink-0">
        <div className="px-2.5 py-1.5 rounded bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 flex flex-col justify-between">
          <span className="text-[9px] uppercase font-bold text-slate-400 dark:text-gray-500 flex items-center gap-1">
            <Hash size={11} className="text-[#2383C2]" /> Folio
          </span>
          <span className="text-[11px] font-bold text-slate-800 dark:text-gray-100 truncate mt-0.5">{factura.folio}</span>
        </div>

        <div className="px-2.5 py-1.5 rounded bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 flex flex-col justify-between">
          <span className="text-[9px] uppercase font-bold text-slate-400 dark:text-gray-500 flex items-center gap-1">
            <Calendar size={11} className="text-[#2383C2]" /> Fecha Emisión
          </span>
          <span className="text-[11px] font-bold text-slate-800 dark:text-gray-100 truncate mt-0.5">{formatearFechaEmision(factura.fchEmis)}</span>
        </div>

        <div className="px-2.5 py-1.5 rounded bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 flex flex-col justify-between">
          <span className="text-[9px] uppercase font-bold text-slate-400 dark:text-gray-500 flex items-center gap-1">
            <Tag size={11} className="text-[#2383C2]" /> Ref. (OC)
          </span>
          <span className="text-[11px] font-bold text-slate-800 dark:text-gray-100 truncate mt-0.5">
            {factura.folioRef || "N/A"}
          </span>
        </div>

        <div className="px-2.5 py-1.5 rounded bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 flex flex-col justify-between">
          <span className="text-[9px] uppercase font-bold text-slate-400 dark:text-gray-500 flex items-center gap-1">
            <DollarSign size={11} className="text-[#2383C2]" /> Total Neto
          </span>
          <span className="text-[11px] font-bold text-slate-800 dark:text-gray-100 truncate mt-0.5">${parseInt(factura.total || 0).toLocaleString('es-CL')}</span>
        </div>

        <div className="px-2.5 py-1.5 rounded bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 flex flex-col justify-between">
          <span className="text-[9px] uppercase font-bold text-slate-400 dark:text-gray-500 flex items-center gap-1">
            <Activity size={11} className="text-[#2383C2]" /> Estado
          </span>
          <div className="mt-0.5">{renderBadgeEstadoGeneral(factura.estado)}</div>
        </div>
      </div>

      {/* RECEPTOR */}
      <div className="px-3 py-1.5 bg-white dark:bg-gray-800 border-b border-slate-200 dark:border-gray-700 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 truncate">
          <Building2 size={13} className="text-[#2383C2] shrink-0" />
          <span className="text-[9px] font-bold text-slate-400 dark:text-gray-500 uppercase">Receptor:</span>
          <span className="text-[11px] font-medium text-slate-800 dark:text-gray-200 truncate">{factura.rznSoc}</span>
        </div>
        <span className="text-[10px] text-slate-400 font-semibold shrink-0">
          Total ítems: <strong className="text-slate-700 dark:text-gray-200">{detallesProcesados.length}</strong>
        </span>
      </div>

      {/* TABLA DE DETALLES */}
      <div className="flex-grow overflow-auto">
        <table className="w-full text-left text-[11px] border-collapse min-w-[1300px]">
          <thead className="bg-slate-100 dark:bg-gray-900 sticky top-0 z-10 shadow-xs">
            <tr className="text-slate-600 dark:text-gray-400 uppercase font-bold text-[10px]">
              <th className="py-1.5 px-2 border-b border-r border-slate-200 dark:border-gray-700 w-10 text-center">#</th>
              <th className="py-1.5 px-2 border-b border-r border-slate-200 dark:border-gray-700 w-24">Cód. Factura</th>
              <th className="py-1.5 px-2 border-b border-r border-slate-200 dark:border-gray-700">Descripción</th>
              <th className="py-1.5 px-2 border-b border-r border-slate-200 dark:border-gray-700 w-16 text-center">Cant.</th>
              <th className="py-1.5 px-2 border-b border-r border-slate-200 dark:border-gray-700 w-16 text-center">Unidad</th>
              <th className="py-1.5 px-2 border-b border-r border-slate-200 dark:border-gray-700 w-24 text-right">P. Unitario</th>
              <th className="py-1.5 px-2 border-b border-r border-slate-200 dark:border-gray-700 w-24 text-right">Total Línea</th>
              <th className="py-1.5 px-2 border-b border-r border-slate-200 dark:border-gray-700 w-28 bg-slate-200/60 dark:bg-gray-800/80 text-slate-800 dark:text-gray-200">Cód. Maestro</th>
              <th className="py-1.5 px-2 border-b border-r border-slate-200 dark:border-gray-700 w-24 bg-slate-200/60 dark:bg-gray-800/80 text-right text-slate-800 dark:text-gray-200">Precio Maestro</th>
              <th className="py-1.5 px-2 border-b border-r border-slate-200 dark:border-gray-700 w-24 bg-blue-100/70 dark:bg-blue-950/60 text-right text-blue-900 dark:text-blue-200">Precio OC</th>
              <th className="py-1.5 px-2 border-b border-r border-slate-200 dark:border-gray-700 w-20 bg-blue-100/70 dark:bg-blue-950/60 text-center text-blue-900 dark:text-blue-200">Cantidad OC</th>
              <th className="py-1.5 px-2 border-b border-r border-slate-200 dark:border-gray-700 w-36 bg-blue-100/70 dark:bg-blue-950/60 text-center text-blue-900 dark:text-blue-200">Vincu OC</th>
              <th className="py-1.5 px-2 border-b border-slate-200 dark:border-gray-700 w-28 bg-slate-200/60 dark:bg-gray-800/80 text-center text-slate-800 dark:text-gray-200">Estado Ítem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-gray-700/60 bg-white dark:bg-gray-800">
            {detallesProcesados.length === 0 ? (
              <tr>
                <td colSpan="13" className="py-6 text-center text-slate-400 dark:text-gray-500 text-xs">
                  Esta factura no posee ítems cargados.
                </td>
              </tr>
            ) : (
              detallesProcesados.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-gray-700/40">
                  <td className="py-1 px-2 border-b border-r border-slate-200 dark:border-gray-700/70 text-slate-500 text-center font-bold">{idx + 1}</td>
                  <td className="py-1 px-2 border-b border-r border-slate-200 dark:border-gray-700/70 font-mono text-slate-500">{item.codigo || '-'}</td>
                  <td className="py-1 px-2 border-b border-r border-slate-200 dark:border-gray-700/70 text-slate-800 dark:text-gray-200 font-medium">{item.nombre}</td>
                  <td className="py-1 px-2 border-b border-r border-slate-200 dark:border-gray-700/70 text-center">{item.cantidad}</td>
                  <td className="py-1 px-2 border-b border-r border-slate-200 dark:border-gray-700/70 text-center text-[10px] uppercase">{item.unidad || '-'}</td>
                  <td className="py-1 px-2 border-b border-r border-slate-200 dark:border-gray-700/70 text-right">${parseInt(item.precio || 0).toLocaleString('es-CL')}</td>
                  <td className="py-1 px-2 border-b border-r border-slate-200 dark:border-gray-700/70 text-right font-bold">${parseInt(item.monto || 0).toLocaleString('es-CL')}</td>
                  <td className="py-1 px-2 border-b border-r border-slate-200 dark:border-gray-700/70 font-mono font-semibold bg-slate-50/50 dark:bg-gray-900/30">{item.codigoMaestro || '-'}</td>
                  <td className="py-1 px-2 border-b border-r border-slate-200 dark:border-gray-700/70 font-mono text-right font-semibold bg-slate-50/50 dark:bg-gray-900/30">
                    {item.precioMaestro !== undefined && item.precioMaestro !== null ? `$${parseInt(item.precioMaestro || 0).toLocaleString('es-CL')}` : '-'}
                  </td>
                  <td className="py-1 px-2 border-b border-r border-slate-200 dark:border-gray-700/70 font-mono text-right font-semibold bg-blue-50/40 dark:bg-blue-950/20 text-blue-900 dark:text-blue-300">
                    {item.precioOC !== null && item.precioOC !== undefined
                      ? `$${parseInt(item.precioOC).toLocaleString('es-CL')}`
                      : '-'
                    }
                  </td>
                  <td className="py-1 px-2 border-b border-r border-slate-200 dark:border-gray-700/70 text-center font-mono font-semibold bg-blue-50/40 dark:bg-blue-950/20 text-blue-900 dark:text-blue-300">
                    {item.cantidadOC !== null && item.cantidadOC !== undefined ? item.cantidadOC : '-'}
                  </td>
                  <td className="py-1 px-2 border-b border-r border-slate-200 dark:border-gray-700/70 text-center bg-blue-50/40 dark:bg-blue-950/20">
                    <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold whitespace-nowrap ${item.vincuOCTexto === "Sin diferencias"
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                        : item.vincuOCTexto === "Sin coincidencia en OC"
                          ? "bg-slate-100 text-slate-500 dark:bg-gray-700 dark:text-gray-400"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                      }`}>
                      {item.vincuOCTexto || "-"}
                    </span>
                  </td>
                  <td className="py-1 px-2 border-b border-slate-200 dark:border-gray-700 text-center bg-slate-50/50 dark:bg-gray-900/30">
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${item.estadoItem === 'Vinculado'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                        : item.estadoItem === 'Diferencia'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300'
                          : 'bg-slate-100 text-slate-800 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                      {item.estadoItem || 'Pendiente'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// COMPONENTE PRINCIPAL
const SolicitudDiferencias = () => {
  const [facturas, setFacturas] = useState([]);
  const [aniosDisponibles, setAniosDisponibles] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [filtroAnio, setFiltroAnio] = useState('');
  const [loading, setLoading] = useState(false);

  // Estado para la factura seleccionada
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

  // Manejo de vista
  const handleVerDetalles = (factura) => setFacturaSeleccionada(factura);
  const handleVolverALista = () => setFacturaSeleccionada(null);

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
      {/* SI HAY UNA FACTURA SELECCIONADA SE MUESTRA EL DETALLE COMPLETO */}
      {facturaSeleccionada ? (
        <DetalleSolicitudDiferencias
          factura={facturaSeleccionada}
          onVolver={handleVolverALista}
          formatearFechaEmision={formatearFechaEmision}
          renderBadgeEstadoGeneral={renderBadgeEstadoGeneral}
        />
      ) : (
        <>
          {/* CABECERA DE LA TABLA PRINCIPAL */}
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
                          onDoubleClick={() => handleVerDetalles(f)}
                          className="border-l-2 border-transparent hover:border-amber-500 hover:bg-amber-50/30 dark:hover:bg-amber-950/20 transition-colors cursor-pointer"
                          title="Doble clic para ver el detalle de ítems"
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
                                handleVerDetalles(f);
                              }}
                              className="p-1 text-slate-500 hover:text-amber-600 dark:text-gray-400 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-gray-700 rounded transition-colors"
                              title="Visualizar detalles del documento"
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

export default SolicitudDiferencias;