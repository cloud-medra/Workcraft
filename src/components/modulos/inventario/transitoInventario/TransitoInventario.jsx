import React, { useState, useEffect } from 'react';
import {
  collection,
  onSnapshot,
  doc,
  query,
  orderBy,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '../../../../firebaseConfig';
import { 
  Truck, 
  RotateCcw, 
  CheckCircle, 
  Search, 
  FileText, 
  PackageCheck, 
  Calendar, 
  User, 
  FileCheck,
  Check,
  Undo2,
  MessageSquare,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { useToast } from '../../../../context/ToastContext';
import { useModal } from '../../../../context/ModalContext';
import { useUser } from '../../../../context/UserContext';
import Spinner from '../../../ui/Spinner';

const COL_TRANSITO = "inventario_transito";
const COL_GENERAL = "inventario_general";
const COL_EGRESOS = "inventario_egresos";

const TransitoInventario = () => {
  const [documentosTransito, setDocumentosTransito] = useState([]);
  const [cajasBase, setCajasBase] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [busqueda, setBusqueda] = useState('');

  // Estado del modal de procesamiento
  const [docSeleccionado, setDocSeleccionado] = useState(null);
  const [cantidadesDevolver, setCantidadesDevolver] = useState({});
  const [cantidadesConsumir, setCantidadesConsumir] = useState({});
  const [observacionesPorItem, setObservacionesPorItem] = useState({});

  const { showToast } = useToast();
  const { confirmAction } = useModal();
  const { userData } = useUser();

  // Escuchar colecciones
  useEffect(() => {
    const qTransito = query(collection(db, COL_TRANSITO), orderBy("fechaRegistro", "desc"));
    const unsubTransito = onSnapshot(qTransito, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setDocumentosTransito(docs.filter(d => d.estado === 'EN_TRANSITO'));
    });

    const qCajas = query(collection(db, COL_GENERAL));
    const unsubCajas = onSnapshot(qCajas, (snapshot) => {
      setCajasBase(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubTransito();
      unsubCajas();
    };
  }, []);

  // Abrir modal e inicializar estados limpios
  const handleAbrirGestion = (docTransito) => {
    setDocSeleccionado(docTransito);
    
    const devIniciales = {};
    const consIniciales = {};
    const obsIniciales = {};

    // Por defecto inicializamos todo usado
    docTransito.items.forEach((item, index) => {
      devIniciales[index] = 0;
      consIniciales[index] = item.cantidadTraspasada;
      obsIniciales[index] = '';
    });

    setCantidadesDevolver(devIniciales);
    setCantidadesConsumir(consIniciales);
    setObservacionesPorItem(obsIniciales);
  };

  const handleCerrarModal = () => {
    setDocSeleccionado(null);
    setCantidadesDevolver({});
    setCantidadesConsumir({});
    setObservacionesPorItem({});
  };

  // ACTUALIZACIÓN DIRECTA Y VISIBLE DE INPUTS
  const handleConsumirChange = (index, valorTexto, max) => {
    const num = valorTexto === '' ? '' : Math.max(0, parseInt(valorTexto, 10) || 0);
    setCantidadesConsumir(prev => ({ ...prev, [index]: num }));
    
    // Auto-ajustar devolución si el valor es numérico
    if (typeof num === 'number') {
      const resto = Math.max(0, max - num);
      setCantidadesDevolver(prev => ({ ...prev, [index]: resto }));
    }
  };

  const handleDevolverChange = (index, valorTexto, max) => {
    const num = valorTexto === '' ? '' : Math.max(0, parseInt(valorTexto, 10) || 0);
    setCantidadesDevolver(prev => ({ ...prev, [index]: num }));

    // Auto-ajustar consumo si el valor es numérico
    if (typeof num === 'number') {
      const resto = Math.max(0, max - num);
      setCantidadesConsumir(prev => ({ ...prev, [index]: resto }));
    }
  };

  // ACCIONES RÁPIDAS DIRECTAS
  const handleMarcarTodoUsado = (index, max) => {
    setCantidadesConsumir(prev => ({ ...prev, [index]: max }));
    setCantidadesDevolver(prev => ({ ...prev, [index]: 0 }));
  };

  const handleMarcarTodoDevuelto = (index, max) => {
    setCantidadesConsumir(prev => ({ ...prev, [index]: 0 }));
    setCantidadesDevolver(prev => ({ ...prev, [index]: max }));
  };

  const handleObservacionChange = (index, texto) => {
    setObservacionesPorItem(prev => ({ ...prev, [index]: texto }));
  };

  // VALIDACIÓN Y PROCESAMIENTO
  const handleProcesarTransito = () => {
    if (!docSeleccionado) return;

    // Verificar si hay items con errores o incoherencias
    let errores = [];
    docSeleccionado.items.forEach((item, idx) => {
      const cons = Number(cantidadesConsumir[idx]) || 0;
      const dev = Number(cantidadesDevolver[idx]) || 0;
      const max = item.cantidadTraspasada;

      if (cons + dev !== max) {
        errores.push(`En "${item.tipo || item.codigo}" la suma de ocupados (${cons}) + devueltos (${dev}) debe ser igual a ${max}.`);
      }
    });

    if (errores.length > 0) {
      showToast(errores[0], "warning");
      return;
    }

    let totalEgresado = 0;
    let totalDevuelto = 0;

    docSeleccionado.items.forEach((_, idx) => {
      totalEgresado += Number(cantidadesConsumir[idx]) || 0;
      totalDevuelto += Number(cantidadesDevolver[idx]) || 0;
    });

    confirmAction(
      "Confirmar Registro Final",
      `¿Deseas guardar los cambios?\n\n- Ocupados / Egresados: ${totalEgresado} uds.\n- Reingreso a stock: ${totalDevuelto} uds.`,
      async () => {
        setCargando(true);
        try {
          const batch = writeBatch(db);

          const itemsEgresadosFinales = [];
          const itemsDevueltosFinales = [];
          const devolucionesPorCaja = {};

          docSeleccionado.items.forEach((item, index) => {
            const cantCons = Number(cantidadesConsumir[index]) || 0;
            const cantDev = Number(cantidadesDevolver[index]) || 0;
            const obsDetalle = observacionesPorItem[index]?.trim() || 'Sin detalles especificados';

            if (cantCons > 0) {
              itemsEgresadosFinales.push({
                ...item,
                cantidadEgresada: cantCons,
                observacionInsumo: obsDetalle,
                fechaEgreso: new Date()
              });
            }

            if (cantDev > 0) {
              const itemDevuelto = {
                ...item,
                cantidadDevuelta: cantDev,
                observacionDevolucion: obsDetalle
              };

              itemsDevueltosFinales.push(itemDevuelto);

              if (!devolucionesPorCaja[item.cajaOrigenId]) {
                devolucionesPorCaja[item.cajaOrigenId] = [];
              }
              devolucionesPorCaja[item.cajaOrigenId].push({
                itemRef: itemDevuelto,
                cantidadDevuelta: cantDev,
                observacion: obsDetalle
              });
            }
          });

          // 1. Devolver al inventario general
          for (const cajaId in devolucionesPorCaja) {
            const cajaDoc = cajasBase.find(c => c.id === cajaId);
            if (!cajaDoc) continue;

            const nuevosItems = structuredClone(cajaDoc.items);
            const devoluciones = devolucionesPorCaja[cajaId];

            devoluciones.forEach(({ itemRef, cantidadDevuelta }) => {
              const idxEnCaja = nuevosItems.findIndex(i => 
                (i.codigo === itemRef.codigo || i.tipo === itemRef.tipo) && 
                i.lote === itemRef.lote
              );

              if (idxEnCaja !== -1) {
                nuevosItems[idxEnCaja].cantidad += cantidadDevuelta;
              } else {
                nuevosItems.push({
                  codigo: itemRef.codigo || '',
                  tipo: itemRef.tipo || '',
                  referencia: itemRef.referencia || '',
                  lote: itemRef.lote || 'S/L',
                  vencimiento: itemRef.vencimiento || 'S/V',
                  cantidad: cantidadDevuelta
                });
              }
            });

            const cajaRef = doc(db, COL_GENERAL, cajaId);
            batch.update(cajaRef, {
              items: nuevosItems,
              ultimaModificacion: serverTimestamp()
            });

            const logRef = doc(collection(db, COL_GENERAL, cajaId, "logs"));
            batch.set(logRef, {
              accion: 'REINGRESO_DESDE_TRANSITO',
              numeroDocumento: docSeleccionado.numeroDocumento,
              detalles: {
                itemsDevueltos: devoluciones.map(d => ({
                  tipo: d.itemRef.tipo || d.itemRef.codigo,
                  lote: d.itemRef.lote,
                  cantidadDevuelta: d.cantidadDevuelta,
                  observacion: d.observacion
                }))
              },
              usuario: userData?.nombreCompleto || 'Usuario',
              fecha: new Date(),
              timestamp: serverTimestamp()
            });
          }

          // 2. Guardar egresos definitivos
          if (itemsEgresadosFinales.length > 0) {
            const egresoRef = doc(collection(db, COL_EGRESOS));
            batch.set(egresoRef, {
              numeroDocumento: docSeleccionado.numeroDocumento,
              motivoOriginal: docSeleccionado.motivo,
              solicitante: docSeleccionado.solicitante,
              observacionOriginal: docSeleccionado.observaciones || '',
              itemsEgresados: itemsEgresadosFinales,
              totalUnidadesEgresadas: totalEgresado,
              totalUnidadesDevueltasStock: totalDevuelto,
              registradoPor: userData?.nombreCompleto || 'Usuario',
              usuarioEmail: userData?.email || '',
              fechaEfectivaEgreso: serverTimestamp(),
              fechaInicioTransito: docSeleccionado.fechaRegistro || null
            });
          }

          // 3. Finalizar documento en tránsito
          const docTransitoRef = doc(db, COL_TRANSITO, docSeleccionado.id);
          batch.update(docTransitoRef, {
            estado: 'PROCESADO',
            fechaProcesado: serverTimestamp(),
            procesadoPor: userData?.nombreCompleto || 'Usuario',
            resumenFinal: {
              unidadesEgresadas: totalEgresado,
              unidadesDevueltas: totalDevuelto,
              itemsDevueltos: itemsDevueltosFinales,
              itemsEgresados: itemsEgresadosFinales
            }
          });

          await batch.commit();

          showToast("Registro completado con éxito", "success");
          handleCerrarModal();
        } catch (error) {
          console.error("Error al procesar el tránsito:", error);
          showToast("Error al guardar: " + error.message, "error");
        } finally {
          setCargando(false);
        }
      }
    );
  };

  const documentosFiltrados = documentosTransito.filter(d => {
    const term = busqueda.toLowerCase();
    return (
      d.numeroDocumento?.toLowerCase().includes(term) ||
      d.solicitante?.toLowerCase().includes(term) ||
      d.motivo?.toLowerCase().includes(term) ||
      d.items?.some(i => 
        i.tipo?.toLowerCase().includes(term) || 
        i.codigo?.toLowerCase().includes(term) ||
        i.lote?.toLowerCase().includes(term)
      )
    );
  });

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden text-[11px] relative">
      {cargando && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-gray-500/20 dark:bg-black/40 backdrop-blur-[2px]">
          <div className="bg-white/90 dark:bg-gray-800/90 p-4 rounded-xl shadow-xl flex flex-col items-center gap-3">
            <Spinner size="md" color="#D97706" />
            <h3 className="text-amber-600 font-bold text-[13px]">Guardando información...</h3>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="px-3 py-2 flex items-center justify-between border-b border-gray-200 dark:border-gray-700 bg-amber-50/60 dark:bg-gray-800">
        <div className="flex items-center gap-2">
          <Truck size={16} className="text-amber-600" />
          <h2 className="text-[12px] font-bold text-gray-700 dark:text-gray-100">
            INSUMOS EN TRÁNSITO
          </h2>
          <span className="bg-amber-200 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 font-extrabold px-2 py-0.5 rounded-full text-[10px]">
            {documentosTransito.length} pendiente(s)
          </span>
        </div>

        <div className="relative w-64">
          <Search size={13} className="absolute left-2.5 top-2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por N° doc, solicitante, lote..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-8 pr-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-[10.5px]"
          />
        </div>
      </div>

      {/* Lista de Tarjetas */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {documentosFiltrados.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 p-8 text-center">
            <PackageCheck size={36} className="mb-2 text-gray-300 dark:text-gray-600" />
            <p className="font-semibold text-[12px]">No hay insumos pendientes en tránsito</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {documentosFiltrados.map((docItem) => (
              <div 
                key={docItem.id}
                className="border border-amber-200 dark:border-amber-900/40 rounded-lg bg-white dark:bg-gray-800 shadow-sm hover:shadow transition flex flex-col overflow-hidden"
              >
                <div className="bg-amber-50 dark:bg-amber-950/30 px-3 py-2 border-b border-amber-100 dark:border-amber-900/20 flex justify-between items-center">
                  <div className="flex items-center gap-1.5 font-bold text-gray-800 dark:text-gray-100 text-[11.5px]">
                    <FileText size={14} className="text-amber-600" />
                    Doc N°: {docItem.numeroDocumento}
                  </div>
                  <span className="text-[9.5px] bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 px-1.5 py-0.5 rounded font-bold">
                    EN TRÁNSITO
                  </span>
                </div>

                <div className="p-2.5 flex-1 space-y-1.5">
                  <div className="flex justify-between items-center text-gray-600 dark:text-gray-300">
                    <span className="flex items-center gap-1"><User size={12} className="text-gray-400" /> Solicitante:</span>
                    <span className="font-bold">{docItem.solicitante || 'N/A'}</span>
                  </div>

                  <div className="flex justify-between items-center text-gray-600 dark:text-gray-300">
                    <span className="flex items-center gap-1"><Calendar size={12} className="text-gray-400" /> Fecha:</span>
                    <span>{docItem.fechaRegistro?.toDate ? docItem.fechaRegistro.toDate().toLocaleString() : 'Reciente'}</span>
                  </div>

                  <div className="border-t border-gray-100 dark:border-gray-700 pt-1.5">
                    <div className="font-bold text-gray-700 dark:text-gray-300 mb-1">Ítems entregados:</div>
                    <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                      {docItem.items?.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-gray-50 dark:bg-gray-750 p-1 rounded text-[10px]">
                          <div>
                            <span className="font-semibold text-gray-800 dark:text-gray-200">{item.tipo || item.codigo}</span>
                            <span className="text-amber-600 block text-[9px]">Lote: {item.lote || 'S/L'}</span>
                          </div>
                          <span className="font-extrabold text-blue-600">{item.cantidadTraspasada} uds</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="p-2 bg-gray-50 dark:bg-gray-900/30 border-t border-gray-100 dark:border-gray-700">
                  <button
                    onClick={() => handleAbrirGestion(docItem)}
                    className="w-full py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded flex items-center justify-center gap-1.5 transition text-[11px]"
                  >
                    <FileCheck size={14} />
                    Gestión de Devolución / Uso
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL CON RESPUESTA VISUAL Y INDICADORES EN TIEMPO REAL */}
      {docSeleccionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 backdrop-blur-xs">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden text-[11px]">
            
            <div className="px-4 py-3 bg-amber-600 text-white flex justify-between items-center">
              <div className="flex items-center gap-2 font-bold text-[12.5px]">
                <RotateCcw size={16} />
                Cierre de Tránsito - Doc N° {docSeleccionado.numeroDocumento}
              </div>
              <button onClick={handleCerrarModal} className="text-white hover:text-gray-200 font-bold text-[14px]">
                ✕
              </button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto space-y-3">
              <div className="grid grid-cols-2 gap-2 bg-amber-50/50 dark:bg-gray-700/40 p-2.5 rounded-lg border border-amber-100 dark:border-gray-600 text-gray-700 dark:text-gray-300">
                <div><b>Solicitante:</b> {docSeleccionado.solicitante}</div>
                <div><b>Motivo Original:</b> {docSeleccionado.motivo}</div>
              </div>

              <div className="space-y-3">
                {docSeleccionado.items?.map((item, idx) => {
                  const max = item.cantidadTraspasada;
                  const consVal = cantidadesConsumir[idx] ?? '';
                  const devVal = cantidadesDevolver[idx] ?? '';
                  
                  const consNum = Number(consVal) || 0;
                  const devNum = Number(devVal) || 0;
                  const suma = consNum + devNum;

                  const esCorrecto = suma === max;
                  const esExcedido = suma > max;
                  const esIncompleto = suma < max;

                  return (
                    <div key={idx} className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-750 space-y-2.5 shadow-xs">
                      
                      {/* Cabecera del Insumo */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex-1">
                          <div className="font-bold text-gray-800 dark:text-gray-100 text-[11.5px]">
                            {item.tipo || item.codigo}
                          </div>
                          <div className="text-[10px] text-gray-500 dark:text-gray-400">
                            Caja origen: <b>{item.nombreCajaOrigen}</b> | Lote: <b className="text-amber-600">{item.lote || 'S/L'}</b>
                          </div>
                          <div className="text-[10.5px] font-extrabold text-blue-600 mt-0.5">
                            Entregados originalmente: <span className="underline">{max} unidad(es)</span>
                          </div>
                        </div>

                        {/* Control de Cantidades */}
                        <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 p-2 rounded-md border border-gray-200 dark:border-gray-700">
                          
                          {/* Casilla Egreso / Ocupado */}
                          <div className="text-center">
                            <label className="block text-[8.5px] font-extrabold text-red-600 dark:text-red-400 uppercase mb-0.5">
                              Ocupado (Egreso)
                            </label>
                            <input
                              type="number"
                              min="0"
                              max={max}
                              value={consVal}
                              onChange={(e) => handleConsumirChange(idx, e.target.value, max)}
                              className="w-16 p-1 text-center border-2 border-red-300 dark:border-red-700 rounded bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 font-extrabold text-[13px] focus:outline-none focus:border-red-500"
                            />
                          </div>

                          <span className="text-gray-400 font-bold text-[14px] mt-2">+</span>

                          {/* Casilla Devolución / Stock */}
                          <div className="text-center">
                            <label className="block text-[8.5px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase mb-0.5">
                              Devuelto (Stock)
                            </label>
                            <input
                              type="number"
                              min="0"
                              max={max}
                              value={devVal}
                              onChange={(e) => handleDevolverChange(idx, e.target.value, max)}
                              className="w-16 p-1 text-center border-2 border-emerald-300 dark:border-emerald-700 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-extrabold text-[13px] focus:outline-none focus:border-emerald-500"
                            />
                          </div>

                          {/* Botones de Selección Rápida */}
                          <div className="flex flex-col gap-1 ml-1 border-l border-gray-200 dark:border-gray-700 pl-2">
                            <button
                              type="button"
                              onClick={() => handleMarcarTodoUsado(idx, max)}
                              className="text-[8.5px] px-2 py-0.5 bg-red-100 hover:bg-red-200 active:bg-red-300 text-red-700 rounded font-bold flex items-center gap-1 transition"
                            >
                              <Check size={10} /> Todo Ocupado
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMarcarTodoDevuelto(idx, max)}
                              className="text-[8.5px] px-2 py-0.5 bg-emerald-100 hover:bg-emerald-200 active:bg-emerald-300 text-emerald-700 rounded font-bold flex items-center gap-1 transition"
                            >
                              <Undo2 size={10} /> Todo Devuelto
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Estado visual de validación en tiempo real */}
                      <div className="flex items-center justify-between text-[10px] px-2 py-1 rounded bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700">
                        {esCorrecto && (
                          <div className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                            <CheckCircle2 size={13} />
                            Distribución correcta ({consNum} ocupados + {devNum} devueltos = {max} total)
                          </div>
                        )}

                        {esExcedido && (
                          <div className="text-red-600 dark:text-red-400 font-bold flex items-center gap-1">
                            <AlertTriangle size={13} />
                            Te pasaste por {suma - max} unidad(es). Máximo permitido: {max}.
                          </div>
                        )}

                        {esIncompleto && (
                          <div className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                            <AlertTriangle size={13} />
                            Faltan declarar {max - suma} unidad(es) de las {max} entregadas.
                          </div>
                        )}
                      </div>

                      {/* Observación por insumo */}
                      <div>
                        <label className="text-[9.5px] font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1 mb-0.5">
                          <MessageSquare size={11} className="text-amber-600" />
                          Detalle / Cliente / Observación para este insumo:
                        </label>
                        <input
                          type="text"
                          placeholder="Ej: 1 usado para Cliente A, 2 devueltos al almacén..."
                          value={observacionesPorItem[idx] || ''}
                          onChange={(e) => handleObservacionChange(idx, e.target.value)}
                          className="w-full p-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-[10px]"
                        />
                      </div>

                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="p-3 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
              <button
                type="button"
                onClick={handleCerrarModal}
                className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleProcesarTransito}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded flex items-center gap-1.5 shadow-sm"
              >
                <CheckCircle size={14} />
                Guardar y Confirmar
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default TransitoInventario;