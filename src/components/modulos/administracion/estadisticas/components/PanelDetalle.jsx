import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, FileSpreadsheet, Loader2 } from 'lucide-react';
import { useColumnasPermitidas } from '../../../../../hooks/useColumnasPermitidas';
import Variacion from './Variacion';
import PrecioUnitario from './PrecioUnitario';
import { formatoNumero, formatoMonto } from './formato';

const PATH_VISTA = '/administracion/estadisticas'; // = RUTA_VISTA_ESTADISTICAS

// Columnas de las tablas del detalle (sección 'detalle'). Monto y precio
// además exigen "Ver montos".
const COLUMNAS_DETALLE = [
  { key: 'nombre', label: 'Nombre', fija: true },
  { key: 'actual', label: 'Período' },
  { key: 'anterior', label: 'Período anterior' },
  { key: 'variacion', label: 'Variación %' },
  { key: 'monto', label: 'Monto' },
  { key: 'cantidad', label: 'Cantidad (códigos)' },
  { key: 'precio', label: 'Precio unitario (códigos)' }
];

const th = 'px-3 py-1.5 text-right font-semibold whitespace-nowrap';
const td = 'px-3 py-1 text-right tabular-nums whitespace-nowrap';

const Seccion = ({ titulo, cantidad, children }) => (
  <section>
    <h4 className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1.5">{titulo} <span className="font-normal normal-case">({cantidad})</span></h4>
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-x-auto">{children}</div>
  </section>
);

// Cruce: médicos / cirugías / empresas, en admisiones o (detalle de un
// código) en cantidad usada, con su monto.
const TablaCruce = ({ titulo, filas, unidad, etiquetaActual, etiquetaAnterior, ver, conMontos }) => {
  const maximo = Math.max(1, ...filas.map((f) => f.actual));
  const verMonto = conMontos && ver('monto');
  return (
    <Seccion titulo={titulo} cantidad={filas.filter((f) => f.actual > 0).length}>
      <table className="w-full text-[11.5px] border-collapse">
        <thead className="bg-gray-50 dark:bg-gray-900 text-[10px] uppercase text-gray-500 dark:text-gray-400">
          <tr>
            <th className="px-3 py-1.5 text-left font-semibold">Nombre</th>
            {ver('actual') && <th className={th} title={unidad}>{etiquetaActual}</th>}
            {ver('anterior') && <th className={th} title={unidad}>{etiquetaAnterior}</th>}
            {ver('variacion') && <th className={th}>Variación</th>}
            {verMonto && <th className={th}>Monto</th>}
          </tr>
        </thead>
        <tbody>
          {filas.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-gray-400">Sin datos.</td></tr>}
          {filas.map((f) => (
            <tr key={f.clave} className="border-t border-gray-100 dark:border-gray-700/60">
              <td className="px-3 py-1 text-gray-800 dark:text-gray-100">
                <div className="truncate max-w-[260px]" title={f.nombre}>{f.nombre}</div>
                <div className="h-1 mt-0.5 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden"><div className="h-full bg-[#2383C2] rounded-full" style={{ width: `${(f.actual / maximo) * 100}%` }} /></div>
              </td>
              {ver('actual') && <td className={`${td} font-semibold text-gray-800 dark:text-gray-100`}>{formatoNumero(f.actual)}</td>}
              {ver('anterior') && <td className={`${td} text-gray-500 dark:text-gray-400`}>{formatoNumero(f.anterior)}</td>}
              {ver('variacion') && <td className={td}><Variacion diferencia={f.diferencia} variacion={f.variacion} compacto /></td>}
              {verMonto && <td className={`${td} text-gray-800 dark:text-gray-100`}>{formatoMonto(f.monto)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </Seccion>
  );
};

// Códigos usados por el médico, la cirugía o la empresa (por monto, de mayor
// a menor; sin "Ver montos", por cantidad).
const TablaCodigosDetalle = ({ filas, ver, conMontos }) => {
  const verPrecio = conMontos && ver('precio');
  const verMonto = conMontos && ver('monto');
  return (
    <Seccion titulo="Códigos" cantidad={filas.length}>
      <table className="w-full text-[11.5px] border-collapse">
        <thead className="bg-gray-50 dark:bg-gray-900 text-[10px] uppercase text-gray-500 dark:text-gray-400">
          <tr>
            <th className="px-3 py-1.5 text-left font-semibold">Código</th>
            <th className="px-3 py-1.5 text-left font-semibold">Descripción</th>
            {ver('cantidad') && <th className={th}>Cantidad</th>}
            {verPrecio && <th className={th} title="Precio unitario sin IVA (promedio si varió)">Precio unit.</th>}
            {verMonto && <th className={th}>Monto</th>}
          </tr>
        </thead>
        <tbody>
          {filas.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-gray-400">Sin códigos.</td></tr>}
          {filas.map((f) => (
            <tr key={f.clave} className="border-t border-gray-100 dark:border-gray-700/60">
              <td className={`px-3 py-1 whitespace-nowrap ${f.sinCodigo ? 'italic text-amber-700 dark:text-amber-400' : 'font-semibold text-gray-800 dark:text-gray-100'}`}>{f.codigo}</td>
              <td className="px-3 py-1 text-gray-700 dark:text-gray-200"><div className="truncate max-w-[220px]" title={f.descripcion}>{f.descripcion || '—'}</div></td>
              {ver('cantidad') && <td className={`${td} text-gray-800 dark:text-gray-100`}>{formatoNumero(f.actual)}</td>}
              {verPrecio && <td className={`${td} text-gray-700 dark:text-gray-200`}><PrecioUnitario fila={f} /></td>}
              {verMonto && <td className={`${td} font-semibold text-gray-800 dark:text-gray-100`}>{formatoMonto(f.monto)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </Seccion>
  );
};

// Detalle de un médico, cirugía, empresa o código: sus cruces y, para los
// tres primeros, los códigos que usó. Sale de los datos ya cargados (los
// códigos se leen una vez por sesión al abrir el primer detalle).
const PanelDetalle = ({ singular, fila, esCodigo, cruces, codigos, cargandoCodigos, conMontos, etiquetaActual, etiquetaAnterior, puedeExportar, onExportar, onCerrar }) => {
  const { ver } = useColumnasPermitidas(PATH_VISTA, 'detalle', COLUMNAS_DETALLE);
  useEffect(() => {
    const alTeclear = (e) => { if (e.key === 'Escape') onCerrar(); };
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [onCerrar]);

  const unidad = esCodigo ? 'Cantidad usada' : 'Admisiones distintas';
  return createPortal(
    <div className="fixed inset-0 z-[90] flex justify-end" role="dialog" aria-modal="true" aria-labelledby="titulo-detalle-estadistica">
      <button type="button" className="absolute inset-0 bg-black/30 cursor-default" aria-label="Cerrar detalle" onClick={onCerrar} />
      <aside className="relative w-full max-w-xl h-full bg-white dark:bg-gray-800 shadow-2xl flex flex-col">
        <header className="px-5 py-3.5 border-b border-gray-200 dark:border-gray-700 flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[10.5px] font-semibold uppercase tracking-wide text-[#2383C2]">{singular}</p>
            <h3 id="titulo-detalle-estadistica" className="text-[14px] font-bold text-gray-800 dark:text-gray-100 break-words">
              {esCodigo ? <>{fila.codigo}{fila.descripcion && <span className="font-normal text-gray-600 dark:text-gray-300"> · {fila.descripcion}</span>}</> : fila.nombre}
            </h3>
            <p className="mt-1 text-[11.5px] text-gray-600 dark:text-gray-300">
              <b className="tabular-nums">{formatoNumero(fila.actual)}</b> {esCodigo ? 'unidades' : 'admisiones'} en {etiquetaActual}
              <span className="text-gray-400"> · {formatoNumero(fila.anterior)} en {etiquetaAnterior} · </span>
              <Variacion diferencia={fila.diferencia} variacion={fila.variacion} compacto />
              {esCodigo && <span className="text-gray-500"> · {formatoNumero(fila.admisiones)} admisiones</span>}
            </p>
            {conMontos && (
              <p className="mt-0.5 text-[11.5px] text-gray-600 dark:text-gray-300">
                Monto <b className="tabular-nums text-gray-800 dark:text-gray-100">{formatoMonto(fila.monto)}</b>
                <span className="text-gray-400"> · {formatoMonto(fila.montoAnterior)} en {etiquetaAnterior} · </span>
                <Variacion diferencia={fila.montoDiferencia} variacion={fila.montoVariacion} compacto />
                {esCodigo && fila.precio != null && <span className="text-gray-500"> · precio unit. <PrecioUnitario fila={fila} /></span>}
              </p>
            )}
          </div>
          {puedeExportar && (
            <button type="button" onClick={onExportar} className="h-7 px-3 rounded-md border border-gray-300 dark:border-gray-600 text-[11.5px] font-semibold text-gray-700 dark:text-gray-200 hover:border-[#2383C2] hover:text-[#2383C2] inline-flex items-center gap-1.5 shrink-0">
              <FileSpreadsheet size={13} /> Exportar
            </button>
          )}
          <button type="button" onClick={onCerrar} aria-label="Cerrar" className="p-1 text-gray-400 hover:text-gray-600 shrink-0"><X size={18} /></button>
        </header>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {cruces.map((c) => (
            <TablaCruce key={c.titulo} titulo={c.titulo} filas={c.filas} unidad={unidad} etiquetaActual={etiquetaActual} etiquetaAnterior={etiquetaAnterior} ver={ver} conMontos={conMontos} />
          ))}
          {!esCodigo && (cargandoCodigos
            ? <p className="text-[11.5px] text-gray-400"><Loader2 size={13} className="inline animate-spin mr-1" />Cargando códigos…</p>
            : codigos && <TablaCodigosDetalle filas={codigos} ver={ver} conMontos={conMontos} />)}
        </div>
      </aside>
    </div>,
    document.body
  );
};

export default PanelDetalle;
