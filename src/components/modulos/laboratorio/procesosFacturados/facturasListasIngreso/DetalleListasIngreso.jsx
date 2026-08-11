import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  FileText,
  Calendar,
  Hash,
  Building2,
  DollarSign,
  Receipt,
  Tag,
  Activity,
  CalendarDays,
  FileCheck,
  X
} from 'lucide-react';
import { useToast } from '../../../../../context/ToastContext';
import { doc, updateDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../../../../../firebaseConfig';

const DetalleListasIngreso = ({
  factura,
  onVolver,
  formatearFechaEmision,
  renderBadgeEstadoGeneral,
  onActualizarFactura
}) => {
  const { showToast } = useToast();

  const obtenerFechaActual = () => {
    const hoy = new Date();
    const anio = hoy.getFullYear();
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    const dia = String(hoy.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
  };

  const [panelActaAbierto, setPanelActaAbierto] = useState(false);
  const [numeroOrden, setNumeroOrden] = useState('');
  const [numeroActa, setNumeroActa] = useState('');
  const [numeroSalida, setNumeroSalida] = useState('');
  const [fechaActa, setFechaActa] = useState(obtenerFechaActual());
  const [fechaSalida, setFechaSalida] = useState(obtenerFechaActual());
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (factura) {
      setNumeroOrden(factura.numeroOrden || factura.orden || factura.numOrden || '');
      setNumeroActa(factura.numeroActa || factura.nroActa || '');
      setNumeroSalida(factura.numeroSalida || factura.nroSalida || '');
      setFechaActa(factura.fechaActa || factura.fchActa || obtenerFechaActual());
      setFechaSalida(factura.fechaSalida || factura.fchSalida || obtenerFechaActual());
    }
  }, [factura]);

  if (!factura) return null;

  const parseMontoToFloat = (valor) => {
    if (valor === undefined || valor === null || valor === '') return 0;
    if (typeof valor === 'number') return valor;
    const strVal = String(valor).replace(/[^0-9,-]/g, '').replace(',', '.');
    return parseFloat(strVal) || 0;
  };

  const formatearMoneda = (valor) => {
    const monto = parseMontoToFloat(valor);
    return `$${Math.round(monto).toLocaleString('es-CL')}`;
  };

  const observaciones =
    factura.observacionDiferencia ||
    factura.motivo ||
    factura.observacion ||
    'No se registraron observaciones adicionales para esta factura.';

  const detalles = factura.detalles || [];

  const handleFinalizarActa = async () => {
    if (!numeroOrden.trim() && !numeroActa.trim() && !numeroSalida.trim()) {
      showToast('Debe ingresar al menos el Número de Orden, Acta o Salida', 'warning');
      return;
    }

    if (!factura.anio || !factura.mesId || !factura.id) {
      showToast('No se pudo determinar la ubicación del documento en la base de datos', 'error');
      return;
    }

    try {
      setGuardando(true);

      const datosActa = {
        numeroOrden,
        numeroActa,
        numeroSalida,
        fechaActa,
        fechaSalida
      };

      const refDocumento = doc(
        db,
        'laboratorio_facturasXml',
        factura.anio,
        'meses',
        factura.mesId,
        'documentos',
        factura.id
      );

      await updateDoc(refDocumento, datosActa);

      try {
        const currentUser = auth.currentUser;
        const usuarioInfo = {
          uid: currentUser?.uid || "desconocido",
          email: currentUser?.email || "usuario_anonimo",
          nombre: currentUser?.displayName || currentUser?.email?.split('@')[0] || "Usuario"
        };

        const estadoAnterior = factura.estado || 'Registrado';
        const estadoNuevo = 'Acta Ingresada'; // O el estado que corresponda

        const logsRef = collection(refDocumento, "logs");
        await addDoc(logsRef, {
          accion: "ACTA INGRESADA",
          detalle: `Datos de recepción registrados para el folio ${factura.folio || factura.id}\nOrden: ${numeroOrden || 'N/A'}\nActa: ${numeroActa || 'N/A'}\nSalida: ${numeroSalida || 'N/A'}\nEstado: ${estadoAnterior} -> ${estadoNuevo}`,
          resumen: {
            numeroOrden: numeroOrden || '-',
            numeroActa: numeroActa || '-',
            numeroSalida: numeroSalida || '-',
            fechaActa: fechaActa || '-',
            fechaSalida: fechaSalida || '-'
          },
          fechaHora: new Date().toLocaleString('es-CL'),
          timestamp: serverTimestamp(),
          usuario: usuarioInfo
        });
      } catch (logError) {
        console.error("Error al escribir log de recepción:", logError);
      }

      showToast('Datos guardados exitosamente', 'success');

      if (onActualizarFactura) {
        onActualizarFactura({ ...factura, ...datosActa });
      }

      setPanelActaAbierto(false);
    } catch (error) {
      console.error('Error al guardar datos:', error);
      showToast('Hubo un error al guardar los datos en la base de datos', 'error');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="relative flex flex-col h-full w-full bg-white dark:bg-gray-800 overflow-hidden font-sans">
      <header className="bg-white dark:bg-gray-800 border-b border-slate-200 dark:border-gray-700 px-3 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={onVolver}
            className="p-1 hover:bg-slate-100 dark:hover:bg-gray-700 rounded text-slate-600 dark:text-gray-300 flex items-center gap-1 text-[11px] font-medium transition-colors cursor-pointer"
            title="Volver a la lista"
          >
            <ArrowLeft size={15} className="text-[#2383C2]" />
            <span>Volver</span>
          </button>
          <span className="text-slate-300 dark:text-gray-600">|</span>
          <FileText className="text-[#2383C2]" size={16} />
          <span className="text-[12px] font-bold text-slate-800 dark:text-gray-100 tracking-wide uppercase">
            Detalle Lista de Ingreso — Folio N° {factura.folio}
          </span>
        </div>
      </header>

      <div className="px-3 py-2 bg-slate-100/60 dark:bg-gray-900/40 border-b border-slate-200 dark:border-gray-700 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 shrink-0">
        <div className="px-2.5 py-1.5 rounded bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 flex flex-col justify-between">
          <span className="text-[9px] uppercase font-bold text-slate-400 dark:text-gray-500 flex items-center gap-1">
            <Hash size={11} className="text-[#2383C2]" /> Folio
          </span>
          <span className="text-[11px] font-bold text-slate-800 dark:text-gray-100 truncate mt-0.5">
            #{factura.folio}
          </span>
        </div>

        <div className="px-2.5 py-1.5 rounded bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 flex flex-col justify-between">
          <span className="text-[9px] uppercase font-bold text-slate-400 dark:text-gray-500 flex items-center gap-1">
            <Calendar size={11} className="text-[#2383C2]" /> Fecha Emisión
          </span>
          <span className="text-[11px] font-bold text-slate-800 dark:text-gray-100 truncate mt-0.5">
            {formatearFechaEmision
              ? formatearFechaEmision(factura.fchEmis)
              : factura.fchEmis || '-'}
          </span>
        </div>

        <div className="px-2.5 py-1.5 rounded bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 flex flex-col justify-between">
          <span className="text-[9px] uppercase font-bold text-slate-400 dark:text-gray-500 flex items-center gap-1">
            <CalendarDays size={11} className="text-[#2383C2]" /> Mes Imputado
          </span>
          <span className="text-[11px] font-bold text-slate-800 dark:text-gray-100 truncate mt-0.5 capitalize">
            {factura.mesImputado || factura.mes_imputado || '-'}
          </span>
        </div>

        <div className="px-2.5 py-1.5 rounded bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 flex flex-col justify-between">
          <span className="text-[9px] uppercase font-bold text-slate-400 dark:text-gray-500 flex items-center gap-1">
            <Tag size={11} className="text-[#2383C2]" /> Ref. (OC)
          </span>
          <span className="text-[11px] font-bold text-slate-800 dark:text-gray-100 truncate mt-0.5 font-mono">
            {factura.folioRef || 'Sin Referencia'}
          </span>
        </div>

        <div className="px-2.5 py-1.5 rounded bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 flex flex-col justify-between">
          <span className="text-[9px] uppercase font-bold text-slate-400 dark:text-gray-500 flex items-center gap-1">
            <DollarSign size={11} className="text-[#2383C2]" /> Total Neto
          </span>
          <span className="text-[11px] font-bold text-slate-800 dark:text-gray-100 truncate mt-0.5">
            {formatearMoneda(factura.total)}
          </span>
        </div>

        <div className="px-2.5 py-1.5 rounded bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 flex flex-col justify-between">
          <span className="text-[9px] uppercase font-bold text-slate-400 dark:text-gray-500 flex items-center gap-1">
            <Activity size={11} className="text-[#2383C2]" /> Estado
          </span>
          <div className="mt-0.5 truncate">
            {renderBadgeEstadoGeneral ? (
              renderBadgeEstadoGeneral(factura.estado)
            ) : (
              <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-800 dark:bg-gray-700 dark:text-gray-300">
                {factura.estado || 'Registrado'}
              </span>
            )}
          </div>
        </div>

        <div className="px-2.5 py-1.5 rounded bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 flex flex-col justify-between">
          <span className="text-[9px] uppercase font-bold text-slate-400 dark:text-gray-500 flex items-center gap-1">
            <FileCheck size={11} className="text-[#2383C2]" /> Documento
          </span>
          <button
            type="button"
            onClick={() => setPanelActaAbierto(true)}
            className="mt-0.5 w-full py-1 px-2 bg-[#2383C2] hover:bg-[#1b6b9f] text-white rounded border border-[#1b6b9f] text-[10px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer shadow-xs"
            title="Añadir Acta"
          >
            <FileCheck size={11} />
            <span>Añadir Acta</span>
          </button>
        </div>
      </div>

      <div className="px-3 py-1.5 bg-white dark:bg-gray-800 border-b border-slate-200 dark:border-gray-700 flex items-center justify-between shrink-0 text-xs">
        <div className="flex items-center gap-2 truncate">
          <Building2 size={13} className="text-[#2383C2] shrink-0" />
          <span className="text-[9px] font-bold text-slate-400 dark:text-gray-500 uppercase">
            Proveedor:
          </span>
          <span className="text-[11px] font-semibold text-slate-800 dark:text-gray-200 truncate" title={factura.rznSoc}>
            {factura.rznSoc || 'Sin Razón Social'}
          </span>
          <span className="text-slate-400 dark:text-gray-500 text-[11px]">
            (RUT: {factura.rutEmisor || 'N/A'})
          </span>
        </div>
        <span className="text-[10px] text-slate-400 font-semibold shrink-0">
          Total Ítems: <strong className="text-slate-700 dark:text-gray-200">{detalles.length}</strong>
        </span>
      </div>

      <div className="flex-grow flex flex-col min-h-0 p-3 space-y-3 overflow-hidden">
        <div className="bg-slate-50 dark:bg-gray-900/50 border border-slate-200 dark:border-gray-700 rounded-md p-3 shrink-0 max-h-32 overflow-y-auto">
          <h4 className="font-semibold text-slate-800 dark:text-gray-200 mb-1 flex items-center gap-1.5 text-xs">
            <Receipt size={14} className="text-[#2383C2] shrink-0" />
            <span>Observaciones o Comentarios</span>
          </h4>
          <p className="text-slate-700 dark:text-gray-300 text-[11px] leading-relaxed whitespace-pre-wrap">
            {observaciones}
          </p>
        </div>

        <div className="border border-slate-200 dark:border-gray-700 rounded-md overflow-auto flex-1 min-h-0 bg-white dark:bg-gray-800">
          <table className="w-full text-left text-[11px] border-collapse min-w-[1400px]">
            <thead className="bg-slate-100 dark:bg-gray-900 sticky top-0 z-10 shadow-xs">
              <tr className="text-slate-600 dark:text-gray-400 uppercase font-bold text-[10px]">
                <th className="py-1.5 px-2 border-b border-r border-slate-200 dark:border-gray-700 w-10 text-center">#</th>
                <th className="py-1.5 px-2 border-b border-r border-slate-200 dark:border-gray-700 w-28">Cód. Factura</th>
                <th className="py-1.5 px-2 border-b border-r border-slate-200 dark:border-gray-700">Descripción Factura</th>
                <th className="py-1.5 px-2 border-b border-r border-slate-200 dark:border-gray-700 w-20 text-center">Cant. Factura</th>
                <th className="py-1.5 px-2 border-b border-r border-slate-200 dark:border-gray-700 w-24 text-right">Precio Factura</th>
                <th className="py-1.5 px-2 border-b border-r border-slate-200 dark:border-gray-700 w-24 text-right">Total Línea</th>
                <th className="py-1.5 px-2 border-b border-r border-slate-200 dark:border-gray-700 w-28 bg-blue-100/70 dark:bg-blue-950/60 text-slate-900 dark:text-blue-200">Cód. Maestro</th>
                <th className="py-1.5 px-2 border-b border-r border-slate-200 dark:border-gray-700 bg-blue-100/70 dark:bg-blue-950/60 text-slate-900 dark:text-blue-200">Descripción Maestro</th>
                <th className="py-1.5 px-2 border-b border-r border-slate-200 dark:border-gray-700 w-28 bg-blue-100/70 dark:bg-blue-950/60 text-slate-900 dark:text-blue-200">Artículo OC</th>
                <th className="py-1.5 px-2 border-b border-r border-slate-200 dark:border-gray-700 w-20 bg-blue-100/70 dark:bg-blue-950/60 text-center text-blue-900 dark:text-blue-200">Cant. OC</th>
                <th className="py-1.5 px-2 border-b border-r border-slate-200 dark:border-gray-700 w-24 bg-blue-100/70 dark:bg-blue-950/60 text-right text-blue-900 dark:text-blue-200">Precio OC</th>
                <th className="py-1.5 px-2 border-b border-slate-200 dark:border-gray-700 w-36 text-center">Estado Item</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-gray-700/60 bg-white dark:bg-gray-800">
              {detalles.length === 0 ? (
                <tr>
                  <td colSpan="12" className="py-6 text-center text-slate-400 dark:text-gray-500 text-xs">
                    Esta factura no posee ítems cargados.
                  </td>
                </tr>
              ) : (
                detalles.map((item, idx) => (
                  <tr key={item.id || item.codigo || idx} className="hover:bg-slate-50 dark:hover:bg-gray-700/40">
                    <td className="py-1 px-2 border-b border-r border-slate-200 dark:border-gray-700/70 text-slate-500 text-center font-bold">{idx + 1}</td>
                    <td className="py-1 px-2 border-b border-r border-slate-200 dark:border-gray-700/70 font-mono text-slate-500">{item.codigo || '-'}</td>
                    <td className="py-1 px-2 border-b border-r border-slate-200 dark:border-gray-700/70 text-slate-800 dark:text-gray-200 font-medium">{item.nombre || item.descripcion}</td>
                    <td className="py-1 px-2 border-b border-r border-slate-200 dark:border-gray-700/70 text-center font-mono">{item.cantidad}</td>
                    <td className="py-1 px-2 border-b border-r border-slate-200 dark:border-gray-700/70 text-right font-mono">{formatearMoneda(item.precio)}</td>
                    <td className="py-1 px-2 border-b border-r border-slate-200 dark:border-gray-700/70 text-right font-bold">{formatearMoneda(item.monto || item.precio * item.cantidad)}</td>
                    <td className="py-1 px-2 border-b border-r border-slate-200 dark:border-gray-700/70 font-mono text-slate-600 dark:text-gray-300 bg-blue-50/30 dark:bg-blue-950/20">{item.codigoMaestro || '-'}</td>
                    <td className="py-1 px-2 border-b border-r border-slate-200 dark:border-gray-700/70 text-slate-800 dark:text-gray-200 bg-blue-50/30 dark:bg-blue-950/20 font-medium">{item.descripcionMaestro || '-'}</td>
                    <td className="py-1 px-2 border-b border-r border-slate-200 dark:border-gray-700/70 font-mono text-slate-600 dark:text-gray-300 bg-blue-50/30 dark:bg-blue-950/20">{item.articuloOC || '-'}</td>
                    <td className="py-1 px-2 border-b border-r border-slate-200 dark:border-gray-700/70 text-center font-mono bg-blue-50/30 dark:bg-blue-950/20 text-blue-900 dark:text-blue-300">{item.cantidadOC ?? '-'}</td>
                    <td className="py-1 px-2 border-b border-r border-slate-200 dark:border-gray-700/70 text-right font-mono bg-blue-50/30 dark:bg-blue-950/20 text-blue-900 dark:text-blue-300">{item.precioOC !== undefined ? formatearMoneda(item.precioOC) : '-'}</td>
                    <td className="py-1 px-2 border-b border-slate-200 dark:border-gray-700 text-center">
                      <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold whitespace-nowrap bg-slate-100 text-slate-700 dark:bg-gray-700 dark:text-gray-300">
                        {item.vincuOCTexto || item.estadoItem || 'Registrado'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {panelActaAbierto && (
        <div className="absolute inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-xs transition-opacity">
          <div className="w-full max-w-sm h-full bg-white dark:bg-gray-800 border-l border-slate-200 dark:border-gray-700 shadow-xl flex flex-col justify-between p-4 animate-in slide-in-from-right duration-200">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <FileCheck size={18} className="text-[#2383C2]" />
                  <h3 className="text-xs font-bold uppercase tracking-wide text-slate-800 dark:text-gray-100">
                    Añadir Datos de Recepción
                  </h3>
                </div>
                <button
                  onClick={() => setPanelActaAbierto(false)}
                  className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-gray-200 hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="mt-4 space-y-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-gray-300">Número de Orden</label>
                  <input
                    type="text"
                    value={numeroOrden}
                    onChange={(e) => setNumeroOrden(e.target.value)}
                    placeholder="Ej. OC-1234"
                    className="h-8 px-2.5 rounded border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-slate-800 dark:text-gray-100 text-xs outline-none focus:border-[#2383C2]"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-gray-300">Número de Acta</label>
                  <input
                    type="text"
                    value={numeroActa}
                    onChange={(e) => setNumeroActa(e.target.value)}
                    placeholder="Ej. ACT-001"
                    className="h-8 px-2.5 rounded border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-slate-800 dark:text-gray-100 text-xs outline-none focus:border-[#2383C2]"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-gray-300">Número de Salida</label>
                  <input
                    type="text"
                    value={numeroSalida}
                    onChange={(e) => setNumeroSalida(e.target.value)}
                    placeholder="Ej. SAL-998"
                    className="h-8 px-2.5 rounded border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-slate-800 dark:text-gray-100 text-xs outline-none focus:border-[#2383C2]"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-gray-300">Fecha Acta</label>
                  <input
                    type="date"
                    value={fechaActa}
                    onChange={(e) => setFechaActa(e.target.value)}
                    className="h-8 px-2.5 rounded border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-slate-800 dark:text-gray-100 text-xs outline-none focus:border-[#2383C2]"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-gray-300">Fecha de Salida</label>
                  <input
                    type="date"
                    value={fechaSalida}
                    onChange={(e) => setFechaSalida(e.target.value)}
                    className="h-8 px-2.5 rounded border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-slate-800 dark:text-gray-100 text-xs outline-none focus:border-[#2383C2]"
                  />
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-gray-700 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPanelActaAbierto(false)}
                disabled={guardando}
                className="px-3 py-1.5 rounded border border-slate-300 dark:border-gray-600 text-slate-600 dark:text-gray-300 text-xs font-medium hover:bg-slate-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleFinalizarActa}
                disabled={guardando}
                className="px-3 py-1.5 rounded bg-[#2383C2] hover:bg-[#1b6b9f] text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
              >
                {guardando ? 'Guardando...' : 'Finalizar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DetalleListasIngreso;