import React, { useState } from 'react';
import { Save, PackageCheck } from 'lucide-react';
import { useToast } from '../../../../context/ToastContext';
import { useUser } from '../../../../context/UserContext';
import Spinner from '../../../ui/Spinner';
import TablaItemsIngreso from './TablaItemsIngreso';
import CabeceraIngreso, { CLASE_INPUT_INGRESO } from '../shared/ingreso/CabeceraIngreso';
import { useCatalogosIngreso } from '../shared/ingreso/useCatalogosIngreso';
import { cabeceraVaciaIngreso, itemVacioIngreso, datosProductoIngreso, validarIngresoStock } from '../shared/ingreso/ingresoStock';
import { guardarIngresoStock, IngresoDuplicadoError } from '../shared/ingreso/ingresoStockService';

const IngresosInventario = () => {
  const { catalogoCodigos, listaEmpresas, listaCajas } = useCatalogosIngreso();
  const [cargando, setCargando] = useState(false);

  const inputBlueFocusClass = CLASE_INPUT_INGRESO;

  // Datos de cabecera del documento de entrada
  const [formDataIngreso, setFormDataIngreso] = useState(cabeceraVaciaIngreso);

  // Lista de ítems/referencias a ingresar
  const [itemsIngreso, setItemsIngreso] = useState(() => [itemVacioIngreso()]);

  const { showToast } = useToast();
  const { userData } = useUser();

  const agregarLineaItem = () => {
    setItemsIngreso([...itemsIngreso, itemVacioIngreso()]);
  };

  const eliminarLineaItem = (index) => {
    if (itemsIngreso.length === 1) {
      return showToast("Debe ingresar al menos una referencia", "error");
    }
    setItemsIngreso(itemsIngreso.filter((_, i) => i !== index));
  };

  const handleItemChange = (index, campo, valor) => {
    const nuevosItems = [...itemsIngreso];
    nuevosItems[index][campo] = valor;
    setItemsIngreso(nuevosItems);
  };

  const seleccionarCodigoCatalogo = (index, cat) => {
    const nuevosItems = [...itemsIngreso];
    nuevosItems[index] = { ...nuevosItems[index], ...datosProductoIngreso(cat) };
    setItemsIngreso(nuevosItems);
  };

  const handleGuardarIngreso = async (e) => {
    e.preventDefault();

    const errorValidacion = validarIngresoStock(formDataIngreso, itemsIngreso);
    if (errorValidacion) return showToast(errorValidacion, "error");

    setCargando(true);
    try {
      await guardarIngresoStock({ cabecera: formDataIngreso, items: itemsIngreso, usuario: userData });
      showToast("Ingreso de stock registrado con éxito", "success");
      limpiarFormulario();
    } catch (error) {
      if (error instanceof IngresoDuplicadoError) showToast(error.message, "error");
      else showToast("Error al procesar el ingreso: " + error.message, "error");
    } finally {
      setCargando(false);
    }
  };

  const limpiarFormulario = () => {
    setFormDataIngreso(cabeceraVaciaIngreso());
    setItemsIngreso([itemVacioIngreso()]);
  };

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden p-0 relative text-[11px]">
      {cargando && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-gray-500/20 dark:bg-black/40 backdrop-blur-[2px]">
          <div className="bg-white/90 dark:bg-gray-800/90 p-4 rounded-xl shadow-xl flex flex-col items-center gap-3">
            <Spinner size="md" color="#2383C2" />
            <h3 className="text-[#2383C2] font-bold text-[13px]">Guardando ingreso de inventario...</h3>
          </div>
        </div>
      )}

      {/* Cabecera */}
      <div className="px-3 py-2 flex items-center justify-between border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/80">
        <h2 className="text-[12px] font-bold text-gray-700 dark:text-gray-100 flex items-center gap-1.5">
          <PackageCheck size={16} className="text-[#2383C2]" />
          REGISTRO DE INGRESO DE STOCK (GUÍAS / ÓRDENES)
        </h2>
      </div>

      <form onSubmit={handleGuardarIngreso} autoComplete="off" className="p-3 flex flex-col gap-3 overflow-y-auto">
        {/* Datos Documento de Ingreso */}
        <CabeceraIngreso
          cabecera={formDataIngreso}
          setCabecera={setFormDataIngreso}
          listaEmpresas={listaEmpresas}
          listaCajas={listaCajas}
          inputClass={inputBlueFocusClass}
        />

        {/* Componente Tabla de Ítems */}
        <TablaItemsIngreso
          itemsIngreso={itemsIngreso}
          catalogoCodigos={catalogoCodigos}
          inputBlueFocusClass={inputBlueFocusClass}
          handleItemChange={handleItemChange}
          seleccionarCodigoCatalogo={seleccionarCodigoCatalogo}
          eliminarLineaItem={eliminarLineaItem}
          agregarLineaItem={agregarLineaItem}
        />

        {/* Botones de Acción */}
        <div className="flex items-center justify-end pt-2 gap-2">
          <button
            type="button"
            onClick={limpiarFormulario}
            className="px-3 py-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition"
          >
            Limpiar
          </button>
          <button
            type="submit"
            className="flex items-center gap-1.5 px-4 py-1.5 bg-[#2383C2] hover:bg-[#1d6fa5] text-white rounded font-bold transition shadow-sm"
          >
            <Save size={14} />
            Guardar Ingreso de Stock
          </button>
        </div>
      </form>
    </div>
  );
};

export default IngresosInventario;