import PaginacionSimple from '../../../../ui/PaginacionSimple';
import { useColumnasPermitidas } from '../../../../../hooks/useColumnasPermitidas';
import Variacion from './Variacion';
import { formatoNumero, formatoMonto, colorDiferencia } from './formato';
import { Encabezado, BarraBusqueda } from './TablaComun';
import { usePaginacion } from './usePaginacion';

const PATH_VISTA = '/administracion/estadisticas'; // = RUTA_VISTA_ESTADISTICAS

// Columnas de la tabla de cada pestaña (granularidad por columna: `col_<key>`
// en la sección 'tabla' del mapa de permisos). El nombre no se puede ocultar.
// Las de monto además exigen "Ver montos".
const COLUMNAS_TABLA = [
  { key: 'nombre', label: 'Nombre', fija: true },
  { key: 'actual', label: 'Período' },
  { key: 'anterior', label: 'Período anterior' },
  { key: 'diferencia', label: 'Diferencia' },
  { key: 'variacion', label: 'Variación %' },
  { key: 'participacion', label: '% del total' },
  { key: 'monto', label: 'Monto del período' },
  { key: 'montoAnterior', label: 'Monto período anterior' },
  { key: 'montoDiferencia', label: 'Diferencia de monto' },
  { key: 'montoVariacion', label: 'Variación % de monto' }
];

const COLUMNAS_MONTO = ['monto', 'montoAnterior', 'montoDiferencia', 'montoVariacion'];

// Tabla ordenable de una dimensión (médicos, cirugías o empresas): período
// elegido vs. anterior, en admisiones y (con "Ver montos") en monto. La
// búsqueda y el orden los guarda la pantalla para que "Exportar" saque
// exactamente lo que se ve (todas las páginas). Sin scroll interno: se pagina
// y la página completa se desplaza bajo la parte superior fija.
const TablaDimension = ({ singular, filas, total, conMontos, etiquetaActual, etiquetaAnterior, busqueda, onBuscar, orden, onOrdenar, seleccionada, onSeleccionar }) => {
  const { ver: verColumna } = useColumnasPermitidas(PATH_VISTA, 'tabla', COLUMNAS_TABLA);
  const ver = (key) => verColumna(key) && (conMontos || !COLUMNAS_MONTO.includes(key));
  const { filasPagina, props: paginacion, mostrar: mostrarPaginacion } = usePaginacion(filas);
  const celda = 'px-3 py-1 border-b border-gray-100 dark:border-gray-700/60 text-right tabular-nums whitespace-nowrap';
  const pie = 'px-3 py-1.5 border-t border-gray-200 dark:border-gray-700 text-right tabular-nums whitespace-nowrap';
  const columnasVisibles = COLUMNAS_TABLA.filter((c) => c.key === 'nombre' || ver(c.key)).length;
  const dif = total ? total.actual - total.anterior : 0;
  const difMonto = total ? total.monto - total.montoAnterior : 0;
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden flex flex-col min-w-0">
      <BarraBusqueda busqueda={busqueda} onBuscar={onBuscar} placeholder={`Buscar ${singular.toLowerCase()}…`} total={filas.length} />
      <div className="overflow-x-auto">
        <table className="w-full text-[11.5px] border-collapse">
          <thead className="bg-gray-50 dark:bg-gray-900 text-[10px] text-gray-500 dark:text-gray-400">
            <tr>
              <Encabezado columna="nombre" orden={orden} onOrdenar={onOrdenar} alinear="left">{singular}</Encabezado>
              {ver('actual') && <Encabezado columna="actual" orden={orden} onOrdenar={onOrdenar} title="Admisiones distintas">{etiquetaActual}</Encabezado>}
              {ver('anterior') && <Encabezado columna="anterior" orden={orden} onOrdenar={onOrdenar} title="Admisiones distintas">{etiquetaAnterior}</Encabezado>}
              {ver('diferencia') && <Encabezado columna="diferencia" orden={orden} onOrdenar={onOrdenar}>Diferencia</Encabezado>}
              {ver('variacion') && <Encabezado columna="variacion" orden={orden} onOrdenar={onOrdenar}>Variación</Encabezado>}
              {ver('participacion') && <Encabezado columna="participacion" orden={orden} onOrdenar={onOrdenar}>% del total</Encabezado>}
              {ver('monto') && <Encabezado columna="monto" orden={orden} onOrdenar={onOrdenar} title="Cantidad × precio unitario, sin IVA">Monto</Encabezado>}
              {ver('montoAnterior') && <Encabezado columna="montoAnterior" orden={orden} onOrdenar={onOrdenar}>Monto anterior</Encabezado>}
              {ver('montoDiferencia') && <Encabezado columna="montoDiferencia" orden={orden} onOrdenar={onOrdenar}>Dif. monto</Encabezado>}
              {ver('montoVariacion') && <Encabezado columna="montoVariacion" orden={orden} onOrdenar={onOrdenar}>Var. monto</Encabezado>}
            </tr>
          </thead>
          <tbody>
            {filas.length === 0 && (
              <tr><td colSpan={columnasVisibles} className="py-10 text-center text-gray-400">{busqueda ? 'Ninguna fila coincide con la búsqueda.' : 'Sin datos en este período.'}</td></tr>
            )}
            {filasPagina.map((f) => (
              <tr key={f.clave} onClick={() => onSeleccionar(f)} aria-selected={seleccionada === f.clave}
                className={`cursor-pointer ${seleccionada === f.clave ? 'bg-[#2383C2]/10' : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'}`}>
                <td className="px-3 py-1 border-b border-gray-100 dark:border-gray-700/60 text-left text-gray-800 dark:text-gray-100 max-w-[320px] truncate" title={f.nombre}>
                  <button type="button" className="text-left hover:text-[#2383C2] focus:outline-none focus-visible:underline" onClick={(e) => { e.stopPropagation(); onSeleccionar(f); }}>{f.nombre}</button>
                </td>
                {ver('actual') && <td className={`${celda} font-semibold text-gray-800 dark:text-gray-100`}>{formatoNumero(f.actual)}</td>}
                {ver('anterior') && <td className={`${celda} text-gray-500 dark:text-gray-400`}>{formatoNumero(f.anterior)}</td>}
                {ver('diferencia') && <td className={`${celda} ${colorDiferencia(f.diferencia)}`}>{f.diferencia > 0 ? '+' : ''}{formatoNumero(f.diferencia)}</td>}
                {ver('variacion') && <td className={celda}><Variacion diferencia={f.diferencia} variacion={f.variacion} compacto /></td>}
                {ver('participacion') && <td className={`${celda} text-gray-600 dark:text-gray-300`}>{f.participacion.toLocaleString('es-CL', { maximumFractionDigits: 1 })}%</td>}
                {ver('monto') && <td className={`${celda} font-semibold text-gray-800 dark:text-gray-100`}>{formatoMonto(f.monto)}</td>}
                {ver('montoAnterior') && <td className={`${celda} text-gray-500 dark:text-gray-400`}>{formatoMonto(f.montoAnterior)}</td>}
                {ver('montoDiferencia') && <td className={`${celda} ${colorDiferencia(f.montoDiferencia)}`}>{f.montoDiferencia > 0 ? '+' : ''}{formatoMonto(f.montoDiferencia)}</td>}
                {ver('montoVariacion') && <td className={celda}><Variacion diferencia={f.montoDiferencia} variacion={f.montoVariacion} compacto /></td>}
              </tr>
            ))}
          </tbody>
          {total && (
            <tfoot className="bg-gray-50 dark:bg-gray-900 font-semibold text-gray-800 dark:text-gray-100">
              <tr>
                <td className="px-3 py-1.5 border-t border-gray-200 dark:border-gray-700" title="Admisiones distintas del período (una admisión con dos médicos, cirugías o empresas cuenta una vez)">Total admisiones</td>
                {ver('actual') && <td className={pie}>{formatoNumero(total.actual)}</td>}
                {ver('anterior') && <td className={`${pie} text-gray-500`}>{formatoNumero(total.anterior)}</td>}
                {ver('diferencia') && <td className={pie}>{dif > 0 ? '+' : ''}{formatoNumero(dif)}</td>}
                {ver('variacion') && <td className={pie}><Variacion diferencia={dif} variacion={total.anterior ? (dif / total.anterior) * 100 : null} compacto /></td>}
                {ver('participacion') && <td className={pie}>100%</td>}
                {ver('monto') && <td className={pie}>{formatoMonto(total.monto)}</td>}
                {ver('montoAnterior') && <td className={`${pie} text-gray-500`}>{formatoMonto(total.montoAnterior)}</td>}
                {ver('montoDiferencia') && <td className={pie}>{difMonto > 0 ? '+' : ''}{formatoMonto(difMonto)}</td>}
                {ver('montoVariacion') && <td className={pie}><Variacion diferencia={difMonto} variacion={total.montoAnterior ? (difMonto / total.montoAnterior) * 100 : null} compacto /></td>}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      {mostrarPaginacion && <PaginacionSimple {...paginacion} />}
    </div>
  );
};

export default TablaDimension;
