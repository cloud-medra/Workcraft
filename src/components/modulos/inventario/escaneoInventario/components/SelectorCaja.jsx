import { useMemo } from 'react';
import { Package } from 'lucide-react';
import { etiquetaCaja } from '../../shared/escaneo/itemsCaja';

export const NUEVA_CAJA = '__nueva__';

const CLASE_INPUT = 'w-full h-7 px-2 border border-gray-300 dark:border-gray-600 rounded text-[11px] outline-none focus:border-[#2383C2] bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 disabled:opacity-50';
const CLASE_LABEL = 'block text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-0.5';

// Caja destino: una caja existente de Stock General ("nombre — ubicación";
// su ubicación no se cambia desde aquí) o "Nueva caja" con nombre y
// ubicación, con los mismos campos que el formulario de Stock General.
const SelectorCaja = ({ cajas, valor, onCambiar, nuevaCaja, onCambiarNuevaCaja, deshabilitado }) => {
  const opciones = useMemo(
    () => [...cajas].sort((a, b) => etiquetaCaja(a).localeCompare(etiquetaCaja(b), 'es', { numeric: true })),
    [cajas]
  );
  const cajaElegida = cajas.find((c) => c.id === valor);

  return (
    <div className="flex flex-wrap items-end gap-2.5">
      <div className="w-[300px]">
        <label className={CLASE_LABEL}>Caja</label>
        <select value={valor} onChange={(e) => onCambiar(e.target.value)} disabled={deshabilitado} className={`${CLASE_INPUT} cursor-pointer`}>
          <option value="">-- Elige una caja --</option>
          <option value={NUEVA_CAJA}>+ Nueva caja</option>
          {opciones.map((c) => (
            <option key={c.id} value={c.id}>{etiquetaCaja(c)}</option>
          ))}
        </select>
      </div>

      {valor === NUEVA_CAJA ? (
        <>
          <div className="w-[220px]">
            <label className={CLASE_LABEL}>Nombre / Código de Caja</label>
            <input
              value={nuevaCaja.nombreCaja}
              onChange={(e) => onCambiarNuevaCaja({ ...nuevaCaja, nombreCaja: e.target.value })}
              disabled={deshabilitado}
              className={CLASE_INPUT}
              placeholder="Ej: Caja Instrumental #1"
            />
          </div>
          <div className="w-[180px]">
            <label className={CLASE_LABEL}>Ubicación (Estante/Bodega)</label>
            <input
              value={nuevaCaja.ubicacion}
              onChange={(e) => onCambiarNuevaCaja({ ...nuevaCaja, ubicacion: e.target.value })}
              disabled={deshabilitado}
              className={CLASE_INPUT}
              placeholder="Ej: Estante A-2"
            />
          </div>
        </>
      ) : cajaElegida && (
        <div className="h-7 flex items-center gap-1.5 text-[11px] text-gray-600 dark:text-gray-300">
          <Package size={13} className="text-[#2383C2]" />
          Ubicación: <b>{cajaElegida.ubicacion || 'Sin ubicación'}</b>
          <span className="text-gray-400">· {(cajaElegida.items || []).length} ítem(s)</span>
        </div>
      )}
    </div>
  );
};

export default SelectorCaja;
