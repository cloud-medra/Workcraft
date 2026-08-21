import React from 'react';
import { Search, Filter, History, Pencil, Trash2 } from 'lucide-react';

const InventarioTable = ({
  cajasFiltradas,
  filtros,
  setFiltros,
  onEditar,
  onEliminar,
  onVerHistorial
}) => {
  return (
    <>
      {/* Barra de Filtros */}
      <div className="bg-gray-50 dark:bg-gray-800/50 px-3 py-2 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center gap-2">
        <span className="font-bold text-gray-600 dark:text-gray-300 flex items-center gap-1 mr-1">
          <Filter size={12} className="text-[#2383C2]" /> Filtros:
        </span>

        <div className="relative">
          <Search className="absolute left-2 top-1.5 text-gray-400" size={12} />
          <input
            value={filtros.nombreCaja}
            onChange={e => setFiltros({ ...filtros, nombreCaja: e.target.value })}
            className="w-44 h-6 pl-6 pr-2 border border-gray-300 dark:border-gray-600 rounded text-[10px] outline-none bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100"
            placeholder="Filtrar por Caja..."
          />
        </div>

        <div className="relative">
          <Search className="absolute left-2 top-1.5 text-gray-400" size={12} />
          <input
            value={filtros.ubicacion}
            onChange={e => setFiltros({ ...filtros, ubicacion: e.target.value })}
            className="w-40 h-6 pl-6 pr-2 border border-gray-300 dark:border-gray-600 rounded text-[10px] outline-none bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100"
            placeholder="Filtrar por Ubicación..."
          />
        </div>

        <div className="relative">
          <Search className="absolute left-2 top-1.5 text-gray-400" size={12} />
          <input
            value={filtros.contenido}
            onChange={e => setFiltros({ ...filtros, contenido: e.target.value })}
            className="w-48 h-6 pl-6 pr-2 border border-gray-300 dark:border-gray-600 rounded text-[10px] outline-none bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100"
            placeholder="Filtrar por Contenido/Ítem..."
          />
        </div>

        {(filtros.nombreCaja || filtros.ubicacion || filtros.contenido) && (
          <button
            onClick={() => setFiltros({ nombreCaja: '', ubicacion: '', contenido: '' })}
            className="text-[10px] text-red-500 hover:text-red-700 font-semibold px-2 py-0.5 bg-red-50 dark:bg-red-950/40 rounded transition cursor-pointer"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Tabla */}
      <div className="flex-grow overflow-auto">
        <table className="w-full text-left text-[11px] border-collapse">
          <thead className="bg-gray-100 dark:bg-gray-900 sticky top-0 z-10">
            <tr className="text-gray-600 dark:text-gray-400 uppercase font-bold text-[10px]">
              <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700 w-8 text-center">#</th>
              <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700 w-48">Caja / Ubicación</th>
              <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700">Contenido Detallado</th>
              <th className="py-1.5 px-2 border-b border-gray-200 dark:border-gray-700 text-center w-20">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cajasFiltradas.length > 0 ? (
              cajasFiltradas.map((caja, index) => (
                <tr
                  key={caja.id}
                  className="border-l-2 border-transparent hover:border-[#2383C2] hover:bg-gray-50/80 dark:hover:bg-gray-700/40 transition-colors"
                >
                  <td className="py-2 px-2 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-500 font-bold text-center align-top">
                    {index + 1}
                  </td>
                  <td className="py-2 px-2 border-b border-r border-gray-200 dark:border-gray-700/70 align-top">
                    <div className="font-bold text-gray-800 dark:text-gray-100">{caja.nombreCaja}</div>
                    <div className="text-gray-400 text-[9px]">
                      Ubicación: {caja.ubicacion || 'No especificada'}
                    </div>
                  </td>
                  <td className="py-2 px-2 border-b border-r border-gray-200 dark:border-gray-700/70 align-top">
                    <div className="flex flex-col gap-1">
                      {caja.items?.map((item, idx) => {
                        const totalCalculado = (Number(item.precio) || 0) * (Number(item.cantidad) || 0);
                        return (
                          <div
                            key={idx}
                            className="grid grid-cols-12 items-center gap-1.5 bg-gray-50 dark:bg-gray-800/60 px-2 py-1 rounded border border-gray-200/60 dark:border-gray-700/60 text-[10px]"
                          >
                            <div className="col-span-1 font-bold text-emerald-600 dark:text-emerald-400 truncate" title={item.codigo}>
                              {item.codigo ? `[${item.codigo}]` : '-'}
                            </div>
                            <div className="col-span-1.5 font-semibold text-gray-700 dark:text-gray-300 truncate" title={item.referencia}>
                              Ref: {item.referencia || 'S/Ref'}
                            </div>
                            <div className="col-span-3 font-bold text-[#2383C2] truncate" title={item.tipo}>
                              {item.tipo}
                            </div>
                            <div className="col-span-1 text-gray-800 dark:text-gray-200 font-bold text-center">
                              Cant: {item.cantidad}
                            </div>
                            <div className="col-span-1.5 text-gray-600 dark:text-gray-300 font-medium truncate">
                              P.Unit: ${Number(item.precio || 0).toLocaleString()}
                            </div>
                            <div className="col-span-1.5 text-emerald-700 dark:text-emerald-300 font-bold truncate">
                              Total: ${totalCalculado.toLocaleString()}
                            </div>
                            <div className="col-span-1.2 text-gray-500 truncate" title={item.lote}>
                              Lote: {item.lote || 'N/A'}
                            </div>
                            <div className="col-span-1.3 text-gray-500 truncate" title={item.vencimiento}>
                              Venc: {item.vencimiento || 'N/A'}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </td>
                  <td className="py-2 px-2 border-b border-gray-200 dark:border-gray-700 text-center align-top">
                    <div className="flex justify-center gap-2 pt-1">
                      <button
                        onClick={() => onVerHistorial(caja)}
                        title="Ver Historial / Logs"
                        className="text-gray-500 hover:text-[#2383C2] dark:hover:text-[#2383C2] transition cursor-pointer"
                      >
                        <History size={13} />
                      </button>
                      <button
                        onClick={() => onEditar(caja)}
                        title="Editar Caja"
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 transition cursor-pointer"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => onEliminar(caja.id)}
                        title="Eliminar Caja"
                        className="text-red-500 hover:text-red-700 transition cursor-pointer"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" className="py-4 text-center text-gray-400 italic text-[10px]">
                  No se encontraron cajas que coincidan con los filtros aplicados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default InventarioTable;