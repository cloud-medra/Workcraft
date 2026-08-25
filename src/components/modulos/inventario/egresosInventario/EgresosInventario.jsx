import React, { useState, useEffect } from 'react';
import {
  collection,
  onSnapshot,
  doc,
  query,
  orderBy,
  serverTimestamp,
  writeBatch,
  getDocs,
  limit
} from 'firebase/firestore';
import { db } from '../../../../firebaseConfig';
import { Search, Plus, Trash2, ArrowRightLeft, AlertCircle, ShoppingBag, FileText } from 'lucide-react';
import { useToast } from '../../../../context/ToastContext';
import { useModal } from '../../../../context/ModalContext';
import { useUser } from '../../../../context/UserContext';
import Spinner from '../../../ui/Spinner';

const COL_BASE = "inventario_general";
const COL_TRANSITO = "inventario_transito";

const EgresosInventario = () => {
  const [cajas, setCajas] = useState([]);
  const [cargando, setCargando] = useState(false);

  // Búsqueda y Selección
  const [busqueda, setBusqueda] = useState('');
  const [cajaSeleccionada, setCajaSeleccionada] = useState(null);

  // Formulario de Selección Temporal
  const [itemIndexSeleccionado, setItemIndexSeleccionado] = useState('');
  const [cantidadRetiro, setCantidadRetiro] = useState(1);

  // Lista de Traspaso (Carrito de Salida)
  const [listaTraspaso, setListaTraspaso] = useState([]);

  // Datos Generales del Traspaso
  const [numeroDocumento, setNumeroDocumento] = useState('');
  const [motivo, setMotivo] = useState('Traspaso a Tránsito');
  const [solicitante, setSolicitante] = useState('');
  const [observaciones, setObservaciones] = useState('');

  const { showToast } = useToast();
  const { confirmAction } = useModal();
  const { userData } = useUser();

  // Función para obtener e incrementar el correlativo automático YYNNNN
  const generarSiguienteDocumento = async () => {
    try {
      const q = query(collection(db, COL_TRANSITO), orderBy("fechaRegistro", "desc"), limit(1));
      const querySnapshot = await getDocs(q);

      const yearPrefix = new Date().getFullYear().toString().slice(-2);

      if (querySnapshot.empty) {
        setNumeroDocumento(`${yearPrefix}0001`);
        return;
      }

      const ultimoDoc = querySnapshot.docs[0].data();
      const ultimoNumDoc = ultimoDoc.numeroDocumento;

      if (ultimoNumDoc && ultimoNumDoc.startsWith(yearPrefix)) {
        const correlativoActual = parseInt(ultimoNumDoc.slice(2), 10);
        const siguienteCorrelativo = (isNaN(correlativoActual) ? 1 : correlativoActual + 1)
          .toString()
          .padStart(4, '0');
        setNumeroDocumento(`${yearPrefix}${siguienteCorrelativo}`);
      } else {
        setNumeroDocumento(`${yearPrefix}0001`);
      }
    } catch (error) {
      console.error("Error al generar correlativo:", error);
      const yearPrefix = new Date().getFullYear().toString().slice(-2);
      setNumeroDocumento(`${yearPrefix}0001`);
    }
  };

  // Generar número correlativo inicial al cargar la pantalla
  useEffect(() => {
    generarSiguienteDocumento();
  }, []);

  // Escuchar cajas en tiempo real
  useEffect(() => {
    const q = query(collection(db, COL_BASE), orderBy("fechaRegistro", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setCajas(docs);

      if (cajaSeleccionada) {
        const actualizada = docs.find(c => c.id === cajaSeleccionada.id);
        if (actualizada) setCajaSeleccionada(actualizada);
      }
    });
    return () => unsubscribe();
  }, [cajaSeleccionada?.id]);

  const handleSeleccionarCaja = (caja) => {
    setCajaSeleccionada(caja);
    setItemIndexSeleccionado('');
    setCantidadRetiro(1);
  };

  const itemActual = (cajaSeleccionada && itemIndexSeleccionado !== '') 
    ? cajaSeleccionada.items[itemIndexSeleccionado] 
    : null;

  // AGREGAR ÍTEM COMPLETO AL CARRITO DE TRASPASO
  const handleAgregarALista = () => {
    if (!cajaSeleccionada) return showToast("Selecciona una caja", "error");
    if (itemIndexSeleccionado === '') return showToast("Selecciona un ítem/lote", "error");

    const cant = Number(cantidadRetiro);
    if (isNaN(cant) || cant <= 0) return showToast("Ingresa una cantidad válida", "error");

    const yaAgregadoEnCarrito = listaTraspaso
      .filter(linea => linea.cajaId === cajaSeleccionada.id && linea.itemIndex === Number(itemIndexSeleccionado))
      .reduce((acc, linea) => acc + linea.cantidadRetirar, 0);

    const stockDisponibleReal = itemActual.cantidad - yaAgregadoEnCarrito;

    if (cant > stockDisponibleReal) {
      return showToast(`La cantidad supera el stock disponible en este lote (${stockDisponibleReal} disp.)`, "error");
    }

    const nuevaLinea = {
      idTemp: Date.now() + Math.random(),
      cajaId: cajaSeleccionada.id,
      nombreCaja: cajaSeleccionada.nombreCaja,
      ubicacionOrigen: cajaSeleccionada.ubicacion || '',
      itemIndex: Number(itemIndexSeleccionado),
      cantidadRetirar: cant,
      itemOriginal: { ...itemActual }
    };

    setListaTraspaso([...listaTraspaso, nuevaLinea]);
    setCantidadRetiro(1);
    showToast("Ítem y lote agregados a la lista de tránsito", "success");
  };

  const handleEliminarDeLista = (idTemp) => {
    setListaTraspaso(listaTraspaso.filter(item => item.idTemp !== idTemp));
  };

  // CONFIRMAR TRASPASO COMPLETO
  const handleConfirmarTraspaso = () => {
    if (listaTraspaso.length === 0) {
      return showToast("La lista de traspaso está vacía", "error");
    }

    if (!numeroDocumento.trim()) {
      return showToast("Esperando generación de número de documento...", "error");
    }

    confirmAction(
      "Confirmar Traspaso a Tránsito",
      `¿Deseas descontar los ${listaTraspaso.length} ítem(s) bajo el documento N° ${numeroDocumento}?`,
      async () => {
        setCargando(true);
        try {
          const batch = writeBatch(db);

          const retirosPorCaja = {};
          listaTraspaso.forEach(linea => {
            if (!retirosPorCaja[linea.cajaId]) {
              retirosPorCaja[linea.cajaId] = [];
            }
            retirosPorCaja[linea.cajaId].push(linea);
          });

          for (const cajaId in retirosPorCaja) {
            const cajaDoc = cajas.find(c => c.id === cajaId);
            if (!cajaDoc) continue;

            const nuevosItems = structuredClone(cajaDoc.items);
            const lineasDeEstaCaja = retirosPorCaja[cajaId];

            lineasDeEstaCaja.forEach(linea => {
              nuevosItems[linea.itemIndex].cantidad -= linea.cantidadRetirar;
            });

            const cajaRef = doc(db, COL_BASE, cajaId);
            batch.update(cajaRef, {
              items: nuevosItems,
              ultimaModificacion: serverTimestamp()
            });

            const logRef = doc(collection(db, COL_BASE, cajaId, "logs"));
            batch.set(logRef, {
              accion: 'TRASPASO_TRANSITO',
              numeroDocumento: numeroDocumento.trim(),
              detalles: {
                motivo,
                solicitante: solicitante.trim() || 'No especificado',
                observaciones: observaciones.trim(),
                itemsTrasladados: lineasDeEstaCaja.map(l => ({
                  ...l.itemOriginal,
                  cantidadTraspasada: l.cantidadRetirar
                }))
              },
              usuario: userData?.nombreCompleto || 'Usuario Desconocido',
              usuarioEmail: userData?.email || '',
              fecha: new Date(),
              timestamp: serverTimestamp()
            });
          }

          const transitoRef = doc(collection(db, COL_TRANSITO));
          
          const itemsFinalesTransito = listaTraspaso.map(linea => ({
            ...linea.itemOriginal,
            cajaOrigenId: linea.cajaId,
            nombreCajaOrigen: linea.nombreCaja,
            ubicacionOrigen: linea.ubicacionOrigen,
            cantidadTraspasada: linea.cantidadRetirar,
            fechaAgregadoLista: new Date()
          }));

          batch.set(transitoRef, {
            numeroDocumento: numeroDocumento.trim(),
            estado: 'EN_TRANSITO',
            motivo,
            solicitante: solicitante.trim() || 'No especificado',
            observaciones: observaciones.trim(),
            items: itemsFinalesTransito,
            totalUnidades: listaTraspaso.reduce((acc, i) => acc + i.cantidadRetirar, 0),
            registradoPor: userData?.nombreCompleto || 'Usuario',
            usuarioEmail: userData?.email || '',
            fechaRegistro: serverTimestamp()
          });

          await batch.commit();

          showToast("Traspaso a tránsito realizado con éxito", "success");

          setListaTraspaso([]);
          setItemIndexSeleccionado('');
          setCantidadRetiro(1);
          setSolicitante('');
          setObservaciones('');

          // Generar automáticamente el correlativo para el próximo documento
          await generarSiguienteDocumento();
        } catch (error) {
          console.error("Error al procesar el traspaso:", error);
          showToast("Error al procesar el traspaso: " + error.message, "error");
        } finally {
          setCargando(false);
        }
      }
    );
  };

  const cajasFiltradas = cajas.filter(c => {
    const term = busqueda.toLowerCase();
    return (
      c.nombreCaja?.toLowerCase().includes(term) ||
      c.ubicacion?.toLowerCase().includes(term) ||
      c.items?.some(i => 
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
            <Spinner size="md" color="#2383C2" />
            <h3 className="text-[#2383C2] font-bold text-[13px]">Procesando traspaso a tránsito...</h3>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="px-3 py-2 flex items-center justify-between border-b border-gray-200 dark:border-gray-700 bg-amber-50/50 dark:bg-gray-800/80">
        <h2 className="text-[12px] font-bold text-gray-700 dark:text-gray-100 flex items-center gap-1.5">
          <ArrowRightLeft size={14} className="text-amber-600" />
          EGRESO Y TRASPASO DE INSUMOS A TRÁNSITO POR LOTES
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-hidden">
        
        {/* PANEL 1: Selección de Caja */}
        <div className="lg:col-span-3 p-2.5 border-b lg:border-b-0 lg:border-r border-gray-200 dark:border-gray-700 flex flex-col h-full overflow-hidden bg-gray-50/30 dark:bg-gray-900/20">
          <label className="font-bold text-gray-700 dark:text-gray-300 mb-1 block">
            1. Seleccionar Caja
          </label>
          <div className="relative mb-2">
            <Search size={13} className="absolute left-2.5 top-2.5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar caja, ítem o lote..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-8 pr-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-[10.5px]"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
            {cajasFiltradas.map((caja) => {
              const isSelected = cajaSeleccionada?.id === caja.id;
              return (
                <div
                  key={caja.id}
                  onClick={() => handleSeleccionarCaja(caja)}
                  className={`p-2 rounded-md border cursor-pointer transition ${
                    isSelected
                      ? 'border-amber-500 bg-amber-50/40 dark:bg-amber-950/20 text-gray-900 dark:text-white font-semibold'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300'
                  }`}
                >
                  <div className="font-bold text-gray-800 dark:text-gray-200">{caja.nombreCaja}</div>
                  <div className="text-[10px] text-gray-500 dark:text-gray-400">
                    Ubicación: {caja.ubicacion || 'S/U'} | Ítems: {caja.items?.length || 0}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* PANEL 2: Selección de Ítem / Lote */}
        <div className="lg:col-span-4 p-2.5 border-b lg:border-b-0 lg:border-r border-gray-200 dark:border-gray-700 flex flex-col h-full overflow-y-auto">
          <label className="font-bold text-gray-700 dark:text-gray-300 mb-1 block">
            2. Seleccionar Ítem y Lote
          </label>

          {!cajaSeleccionada ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-4 text-center">
              <AlertCircle size={28} className="mb-1 text-gray-300 dark:text-gray-600" />
              <p>Selecciona una caja a la izquierda</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="bg-amber-50 dark:bg-amber-950/20 p-2 rounded border border-amber-200 dark:border-amber-900/30">
                <span className="text-[9.5px] font-bold text-amber-700 dark:text-amber-400 block uppercase">Caja Activa</span>
                <span className="font-bold text-gray-800 dark:text-gray-100 text-[11.5px]">{cajaSeleccionada.nombreCaja}</span>
              </div>

              <div>
                <label className="font-semibold text-gray-600 dark:text-gray-400 block mb-0.5">Ítem / Lote Disponible *</label>
                <select
                  value={itemIndexSeleccionado}
                  onChange={(e) => setItemIndexSeleccionado(e.target.value)}
                  className="w-full p-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100"
                >
                  <option value="">-- Escoger producto y lote --</option>
                  {cajaSeleccionada.items?.map((item, idx) => (
                    <option key={idx} value={idx} disabled={item.cantidad <= 0}>
                      {item.tipo || item.codigo} | Lote: {item.lote || 'S/L'} (Stock: {item.cantidad})
                    </option>
                  ))}
                </select>
              </div>

              {itemActual && (
                <div className="bg-gray-50 dark:bg-gray-700/40 p-2 rounded border text-[10px] space-y-1">
                  <div><span className="text-gray-400">Código/Ref:</span> <b>{itemActual.codigo || 'N/A'} / {itemActual.referencia || 'N/A'}</b></div>
                  <div><span className="text-gray-400">Lote:</span> <b className="text-amber-600 dark:text-amber-400">{itemActual.lote || 'S/L'}</b></div>
                  <div><span className="text-gray-400">Vencimiento:</span> <b>{itemActual.vencimiento || 'S/V'}</b></div>
                  <div><span className="text-gray-400">Stock Actual:</span> <b className="text-blue-600">{itemActual.cantidad} uds</b></div>
                </div>
              )}

              <div>
                <label className="font-semibold text-gray-600 dark:text-gray-400 block mb-0.5">Cantidad a Traspasar *</label>
                <input
                  type="number"
                  min="1"
                  max={itemActual ? itemActual.cantidad : 1}
                  value={cantidadRetiro}
                  onChange={(e) => setCantidadRetiro(e.target.value)}
                  className="w-full p-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 font-bold"
                />
              </div>

              <button
                type="button"
                onClick={handleAgregarALista}
                disabled={!itemActual || itemActual.cantidad <= 0}
                className="w-full py-1.5 px-3 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-300 text-white font-bold rounded flex items-center justify-center gap-1.5 transition"
              >
                <Plus size={14} />
                Agregar a Lista de Tránsito
              </button>
            </div>
          )}
        </div>

        {/* PANEL 3: Resumen y Traspaso */}
        <div className="lg:col-span-5 p-2.5 flex flex-col h-full bg-gray-50/20 dark:bg-gray-900/10">
          <div className="flex items-center justify-between mb-1.5">
            <label className="font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1">
              <ShoppingBag size={13} className="text-amber-600" />
              3. Resumen de Salida a Tránsito ({listaTraspaso.length})
            </label>
            {listaTraspaso.length > 0 && (
              <button
                onClick={() => setListaTraspaso([])}
                className="text-[10px] text-red-500 hover:underline"
              >
                Vaciar lista
              </button>
            )}
          </div>

          {/* Tabla Resumen */}
          <div className="flex-1 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800 mb-2">
            {listaTraspaso.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 p-4 text-center">
                <p>No has agregado ítems ni lotes a la lista aún.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-[10px]">
                <thead className="bg-gray-100 dark:bg-gray-700 sticky top-0 text-gray-600 dark:text-gray-300">
                  <tr>
                    <th className="p-1.5">Caja</th>
                    <th className="p-1.5">Ítem / Lote</th>
                    <th className="p-1.5 text-center">Cant.</th>
                    <th className="p-1.5 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {listaTraspaso.map((linea) => (
                    <tr key={linea.idTemp} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                      <td className="p-1.5 font-semibold text-gray-700 dark:text-gray-300">{linea.nombreCaja}</td>
                      <td className="p-1.5">
                        <div className="font-bold text-gray-800 dark:text-gray-100">{linea.itemOriginal.tipo || linea.itemOriginal.codigo}</div>
                        <div className="text-[9px] text-amber-600 dark:text-amber-400">Lote: {linea.itemOriginal.lote || 'S/L'}</div>
                      </td>
                      <td className="p-1.5 text-center font-bold text-blue-600">{linea.cantidadRetirar}</td>
                      <td className="p-1.5 text-center">
                        <button
                          onClick={() => handleEliminarDeLista(linea.idTemp)}
                          className="text-red-500 hover:text-red-700 p-0.5"
                          title="Quitar ítem"
                        >
                          <Trash2 size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Formulario e Iniciar Traspaso */}
          <div className="space-y-1.5 pt-1 border-t border-gray-200 dark:border-gray-700">
            <div>
              <label className="font-semibold text-gray-600 dark:text-gray-400 block mb-0.5">
                N° de Documento / Guía / Orden (Autogenerado)
              </label>
              <div className="relative">
                <FileText size={13} className="absolute left-2 top-2 text-gray-400" />
                <input
                  type="text"
                  readOnly
                  value={numeroDocumento}
                  placeholder="Cargando..."
                  className="w-full pl-7 p-1 border border-amber-300 dark:border-amber-600/50 rounded bg-amber-100/50 dark:bg-gray-700/80 text-[10.5px] font-bold text-amber-900 dark:text-amber-300 cursor-not-allowed focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              <input
                type="text"
                placeholder="Solicitante / Destino"
                value={solicitante}
                onChange={(e) => setSolicitante(e.target.value)}
                className="w-full p-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-[10px]"
              />
              <input
                type="text"
                placeholder="Observaciones"
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                className="w-full p-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-[10px]"
              />
            </div>

            <button
              type="button"
              onClick={handleConfirmarTraspaso}
              disabled={listaTraspaso.length === 0}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white font-bold rounded shadow transition flex items-center justify-center gap-1.5 text-[11.5px]"
            >
              <ArrowRightLeft size={15} />
              Confirmar y Dejar en Tránsito ({listaTraspaso.reduce((a, b) => a + b.cantidadRetirar, 0)} uds)
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default EgresosInventario;