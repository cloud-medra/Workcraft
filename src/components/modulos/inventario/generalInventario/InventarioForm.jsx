import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { Layers, Plus, Save, X, ChevronDown, Trash2 } from 'lucide-react';

const InventarioForm = ({
  formDataCaja,
  setFormDataCaja,
  itemsCaja,
  catalogoCodigos,
  editingId,
  onSubmit,
  onAgregarLinea,
  onEliminarLinea,
  onItemChange,
  onSeleccionarCodigo,
  onCancelar
}) => {
  return (
    <form onSubmit={onSubmit} className="px-3 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50/30 dark:bg-gray-800/20 flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-2.5">
        <div className="w-[220px]">
          <label className="block text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-0.5">
            Nombre / Código de Caja
          </label>
          <input
            required
            value={formDataCaja.nombreCaja}
            onChange={e => setFormDataCaja({ ...formDataCaja, nombreCaja: e.target.value })}
            className="w-full h-7 px-2 border border-gray-300 dark:border-gray-600 rounded text-[11px] outline-none focus:border-[#2383C2] bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100"
            placeholder="Ej: Caja Instrumental #1"
          />
        </div>
        <div className="w-[180px]">
          <label className="block text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-0.5">
            Ubicación (Estante/Bodega)
          </label>
          <input
            value={formDataCaja.ubicacion}
            onChange={e => setFormDataCaja({ ...formDataCaja, ubicacion: e.target.value })}
            className="w-full h-7 px-2 border border-gray-300 dark:border-gray-600 rounded text-[11px] outline-none focus:border-[#2383C2] bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100"
            placeholder="Ej: Estante A-2"
          />
        </div>
      </div>

      {/* Sección de Ítems */}
      <div className="border border-gray-200 dark:border-gray-700 rounded p-2 bg-white dark:bg-gray-900">
        <div className="flex justify-between items-center mb-2">
          <span className="font-bold text-gray-700 dark:text-gray-300 uppercase text-[10px] flex items-center gap-1">
            <Layers size={12} className="text-[#2383C2]" />
            Contenido de la Caja (Búsqueda por Referencia, Código, Descriptor o Empresa)
          </span>
          <button
            type="button"
            onClick={onAgregarLinea}
            className="text-[10px] bg-blue-50 dark:bg-blue-950/50 text-[#2383C2] px-2 py-1 rounded font-bold hover:bg-blue-100 transition cursor-pointer"
          >
            + Agregar otro ítem
          </button>
        </div>

        <div className="flex flex-col gap-2 max-h-52 overflow-y-auto pr-1">
          {itemsCaja.map((item, index) => (
            <FilaItemAutocompletado
              key={index}
              item={item}
              index={index}
              catalogoCodigos={catalogoCodigos}
              handleItemChange={onItemChange}
              seleccionarCodigoCatalogo={onSeleccionarCodigo}
              eliminarLineaItem={onEliminarLinea}
            />
          ))}
        </div>
      </div>

      {/* Botones */}
      <div className="flex gap-2">
        <button
          type="submit"
          className={`h-7 px-3 rounded font-bold text-[11px] flex items-center gap-1.5 ${
            editingId ? 'bg-amber-600 hover:bg-amber-700' : 'bg-[#2383C2] hover:bg-[#369BCE]'
          } text-white transition cursor-pointer`}
        >
          {editingId ? (
            <><Save size={13} /> Actualizar Caja</>
          ) : (
            <><Plus size={13} /> Registrar Caja</>
          )}
        </button>
        {editingId && (
          <button
            type="button"
            onClick={onCancelar}
            className="h-7 px-3 bg-gray-200 dark:bg-gray-700 rounded font-bold text-[11px] text-gray-600 dark:text-gray-300 flex items-center gap-1.5 hover:bg-gray-300 transition cursor-pointer"
          >
            <X size={13} /> Cancelar
          </button>
        )}
      </div>
    </form>
  );
};

// ========== Sub-componente FilaItemAutocompletado ==========
const FilaItemAutocompletado = ({
  item,
  index,
  catalogoCodigos,
  handleItemChange,
  seleccionarCodigoCatalogo,
  eliminarLineaItem
}) => {
  const [textoBusqueda, setTextoBusqueda] = useState(item.tipo || '');
  const [abierto, setAbierto] = useState(false);
  const [coordenadas, setCoordenadas] = useState({ top: 0, left: 0, width: 0 });
  const refInputContainer = useRef(null);

  useEffect(() => {
    setTextoBusqueda(item.tipo || '');
  }, [item.tipo]);

  const abrirDropdown = () => {
    if (refInputContainer.current) {
      const rect = refInputContainer.current.getBoundingClientRect();
      setCoordenadas({
        top: rect.bottom + window.scrollY + 2,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
    setAbierto(true);
  };

  useEffect(() => {
    const handleClickFuera = (e) => {
      if (refInputContainer.current && !refInputContainer.current.contains(e.target)) {
        const dropdownMenu = document.getElementById(`dropdown-portal-${index}`);
        if (!dropdownMenu || !dropdownMenu.contains(e.target)) {
          setAbierto(false);
        }
      }
    };
    document.addEventListener("mousedown", handleClickFuera);
    return () => document.removeEventListener("mousedown", handleClickFuera);
  }, [index]);

  const codigosFiltrados = catalogoCodigos.filter(cat => {
    const queryStr = textoBusqueda.toLowerCase();
    const referencia = (cat.referencia || '').toLowerCase();
    const codigo = (cat.codigo || '').toLowerCase();
    const descriptorAuto = (cat.descriptorAuto || '').toLowerCase();
    const empresa = (cat.empresa || '').toLowerCase();

    return (
      referencia.includes(queryStr) ||
      codigo.includes(queryStr) ||
      descriptorAuto.includes(queryStr) ||
      empresa.includes(queryStr)
    );
  });

  return (
    <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 p-1.5 rounded border border-gray-200 dark:border-gray-700 relative">
      <div className="flex-1 relative" ref={refInputContainer}>
        <div className="flex items-center">
          <input
            required
            placeholder="Buscar por referencia, código, descriptor o empresa..."
            value={textoBusqueda}
            onChange={(e) => {
              setTextoBusqueda(e.target.value);
              handleItemChange(index, 'tipo', e.target.value);
              abrirDropdown();
            }}
            onFocus={abrirDropdown}
            className="w-full h-6 px-1.5 pr-6 border border-gray-300 dark:border-gray-600 rounded text-[10px] bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 outline-none focus:border-[#2383C2]"
          />
          <button
            type="button"
            onClick={() => {
              if (abierto) setAbierto(false);
              else abrirDropdown();
            }}
            className="absolute right-1 text-gray-400 hover:text-gray-600 cursor-pointer"
          >
            <ChevronDown size={12} />
          </button>
        </div>

        {abierto && ReactDOM.createPortal(
          <div
            id={`dropdown-portal-${index}`}
            style={{
              position: 'absolute',
              top: `${coordenadas.top}px`,
              left: `${coordenadas.left}px`,
              width: `${coordenadas.width}px`,
              zIndex: 999999
            }}
            className="max-h-48 overflow-y-auto bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded shadow-2xl"
          >
            {codigosFiltrados.length > 0 ? (
              codigosFiltrados.map((cat) => (
                <div
                  key={cat.id}
                  onClick={() => {
                    seleccionarCodigoCatalogo(index, cat);
                    setTextoBusqueda(cat.descriptorAuto || cat.referencia || '');
                    setAbierto(false);
                  }}
                  className="px-2.5 py-1.5 hover:bg-blue-50 dark:hover:bg-gray-800 cursor-pointer border-b border-gray-100 dark:border-gray-800 text-[10px]"
                >
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-bold text-gray-800 dark:text-gray-100">
                        {cat.referencia || 'S/Ref'}
                      </span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        [{cat.codigo || 'S/Cod'}]
                      </span>
                      <span className="text-[#2383C2]">
                        {cat.descriptorAuto || 'S/Descriptor'}
                      </span>
                      <span className="text-gray-400 dark:text-gray-500 italic">
                        ({cat.empresa || 'S/Empresa'})
                      </span>
                    </div>
                    <span className="font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1 rounded">
                      ${Number(cat.precioNeto || cat.precio || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-2.5 py-2 text-gray-400 text-[10px] italic">
                No se encontraron coincidencias
              </div>
            )}
          </div>,
          document.body
        )}
      </div>

      <input
        readOnly
        value={`$ ${Number(item.precio || 0).toLocaleString()}`}
        className="w-28 h-6 px-1.5 border border-gray-300 dark:border-gray-600 rounded text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 outline-none cursor-not-allowed select-none font-semibold text-center"
        title="Precio automático desde el catálogo (No modificable)"
      />

      <input
        required
        type="number"
        min="1"
        placeholder="Cant."
        value={item.cantidad}
        onChange={e => handleItemChange(index, 'cantidad', parseInt(e.target.value) || 0)}
        className="w-16 h-6 px-1.5 border border-gray-300 dark:border-gray-600 rounded text-[10px] bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 outline-none"
      />
      <input
        placeholder="Lote"
        value={item.lote}
        onChange={e => handleItemChange(index, 'lote', e.target.value)}
        className="w-24 h-6 px-1.5 border border-gray-300 dark:border-gray-600 rounded text-[10px] bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 outline-none"
      />
      <input
        type="date"
        value={item.vencimiento}
        onChange={e => handleItemChange(index, 'vencimiento', e.target.value)}
        className="w-28 h-6 px-1.5 border border-gray-300 dark:border-gray-600 rounded text-[10px] bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 outline-none"
      />

      <button
        type="button"
        onClick={() => eliminarLineaItem(index)}
        className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
};

export default InventarioForm;