import { Eye, Trash2 } from 'lucide-react';
import { useColumnResize } from '../../../../hooks/useColumnResize';
import { ThRedimensionable, ColgroupRedimensionable } from '../../../ui/ThRedimensionable';
import EstadoProcesoBadge from './EstadoProcesoBadge';
import CeldasDatosIngreso from './CeldasDatosIngreso';
import { COLUMNAS_DATOS_INGRESO } from './columnasDatosIngreso';

// Tabla de XML Documentos (Laboratorio y Vacunatorio), con columnas
// redimensionables. Orden / Acta / Salida / Mes imputado se muestran igual
// que en Procesos > Documentos Recibidos (CeldasDatosIngreso).

const COLUMNAS = [
  { key: 'n', ancho: 36, min: 30 },
  { key: 'folio', ancho: 90, min: 60 },
  { key: 'emision', ancho: 90, min: 65 },
  { key: 'ref', ancho: 90, min: 60 },
  { key: 'razonSocial', ancho: 240, min: 100 },
  { key: 'total', ancho: 105, min: 70 },
  { key: 'estado', ancho: 140, min: 90 },
  ...COLUMNAS_DATOS_INGRESO,
  { key: 'acciones', ancho: 75, min: 60 },
];

const TH = 'px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700';
const TD = 'px-2 py-1 border-b border-r border-slate-200/60 dark:border-gray-700/70';

const TablaXmlDocumentos = ({ documentos, mensajeVacio, puedeVer, puedeEliminar, onVer, onEliminar }) => {
  const { anchos, handleResize, anchoTotalTabla } = useColumnResize(COLUMNAS);

  const th = (col, label, extra = 'text-center') => (
    <ThRedimensionable key={col.key} col={col} anchos={anchos} onResize={handleResize} className={`${TH} ${extra}`}>{label}</ThRedimensionable>
  );

  return (
    <table
      className="text-left text-[11px] border-collapse"
      style={{ tableLayout: 'fixed', width: anchoTotalTabla, minWidth: '100%' }}
    >
      <ColgroupRedimensionable columnas={COLUMNAS} anchos={anchos} />
      <thead className="bg-slate-100 dark:bg-gray-900/80 sticky top-0 z-10">
        <tr className="text-slate-600 dark:text-gray-400 uppercase font-bold text-[10px]">
          {th(COLUMNAS[0], '#')}
          {th(COLUMNAS[1], 'Folio', '')}
          {th(COLUMNAS[2], 'Emisión', '')}
          {th(COLUMNAS[3], 'Ref.', '')}
          {th(COLUMNAS[4], 'Razón Social', '')}
          {th(COLUMNAS[5], 'Total (Neto)', 'text-right')}
          {th(COLUMNAS[6], 'Estado')}
          {COLUMNAS_DATOS_INGRESO.map(col => th(col, col.label))}
          {th(COLUMNAS[COLUMNAS.length - 1], 'Acciones')}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-200/60 dark:divide-gray-700/50 bg-white dark:bg-gray-800">
        {documentos.length === 0 ? (
          <tr>
            <td colSpan={COLUMNAS.length} className="text-center py-6 text-slate-400 dark:text-gray-500">
              {mensajeVacio}
            </td>
          </tr>
        ) : documentos.map((docItem, index) => (
          <tr
            key={docItem.id}
            className="border-l-2 border-transparent hover:border-[#2383C2] hover:bg-gray-50/80 dark:hover:bg-gray-700/40 transition-colors"
          >
            <td className={`${TD} text-gray-500 dark:text-gray-400 font-bold text-center`}>
              {index + 1}
            </td>
            <td className={`${TD} font-medium text-slate-800 dark:text-gray-100 truncate`}>
              {docItem.folio}
            </td>
            <td className={`${TD} text-slate-600 dark:text-gray-400 truncate`}>
              {docItem.fchEmis}
            </td>
            <td className={`${TD} text-slate-600 dark:text-gray-400 truncate`}>
              {docItem.folioRef}
            </td>
            <td className={`${TD} text-slate-700 dark:text-gray-300 truncate`} title={docItem.rznSoc}>
              {docItem.rznSoc}
            </td>
            <td className={`${TD} text-slate-800 dark:text-gray-100 font-medium text-right truncate`}>
              ${parseInt(docItem.total || 0, 10).toLocaleString('es-CL')}
            </td>
            <td className={`${TD} text-center truncate`}>
              <EstadoProcesoBadge estado={docItem.estado} fallback="Iniciar Ingreso" />
            </td>
            <CeldasDatosIngreso documento={docItem} />
            <td className="px-2 py-1 border-b border-slate-200/60 dark:border-gray-700 text-center">
              <div className="flex justify-center gap-2">
                {puedeVer && (
                  <button
                    onClick={() => onVer(docItem)}
                    className="text-gray-500 hover:text-[#2383C2] dark:hover:text-[#2383C2] transition"
                    title="Ver Detalle"
                  >
                    <Eye size={13} />
                  </button>
                )}
                {puedeEliminar && (
                  <button
                    onClick={() => onEliminar(docItem.id)}
                    className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition"
                    title="Eliminar"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default TablaXmlDocumentos;
