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
  Search,  
  FileText,  
  PackageCheck,  
  Calendar,  
  User,  
  FileCheck,
  MapPin
} from 'lucide-react';
import { useToast } from '../../../../context/ToastContext';
import { useUser } from '../../../../context/UserContext';
import Spinner from '../../../ui/Spinner';
import GestionTransitoModal from './GestionTransitoModal';

const COL_TRANSITO = "inventario_transito";
const COL_GENERAL = "inventario_general";
const COL_EGRESOS = "inventario_egresos";

const TransitoInventario = () => {
  const [documentosTransito, setDocumentosTransito] = useState([]);
  const [cajasBase, setCajasBase] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [docSeleccionado, setDocSeleccionado] = useState(null);

  const { showToast } = useToast();
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

  // Lógica de guardado en Firestore alineada con Egresos
  // Ahora recibe "desglosePorItem": { [idx]: { egresos: [{cantidad, observacion}], devolver: number } }
  // - Cada salida (egreso) puede tener su propia cantidad y observación (ej: distintos clientes)
  // - "devolver" es una sola cantidad, sin observación
  // - Lo que sobra queda automáticamente en tránsito
  const handleConfirmarProcesamiento = async ({ desglosePorItem, destinoFinal, observacionGlobal }) => {
    if (!docSeleccionado) return;

    setCargando(true);
    try {
      const batch = writeBatch(db);

      const itemsEgresadosFinales = [];
      const itemsDevueltosFinales = [];
      const devolucionesPorCaja = {};
      const nuevosItemsTransito = [];
      let totalEgresado = 0;
      let totalDevuelto = 0;

      docSeleccionado.items.forEach((item, index) => {
        const { egresos = [], devolver = 0 } = desglosePorItem[index] || {};
        const sumaEgresos = egresos.reduce((acc, e) => acc + (Number(e.cantidad) || 0), 0);
        const cantDev = Number(devolver) || 0;
        const cantPendiente = item.cantidadTraspasada - (sumaEgresos + cantDev);

        totalEgresado += sumaEgresos;
        totalDevuelto += cantDev;

        // Cada salida se registra como su PROPIA línea de egreso, con su propia observación.
        // Esto permite, por ejemplo, distinguir "1 unidad -> Cliente A" de "1 unidad -> Cliente B".
        egresos.forEach((split) => {
          if (Number(split.cantidad) > 0) {
            itemsEgresadosFinales.push({
              ...item,
              cantidadEgresada: Number(split.cantidad),
              observacionInsumo: split.observacion?.trim() || 'Sin detalles especificados',
              fechaEgreso: new Date()
            });
          }
        });

        if (cantDev > 0) {
          const itemDevuelto = {
            ...item,
            cantidadDevuelta: cantDev
          };

          itemsDevueltosFinales.push(itemDevuelto);

          if (!devolucionesPorCaja[item.cajaOrigenId]) {
            devolucionesPorCaja[item.cajaOrigenId] = [];
          }
          devolucionesPorCaja[item.cajaOrigenId].push({
            itemRef: itemDevuelto,
            cantidadDevuelta: cantDev
          });
        }

        if (cantPendiente > 0) {
          nuevosItemsTransito.push({
            ...item,
            cantidadTraspasada: cantPendiente
          });
        }
      });

      // 1. Devolver al inventario general si aplica
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
          accion: 'REINGRESO_PARCIAL_DESDE_TRANSITO',
          numeroDocumento: docSeleccionado.numeroDocumento,
          detalles: {
            itemsDevueltos: devoluciones.map(d => ({
              tipo: d.itemRef.tipo || d.itemRef.codigo,
              lote: d.itemRef.lote,
              cantidadDevuelta: d.cantidadDevuelta
            }))
          },
          usuario: userData?.nombreCompleto || 'Usuario',
          fecha: new Date(),
          timestamp: serverTimestamp()
        });
      }

      // 2. Guardar egresos (Alineado con estructura de Egreso.jsx)
      // Nota: itemsEgresadosFinales ya viene con una línea por CADA salida registrada,
      // cada una con su propia cantidadEgresada y observacionInsumo.
      if (itemsEgresadosFinales.length > 0) {
        const egresoRef = doc(collection(db, COL_EGRESOS));
        batch.set(egresoRef, {
          numeroDocumento: docSeleccionado.numeroDocumento,
          motivoOriginal: docSeleccionado.motivo,
          solicitante: docSeleccionado.solicitante,
          destino: destinoFinal || docSeleccionado.destino || 'No especificado',
          observacionOriginal: docSeleccionado.observaciones || '',
          observacionCierre: observacionGlobal || '',
          itemsEgresados: itemsEgresadosFinales,
          totalUnidadesEgresadas: totalEgresado,
          totalUnidadesDevueltasStock: totalDevuelto,
          registradoPor: userData?.nombreCompleto || 'Usuario',
          usuarioEmail: userData?.email || '',
          fechaEfectivaEgreso: serverTimestamp(),
          fechaInicioTransito: docSeleccionado.fechaRegistro || null
        });
      }

      // 3. Actualizar documento en tránsito
      const docTransitoRef = doc(db, COL_TRANSITO, docSeleccionado.id);

      if (nuevosItemsTransito.length > 0) {
        batch.update(docTransitoRef, {
          items: nuevosItemsTransito,
          ultimaModificacion: serverTimestamp(),
          ultimoProcesadoPor: userData?.nombreCompleto || 'Usuario'
        });
      } else {
        batch.update(docTransitoRef, {
          estado: 'PROCESADO',
          fechaProcesado: serverTimestamp(),
          procesadoPor: userData?.nombreCompleto || 'Usuario',
          resumenFinal: {
            unidadesEgresadas: totalEgresado,
            unidadesDevueltas: totalDevuelto,
            itemsDevueltos: itemsDevueltosFinales,
            itemsEgresados: itemsEgresadosFinales,
            destinoFinal: destinoFinal,
            observacionCierre: observacionGlobal
          }
        });
      }

      await batch.commit();

      showToast("Registro completado con éxito", "success");
      setDocSeleccionado(null);
    } catch (error) {
      console.error("Error al procesar el tránsito:", error);
      showToast("Error al guardar: " + error.message, "error");
    } finally {
      setCargando(false);
    }
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
                    <span className="flex items-center gap-1"><MapPin size={12} className="text-gray-400" /> Destino:</span>
                    <span className="font-bold text-amber-700 dark:text-amber-400">{docItem.destino || docItem.tipoDestino || 'N/A'}</span>
                  </div>

                  <div className="flex justify-between items-center text-gray-600 dark:text-gray-300">
                    <span className="flex items-center gap-1"><Calendar size={12} className="text-gray-400" /> Fecha:</span>
                    <span>{docItem.fechaRegistro?.toDate ? docItem.fechaRegistro.toDate().toLocaleString() : 'Reciente'}</span>
                  </div>

                  {docItem.observaciones && (
                    <div className="text-[10px] bg-gray-50 dark:bg-gray-700/50 p-1.5 rounded border border-gray-100 dark:border-gray-700">
                      <span className="text-gray-400 block font-semibold">Observaciones:</span>
                      <p className="text-gray-600 dark:text-gray-300 italic">"{docItem.observaciones}"</p>
                    </div>
                  )}

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
                    onClick={() => setDocSeleccionado(docItem)}
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

      {/* Renderizado del Modal */}
      <GestionTransitoModal
        docSeleccionado={docSeleccionado}
        onClose={() => setDocSeleccionado(null)}
        onConfirm={handleConfirmarProcesamiento}
      />
    </div>
  );
};

export default TransitoInventario;