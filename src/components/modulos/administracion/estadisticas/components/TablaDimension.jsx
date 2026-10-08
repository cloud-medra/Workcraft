import { Search, ChevronUp, ChevronDown, X } from 'lucide-react';
import { useColumnasPermitidas } from '../../../../../hooks/useColumnasPermitidas';
import Variacion from './Variacion';
import { formatoNumero } from './formato';

const PATH_VISTA = '/administracion/estadisticas'; // = RUTA_VISTA_ESTADISTICAS

// Columnas de la tabla de cada pestaña (granularidad por columna: `col_<key>`
// en la sección 'tabla' del mapa de permisos). El nombre no se puede ocultar.
const COLUMNAS_TABLA = [
  { key: 'nombre', label: 'Nombre', fija: true },
  { key: 'actual', label: 'Período' },
  { key: 'anterior', label: 'Período anterior' },
  { key: 'diferencia', label: 'Diferencia' },
  { key: 'variacion', label: 'Variación %' },
  { key: 'participacion', label: '% del total' }
];

const Encabezado = ({ columna, children, orden, onOrdenar, alinear = 'right' }) => {
  const activa = orden.columna === columna;
  const Icono = activa && orden.sentido === 'asc' ? ChevronUp : ChevronDown;
  return (
    <th className={`px-3 py-2 border-b border-gray-200 dark:border-gray-700 font-semibold text-${alinear}`} aria-sort={activa ? (orden.sentido === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button type="button" onClick={() => onOrdenar(columna)} className={`inline-flex items-center gap-0.5 uppercase hover:text-[#2383C2] ${activa ? 'text-[#2383C2]' : ''}`}>
        {children}
        <Icono size={12} className={activa ? '' : 'opacity-30'} />
      </button>
    </th>
  );
};

// Tabla ordenable de una dimensión (médicos, cirugías o empresas): período
// elegido vs. anterior. La búsqueda y el orden los guarda la pantalla para
// que "Exportar" saque exactamente lo que se ve.
const TablaDimension = ({ singular, filas, total, etiquetaActual, etiquetaAnterior, busqueda, onBuscar, orden, onOrdenar, seleccionada, onSeleccionar }) => {
  const { ver } = useColumnasPermitidas(PATH_VISTA, 'tabla', COLUMNAS_TABLA);
  const celda = 'px-3 py-2 border-b border-gray-100 dark:border-gray-700/60 text-right tabular-nums';
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden flex flex-col min-w-0">
      <div className="px-3 py-2.5 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2 flex-wrap">
        <div className="relative w-72 max-w-full">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={busqueda} onChange={(e) => onBuscar(e.target.value)} onKeyDown={(e) => { if (e.key === 'Escape') onBuscar(''); }}
            placeholder={`Buscar ${singular.toLowerCase()}…`} aria-label={`Buscar ${singular.toLowerCase()}`}
            className="w-full h-8 pl-8 pr-7 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-[12px] text-gray-800 dark:text-gray-100 focus:outline-none focus:border-[#2383C2]" />
          {busqueda && (
            <button type="button" onClick={() => onBuscar('')} title="Limpiar búsqueda" aria-label="Limpiar búsqueda" className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#2383C2]"><X size={13} /></button>
          )}
        </div>
        <span className="ml-auto text-[11.5px] text-gray-500 dark:text-gray-400">{formatoNumero(filas.length)} {filas.length === 1 ? 'fila' : 'filas'} · clic en una fila para ver el detalle</span>
      </div>
      <div className="overflow-auto max-h-[560px]">
        <table className="w-full text-[12px] border-collapse">
          <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0 z-10 text-[10.5px] text-gray-500 dark:text-gray-400">
            <tr>
              <Encabezado columna="nombre" orden={orden} onOrdenar={onOrdenar} alinear="left">{singular}</Encabezado>
              {ver('actual') && <Encabezado columna="actual" orden={orden} onOrdenar={onOrdenar}>{etiquetaActual}</Encabezado>}
              {ver('anterior') && <Encabezado columna="anterior" orden={orden} onOrdenar={onOrdenar}>{etiquetaAnterior}</Encabezado>}
              {ver('diferencia') && <Encabezado columna="diferencia" orden={orden} onOrdenar={onOrdenar}>Diferencia</Encabezado>}
              {ver('variacion') && <Encabezado columna="variacion" orden={orden} onOrdenar={onOrdenar}>Variación</Encabezado>}
              {ver('participacion') && <Encabezado columna="participacion" orden={orden} onOrdenar={onOrdenar}>% del total</Encabezado>}
            </tr>
          </thead>
          <tbody>
            {filas.length === 0 && (
              <tr><td colSpan={6} className="py-10 text-center text-gray-400">{busqueda ? 'Ninguna fila coincide con la búsqueda.' : 'Sin datos en este período.'}</td></tr>
            )}
            {filas.map((f) => (
              <tr key={f.clave} onClick={() => onSeleccionar(f)} aria-selected={seleccionada === f.clave}
                className={`cursor-pointer ${seleccionada === f.clave ? 'bg-[#2383C2]/10' : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'}`}>
                <td className="px-3 py-2 border-b border-gray-100 dark:border-gray-700/60 text-left text-gray-800 dark:text-gray-100 max-w-[360px] truncate" title={f.nombre}>
                  <button type="button" className="text-left hover:text-[#2383C2] focus:outline-none focus-visible:underline" onClick={(e) => { e.stopPropagation(); onSeleccionar(f); }}>{f.nombre}</button>
                </td>
                {ver('actual') && <td className={`${celda} font-semibold text-gray-800 dark:text-gray-100`}>{formatoNumero(f.actual)}</td>}
                {ver('anterior') && <td className={`${celda} text-gray-500 dark:text-gray-400`}>{formatoNumero(f.anterior)}</td>}
                {ver('diferencia') && <td className={`${celda} ${f.diferencia > 0 ? 'text-emerald-700 dark:text-emerald-400' : f.diferencia < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-500'}`}>{f.diferencia > 0 ? '+' : ''}{formatoNumero(f.diferencia)}</td>}
                {ver('variacion') && <td className={celda}><Variacion diferencia={f.diferencia} variacion={f.variacion} compacto /></td>}
                {ver('participacion') && <td className={`${celda} text-gray-600 dark:text-gray-300`}>{f.participacion.toLocaleString('es-CL', { maximumFractionDigits: 1 })}%</td>}
              </tr>
            ))}
          </tbody>
          {total && (
            <tfoot className="bg-gray-50 dark:bg-gray-900 sticky bottom-0 font-semibold text-gray-800 dark:text-gray-100">
              <tr>
                <td className="px-3 py-2 border-t border-gray-200 dark:border-gray-700" title="Admisiones distintas del período (una admisión con dos médicos, cirugías o empresas cuenta una vez)">Total admisiones</td>
                {ver('actual') && <td className="px-3 py-2 border-t border-gray-200 dark:border-gray-700 text-right tabular-nums">{formatoNumero(total.actual)}</td>}
                {ver('anterior') && <td className="px-3 py-2 border-t border-gray-200 dark:border-gray-700 text-right tabular-nums text-gray-500">{formatoNumero(total.anterior)}</td>}
                {ver('diferencia') && <td className="px-3 py-2 border-t border-gray-200 dark:border-gray-700 text-right tabular-nums">{total.actual - total.anterior > 0 ? '+' : ''}{formatoNumero(total.actual - total.anterior)}</td>}
                {ver('variacion') && <td className="px-3 py-2 border-t border-gray-200 dark:border-gray-700 text-right"><Variacion diferencia={total.actual - total.anterior} variacion={total.anterior ? ((total.actual - total.anterior) / total.anterior) * 100 : null} compacto /></td>}
                {ver('participacion') && <td className="px-3 py-2 border-t border-gray-200 dark:border-gray-700 text-right">100%</td>}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
};

export default TablaDimension;
