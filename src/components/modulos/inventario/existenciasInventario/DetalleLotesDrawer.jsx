import React, { useMemo } from 'react';
import { X, Package, Tag, Box, Hash, Calendar, Layers } from 'lucide-react';

/**
 * Panel lateral (Slide-over) para mostrar el desglose detallado 
 * de lotes, cajas e ítems individuales de una referencia consolidada.
 */
const DetalleLotesDrawer = ({ isOpen, onClose, producto, cajas = [] }) => {
  if (!isOpen || !producto) return null;

  // Filtrar y extraer todas las apariciones/lotes específicos de esta referencia/producto
  const desgloseDetallado = useMemo(() => {
    const lista = [];

    if (!Array.isArray(cajas)) return lista;

    cajas.forEach((caja) => {
      if (caja.items && Array.isArray(caja.items)) {
        caja.items.forEach((item) => {
          const refRaw = (item.referencia || '').toString().trim().toUpperCase();
          const tipoTexto = (item.tipo || item.descripcion || 'Sin descripción').toString().trim().toUpperCase();

          // Comprobar si el ítem pertenece a esta consolidación
          const coincideRef = producto.referencia !== 'SIN REFERENCIA' && refRaw === producto.referencia;
          const coincideDesc = producto.referencia === 'SIN REFERENCIA' && tipoTexto === producto.tipo.toUpperCase();

          if (coincideRef || coincideDesc) {
            lista.push({
              idItem: item.id || Math.random().toString(),
              nombreCaja: caja.nombreCaja || 'Caja sin nombre',
              consecutivoCaja: caja.consecutivo || 'S/N',
              fechaRegistro: caja.fechaRegistro || null,
              lote: item.lote || 'S/L',
              vencimiento: item.vencimiento || item.fechaVencimiento || 'N/A',
              cantidad: Number(item.cantidad) || 0,
              precioUnitario: Number(item.precio || item.precioUnitario) || 0,
              codigo: item.codigo || 'S/C',
              descripcion: item.descripcion || item.tipo || ''
            });
          }
        });
      }
    });

    return lista;
  }, [producto, cajas]);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-[2px] transition-opacity flex justify-end">
      {/* Overlay para cerrar al hacer clic afuera */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Contenedor del Drawer deslizable */}
      <div className="relative w-full max-w-md bg-white dark:bg-gray-800 h-full shadow-2xl flex flex-col border-l border-gray-200 dark:border-gray-700 z-10 animate-in slide-in-from-right duration-200">
        
        {/* Header del Panel */}
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="text-[#2383C2]" size={16} />
            <div>
              <h3 className="text-[12px] font-bold text-gray-800 dark:text-gray-100 uppercase tracking-wide">
                Detalle de Lotes y Ubicación
              </h3>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">
                {producto.referencia !== 'SIN REFERENCIA' ? producto.referencia : producto.tipo}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Resumen Tarjeta Superior */}
        <div className="p-3 bg-blue-50/50 dark:bg-sky-950/20 border-b border-gray-200 dark:border-gray-700/60 grid grid-cols-3 gap-2 text-[10px]">
          <div className="flex flex-col">
            <span className="text-gray-500 dark:text-gray-400 font-semibold">Código:</span>
            <span className="font-mono text-gray-700 dark:text-gray-200 font-bold">{producto.codigo || 'S/C'}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-gray-500 dark:text-gray-400 font-semibold">Total Stock:</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">{producto.cantidadTotal.toLocaleString('es-ES')} Ud.</span>
          </div>
          <div className="flex flex-col">
            <span className="text-gray-500 dark:text-gray-400 font-semibold">Lotes Distintos:</span>
            <span className="font-bold text-[#2383C2]">{producto.lotes?.size || 0} Lote(s)</span>
          </div>
        </div>

        {/* Lista de Entradas/Lotes */}
        <div className="flex-grow overflow-auto p-3 space-y-2.5">
          {desgloseDetallado.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-[11px] italic">
              No se encontraron desglices para esta referencia.
            </div>
          ) : (
            desgloseDetallado.map((det, index) => (
              <div
                key={`${det.idItem}-${index}`}
                className="p-2.5 bg-white dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm hover:border-[#2383C2] transition-colors text-[10.5px] space-y-1.5"
              >
                {/* Cabecera del ítem / Lote */}
                <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-1">
                  <span className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-1">
                    <Tag size={12} className="text-[#2383C2]" />
                    Lote: <span className="font-mono text-blue-600 dark:text-sky-400">{det.lote}</span>
                  </span>
                  <span className="px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold rounded text-[9.5px]">
                    {det.cantidad.toLocaleString('es-ES')} Ud.
                  </span>
                </div>

                {/* Detalles de Ubicación y Fechas */}
                <div className="grid grid-cols-2 gap-1.5 text-gray-600 dark:text-gray-300">
                  <div className="flex items-center gap-1">
                    <Box size={11} className="text-gray-400" />
                    <span>Caja: <strong>{det.nombreCaja}</strong></span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Hash size={11} className="text-gray-400" />
                    <span>N° Cierre: <strong>{det.consecutivoCaja}</strong></span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar size={11} className="text-gray-400" />
                    <span>Vencimiento: <strong className="text-amber-600 dark:text-amber-400">{det.vencimiento}</strong></span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Package size={11} className="text-gray-400" />
                    <span>P. Unit: <strong>${det.precioUnitario.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</strong></span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer del Drawer */}
        <div className="p-2.5 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 text-right">
          <button
            onClick={onClose}
            className="px-3 py-1 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded text-[11px] font-semibold transition-colors"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};

export default DetalleLotesDrawer;