import { Eye } from 'lucide-react';
import { useColumnResize } from '../../../../hooks/useColumnResize';
import { ThRedimensionable, ColgroupRedimensionable } from '../../../ui/ThRedimensionable';

// Tabla principal de órdenes (Laboratorio y Vacunatorio), con columnas
// redimensionables. Doble clic o el ojo abren el detalle.

const COLUMNAS = [
  { key: 'nro', ancho: 130, min: 80 },
  { key: 'fecha', ancho: 100, min: 70 },
  { key: 'rut', ancho: 130, min: 80 },
  { key: 'proveedor', ancho: 360, min: 120 },
  { key: 'items', ancho: 70, min: 50 },
  { key: 'total', ancho: 130, min: 80 },
  { key: 'acciones', ancho: 80, min: 60 },
];

const TH = 'px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700';
const TD = 'px-2 py-1 border-b border-r border-slate-200/60 dark:border-gray-700/70';

const TablaOrdenes = ({ ordenes, onSeleccionar }) => {
  const { anchos, handleResize, anchoTotalTabla } = useColumnResize(COLUMNAS);

  const th = (i, label, extra = '') => (
    <ThRedimensionable col={COLUMNAS[i]} anchos={anchos} onResize={handleResize} className={`${TH} ${extra}`}>{label}</ThRedimensionable>
  );

  return (
    <table
      className="text-left text-[11px] border-collapse"
      style={{ tableLayout: 'fixed', width: anchoTotalTabla, minWidth: '100%' }}
    >
      <ColgroupRedimensionable columnas={COLUMNAS} anchos={anchos} />
      <thead className="bg-slate-100 dark:bg-gray-900/80 sticky top-0 z-10">
        <tr className="text-slate-600 dark:text-gray-400 uppercase font-normal text-[10px] tracking-wider">
          {th(0, 'Nro.Orden')}
          {th(1, 'F.Orden')}
          {th(2, 'Rut Proveedor')}
          {th(3, 'Proveedor')}
          {th(4, 'Items', 'text-center')}
          {th(5, 'Total', 'text-right')}
          {th(6, 'Acciones', 'text-center')}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-200/60 dark:divide-gray-700/50 bg-white dark:bg-gray-800">
        {ordenes.map((o) => (
          <tr
            key={o.id}
            onDoubleClick={() => onSeleccionar(o)}
            className="hover:bg-slate-50 dark:hover:bg-gray-700/40 transition-all duration-150 cursor-pointer group border-l-2 border-l-transparent hover:border-l-[#2383C2]"
          >
            <td className={`${TD} font-normal text-slate-700 dark:text-gray-200 truncate`}>{o["Nro.Orden"]}</td>
            <td className={`${TD} text-slate-600 dark:text-gray-400 truncate`}>{o["F.Orden"]}</td>
            <td className={`${TD} text-slate-600 dark:text-gray-400 truncate`}>{o["Rut proveedor"]}</td>
            <td className={`${TD} text-slate-700 dark:text-gray-300 truncate`} title={o["Proveedor"]}>{o["Proveedor"]}</td>
            <td className={`${TD} text-slate-600 dark:text-gray-400 text-center font-normal`}>{o.totalItems}</td>
            <td className={`${TD} text-slate-800 dark:text-gray-100 font-normal text-right truncate`}>${o.totalOrden?.toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
            <td className="px-2 py-1 border-b border-slate-200/60 dark:border-gray-700 text-center">
              <button onClick={() => onSeleccionar(o)} className="text-slate-400 hover:text-[#2383C2] transition inline-flex items-center justify-center p-0.5 rounded hover:bg-slate-100 dark:hover:bg-gray-700">
                <Eye size={13} />
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default TablaOrdenes;
