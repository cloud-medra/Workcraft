import { Search, X } from 'lucide-react';
import { useColumnResize } from '../../../../hooks/useColumnResize';
import { ThRedimensionable, ColgroupRedimensionable } from '../../../ui/ThRedimensionable';
import { normalizarCodigo } from './useFacturacionOrden';
import { useFiltrosDetalleOrden } from './useFiltrosDetalleOrden';

// Detalle de una orden (Laboratorio y Vacunatorio): buscadores por
// descripción / código / N° documento, columnas redimensionables y totales.

const COLUMNAS = [
  { key: 'codigo', ancho: 110, min: 70 },
  { key: 'descripcion', ancho: 320, min: 120 },
  { key: 'cantidad', ancho: 70, min: 50 },
  { key: 'precio', ancho: 100, min: 70 },
  { key: 'subtotal', ancho: 110, min: 70 },
  { key: 'documento', ancho: 170, min: 90 },
  { key: 'facturada', ancho: 105, min: 70 },
  { key: 'pendiente', ancho: 105, min: 70 },
];

const TH = 'px-3 py-1.5 border-r border-slate-200 dark:border-gray-700/80';
const TD = 'px-3 py-1 border-r border-slate-200/50 dark:border-gray-700/50';
const INPUT = 'w-full h-6 pl-7 pr-2 border border-slate-300 dark:border-gray-600 rounded text-[11px] outline-none bg-white dark:bg-gray-900 text-slate-800 dark:text-gray-100 focus:border-[#2383C2]';

const Buscador = ({ value, onChange, placeholder }) => (
  <div className="relative w-52">
    <Search className="absolute left-2 top-1.5 text-slate-400 dark:text-gray-500" size={12} />
    <input value={value} onChange={e => onChange(e.target.value)} className={INPUT} placeholder={placeholder} />
  </div>
);

const DetalleOrdenTabla = ({ detalle, facturacion, errorFacturacion, totalOrden }) => {
  const { anchos, handleResize, anchoTotalTabla } = useColumnResize(COLUMNAS);
  const { filtros, setFiltro, limpiarFiltros, hayFiltros, detalleFiltrado } = useFiltrosDetalleOrden(detalle, facturacion);

  const totalDetalle = detalle.reduce((acc, item) => acc + ((parseFloat(item["Cant."]) || 0) * (parseFloat(item["P.Unitario"]) || 0)), 0);
  const totalUnidades = detalle.reduce((acc, item) => acc + (parseFloat(item["Cant."]) || 0), 0);
  const totalFacturadas = detalle.reduce((acc, item) => acc + (facturacion[normalizarCodigo(item["Cod.Artículo"])]?.cantidadFacturada || 0), 0);

  const th = (i, label, extra = '') => (
    <ThRedimensionable col={COLUMNAS[i]} anchos={anchos} onResize={handleResize} className={`${TH} ${extra}`}>{label}</ThRedimensionable>
  );

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="bg-slate-100/70 dark:bg-gray-800/40 p-1.5 flex flex-wrap gap-1.5 items-center border-b border-slate-200 dark:border-gray-700 shrink-0">
        <Buscador value={filtros.descripcion} onChange={v => setFiltro('descripcion', v)} placeholder="Buscar por descripción..." />
        <Buscador value={filtros.codigo} onChange={v => setFiltro('codigo', v)} placeholder="Buscar por código..." />
        <Buscador value={filtros.documento} onChange={v => setFiltro('documento', v)} placeholder="Buscar por N° documento..." />
        {hayFiltros && (
          <button
            type="button"
            onClick={limpiarFiltros}
            className="h-6 px-2 rounded text-[11px] flex items-center gap-1 text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-gray-200 hover:bg-slate-200/70 dark:hover:bg-gray-700 transition"
          >
            <X size={12} /> Limpiar filtros
          </button>
        )}
        {hayFiltros && (
          <span className="text-[10px] text-slate-500 dark:text-gray-400 ml-auto">
            {detalleFiltrado.length} de {detalle.length} líneas
          </span>
        )}
      </div>

      <div className="flex-grow overflow-auto min-h-0">
        <table
          className="text-left text-[11px] border-collapse"
          style={{ tableLayout: 'fixed', width: anchoTotalTabla, minWidth: '100%' }}
        >
          <ColgroupRedimensionable columnas={COLUMNAS} anchos={anchos} />
          <thead className="bg-slate-100/90 dark:bg-gray-900 sticky top-0 z-10 shadow-xs">
            <tr className="text-slate-500 dark:text-gray-400 uppercase font-normal text-[10px] tracking-wider border-b border-slate-200 dark:border-gray-700">
              {th(0, 'Código')}
              {th(1, 'Descripción del Artículo')}
              {th(2, 'Cant.', 'text-center')}
              {th(3, 'Precio Unit.', 'text-right')}
              {th(4, 'Subtotal', 'text-right')}
              {th(5, 'N° Documento')}
              {th(6, 'Cant. Facturada', 'text-center')}
              {th(7, 'Cant. Pendiente', 'text-center')}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/60 dark:divide-gray-700/40 bg-white dark:bg-gray-800">
            {detalleFiltrado.length === 0 && (
              <tr>
                <td colSpan={COLUMNAS.length} className="px-4 py-6 text-center text-slate-400 dark:text-gray-500 text-xs">
                  {hayFiltros ? 'Ninguna línea coincide con los filtros.' : 'La orden no tiene líneas.'}
                </td>
              </tr>
            )}
            {detalleFiltrado.map((item, i) => {
              const cantidad = parseFloat(item["Cant."]) || 0;
              const precioUnidad = parseFloat(item["P.Unitario"]) || 0;
              const totalLinea = cantidad * precioUnidad;
              const fact = facturacion[normalizarCodigo(item["Cod.Artículo"])];
              const facturada = fact?.cantidadFacturada || 0;
              const pendiente = cantidad - facturada;
              const claseFacturada = fact?.tieneTemporal
                ? 'text-orange-600 dark:text-orange-400'
                : fact?.todosFinales
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-slate-700 dark:text-gray-300';
              const tituloFacturada = fact?.tieneTemporal
                ? 'Temporal: incluye facturas con diferencia por resolver, sujeto a cambios'
                : fact?.todosFinales ? 'Definitivo: todas las facturas están sin diferencias' : undefined;
              const documentosTitle = fact?.documentos.map(x => `${x.folio} (${x.cantidad}) — ${x.estado || 'Sin estado'}`).join('\n') || '';

              return (
                <tr
                  key={item["Cod.Artículo"] ?? i}
                  className="hover:bg-slate-50/80 dark:hover:bg-gray-700/30 transition-all duration-150 group border-l-2 border-l-transparent hover:border-l-[#2383C2]"
                >
                  <td className={`${TD} text-[10px] text-slate-700 dark:text-gray-200 truncate`}>
                    {item["Cod.Artículo"] || "N/A"}
                  </td>
                  <td className={`${TD} text-slate-800 dark:text-gray-200 font-normal truncate`} title={item["Artículo"]}>
                    {item["Artículo"] || "Sin Descripción"}
                  </td>
                  <td className={`${TD} text-slate-700 dark:text-gray-300 text-center font-normal`}>
                    {cantidad}
                  </td>
                  <td className={`${TD} text-slate-600 dark:text-gray-300 text-right whitespace-nowrap text-[10px]`}>
                    ${precioUnidad.toLocaleString('es-CL', { minimumFractionDigits: 0 })}
                  </td>
                  <td className={`${TD} text-slate-900 dark:text-gray-100 font-normal text-right whitespace-nowrap`}>
                    ${totalLinea.toLocaleString('es-CL', { minimumFractionDigits: 0 })}
                  </td>
                  <td className={`${TD} text-[10px] text-slate-600 dark:text-gray-300 truncate`} title={documentosTitle}>
                    {fact ? fact.documentos.map((x, idx) => (
                      <span key={x.id} className={x.temporal ? 'text-orange-600 dark:text-orange-400' : ''}>
                        {idx > 0 && ', '}{x.folio} ({x.cantidad}){x.temporal && ' ⚠'}
                      </span>
                    )) : '-'}
                  </td>
                  <td className={`${TD} text-center font-normal ${claseFacturada}`} title={tituloFacturada}>
                    {facturada}
                  </td>
                  <td
                    className={`px-3 py-1 text-center font-normal ${pendiente < 0 ? 'text-red-600 dark:text-red-400' : pendiente === 0 && facturada > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-gray-300'}`}
                    title={pendiente < 0 ? 'Facturado sobre la cantidad de la orden' : undefined}
                  >
                    {pendiente}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="bg-slate-100 dark:bg-gray-900 border-t border-slate-200 dark:border-gray-700 p-2.5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4 text-[10px] text-slate-500 dark:text-gray-400">
          <span>Líneas: <strong className="text-slate-800 dark:text-gray-200 font-normal">{detalle.length}</strong></span>
          <span>Unidades totales: <strong className="text-slate-800 dark:text-gray-200 font-normal">{totalUnidades}</strong></span>
          <span>Facturadas: <strong className="text-slate-800 dark:text-gray-200 font-normal">{totalFacturadas}</strong></span>
          {errorFacturacion && <span className="text-red-500" title={errorFacturacion.message}>No se pudo cargar la facturación (¿índice pendiente de desplegar?)</span>}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-normal text-slate-500 dark:text-gray-400 uppercase tracking-wider">Total Orden:</span>
          <span className="text-[13px] font-normal text-[#2383C2] dark:text-[#369BCE] px-2 py-0.5 rounded bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700">
            ${(totalOrden || totalDetalle).toLocaleString('es-CL', { minimumFractionDigits: 0 })}
          </span>
        </div>
      </div>
    </div>
  );
};

export default DetalleOrdenTabla;
