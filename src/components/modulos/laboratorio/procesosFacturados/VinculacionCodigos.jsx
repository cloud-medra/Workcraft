// src/components/facturas/VinculacionCodigos.jsx
import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore'; 
import { db, auth } from '../../../../firebaseConfig'; // <-- Agregamos 'auth' aquí
import { 
  ClipboardList, 
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
  Activity,
  Link as LinkIcon
} from 'lucide-react';
import { useToast } from '../../../../context/ToastContext';
import { useModal } from '../../../../context/ModalContext';
import { useGranularPermission } from '../../../../hooks/useGranularPermission';

const VinculacionCodigos = () => {
  const [facturas, setFacturas] = useState([]);
  const [aniosDisponibles, setAniosDisponibles] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [filtroAnio, setFiltroAnio] = useState('');
  const [loading, setLoading] = useState(false);

  // Estado para controlar la factura seleccionada en vista detalle
  const [facturaSeleccionada, setFacturaSeleccionada] = useState(null);

  const { showToast } = useToast();
  const { confirmAction } = useModal();
  const { hasPermission } = useGranularPermission();

  const PATH_VISTA = "/laboratorio/controlFactura";
  const COL_BASE = "laboratorio_facturasXml";
  const COL_MAESTRO = "laboratorio_codigos";

  // Formatear fecha dd/mm/yyyy
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

  // Cargar facturas en estados: Proceso Iniciado, Falta Vinculación, Diferencia Precios
  const cargarFacturasEnProceso = async () => {
    if (!filtroAnio) {
      setFacturas([]);
      return;
    }

    setLoading(true);
    try {
      const mesesSnap = await getDocs(collection(db, COL_BASE, filtroAnio, "meses"));
      let docsAcumulados = [];

      const estadosPermitidos = ["Proceso Iniciado", "Falta Vinculación", "Diferencia Precios"];

      for (const mesDoc of mesesSnap.docs) {
        const mesId = mesDoc.id;
        const docsSnap = await getDocs(collection(db, COL_BASE, filtroAnio, "meses", mesId, "documentos"));
        
        docsSnap.docs.forEach(d => {
          const data = d.data();
          if (estadosPermitidos.includes(data.estado)) {
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
      showToast("Error al obtener las facturas pendientes de vinculación", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarFacturasEnProceso();
  }, [filtroAnio]);

  // Selección de factura para visualización en pantalla
  const handleVerDetalles = (factura) => {
    setFacturaSeleccionada(factura);
  };

  // Volver a la lista general
  const handleVolverALista = () => {
    setFacturaSeleccionada(null);
  };

  // Lógica de Vincular Códigos con registro en subcolección 'logs'
  const handleVincularFactura = () => {
    if (!facturaSeleccionada || !facturaSeleccionada.detalles?.length) {
      showToast("La factura no contiene ítems para vincular", "error");
      return;
    }

    confirmAction(
      "Confirmar Vinculación",
      `¿Está seguro de procesar la vinculación para el folio ${facturaSeleccionada.folio}?`,
      async () => {
        try {
          // Capturamos el estado general antes de modificarlo
          const estadoAnteriorGeneral = facturaSeleccionada.estado || "Proceso Iniciado";

          // 1. Obtener catálogo maestro de códigos
          const codigosSnap = await getDocs(collection(db, COL_MAESTRO));
          
          // 2. Mapear por Referencia (normalizada)
          const refMap = new Map();
          codigosSnap.docs.forEach(d => {
            const itemMaestro = d.data();
            if (itemMaestro.referencia) {
              refMap.set(String(itemMaestro.referencia).trim().toLowerCase(), itemMaestro);
            }
          });

          // 3. Evaluar ítems de la factura
          let faltantesCount = 0;
          let diferenciasCount = 0;
          let vinculadosOKCount = 0;

          const nuevosDetalles = facturaSeleccionada.detalles.map(item => {
            const codFactura = item.codigo ? String(item.codigo).trim().toLowerCase() : '';
            const coincidencia = refMap.get(codFactura);

            if (!coincidencia) {
              faltantesCount++;
              return {
                ...item,
                codigoMaestro: '-',
                precioMaestro: 0,
                estadoItem: 'No Vinculado'
              };
            }

            const precioFactura = Number(item.precio || 0);
            const precioMaestro = Number(coincidencia.precio || 0);

            if (precioFactura !== precioMaestro) {
              diferenciasCount++;
              return {
                ...item,
                codigoMaestro: coincidencia.codigo || '-',
                precioMaestro: precioMaestro,
                estadoItem: 'Con Diferencias'
              };
            }

            vinculadosOKCount++;
            return {
              ...item,
              codigoMaestro: coincidencia.codigo || '-',
              precioMaestro: precioMaestro,
              estadoItem: 'Vinculado'
            };
          });

          // 4. Determinar nuevo Estado General de la Factura
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

          const ahora = new Date();
          const fechaHoraString = ahora.toLocaleString('es-CL');

          // Referencia del documento en Firestore
          const docRef = doc(
            db, 
            COL_BASE, 
            filtroAnio, 
            "meses", 
            facturaSeleccionada.mesId, 
            "documentos", 
            facturaSeleccionada.id
          );

          // 5. Actualizar el documento principal
          await updateDoc(docRef, {
            detalles: nuevosDetalles,
            estado: nuevoEstadoGeneral
          });

          // 6. Registrar evento en la subcolección 'logs' incluyendo ambos estados
          try {
            const logsRef = collection(docRef, "logs");
            await addDoc(logsRef, {
              accion: "VINCULACION_CODIGOS",
              detalle: `Vinculación procesada para el folio ${facturaSeleccionada.folio || facturaSeleccionada.id}`,
              estadoAnterior: estadoAnteriorGeneral, // <-- Asegurado aquí
              nuevoEstado: nuevoEstadoGeneral,       // <-- Asegurado aquí
              resumen: {
                vinculadosOK: vinculadosOKCount,
                conDiferencias: diferenciasCount,
                sinVincular: faltantesCount
              },
              fechaHora: fechaHoraString,
              timestamp: serverTimestamp(),
              usuario: usuarioInfo
            });
          } catch (logError) {
            console.error("Error al escribir log de vinculación:", logError);
          }

          // 7. Actualizar estado local
          const facturaActualizada = {
            ...facturaSeleccionada,
            detalles: nuevosDetalles,
            estado: nuevoEstadoGeneral
          };

          setFacturaSeleccionada(facturaActualizada);
          setFacturas(prev => prev.map(f => f.id === facturaActualizada.id ? facturaActualizada : f));

          showToast(
            `Vinculación guardada: Estado "${nuevoEstadoGeneral}" (${vinculadosOKCount} OK, ${diferenciasCount} Dif., ${faltantesCount} Sin Vincular).`, 
            nuevoEstadoGeneral === "Procesar OC" ? "success" : "info"
          );

        } catch (error) {
          console.error("Error al vincular factura:", error);
          showToast("Error al procesar la vinculación con Códigos Maestro", "error");
        }
      }
    );
  };

  const facturasFiltradas = facturas.filter(f => 
    f.folio?.includes(busqueda) || 
    f.rznSoc?.toLowerCase().includes(busqueda.toLowerCase()) || 
    f.folioRef?.includes(busqueda)
  );

  // Helper para renderizar badges de estado general
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
      
      {/* VISTA DETALLE DE LA FACTURA */}
      {facturaSeleccionada ? (
        <div className="flex flex-col h-full w-full bg-white dark:bg-gray-800">
          
          {/* CABECERA VISTA DETALLE */}
          <header className="bg-white dark:bg-gray-800 border-b border-slate-200 dark:border-gray-700 px-3 py-2 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <button
                onClick={handleVolverALista}
                className="p-1 hover:bg-slate-100 dark:hover:bg-gray-700 rounded text-slate-600 dark:text-gray-300 flex items-center gap-1 text-[11px] font-medium transition-colors"
                title="Volver a la lista"
              >
                <ArrowLeft size={15} className="text-[#2383C2]" />
                <span>Volver</span>
              </button>
              <span className="text-slate-300 dark:text-gray-600">|</span>
              <FileText className="text-[#2383C2]" size={15} />
              <span className="text-[12px] font-bold text-slate-800 dark:text-gray-100 tracking-wide uppercase">
                Detalle Factura Electrónica — Folio {facturaSeleccionada.folio}
              </span>
            </div>
          </header>

          {/* TARJETAS RESUMEN METRICAS (6 COLUMNAS) */}
          <div className="px-3 py-2 bg-slate-100/60 dark:bg-gray-900/40 border-b border-slate-200 dark:border-gray-700 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 shrink-0">
            
            {/* FOLIO */}
            <div className="px-2.5 py-1.5 rounded bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 flex flex-col justify-between">
              <span className="text-[9px] uppercase font-bold text-slate-400 dark:text-gray-500 flex items-center gap-1">
                <Hash size={11} className="text-[#2383C2]" />
                Folio
              </span>
              <span className="text-[11px] font-bold text-slate-800 dark:text-gray-100 truncate mt-0.5">
                {facturaSeleccionada.folio}
              </span>
            </div>

            {/* FECHA EMISIÓN */}
            <div className="px-2.5 py-1.5 rounded bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 flex flex-col justify-between">
              <span className="text-[9px] uppercase font-bold text-slate-400 dark:text-gray-500 flex items-center gap-1">
                <Calendar size={11} className="text-[#2383C2]" />
                Fecha Emisión
              </span>
              <span className="text-[11px] font-bold text-slate-800 dark:text-gray-100 truncate mt-0.5">
                {formatearFechaEmision(facturaSeleccionada.fchEmis)}
              </span>
            </div>

            {/* REF (OC) */}
            <div className="px-2.5 py-1.5 rounded bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 flex flex-col justify-between">
              <span className="text-[9px] uppercase font-bold text-slate-400 dark:text-gray-500 flex items-center gap-1">
                <Tag size={11} className="text-[#2383C2]" />
                Ref. (OC)
              </span>
              <span className="text-[11px] font-bold text-slate-800 dark:text-gray-100 truncate mt-0.5">
                {facturaSeleccionada.folioRef || "N/A"}
              </span>
            </div>

            {/* TOTAL NETO */}
            <div className="px-2.5 py-1.5 rounded bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 flex flex-col justify-between">
              <span className="text-[9px] uppercase font-bold text-slate-400 dark:text-gray-500 flex items-center gap-1">
                <DollarSign size={11} className="text-[#2383C2]" />
                Total Neto
              </span>
              <span className="text-[11px] font-bold text-slate-800 dark:text-gray-100 truncate mt-0.5">
                ${parseInt(facturaSeleccionada.total || 0).toLocaleString('es-CL')}
              </span>
            </div>

            {/* ESTADO GENERAL */}
            <div className="px-2.5 py-1.5 rounded bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 flex flex-col justify-between">
              <span className="text-[9px] uppercase font-bold text-slate-400 dark:text-gray-500 flex items-center gap-1">
                <Activity size={11} className="text-[#2383C2]" />
                Estado General
              </span>
              <div className="mt-0.5">
                {renderBadgeEstadoGeneral(facturaSeleccionada.estado)}
              </div>
            </div>

            {/* BOTÓN VINCULAR */}
            <div className="px-2.5 py-1.5 rounded bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 flex flex-col justify-between">
              <span className="text-[9px] uppercase font-bold text-slate-400 dark:text-gray-500 flex items-center gap-1">
                <LinkIcon size={11} className="text-[#2383C2]" />
                Acción
              </span>
              <button
                onClick={handleVincularFactura}
                className="mt-0.5 w-full h-5 bg-[#2383C2] hover:bg-[#1d6fa5] active:bg-[#175b88] text-white rounded text-[10px] font-bold flex items-center justify-center gap-1 transition-colors shadow-2xs"
              >
                <LinkIcon size={11} />
                <span>Vincular</span>
              </button>
            </div>

          </div>

          {/* DATOS DEL RECEPTOR / PROVEEDOR */}
          <div className="px-3 py-1.5 bg-white dark:bg-gray-800 border-b border-slate-200 dark:border-gray-700 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 truncate">
              <Building2 size={13} className="text-[#2383C2] shrink-0" />
              <span className="text-[9px] font-bold text-slate-400 dark:text-gray-500 uppercase">Receptor:</span>
              <span className="text-[11px] font-medium text-slate-800 dark:text-gray-200 truncate">{facturaSeleccionada.rznSoc}</span>
            </div>
            <span className="text-[10px] text-slate-400 font-semibold shrink-0">
              Total ítems: <strong className="text-slate-700 dark:text-gray-200">{facturaSeleccionada.detalles?.length || 0}</strong>
            </span>
          </div>

          {/* TABLA DE DETALLES/ITEMS */}
          <div className="flex-grow overflow-auto">
            <table className="w-full text-left text-[11px] border-collapse min-w-[1050px]">
              <thead className="bg-slate-100 dark:bg-gray-900 sticky top-0 z-10 shadow-xs">
                <tr className="text-slate-600 dark:text-gray-400 uppercase font-bold text-[10px]">
                  <th className="py-1.5 px-2 border-b border-r border-slate-200 dark:border-gray-700 w-10 text-center">#</th>
                  <th className="py-1.5 px-2 border-b border-r border-slate-200 dark:border-gray-700 w-28">Cód. Factura</th>
                  <th className="py-1.5 px-2 border-b border-r border-slate-200 dark:border-gray-700">Descripción</th>
                  <th className="py-1.5 px-2 border-b border-r border-slate-200 dark:border-gray-700 w-20 text-center">Cant.</th>
                  <th className="py-1.5 px-2 border-b border-r border-slate-200 dark:border-gray-700 w-20 text-center">Unidad</th>
                  <th className="py-1.5 px-2 border-b border-r border-slate-200 dark:border-gray-700 w-28 text-right">P. Unitario</th>
                  <th className="py-1.5 px-2 border-b border-r border-slate-200 dark:border-gray-700 w-28 text-right">Total Línea</th>
                  <th className="py-1.5 px-2 border-b border-r border-slate-200 dark:border-gray-700 w-32 bg-slate-200/60 dark:bg-gray-800/80 text-slate-800 dark:text-gray-200">Cód. Maestro</th>
                  <th className="py-1.5 px-2 border-b border-r border-slate-200 dark:border-gray-700 w-28 bg-slate-200/60 dark:bg-gray-800/80 text-right text-slate-800 dark:text-gray-200">Precio Maestro</th>
                  <th className="py-1.5 px-2 border-b border-slate-200 dark:border-gray-700 w-32 bg-slate-200/60 dark:bg-gray-800/80 text-center text-slate-800 dark:text-gray-200">Estado Ítem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-gray-700/60 bg-white dark:bg-gray-800">
                {facturaSeleccionada.detalles?.length === 0 || !facturaSeleccionada.detalles ? (
                  <tr>
                    <td colSpan="10" className="py-6 text-center text-slate-400 dark:text-gray-500 text-xs">
                      Esta factura no posee ítems cargados.
                    </td>
                  </tr>
                ) : (
                  facturaSeleccionada.detalles.map((item, idx) => (
                    <tr 
                      key={idx} 
                      className="border-l-2 border-transparent hover:border-[#2383C2] hover:bg-slate-50 dark:hover:bg-gray-700/40 transition-colors"
                    >
                      <td className="py-1 px-2 border-b border-r border-slate-200 dark:border-gray-700/70 text-slate-500 dark:text-gray-400 font-bold text-center">
                        {idx + 1}
                      </td>
                      <td className="py-1 px-2 border-b border-r border-slate-200 dark:border-gray-700/70 font-mono text-slate-500 dark:text-gray-400 truncate">
                        {item.codigo || '-'}
                      </td>
                      <td className="py-1 px-2 border-b border-r border-slate-200 dark:border-gray-700/70 text-slate-800 dark:text-gray-200 font-medium">
                        {item.nombre}
                      </td>
                      <td className="py-1 px-2 border-b border-r border-slate-200 dark:border-gray-700/70 text-center text-slate-600 dark:text-gray-300 font-medium">
                        {item.cantidad}
                      </td>
                      <td className="py-1 px-2 border-b border-r border-slate-200 dark:border-gray-700/70 text-center text-slate-500 dark:text-gray-400 uppercase text-[10px]">
                        {item.unidad || '-'}
                      </td>
                      <td className="py-1 px-2 border-b border-r border-slate-200 dark:border-gray-700/70 text-right text-slate-600 dark:text-gray-300">
                        ${parseInt(item.precio || 0).toLocaleString('es-CL')}
                      </td>
                      <td className="py-1 px-2 border-b border-r border-slate-200 dark:border-gray-700/70 text-right font-bold text-slate-800 dark:text-gray-100">
                        ${parseInt(item.monto || 0).toLocaleString('es-CL')}
                      </td>
                      <td className="py-1 px-2 border-b border-r border-slate-200 dark:border-gray-700/70 font-mono text-slate-700 dark:text-gray-300 font-semibold bg-slate-50/50 dark:bg-gray-900/30">
                        {item.codigoMaestro || '-'}
                      </td>
                      <td className="py-1 px-2 border-b border-r border-slate-200 dark:border-gray-700/70 font-mono text-right text-slate-700 dark:text-gray-300 font-semibold bg-slate-50/50 dark:bg-gray-900/30">
                        {item.precioMaestro !== undefined ? `$${parseInt(item.precioMaestro || 0).toLocaleString('es-CL')}` : '-'}
                      </td>
                      <td className="py-1 px-2 border-b border-slate-200 dark:border-gray-700 text-center bg-slate-50/50 dark:bg-gray-900/30">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                          item.estadoItem === 'Vinculado' 
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50' 
                            : item.estadoItem === 'Con Diferencias'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50'
                            : item.estadoItem === 'No Vinculado' || item.estadoItem === 'No encontrado'
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50'
                            : 'bg-slate-100 text-slate-800 dark:bg-gray-700 dark:text-gray-300 border border-slate-200 dark:border-gray-600'
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
      ) : (
        /* VISTA PRINCIPAL (LISTA DE FACTURAS) */
        <>
          {/* CABECERA */}
          <header className="bg-white dark:bg-gray-800 border-b border-slate-200 dark:border-gray-700 px-3 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ClipboardList size={16} className="text-[#2383C2]" />
              <span className="text-[12px] font-normal text-slate-800 dark:text-gray-100 tracking-wide uppercase">
                Vinculación de Códigos (Facturas Pendientes)
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
              onClick={cargarFacturasEnProceso}
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
                  Cargando facturas del año {filtroAnio}...
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
                            ? "No hay facturas pendientes de vinculación para este año." 
                            : "Seleccione un año para visualizar las facturas."}
                        </td>
                      </tr>
                    ) : (
                      facturasFiltradas.map((f) => (
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
                              className="p-1 text-slate-500 hover:text-[#2383C2] dark:text-gray-400 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-gray-700 rounded transition-colors"
                              title="Visualizar factura"
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