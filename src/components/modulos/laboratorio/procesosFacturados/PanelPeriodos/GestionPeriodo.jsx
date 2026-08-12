import React, { useState, useEffect, useCallback } from 'react';
import {
  collection, doc, getDoc, getDocs, setDoc, updateDoc,
  query, where, onSnapshot, arrayUnion, serverTimestamp
} from 'firebase/firestore';
import { db } from '../../../../../firebaseConfig';
import {
  Lock, Unlock, Calendar, History, AlertTriangle,
  RefreshCw, X
} from 'lucide-react';
import { useToast } from '../../../../../context/ToastContext';
import { useModal } from '../../../../../context/ModalContext';
import { useUser } from '../../../../../context/UserContext';

const MESES = [
  { id: 'enero', nombre: 'Enero', num: 1 },
  { id: 'febrero', nombre: 'Febrero', num: 2 },
  { id: 'marzo', nombre: 'Marzo', num: 3 },
  { id: 'abril', nombre: 'Abril', num: 4 },
  { id: 'mayo', nombre: 'Mayo', num: 5 },
  { id: 'junio', nombre: 'Junio', num: 6 },
  { id: 'julio', nombre: 'Julio', num: 7 },
  { id: 'agosto', nombre: 'Agosto', num: 8 },
  { id: 'septiembre', nombre: 'Septiembre', num: 9 },
  { id: 'octubre', nombre: 'Octubre', num: 10 },
  { id: 'noviembre', nombre: 'Noviembre', num: 11 },
  { id: 'diciembre', nombre: 'Diciembre', num: 12 }
];

const COL_CIERRES = "laboratorio_cierres";
const COL_IMPUTADAS = "laboratorio_facturasImputadas";

const BadgeEstado = ({ estado }) => {
  switch (estado) {
    case 'ABIERTO':
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"><Unlock size={11} /> ABIERTO</span>;
    case 'CERRADO':
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800"><Lock size={11} /> CERRADO</span>;
    case 'REABIERTO':
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800"><RefreshCw size={11} /> REABIERTO</span>;
    default:
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border border-gray-300 dark:border-gray-700">SIN INICIAR</span>;
  }
};

const CierreMes = () => {
  const [anioSeleccionado, setAnioSeleccionado] = useState(new Date().getFullYear().toString());
  const [estadosMeses, setEstadosMeses] = useState({});
  const [resumenImputaciones, setResumenImputaciones] = useState({});
  const [cargando, setCargando] = useState(true);

  const [mesParaReabrir, setMesParaReabrir] = useState(null);
  const [motivoReapertura, setMotivoReapertura] = useState('');
  const [mesParaHistorial, setMesParaHistorial] = useState(null);

  const { showToast } = useToast();
  const { confirmAction } = useModal();
  const { userData } = useUser();

  const obtenerUsuarioLog = useCallback(() => {
    return {
      uid: userData?.uid || '',
      nombre: userData?.nombreCompleto || userData?.displayName || userData?.nombre || userData?.email?.split('@')[0] || 'Usuario Sistema',
      email: userData?.email || ''
    };
  }, [userData]);

  const formatearNombreUsuario = (usuario) => {
    if (!usuario) return 'Usuario Sistema';
    if (typeof usuario === 'object') {
      return usuario.nombreCompleto || usuario.nombre || usuario.email || 'Usuario Sistema';
    }
    return usuario;
  };

  useEffect(() => {
    setCargando(true);
    const q = query(collection(db, COL_CIERRES), where("anio", "==", anioSeleccionado));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const datos = {};
      snapshot.docs.forEach(d => {
        const data = d.data();
        if (data.mes) {
          datos[data.mes] = { id: d.id, ...data };
        }
      });
      setEstadosMeses(datos);
      setCargando(false);
    }, (error) => {
      console.error("Error al obtener cierres:", error);
      showToast("Error al cargar la información de cierres", "error");
      setCargando(false);
    });

    return () => unsubscribe();
  }, [anioSeleccionado, showToast]);

  useEffect(() => {
    const cargarResumenFacturas = async () => {
      try {
        const promesas = MESES.map(async (mesObj) => {
          try {
            const docsRef = collection(db, COL_IMPUTADAS, anioSeleccionado, "meses", mesObj.id, "documentos");
            const snap = await getDocs(docsRef);
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
        const nuevoResumen = resultados.reduce((acc, item) => {
          acc[item.mesId] = { cantidad: item.cantidad, montoTotal: item.montoTotal };
          return acc;
        }, {});

        setResumenImputaciones(nuevoResumen);
      } catch (e) {
        console.error("Error cargando resumen de facturas:", e);
      }
    };

    cargarResumenFacturas();
  }, [anioSeleccionado]); 

  const handleAbrirMes = (mesId) => {
    const docId = `${anioSeleccionado}_${mesId}`;
    confirmAction(
      "Abrir Período",
      `¿Deseas habilitar la imputación de facturas para ${mesId.toUpperCase()} ${anioSeleccionado}? Esto cerrará automáticamente cualquier otro período que esté abierto.`,
      async () => {
        try {
          const qAbiertos = query(
            collection(db, COL_CIERRES),
            where("estado", "in", ["ABIERTO", "REABIERTO"])
          );
          const snapAbiertos = await getDocs(qAbiertos);
          const cierresAutomaticos = snapAbiertos.docs
            .filter(d => d.id !== docId)
            .map(d => updateDoc(doc(db, COL_CIERRES, d.id), {
              estado: 'CERRADO',
              fechaCierre: serverTimestamp(),
              usuarioCierre: obtenerUsuarioLog(),
              cierreAutomatico: true
            }));
          await Promise.all(cierresAutomaticos);

          const docRef = doc(db, COL_CIERRES, docId);
          await setDoc(docRef, {
            anio: anioSeleccionado,
            mes: mesId,
            estado: 'ABIERTO',
            fechaApertura: serverTimestamp(),
            usuarioApertura: obtenerUsuarioLog(),
          }, { merge: true });

          const periodoActivoRef = doc(db, "configuracion_periodos", "periodo_activo");
          await setDoc(periodoActivoRef, {
            mes: mesId,
            anio: anioSeleccionado,
            actualizadoEn: serverTimestamp(),
            actualizadoPor: obtenerUsuarioLog(),
          });

          showToast(`Mes de ${mesId} abierto correctamente`, 'success');
        } catch (error) {
          console.error("Error al abrir mes:", error);
          showToast("Error al abrir el mes", "error");
        }
      }
    );
  };

  const handleCerrarMes = (mesId) => {
    const docId = `${anioSeleccionado}_${mesId}`;
    confirmAction(
      "Cerrar Período de Imputación",
      `Al cerrar ${mesId.toUpperCase()} ${anioSeleccionado}, no se podrán ingresar ni modificar facturas en este mes. ¿Continuar?`,
      async () => {
        try {
          const docRef = doc(db, COL_CIERRES, docId);
          await setDoc(docRef, {
            anio: anioSeleccionado,
            mes: mesId,
            estado: 'CERRADO',
            fechaCierre: serverTimestamp(),
            usuarioCierre: obtenerUsuarioLog()
          }, { merge: true });

          showToast(`Mes de ${mesId} cerrado oficialmente`, 'info');
        } catch (error) {
          console.error("Error al cerrar mes:", error);
          showToast("Error al cerrar el mes", "error");
        }
      }
    );
  };

  const ejecutarReapertura = async () => {
    if (!motivoReapertura.trim()) {
      showToast("Debes ingresar el motivo de la reapertura", "warning");
      return;
    }

    const docId = `${anioSeleccionado}_${mesParaReabrir}`;
    try {
      const docRef = doc(db, COL_CIERRES, docId);
      const registroReapertura = {
        fecha: new Date().toISOString(),
        motivo: motivoReapertura,
        usuario: obtenerUsuarioLog()
      };

      await setDoc(docRef, {
        estado: 'REABIERTO',
        fechaReapertura: serverTimestamp(),
        usuarioReapertura: obtenerUsuarioLog(),
        historialReaperturas: arrayUnion(registroReapertura)
      }, { merge: true });

      showToast(`Mes de ${mesParaReabrir} reabierto`, 'warning');
      setMesParaReabrir(null);
      setMotivoReapertura('');
    } catch (error) {
      console.error("Error al reabrir mes:", error);
      showToast("Error al reabrir el mes", "error");
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-lg shadow-xs overflow-hidden font-sans">

      <header className="bg-white dark:bg-gray-800 border-b border-slate-200 dark:border-gray-700 px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar size={18} className="text-[#2383C2]" />
          <div>
            <h2 className="text-[13px] font-bold text-slate-800 dark:text-gray-100 uppercase tracking-wide">
              Control y Cierre Período de Imputación
            </h2>
            <p className="text-[10px] text-slate-500 dark:text-gray-400">
              Administra la apertura y cierre de meses para la recepción e imputación contable de facturas
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
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
      </header>

      <div className="flex-1 overflow-y-auto p-4">
        {cargando ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-500">
            <div className="w-8 h-8 border-2 border-[#2383C2] border-t-transparent rounded-full animate-spin mb-2" />
            <p className="text-[11px]">Cargando estados de cierre...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
            {MESES.map((mes) => {
              const infoEstado = estadosMeses[mes.id] || {};
              const estado = infoEstado.estado || 'SIN_INICIAR';
              const resumen = resumenImputaciones[mes.id] || { cantidad: 0, montoTotal: 0 };

              return (
                <div
                  key={mes.id}
                  className={`bg-white dark:bg-gray-800 border rounded-lg p-3 flex flex-col justify-between transition shadow-xs hover:shadow-md ${estado === 'CERRADO' ? 'border-rose-200 dark:border-rose-900/40' :
                      estado === 'ABIERTO' ? 'border-emerald-200 dark:border-emerald-900/40' :
                        estado === 'REABIERTO' ? 'border-amber-200 dark:border-amber-900/40' :
                          'border-slate-200 dark:border-gray-700'
                    }`}
                >
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-[13px] font-bold text-slate-800 dark:text-gray-100">
                        {mes.nombre} <span className="text-[10px] text-slate-400">{anioSeleccionado}</span>
                      </h3>
                      <BadgeEstado estado={estado} />
                    </div>

                    <div className="bg-slate-50 dark:bg-gray-900/50 rounded p-2 border border-slate-100 dark:border-gray-700/50 mb-3 space-y-1">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-slate-500 dark:text-gray-400">Facturas Imputadas:</span>
                        <span className="font-bold text-slate-800 dark:text-gray-200">{resumen.cantidad} docs</span>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-slate-500 dark:text-gray-400">Total Imputado:</span>
                        <span className="font-bold text-[#2383C2]">${Math.round(resumen.montoTotal).toLocaleString('es-CL')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-gray-700/80 flex items-center justify-between gap-1">
                    {infoEstado.historialReaperturas?.length > 0 && (
                      <button
                        onClick={() => setMesParaHistorial(infoEstado)}
                        className="p-1 rounded text-slate-400 hover:text-amber-600 hover:bg-slate-100 dark:hover:bg-gray-700 transition"
                        title="Ver Historial de Reaperturas"
                      >
                        <History size={14} />
                      </button>
                    )}

                    <div className="flex gap-1 ml-auto">
                      {estado === 'CERRADO' ? (
                        <button
                          onClick={() => setMesParaReabrir(mes.id)}
                          className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded text-[10px] font-bold transition flex items-center gap-1"
                        >
                          <RefreshCw size={11} /> Reabrir
                        </button>
                      ) : estado === 'ABIERTO' || estado === 'REABIERTO' ? (
                        <button
                          onClick={() => handleCerrarMes(mes.id)}
                          className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-bold transition flex items-center gap-1"
                        >
                          <Lock size={11} /> Cerrar Mes
                        </button>
                      ) : (
                        <button
                          onClick={() => handleAbrirMes(mes.id)}
                          className="px-2.5 py-1 bg-[#2383C2] hover:bg-blue-600 text-white rounded text-[10px] font-bold transition flex items-center gap-1"
                        >
                          <Unlock size={11} /> Abrir Mes
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {mesParaReabrir && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[1px] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-slate-200 dark:border-gray-700 w-full max-w-md p-4 space-y-3 font-sans">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 border-b border-slate-200 dark:border-gray-700 pb-2">
              <AlertTriangle size={18} />
              <h3 className="text-[13px] font-bold uppercase">Reapertura de Mes Cerrado</h3>
            </div>

            <p className="text-[11px] text-slate-600 dark:text-gray-300">
              Estás por reabrir la imputación para el mes de <strong className="uppercase">{mesParaReabrir} {anioSeleccionado}</strong>.
              Ingresa la justificación de este ajuste excepcional:
            </p>

            <textarea
              value={motivoReapertura}
              onChange={(e) => setMotivoReapertura(e.target.value)}
              placeholder="Ej: Ingreso extemporáneo de factura NC del proveedor X autorizada por Jefatura..."
              className="w-full h-20 p-2 border border-slate-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-slate-800 dark:text-gray-100 text-[11px] outline-none focus:border-amber-500 resize-none"
            />

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-gray-700">
              <button
                onClick={() => { setMesParaReabrir(null); setMotivoReapertura(''); }}
                className="px-3 py-1 bg-slate-200 dark:bg-gray-700 text-slate-700 dark:text-gray-300 rounded text-[10px] font-bold hover:bg-slate-300 transition"
              >
                Cancelar
              </button>
              <button
                onClick={ejecutarReapertura}
                className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded text-[10px] font-bold transition"
              >
                Confirmar Reapertura
              </button>
            </div>
          </div>
        </div>
      )}

      {mesParaHistorial && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[1px] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-slate-200 dark:border-gray-700 w-full max-w-lg p-4 space-y-3 font-sans">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-gray-700 pb-2">
              <div className="flex items-center gap-2 text-[#2383C2]">
                <History size={18} />
                <h3 className="text-[13px] font-bold uppercase">
                  Historial Reaperturas: {mesParaHistorial.mes} {mesParaHistorial.anio}
                </h3>
              </div>
              <button onClick={() => setMesParaHistorial(null)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2">
              {mesParaHistorial.historialReaperturas?.map((h, i) => (
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
                onClick={() => setMesParaHistorial(null)}
                className="px-3 py-1 bg-slate-200 dark:bg-gray-700 text-slate-700 dark:text-gray-300 rounded text-[10px] font-bold"
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

export default CierreMes;