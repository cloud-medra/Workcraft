import React from 'react';
import { Plus, Trash2 } from 'lucide-react';

const TablaItemsIngreso = ({
  itemsIngreso,
  catalogoCodigos,
  inputBlueFocusClass,
  handleItemChange,
  seleccionarCodigoCatalogo,
  eliminarLineaItem,
  agregarLineaItem
}) => {
  return (
    <div className="flex flex-col gap-2">
      <div className="border border-gray-200 dark:border-gray-700 rounded-md overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[700px]">
          <thead>
            <tr className="bg-gray-100 dark:bg-gray-700/50 text-gray-700 dark:text-gray-200 border-b border-gray-200 dark:border-gray-700">
              <th className="p-2 w-[28%]">Buscar (Referencia / Descripción) *</th>
              <th className="p-2 w-[14%]">Código</th>
              <th className="p-2 w-[10%]">Cantidad</th>
              <th className="p-2 w-[14%]">Lote</th>
              <th className="p-2 w-[14%]">Vencimiento</th>
              <th className="p-2 w-[12%]">Precio U.</th>
              <th className="p-2 text-center w-[8%]">Acción</th>
            </tr>
          </thead>
          <tbody>
            {itemsIngreso.map((item, index) => (
              <tr key={index} className="border-b border-gray-200 dark:border-gray-700/60">
                {/* Desplegable de Referencia / Descripción */}
                <td className="p-1.5">
                  <select
                    onChange={(e) => {
                      const seleccionado = catalogoCodigos.find(c => c.id === e.target.value);
                      if (seleccionado) seleccionarCodigoCatalogo(index, seleccionado);
                    }}
                    value={item.codigoId || ''}
                    className={inputBlueFocusClass}
                  >
                    <option value="">-- Seleccionar por Referencia / Descripción --</option>
                    {catalogoCodigos.map(cat => {
                      const refText = cat.referencia || '';
                      const descText = cat.descriptorAuto || cat.descripcion || cat.tipo || '';
                      const etiqueta = refText && descText ? `${refText} - ${descText}` : (refText || descText || 'Sin descripción');
                      
                      return (
                        <option key={cat.id} value={cat.id}>
                          {etiqueta}
                        </option>
                      );
                    })}
                  </select>
                </td>

                {/* Código (Bloqueado / Solo Lectura) */}
                <td className="p-1.5">
                  <input
                    type="text"
                    value={item.codigo}
                    readOnly
                    disabled
                    placeholder="Auto"
                    className={`${inputBlueFocusClass} bg-gray-100 dark:bg-gray-800/50 text-gray-500 cursor-not-allowed`}
                  />
                </td>

                {/* Cantidad */}
                <td className="p-1.5">
                  <input
                    type="number"
                    min="1"
                    value={item.cantidad}
                    onChange={(e) => handleItemChange(index, 'cantidad', parseInt(e.target.value) || 0)}
                    autoComplete="off"
                    className={inputBlueFocusClass}
                    required
                  />
                </td>

                {/* Lote */}
                <td className="p-1.5">
                  <input
                    type="text"
                    value={item.lote}
                    onChange={(e) => handleItemChange(index, 'lote', e.target.value)}
                    placeholder="N° Lote"
                    autoComplete="off"
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck="false"
                    className={inputBlueFocusClass}
                  />
                </td>

                {/* Vencimiento */}
                <td className="p-1.5">
                  <input
                    type="date"
                    value={item.vencimiento}
                    onChange={(e) => handleItemChange(index, 'vencimiento', e.target.value)}
                    autoComplete="off"
                    className={inputBlueFocusClass}
                  />
                </td>

                {/* Precio U. (Bloqueado / Solo Lectura) */}
                <td className="p-1.5">
                  <input
                    type="number"
                    value={item.precio}
                    readOnly
                    disabled
                    placeholder="0"
                    className={`${inputBlueFocusClass} bg-gray-100 dark:bg-gray-800/50 text-gray-500 cursor-not-allowed`}
                  />
                </td>

                {/* Acción Eliminar */}
                <td className="p-1.5 text-center">
                  <button
                    type="button"
                    onClick={() => eliminarLineaItem(index)}
                    className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 rounded transition"
                    title="Eliminar fila"
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <button
          type="button"
          onClick={agregarLineaItem}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded font-semibold transition"
        >
          <Plus size={14} />
          Añadir otra referencia
        </button>
      </div>
    </div>
  );
};

export default TablaItemsIngreso;