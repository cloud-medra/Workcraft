import React, { useState, useEffect, useCallback } from 'react';
import {
  collection, doc, getDocs, setDoc, updateDoc,
  query, where, onSnapshot, arrayUnion, serverTimestamp
} from 'firebase/firestore';
import { db } from '../../../../firebaseConfig';
import { Calendar, History, AlertTriangle, X, Plus, CheckCircle, Lock, AlertCircle, PlayCircle } from 'lucide-react';
import { useToast } from '../../../../context/ToastContext';
import { useModal } from '../../../../context/ModalContext';
import { useUser } from '../../../../context/UserContext';

import { MODULOS, MESES, COLECCIONES } from './constants';
import PanelAperturaPeriodo from './PanelAperturaPeriodo';

const ControlMensual = () => {
  const [anioSeleccionado, setAnioSeleccionado] = useState(new Date().getFullYear().toString());
  const [moduloFiltro, setModuloFiltro] = useState('TODOS');
  
  const [estadosModulos, setEstadosModulos] = useState({});
  const [resumenImputaciones, setResumenImputaciones] = useState({});
  const [cargando, setCargando] = useState(true);

  // Panel Lateral de Apertura
  const [panelAperturaAbierto, setPanelAperturaAbierto] = useState(false);
  const [anioApertura, setAnioApertura] = useState(new Date().getFullYear().toString());
  const [mesApertura, setMesApertura] = useState(MESES[new Date().getMonth()].id);
  const [modulosApertura, setModulosApertura] = useState(MODULOS.map(m => m.id));

  // Modales adicionales
  const [modalReapertura, setModalReapertura] = useState(null);
  const [motivoReapertura, setMotivoReapertura] = useState('');
  const [modalHistorial, setModalHistorial] = useState(null);

  const { showToast } = useToast();
  const { confirmAction } = useModal();
  const { userData } = useUser();

  const obtenerUsuarioLog = useCallback(() => ({
    uid: userData?.uid || '',
    nombre: userData?.nombreCompleto || userData?.displayName || userData?.nombre || userData?.email?.split('@')[0] || 'Usuario Sistema',
    email: userData?.email || ''
  }), [userData]);

  const formatearNombreUsuario = (usuario) => {
    if (!usuario) return 'Usuario Sistema';
    if (typeof usuario === 'object') {
      return usuario.nombreCompleto || usuario.nombre || usuario.email || 'Usuario Sistema';
    }
    return usuario;
  };

  // Módulos visibles según el filtro seleccionado
  const modulosVisibles = moduloFiltro === 'TODOS' 
    ? MODULOS 
    : MODULOS.filter(m => m.id === moduloFiltro);

  // Escuchar la colección general de cierres para el año seleccionado
  useEffect(() => {
    setCargando(true);
    const q = query(
      collection(db, COLECCIONES.CIERRES),
      where("anio", "==", anioSeleccionado)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const datosEstructurados = {};

      snapshot.docs.forEach(d => {
        const data = d.data();
        if (data.modulo && data.mes) {
          if (!datosEstructurados[data.modulo]) {
            datosEstructurados[data.modulo] = {};
          }
          datosEstructurados[data.modulo][data.mes] = { id: d.id, ...data };
        }
      });

      setEstadosModulos(datosEstructurados);
      setCargando(false);
    }, (error) => {
      console.error("Error al escuchar cierres de períodos:", error);
      setCargando(false);
    });

    return () => unsubscribe();
  }, [anioSeleccionado]);

  // Cargar resumen de documentos e imputaciones por módulo y mes
  useEffect(() => {
    const cargarResumenFacturas = async () => {
      const nuevoResumen = {};

      for (const mod of MODULOS) {
        nuevoResumen[mod.id] = {};
        const promesas = MESES.map(async (mesObj) => {
          try {
            const docsRef = collection(db, COLECCIONES.IMPUTACIONES, anioSeleccionado, "meses", mesObj.id, "documentos");
            const qDocs = query(docsRef, where("modulo", "==", mod.id));
            const snap = await getDocs(qDocs);
            
            let totalMonto = 0;
            snap.docs.forEach(d => {
              totalMonto += Number(d.data().total || 0);
            });
            return { mesId: mesObj.id, cantidad: snap.size, montoTotal: totalMonto };
          } catch {
            return { mesId: mesObj.id, cantidad: 0, montoTotal: 0 };
          }
        });

        const resultados = await Promise.all(promesas);
        resultados.forEach(item => {
          nuevoResumen[mod.id][item.mesId] = { cantidad: item.cantidad, montoTotal: item.montoTotal };
        });
      }

      setResumenImputaciones(nuevoResumen);
    };

    cargarResumenFacturas();
  }, [anioSeleccionado]);

  // Filtrar solo los meses que tienen al menos un módulo iniciado
  const mesesIniciados = MESES.filter((mes) => {
    return MODULOS.some(mod => {
      const estado = estadosModulos[mod.id]?.[mes.id]?.estado;
      return estado && estado !== 'SIN_INICIAR';
    });
  });

  const handleAbrirMes = (mesId, modTarget, anioTarget = anioSeleccionado) => {
    const modulosAfectados = Array.isArray(modTarget) 
      ? MODULOS.filter(m => modTarget.includes(m.id))
      : MODULOS.filter(m => m.id === modTarget);

    const modulosNombres = modulosAfectados.map(m => m.nombre).join(', ');

    confirmAction(
      "Abrir Período de Imputación",
      `¿Deseas abrir ${mesId.toUpperCase()} ${anioTarget} para: [${modulosNombres}]?`,
      async () => {
        try {
          const usuario = obtenerUsuarioLog();

          const operacion = modulosAfectados.map(async (mod) => {
            const docId = `${anioTarget}_${mesId}_${mod.id}`;
            
            // Cerrar automáticamente períodos previos abiertos del módulo
            const qAbiertos = query(
              collection(db, COLECCIONES.CIERRES),
              where("modulo", "==", mod.id),
              where("estado", "in", ["ABIERTO", "REABIERTO"])
            );
            const snapAbiertos = await getDocs(qAbiertos);
            const cierresAuto = snapAbiertos.docs
              .filter(d => d.id !== docId)
              .map(d => updateDoc(doc(db, COLECCIONES.CIERRES, d.id), {
                estado: 'CERRADO',
                fechaCierre: serverTimestamp(),
                usuarioCierre: usuario,
                cierreAutomatico: true
              }));
            await Promise.all(cierresAuto);

            // Abrir período actual
            const docRef = doc(db, COLECCIONES.CIERRES, docId);
            await setDoc(docRef, {
              anio: anioTarget,
              mes: mesId,
              modulo: mod.id,
              estado: 'ABIERTO',
              fechaApertura: serverTimestamp(),
              usuarioApertura: usuario,
            }, { merge: true });

            // Registrar período activo
            const periodoActivoRef = doc(db, COLECCIONES.CONFIGURACION, `periodo_activo_${mod.id}`);
            await setDoc(periodoActivoRef, {
              mes: mesId,
              anio: anioTarget,
              modulo: mod.id,
              actualizadoEn: serverTimestamp(),
              actualizadoPor: usuario,
            });
          });

          await Promise.all(operacion);
          if (anioTarget !== anioSeleccionado) {
            setAnioSeleccionado(anioTarget);
          }
          showToast(`Mes de ${mesId} abierto para ${modulosNombres}`, 'success');
        } catch (error) {
          console.error("Error al abrir mes:", error);
          showToast("Error al abrir el período", "error");
        }
      }
    );
  };

  const handleCerrarMes = (mesId, modId) => {
    const modObj = MODULOS.find(m => m.id === modId);

    confirmAction(
      "Cerrar Período de Imputación",
      `Al cerrar ${mesId.toUpperCase()} ${anioSeleccionado} para el módulo de [${modObj?.nombre}], no se podrán ingresar ni modificar documentos en él. ¿Continuar?`,
      async () => {
        try {
          const usuario = obtenerUsuarioLog();
          const docId = `${anioSeleccionado}_${mesId}_${modId}`;
          const docRef = doc(db, COLECCIONES.CIERRES, docId);
          
          await setDoc(docRef, {
            anio: anioSeleccionado,
            mes: mesId,
            modulo: modId,
            estado: 'CERRADO',
            fechaCierre: serverTimestamp(),
            usuarioCierre: usuario
          }, { merge: true });

          showToast(`Mes de ${mesId} cerrado para ${modObj?.nombre}`, 'info');
        } catch (error) {
          console.error("Error al cerrar mes:", error);
          showToast("Error al cerrar el período", "error");
        }
      }
    );
  };

  const ejecutarReapertura = async () => {
    if (!motivoReapertura.trim()) {
      showToast("Debes ingresar el motivo de la reapertura", "warning");
      return;
    }

    const { mesId, modId } = modalReapertura;
    const usuario = obtenerUsuarioLog();

    try {
      const docId = `${anioSeleccionado}_${mesId}_${modId}`;
      const docRef = doc(db, COLECCIONES.CIERRES, docId);
      const registroReapertura = {
        fecha: new Date().toISOString(),
        motivo: motivoReapertura,
        usuario: usuario
      };

      await setDoc(docRef, {
        estado: 'REABIERTO',
        fechaReapertura: serverTimestamp(),
        usuarioReapertura: usuario,
        historialReaperturas: arrayUnion(registroReapertura)
      }, { merge: true });

      showToast(`Mes de ${mesId} reabierto correctamente`, 'warning');
      setModalReapertura(null);
      setMotivoReapertura('');
    } catch (error) {
      console.error("Error al reabrir mes:", error);
      showToast("Error al reabrir el período", "error");
    }
  };

  // Helper para renderizar Badge de Estado en celda
  const renderBadgeEstado = (estado) => {
    switch (estado) {
      case 'ABIERTO':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
            <CheckCircle size={10} /> Abierto
          </span>
        );
      case 'REABIERTO':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
            <AlertCircle size={10} /> Reabierto
          </span>
        );
      case 'CERRADO':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-gray-800 dark:text-gray-300 border border-slate-300 dark:border-gray-600">
            <Lock size={10} /> Cerrado
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-50 text-slate-400 dark:bg-gray-900 dark:text-gray-600 border border-slate-200 dark:border-gray-800">
            Sin Iniciar
          </span>
        );
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-lg shadow-xs overflow-hidden font-sans relative">
      
      {/* HEADER */}
      <header className="bg-white dark:bg-gray-800 border-b border-slate-200 dark:border-gray-700 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Calendar size={18} className="text-[#2383C2]" />
          <div>
            <h2 className="text-[13px] font-bold text-slate-800 dark:text-gray-100 uppercase tracking-wide">
              Control y Cierre de Períodos
            </h2>
            <p className="text-[10px] text-slate-500 dark:text-gray-400">
              Matriz detallada de estado, documentos y montos imputados por módulo
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-medium text-slate-600 dark:text-gray-300">Módulo:</span>
            <select
              value={moduloFiltro}
              onChange={(e) => setModuloFiltro(e.target.value)}
              className="h-7 border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-slate-800 dark:text-gray-100 rounded text-[11px] px-2 font-bold outline-none focus:border-[#2383C2]"
            >
              <option value="TODOS">Todos los Módulos</option>
              {MODULOS.map(m => (
                <option key={m.id} value={m.id}>{m.nombre}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-medium text-slate-600 dark:text-gray-300">Año:</span>
            <select
              value={anioSeleccionado}
              onChange={(e) => setAnioSeleccionado(e.target.value)}
              className="h-7 border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-slate-800 dark:text-gray-100 rounded text-[11px] px-2 font-bold outline-none focus:border-[#2383C2]"
            >
              {[2024, 2025, 2026, 2027].map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setPanelAperturaAbierto(true)}
            className="flex items-center gap-1.5 px-3 py-1 bg-[#2383C2] hover:bg-[#1d6fa5] text-white rounded text-[11px] font-bold shadow-xs transition h-7 cursor-pointer"
          >
            <Plus size={14} />
            Abrir Período
          </button>
        </div>
      </header>

      {/* TABLA MATRICIAL SUBDIVIDIDA */}
      <div className="flex-1 overflow-auto p-4">
        {cargando ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-500">
            <div className="w-8 h-8 border-2 border-[#2383C2] border-t-transparent rounded-full animate-spin mb-2" />
            <p className="text-[11px]">Cargando consolidado de cierres...</p>
          </div>
        ) : mesesIniciados.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-gray-800 rounded-lg border border-slate-200 dark:border-gray-700 text-center space-y-3">
            <Calendar size={36} className="text-slate-300 dark:text-gray-600" />
            <div>
              <p className="text-[13px] font-bold text-slate-700 dark:text-gray-200">
                No hay meses abiertos para el año {anioSeleccionado}
              </p>
              <p className="text-[11px] text-slate-400 dark:text-gray-500">
                Usa el botón "Abrir Período" para iniciar el flujo de un nuevo mes.
              </p>
            </div>
            <button
              onClick={() => setPanelAperturaAbierto(true)}
              className="px-3 py-1.5 bg-[#2383C2] hover:bg-[#1d6fa5] text-white text-[11px] font-bold rounded shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <Plus size={14} />
              Abrir Período
            </button>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-slate-200 dark:border-gray-700 overflow-hidden shadow-xs min-w-max">
            <table className="w-full text-left border-collapse">
              <thead>
                {/* FILA 1: CABECERAS PRINCIPALES DE MÓDULO */}
                <tr className="bg-slate-100 dark:bg-gray-900 border-b border-slate-200 dark:border-gray-700 text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-gray-200">
                  <th rowSpan={2} className="py-2.5 px-4 border-r border-slate-200 dark:border-gray-700 bg-slate-100 dark:bg-gray-900 sticky left-0 z-10 w-32">
                    Período
                  </th>
                  {modulosVisibles.map((mod) => (
                    <th
                      key={mod.id}
                      colSpan={3}
                      className="py-2 px-3 text-center border-r border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-800/80"
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#2383C2]"></span>
                        <span>{mod.nombre}</span>
                      </div>
                    </th>
                  ))}
                </tr>

                {/* FILA 2: SUBCOLUMNAS POR MÓDULO (ESTADO, DOCS, MONTO) */}
                <tr className="bg-slate-50 dark:bg-gray-900/60 border-b border-slate-200 dark:border-gray-700 text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400">
                  {modulosVisibles.map((mod) => (
                    <React.Fragment key={`sub_${mod.id}`}>
                      <th className="py-1.5 px-2 text-center border-r border-slate-100 dark:border-gray-800 w-28">
                        Estado
                      </th>
                      <th className="py-1.5 px-2 text-right border-r border-slate-100 dark:border-gray-800 w-16">
                        Docs
                      </th>
                      <th className="py-1.5 px-2 text-right border-r border-slate-200 dark:border-gray-700 w-28">
                        Monto Total
                      </th>
                    </React.Fragment>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200 dark:divide-gray-700 text-[11px]">
                {mesesIniciados.map((mes) => (
                  <tr key={mes.id} className="hover:bg-slate-50/80 dark:hover:bg-gray-800/50 transition-colors">
                    
                    {/* CELDA DE MES */}
                    <td className="py-2.5 px-4 font-bold text-slate-800 dark:text-gray-100 border-r border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 sticky left-0 z-10 uppercase">
                      {mes.nombre} {anioSeleccionado}
                    </td>

                    {/* CELDAS POR MÓDULO (SUBDIVIDIDAS) */}
                    {modulosVisibles.map((mod) => {
                      const cierreData = estadosModulos[mod.id]?.[mes.id] || {};
                      const estado = cierreData.estado || 'SIN_INICIAR';
                      const infoImputacion = resumenImputaciones[mod.id]?.[mes.id] || { cantidad: 0, montoTotal: 0 };
                      const tieneHistorial = cierreData.historialReaperturas?.length > 0;

                      return (
                        <React.Fragment key={`${mes.id}_${mod.id}`}>
                          {/* SUBCOLUMNA 1: ESTADO + ACCIÓN RÁPIDA */}
                          <td className="py-2 px-2 border-r border-slate-100 dark:border-gray-800 text-center">
                            <div className="flex flex-col items-center gap-1">
                              {renderBadgeEstado(estado)}
                              
                              {/* Botones de acción individual por celda */}
                              <div className="flex items-center gap-1 mt-0.5">
                                {estado === 'SIN_INICIAR' && (
                                  <button
                                    onClick={() => handleAbrirMes(mes.id, mod.id)}
                                    title={`Abrir ${mes.nombre} para ${mod.nombre}`}
                                    className="p-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded transition cursor-pointer"
                                  >
                                    <PlayCircle size={13} />
                                  </button>
                                )}

                                {(estado === 'ABIERTO' || estado === 'REABIERTO') && (
                                  <button
                                    onClick={() => handleCerrarMes(mes.id, mod.id)}
                                    title={`Cerrar ${mes.nombre} para ${mod.nombre}`}
                                    className="p-1 text-slate-500 hover:text-slate-800 dark:hover:text-gray-200 hover:bg-slate-100 dark:hover:bg-gray-700 rounded transition cursor-pointer"
                                  >
                                    <Lock size={13} />
                                  </button>
                                )}

                                {estado === 'CERRADO' && (
                                  <button
                                    onClick={() => setModalReapertura({ mesId: mes.id, modId: mod.id })}
                                    title={`Reabrir ${mes.nombre} para ${mod.nombre}`}
                                    className="p-1 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/50 rounded transition cursor-pointer"
                                  >
                                    <AlertTriangle size={13} />
                                  </button>
                                )}

                                {tieneHistorial && (
                                  <button
                                    onClick={() => setModalHistorial({
                                      mes: mes.nombre,
                                      anio: anioSeleccionado,
                                      moduloNombre: mod.nombre,
                                      historialReaperturas: cierreData.historialReaperturas
                                    })}
                                    title="Ver historial de reaperturas"
                                    className="p-1 text-[#2383C2] hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded transition cursor-pointer"
                                  >
                                    <History size={13} />
                                  </button>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* SUBCOLUMNA 2: DOCUMENTOS */}
                          <td className="py-2 px-2 border-r border-slate-100 dark:border-gray-800 text-right font-mono text-slate-700 dark:text-gray-300">
                            {infoImputacion.cantidad.toLocaleString('es-CL')}
                          </td>

                          {/* SUBCOLUMNA 3: MONTO TOTAL */}
                          <td className="py-2 px-2 border-r border-slate-200 dark:border-gray-700 text-right font-mono font-semibold text-slate-800 dark:text-gray-200">
                            ${infoImputacion.montoTotal.toLocaleString('es-CL')}
                          </td>
                        </React.Fragment>
                      );
                    })}

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* PANEL LATERAL DE APERTURA MULTI-MÓDULO */}
      <PanelAperturaPeriodo
        isOpen={panelAperturaAbierto}
        onClose={() => setPanelAperturaAbierto(false)}
        anioApertura={anioApertura}
        setAnioApertura={setAnioApertura}
        mesApertura={mesApertura}
        setMesApertura={setMesApertura}
        modulosSeleccionados={modulosApertura}
        setModulosSeleccionados={setModulosApertura}
        onConfirm={() => {
          handleAbrirMes(mesApertura, modulosApertura, anioApertura);
          setPanelAperturaAbierto(false);
        }}
      />

      {/* MODAL REAPERTURA */}
      {modalReapertura && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[1px] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-slate-200 dark:border-gray-700 w-full max-w-md p-4 space-y-3 font-sans">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 border-b border-slate-200 dark:border-gray-700 pb-2">
              <AlertTriangle size={18} />
              <h3 className="text-[13px] font-bold uppercase">Reapertura de Período Cerrado</h3>
            </div>

            <p className="text-[11px] text-slate-600 dark:text-gray-300">
              Estás por reabrir la imputación para el mes de <strong className="uppercase">{modalReapertura.mesId} {anioSeleccionado}</strong> 
              {` en el módulo de ${MODULOS.find(m => m.id === modalReapertura.modId)?.nombre}.`}
            </p>

            <textarea
              value={motivoReapertura}
              onChange={(e) => setMotivoReapertura(e.target.value)}
              placeholder="Ej: Ajuste de facturación extemporánea autorizada por jefatura..."
              className="w-full h-20 p-2 border border-slate-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-slate-800 dark:text-gray-100 text-[11px] outline-none focus:border-amber-500 resize-none"
            />

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-gray-700">
              <button
                onClick={() => { setModalReapertura(null); setMotivoReapertura(''); }}
                className="px-3 py-1 bg-slate-200 dark:bg-gray-700 text-slate-700 dark:text-gray-300 rounded text-[10px] font-bold hover:bg-slate-300 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={ejecutarReapertura}
                className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded text-[10px] font-bold transition cursor-pointer"
              >
                Confirmar Reapertura
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL HISTORIAL */}
      {modalHistorial && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[1px] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-slate-200 dark:border-gray-700 w-full max-w-lg p-4 space-y-3 font-sans">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-gray-700 pb-2">
              <div className="flex items-center gap-2 text-[#2383C2]">
                <History size={18} />
                <h3 className="text-[13px] font-bold uppercase">
                  Historial: {modalHistorial.mes} {modalHistorial.anio} ({modalHistorial.moduloNombre})
                </h3>
              </div>
              <button onClick={() => setModalHistorial(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2">
              {modalHistorial.historialReaperturas?.map((h, i) => (
                <div key={i} className="p-2 border border-slate-200 dark:border-gray-700 rounded bg-slate-50 dark:bg-gray-900/50 text-[10px]">
                  <div className="flex justify-between font-semibold text-slate-700 dark:text-gray-300 mb-1">
                    <span>Usuario: {formatearNombreUsuario(h.usuario)}</span>
                    <span className="font-mono text-slate-400">
                      {h.fecha ? new Date(h.fecha).toLocaleString('es-CL') : 'N/A'}
                    </span>
                  </div>
                  <p className="text-slate-600 dark:text-gray-400 italic">"{h.motivo}"</p>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-gray-700">
              <button
                onClick={() => setModalHistorial(null)}
                className="px-3 py-1 bg-slate-200 dark:bg-gray-700 text-slate-700 dark:text-gray-300 rounded text-[10px] font-bold cursor-pointer"
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

export default ControlMensual;