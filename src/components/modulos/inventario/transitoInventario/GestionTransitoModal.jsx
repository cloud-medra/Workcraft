import React, { useState, useEffect } from 'react';
import {
  RotateCcw,
  Check,
  Undo2,
  AlertTriangle,
  CheckCircle2,
  CheckCircle,
  MapPin,
  FileText,
  Plus,
  X,
  PackageMinus
} from 'lucide-react';
import { useToast } from '../../../../context/ToastContext';
import { useModal } from '../../../../context/ModalContext';

const crearSplitVacio = () => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  cantidad: '',
  observacion: ''
});

const GestionTransitoModal = ({ docSeleccionado, onClose, onConfirm }) => {
  const [desglosePorItem, setDesglosePorItem] = useState({});

  const [destinoFinal, setDestinoFinal] = useState('');
  const [observacionGlobal, setObservacionGlobal] = useState('');

  const { showToast } = useToast();
  const { confirmAction } = useModal();

  // Inicializar estados al abrir
  useEffect(() => {
    if (docSeleccionado) {
      const inicial = {};
      docSeleccionado.items.forEach((item, index) => {
        inicial[index] = { egresos: [], devolver: '' };
      });
      setDesglosePorItem(inicial);
      setDestinoFinal(docSeleccionado.destino || docSeleccionado.tipoDestino || '');
      setObservacionGlobal(docSeleccionado.observaciones || '');
    }
  }, [docSeleccionado]);

  if (!docSeleccionado) return null;

  // ---------- Helpers de cálculo ----------
  const getSumaEgresos = (idx) =>
    (desglosePorItem[idx]?.egresos || []).reduce((acc, e) => acc + (Number(e.cantidad) || 0), 0);

  const getDevolver = (idx) => Number(desglosePorItem[idx]?.devolver) || 0;

  // ---------- Manejadores: Salidas (múltiples por ítem) ----------
  const handleAgregarSalida = (idx) => {
    setDesglosePorItem(prev => ({
      ...prev,
      [idx]: {
        ...prev[idx],
        egresos: [...(prev[idx]?.egresos || []), crearSplitVacio()]
      }
    }));
  };

  const handleQuitarSalida = (idx, splitId) => {
    setDesglosePorItem(prev => ({
      ...prev,
      [idx]: {
        ...prev[idx],
        egresos: prev[idx].egresos.filter(e => e.id !== splitId)
      }
    }));
  };

  const handleCambiarSalida = (idx, splitId, campo, valor) => {
    setDesglosePorItem(prev => ({
      ...prev,
      [idx]: {
        ...prev[idx],
        egresos: prev[idx].egresos.map(e =>
          e.id === splitId
            ? { ...e, [campo]: campo === 'cantidad' ? (valor === '' ? '' : Math.max(0, parseInt(valor, 10) || 0)) : valor }
            : e
        )
      }
    }));
  };

  // ---------- Manejador: Devolver a stock (sin observación) ----------
  const handleCambiarDevolver = (idx, valorTexto) => {
    const num = valorTexto === '' ? '' : Math.max(0, parseInt(valorTexto, 10) || 0);
    setDesglosePorItem(prev => ({
      ...prev,
      [idx]: { ...prev[idx], devolver: num }
    }));
  };

  // ---------- Accesos rápidos ----------
  const handleTodoOcupado = (idx, max) => {
    setDesglosePorItem(prev => ({
      ...prev,
      [idx]: {
        egresos: [{ ...crearSplitVacio(), cantidad: max }],
        devolver: ''
      }
    }));
  };

  const handleTodoDevuelto = (idx, max) => {
    setDesglosePorItem(prev => ({
      ...prev,
      [idx]: { egresos: [], devolver: max }
    }));
  };

  const handleMantenerTransito = (idx) => {
    setDesglosePorItem(prev => ({
      ...prev,
      [idx]: { egresos: [], devolver: '' }
    }));
  };

  // ---------- Validación y confirmación ----------
  const handleProcesar = () => {
    let errores = [];
    let hayMovimiento = false;

    docSeleccionado.items.forEach((item, idx) => {
      const max = item.cantidadTraspasada;
      const egresos = desglosePorItem[idx]?.egresos || [];
      const sumaEgresos = getSumaEgresos(idx);
      const devolver = getDevolver(idx);
      const suma = sumaEgresos + devolver;
      const nombreItem = item.tipo || item.codigo;

      if (suma > max) {
        errores.push(`En "${nombreItem}" la suma de salidas (${sumaEgresos}) + devuelto (${devolver}) no puede superar las ${max} unidades disponibles.`);
      }

      // Si hay más de una salida, cada una necesita su propia observación para diferenciarlas
      if (egresos.length > 1) {
        const sinObservacion = egresos.some(e => !e.observacion || !e.observacion.trim());
        if (sinObservacion) {
          errores.push(`En "${nombreItem}" tienes varias salidas registradas: cada una necesita su propia observación para poder diferenciarlas (ej: nombre del cliente).`);
        }
      }

      // Cada salida debe tener cantidad > 0
      const salidaSinCantidad = egresos.some(e => !e.cantidad || Number(e.cantidad) <= 0);
      if (salidaSinCantidad) {
        errores.push(`En "${nombreItem}" hay una salida sin cantidad ingresada.`);
      }

      if (sumaEgresos > 0 || devolver > 0) hayMovimiento = true;
    });

    if (errores.length > 0) {
      showToast(errores[0], "warning");
      return;
    }

    if (!hayMovimiento) {
      showToast("Debes ingresar al menos una cantidad a dar salida o devolver.", "warning");
      return;
    }

    let totalEgresado = 0;
    let totalDevuelto = 0;
    let totalPendienteTransito = 0;

    docSeleccionado.items.forEach((item, idx) => {
      const max = item.cantidadTraspasada;
      const sumaEgresos = getSumaEgresos(idx);
      const devolver = getDevolver(idx);
      totalEgresado += sumaEgresos;
      totalDevuelto += devolver;
      totalPendienteTransito += (max - (sumaEgresos + devolver));
    });

    confirmAction(
      "Confirmar Registro",
      `¿Deseas guardar los cambios?\n\n- Destino: ${destinoFinal || 'N/A'}\n- Salidas / Egresados: ${totalEgresado} uds.\n- Reingreso a stock: ${totalDevuelto} uds.\n- Quedan en Tránsito: ${totalPendienteTransito} uds.`,
      () => {
        // Limpiar / normalizar antes de enviar (quita salidas con cantidad 0)
        const desgloseLimpio = {};
        docSeleccionado.items.forEach((item, idx) => {
          desgloseLimpio[idx] = {
            egresos: (desglosePorItem[idx]?.egresos || [])
              .filter(e => Number(e.cantidad) > 0)
              .map(e => ({ cantidad: Number(e.cantidad), observacion: (e.observacion || '').trim() })),
            devolver: Number(desglosePorItem[idx]?.devolver) || 0
          };
        });

        onConfirm({
          desglosePorItem: desgloseLimpio,
          destinoFinal,
          observacionGlobal
        });
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 backdrop-blur-xs">
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden text-[11px]">

        {/* Modal Header */}
        <div className="px-4 py-3 bg-amber-600 text-white flex justify-between items-center">
          <div className="flex items-center gap-2 font-bold text-[12.5px]">
            <RotateCcw size={16} />
            Cierre de Tránsito - Doc N° {docSeleccionado.numeroDocumento}
          </div>
          <button onClick={onClose} className="text-white hover:text-gray-200 font-bold text-[14px]">
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 flex-1 overflow-y-auto space-y-3">

          {/* Información general del documento incluyendo el Destino */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 bg-amber-50/50 dark:bg-gray-700/40 p-2.5 rounded-lg border border-amber-100 dark:border-gray-600 text-gray-700 dark:text-gray-300">
            <div><b>Solicitante:</b> {docSeleccionado.solicitante || 'N/A'}</div>
            <div><b>Motivo Original:</b> {docSeleccionado.motivo || 'N/A'}</div>
            <div className="flex items-center gap-1">
              <MapPin size={12} className="text-amber-600" />
              <span><b>Destino:</b> <span className="text-amber-700 dark:text-amber-400 font-bold">{docSeleccionado.destino || docSeleccionado.tipoDestino || 'N/A'}</span></span>
            </div>
          </div>

          {/* Listado de Ítems */}
          <div className="space-y-3">
            {docSeleccionado.items?.map((item, idx) => {
              const max = item.cantidadTraspasada;
              const egresos = desglosePorItem[idx]?.egresos || [];
              const devVal = desglosePorItem[idx]?.devolver ?? '';

              const sumaEgresos = getSumaEgresos(idx);
              const devNum = Number(devVal) || 0;
              const suma = sumaEgresos + devNum;

              const esValido = suma <= max;
              const esExcedido = suma > max;
              const quedaTransito = max - suma;

              return (
                <div key={idx} className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-750 space-y-2.5 shadow-xs">

                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
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

                    <div className="flex gap-1 flex-wrap justify-end">
                      <button type="button" onClick={() => handleTodoOcupado(idx, max)} className="text-[8.5px] px-2 py-1 bg-red-100 hover:bg-red-200 active:bg-red-300 text-red-700 rounded font-bold flex items-center gap-1 transition">
                        <Check size={10} /> Todo Ocupado
                      </button>
                      <button type="button" onClick={() => handleTodoDevuelto(idx, max)} className="text-[8.5px] px-2 py-1 bg-emerald-100 hover:bg-emerald-200 active:bg-emerald-300 text-emerald-700 rounded font-bold flex items-center gap-1 transition">
                        <Undo2 size={10} /> Todo Devuelto
                      </button>
                      <button type="button" onClick={() => handleMantenerTransito(idx)} className="text-[8.5px] px-2 py-1 bg-amber-100 hover:bg-amber-200 active:bg-amber-300 text-amber-700 rounded font-bold flex items-center gap-1 transition">
                        <PackageMinus size={10} /> Mantener en Tránsito
                      </button>
                    </div>
                  </div>

                  {/* SALIDA(S) / USO — pueden ser varias, cada una con su propia observación */}
                  <div className="bg-red-50/50 dark:bg-red-950/10 border border-red-100 dark:border-red-900/20 rounded-md p-2 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[9.5px] font-extrabold text-red-600 dark:text-red-400 uppercase">
                        Salida(s) / Uso (Egreso)
                      </label>
                      <button
                        type="button"
                        onClick={() => handleAgregarSalida(idx)}
                        className="text-[9px] px-1.5 py-0.5 bg-red-600 hover:bg-red-700 text-white rounded font-bold flex items-center gap-0.5"
                      >
                        <Plus size={10} /> Agregar salida
                      </button>
                    </div>

                    {egresos.length === 0 ? (
                      <p className="text-[9.5px] text-gray-400 italic">Sin salidas registradas para este ítem.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {egresos.map((split, sIdx) => (
                          <div key={split.id} className="flex items-center gap-1.5 bg-white dark:bg-gray-800 border border-red-200 dark:border-red-900/40 rounded p-1.5">
                            <span className="text-[9px] font-bold text-gray-400 w-4">{sIdx + 1}.</span>
                            <input
                              type="number"
                              min="0"
                              placeholder="Cant."
                              value={split.cantidad}
                              onChange={(e) => handleCambiarSalida(idx, split.id, 'cantidad', e.target.value)}
                              className="w-14 p-1 text-center border-2 border-red-300 dark:border-red-700 rounded bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 font-extrabold text-[12px] focus:outline-none focus:border-red-500"
                            />
                            <input
                              type="text"
                              placeholder={egresos.length > 1 ? "Observación (obligatoria, ej: Cliente X)" : "Observación (ej: Cliente X)"}
                              value={split.observacion}
                              onChange={(e) => handleCambiarSalida(idx, split.id, 'observacion', e.target.value)}
                              className="flex-1 p-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-[10px]"
                            />
                            <button
                              type="button"
                              onClick={() => handleQuitarSalida(idx, split.id)}
                              className="text-gray-400 hover:text-red-600 p-0.5"
                              title="Quitar esta salida"
                            >
                              <X size={13} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    {sumaEgresos > 0 && (
                      <div className="text-[9.5px] font-bold text-red-600 dark:text-red-400 text-right">
                        Total en salida: {sumaEgresos} uds
                      </div>
                    )}
                  </div>

                  {/* DEVUELTO A STOCK — sin observación */}
                  <div className="bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/20 rounded-md p-2 flex items-center justify-between gap-2">
                    <label className="text-[9.5px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase">
                      Devuelto a Stock (reingreso)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={max}
                      value={devVal}
                      onChange={(e) => handleCambiarDevolver(idx, e.target.value)}
                      className="w-16 p-1 text-center border-2 border-emerald-300 dark:border-emerald-700 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-extrabold text-[13px] focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* Resumen / validación de la fila */}
                  <div className="flex items-center justify-between text-[10px] px-2 py-1 rounded bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700">
                    {esValido && (
                      <div className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle2 size={13} />
                        <span>
                          {sumaEgresos} en salida + {devNum} devuelto(s)
                          {quedaTransito > 0 ? (
                            <b className="text-amber-600 dark:text-amber-400 ml-1">
                              ({quedaTransito} se mantienen en tránsito)
                            </b>
                          ) : (
                            " = Totalmente procesado"
                          )}
                        </span>
                      </div>
                    )}

                    {esExcedido && (
                      <div className="text-red-600 dark:text-red-400 font-bold flex items-center gap-1">
                        <AlertTriangle size={13} />
                        Excedes la cantidad entregada por {suma - max} unidad(es). Máximo disponible: {max}.
                      </div>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleProcesar}
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded flex items-center gap-1.5 shadow-sm"
          >
            <CheckCircle size={14} />
            Guardar y Confirmar
          </button>
        </div>

      </div>
    </div>
  );
};

export default GestionTransitoModal;