// src/components/facturas/IniciarProceso.jsx
import React, { useState, useEffect } from 'react';
import { collection, getDocs, updateDoc, doc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../../../../firebaseConfig';
import { FileText, Search, PlayCircle, CheckSquare, Square } from 'lucide-react';
import { useToast } from '../../../../context/ToastContext';
import { useModal } from '../../../../context/ModalContext';
import { useUser } from '../../../../context/UserContext';
import { useGranularPermission } from '../../../../hooks/useGranularPermission';

const IniciarProceso = () => {
  const [facturas, setFacturas] = useState([]);
  const [aniosDisponibles, setAniosDisponibles] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [filtroAnio, setFiltroAnio] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Selección de filas
  const [seleccionadas, setSeleccionadas] = useState([]);

  const { showToast } = useToast();
  const { confirmAction } = useModal();
  const { userData } = useUser();
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

  // Cargar facturas con estado "Iniciar Ingreso" para el Año seleccionado
  useEffect(() => {
    if (!filtroAnio) {
      setFacturas([]);
      setSeleccionadas([]);
      return;
    }

    const cargarFacturasDelAnio = async () => {
      setLoading(true);
      try {
        const mesesSnap = await getDocs(collection(db, COL_BASE, filtroAnio, "meses"));
        let docsAcumulados = [];

        for (const mesDoc of mesesSnap.docs) {
          const mesId = mesDoc.id;
          const docsSnap = await getDocs(collection(db, COL_BASE, filtroAnio, "meses", mesId, "documentos"));
          
          docsSnap.docs.forEach(d => {
            const data = d.data();
            const estadoActual = data.estado || "Iniciar Ingreso";
            
            if (estadoActual === "Iniciar Ingreso") {
              docsAcumulados.push({
                id: d.id,
                mesId,
                ...data,
                estado: estadoActual
              });
            }
          });
        }

        docsAcumulados.sort((a, b) => new Date(b.fchEmis || 0) - new Date(a.fchEmis || 0));
        setFacturas(docsAcumulados);
        setSeleccionadas([]);
      } catch (error) {
        console.error("Error al cargar facturas para iniciar proceso:", error);
        showToast("Error al obtener las facturas del año", "error");
      } finally {
        setLoading(false);
      }
    };

    cargarFacturasDelAnio();
  }, [filtroAnio]);

  // Selección individual de filas
  const toggleSeleccion = (factura) => {
    setSeleccionadas(prev => {
      const existe = prev.some(item => item.id === factura.id);
      if (existe) {
        return prev.filter(item => item.id !== factura.id);
      } else {
        return [...prev, factura];
      }
    });
  };

  // Selección/deselección masiva
  const toggleSeleccionarTodas = () => {
    if (seleccionadas.length === facturasFiltradas.length) {
      setSeleccionadas([]);
    } else {
      setSeleccionadas([...facturasFiltradas]);
    }
  };

  // Cambiar estado a "Proceso Iniciado" registrando auditoría/logs
  const handleIniciarProceso = () => {
    if (seleccionadas.length === 0) return;

    confirmAction(
      "Iniciar Proceso",
      `¿Desea iniciar el proceso de ${seleccionadas.length} factura(s)?`,
      async () => {
        try {
          const currentUser = auth.currentUser;
          
          // Sanitización estricta utilizando preferentemente Nombre Completo
          const usuarioInfo = {
            uid: currentUser?.uid || "desconocido",
            email: userData?.email || currentUser?.email || "usuario_anonimo",
            nombre: userData?.nombreCompleto || userData?.nombre || currentUser?.displayName || currentUser?.email?.split('@')[0] || "Usuario"
          };

          const ahora = new Date();
          const fechaHoraString = ahora.toLocaleString('es-CL');

          const promesasUpdate = seleccionadas.map(async (f) => {
            const docRef = doc(db, COL_BASE, filtroAnio, "meses", f.mesId, "documentos", f.id);
            
            // 1. Actualizar el documento principal con el nuevo estado "Proceso Iniciado"
            await updateDoc(docRef, {
              estado: "Proceso Iniciado",
              procesoIniciado: {
                fechaHora: fechaHoraString,
                timestamp: serverTimestamp(),
                usuario: usuarioInfo
              }
            });

            // 2. Registrar evento en la subcolección 'logs' protegida con try/catch
            try {
              const logsRef = collection(docRef, "logs");
              await addDoc(logsRef, {
                accion: "INICIO_PROCESO",
                detalle: `El proceso ha iniciado para el folio ${f.folio || f.id}`,
                estadoAnterior: f.estado || "Iniciar Ingreso",
                nuevoEstado: "Proceso Iniciado",
                fechaHora: fechaHoraString,
                timestamp: serverTimestamp(),
                usuario: usuarioInfo
              });
            } catch (logError) {
              console.error(`Error al escribir log para la factura ${f.id}:`, logError);
            }
          });

          await Promise.all(promesasUpdate);

          const idsProcesados = new Set(seleccionadas.map(f => f.id));
          setFacturas(prev => prev.filter(f => !idsProcesados.has(f.id)));
          setSeleccionadas([]);

          showToast(`${seleccionadas.length} factura(s) pasaron a 'Proceso Iniciado'`, "success");
        } catch (error) {
          console.error("Error al actualizar estados y guardar logs:", error);
          showToast("Hubo un error al actualizar el estado", "error");
        }
      },
      { confirmText: "Iniciar", type: "primary" }
    );
  };

  const facturasFiltradas = facturas.filter(f => 
    f.folio?.includes(busqueda) || 
    f.rznSoc?.toLowerCase().includes(busqueda.toLowerCase()) || 
    f.folioRef?.includes(busqueda)
  );

  const todasSeleccionadas = facturasFiltradas.length > 0 && seleccionadas.length === facturasFiltradas.length;

  return (
    <div className="w-full h-full flex flex-col bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-lg shadow-xs overflow-hidden p-0 relative font-sans">
      
      {/* CABECERA */}
      <header className="bg-white dark:bg-gray-800 border-b border-slate-200 dark:border-gray-700 px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-[#2383C2]" />
          <span className="text-[12px] font-normal text-slate-800 dark:text-gray-100 tracking-wide uppercase">
            Iniciar Proceso de Facturas (Selección por Año)
          </span>
        </div>
      </header>

      {/* FILTROS, BÚSQUEDA Y ACCIÓN */}
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

        {/* BOTÓN PARA CAMBIAR ESTADO A PROCESO INICIADO */}
        <button
          onClick={handleIniciarProceso}
          disabled={seleccionadas.length === 0}
          className={`h-6 px-2.5 rounded text-[11px] font-medium flex items-center gap-1 transition-colors ${
            seleccionadas.length > 0
              ? 'bg-[#2383C2] text-white hover:bg-blue-600 shadow-xs cursor-pointer'
              : 'bg-slate-200 dark:bg-gray-700 text-slate-400 dark:text-gray-500 cursor-not-allowed'
          }`}
        >
          <PlayCircle size={13} />
          <span>Iniciar Proceso ({seleccionadas.length})</span>
        </button>
      </div>

      {/* TABLA DE FACTURAS */}
      {hasPermission(PATH_VISTA, "tabla_facturas") && (
        <div className="flex-grow overflow-auto">
          {loading ? (
            <div className="w-full h-40 flex items-center justify-center text-xs text-slate-500 dark:text-gray-400">
              Cargando facturas pendientes del año {filtroAnio}...
            </div>
          ) : (
            <table className="w-full text-left text-[11px] border-collapse table-fixed min-w-[800px]">
              <thead className="bg-slate-100 dark:bg-gray-900/80 sticky top-0 z-10">
                <tr className="text-slate-600 dark:text-gray-400 uppercase font-normal text-[10px] tracking-wider">
                  <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700 w-[4%] text-center">
                    <button
                      onClick={toggleSeleccionarTodas}
                      className="text-slate-500 dark:text-gray-400 hover:text-[#2383C2] focus:outline-none"
                      title="Seleccionar todas"
                      type="button"
                    >
                      {todasSeleccionadas ? (
                        <CheckSquare size={14} className="text-[#2383C2]" />
                      ) : (
                        <Square size={14} />
                      )}
                    </button>
                  </th>
                  <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700 w-[12%]">Folio</th>
                  <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700 w-[12%]">Emisión</th>
                  <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700 w-[12%]">Ref.</th>
                  <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700 w-[34%]">Razón Social</th>
                  <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700 w-[13%] text-right">Total (Neto)</th>
                  <th className="px-2 py-1.5 border-b border-slate-200 dark:border-gray-700 w-[13%] text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/60 dark:divide-gray-700/50 bg-white dark:bg-gray-800">
                {facturasFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-3 py-6 text-center text-slate-400 dark:text-gray-500 text-xs">
                      {filtroAnio 
                        ? "No hay facturas pendientes en estado 'Iniciar Ingreso' para este año." 
                        : "Seleccione un año para visualizar las facturas pendientes."}
                    </td>
                  </tr>
                ) : (
                  facturasFiltradas.map((f) => {
                    const isSelected = seleccionadas.some(item => item.id === f.id);

                    return (
                      <tr 
                        key={f.id} 
                        onClick={() => toggleSeleccion(f)}
                        className={`border-l-2 transition-colors cursor-pointer ${
                          isSelected 
                            ? 'border-[#2383C2] bg-blue-50/50 dark:bg-blue-950/30' 
                            : 'border-transparent hover:border-[#2383C2] hover:bg-gray-50/80 dark:hover:bg-gray-700/40'
                        }`}
                      >
                        <td className="px-2 py-1 border-b border-r border-slate-200/60 dark:border-gray-700/70 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="rounded border-slate-300 text-[#2383C2] focus:ring-0 cursor-pointer"
                          />
                        </td>
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
                        <td className="px-2 py-1 border-b border-slate-200/60 dark:border-gray-700/70 text-center whitespace-nowrap">
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50">
                            {f.estado}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};

export default IniciarProceso;