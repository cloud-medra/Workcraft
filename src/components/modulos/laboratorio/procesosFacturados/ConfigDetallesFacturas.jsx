import React, { useState } from 'react';
import { X, Settings, Calendar, Hash, Building2, Save, Trash2, Plus, Tag, DollarSign } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../../firebaseConfig';
import { useToast } from '../../../../context/ToastContext';

// Funciones para normalizar el formato dd/mm/yyyy
const formatToDDMMYYYY = (dateStr) => {
  if (!dateStr) return '';
  if (dateStr.includes('/')) return dateStr;
  const [year, month, day] = dateStr.split('T')[0].split('-');
  return (year && month && day) ? `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}` : dateStr;
};

const formatToYYYYMMDD = (dateStr) => {
  if (!dateStr) return '';
  if (dateStr.includes('-')) return dateStr.split('T')[0];
  const [day, month, year] = dateStr.split('/');
  return (year && month && day) ? `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}` : '';
};

const ConfigDetallesFacturas = ({ factura, filtroAnio, filtroMes, onClose }) => {
  if (!factura) return null;

  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);

  // --- ESTADOS GENERALES DE LA FACTURA ---
  const [folio, setFolio] = useState(factura.folio || '');
  const [fchEmis, setFchEmis] = useState(formatToDDMMYYYY(factura.fchEmis || ''));
  const [rznSoc, setRznSoc] = useState(factura.rznSoc || '');
  const [folioRef, setFolioRef] = useState(factura.folioRef || '');
  
  // Campos de control interno
  const [estado, setEstado] = useState(factura.estado || '');
  const [ordenCompra, setOrdenCompra] = useState(factura.ordenCompra || factura.folioRef || '');
  const [acta, setActa] = useState(factura.acta || '');
  const [salida, setSalida] = useState(factura.salida || '');
  const [mesImputado, setMesImputado] = useState(factura.mesImputado || filtroMes || '');

  // --- ESTADO DE DETALLES / ÍTEMS ---
  const [detalles, setDetalles] = useState(
    factura.detalles && factura.detalles.length > 0
      ? factura.detalles.map(d => ({
          codigo: d.codigo || '',
          nombre: d.nombre || '',
          cantidad: Number(d.cantidad) || 0,
          unidad: d.unidad || '',
          precio: Number(d.precio) || 0,
          monto: Number(d.monto) || (Number(d.cantidad || 0) * Number(d.precio || 0))
        }))
      : []
  );

  const COL_BASE = "laboratorio_facturasXml";

  // Manejar cambios en la tabla de ítems
  const handleItemChange = (index, field, value) => {
    const nuevosDetalles = [...detalles];
    nuevosDetalles[index][field] = value;

    if (field === 'cantidad' || field === 'precio') {
      const cant = Number(field === 'cantidad' ? value : nuevosDetalles[index].cantidad) || 0;
      const prec = Number(field === 'precio' ? value : nuevosDetalles[index].precio) || 0;
      nuevosDetalles[index].monto = cant * prec;
    }

    setDetalles(nuevosDetalles);
  };

  // Agregar una nueva fila de detalle
  const handleAddRow = () => {
    setDetalles([
      ...detalles,
      { codigo: '', nombre: '', cantidad: 1, unidad: 'UNI', precio: 0, monto: 0 }
    ]);
  };

  // Eliminar una fila de detalle
  const handleRemoveRow = (index) => {
    setDetalles(detalles.filter((_, idx) => idx !== index));
  };

  // Calcular el Total Neto acumulado dinámicamente
  const totalCalculado = detalles.reduce((acc, curr) => acc + (Number(curr.monto) || 0), 0);

  // Guardar cambios en Firestore
  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const docRef = doc(db, COL_BASE, filtroAnio, "meses", filtroMes, "documentos", factura.id);

      await updateDoc(docRef, {
        folio,
        fchEmis, // Se guarda en Firestore con formato DD/MM/YYYY
        rznSoc,
        folioRef,
        estado,
        ordenCompra,
        acta,
        salida,
        mesImputado,
        total: totalCalculado,
        detalles,
        updatedAt: new Date()
      });

      showToast("Factura y detalles actualizados correctamente", "success");
      onClose();
    } catch (error) {
      console.error("Error al guardar la edición:", error);
      showToast("Error al guardar los cambios", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 dark:bg-black/80 backdrop-blur-[2px] p-3 font-sans text-[11px]">
      <div className="bg-white dark:bg-gray-800 w-full max-w-6xl rounded-lg shadow-xl overflow-hidden flex flex-col h-[92vh] border border-gray-200 dark:border-gray-700">

        {/* CABECERA */}
        <div className="flex justify-between items-center px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/80 shrink-0">
          <div className="flex items-center gap-2">
            <Settings className="text-[#2383C2]" size={16} />
            <h3 className="text-[12px] font-bold text-gray-800 dark:text-gray-100 uppercase tracking-wide">
              Edición Integral de Factura
            </h3>
          </div>
          <button 
            onClick={onClose} 
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* FORMULARIO CONTENEDOR PRINCIPAL */}
        <form onSubmit={handleSave} className="flex flex-col flex-grow overflow-hidden">
          
          {/* SECCIÓN 1: DATOS GENERALES Y CONTROL */}
          <div className="p-3 bg-gray-50/50 dark:bg-gray-900/40 border-b border-gray-200 dark:border-gray-700 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2.5 shrink-0">
            
            <div className="flex flex-col gap-0.5">
              <label className="text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase flex items-center gap-1">
                <Hash size={10} className="text-[#2383C2]" /> Folio
              </label>
              <input
                type="text"
                value={folio}
                onChange={(e) => setFolio(e.target.value)}
                className="h-7 px-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 font-bold text-gray-800 dark:text-gray-100 outline-none focus:border-[#2383C2]"
              />
            </div>

            {/* FCH EMISIÓN EDITADO */}
            <div className="flex flex-col gap-0.5">
              <label className="text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase flex items-center gap-1">
                <Calendar size={10} className="text-[#2383C2]" /> Fch. Emisión
              </label>
              <input
                type="date"
                value={formatToYYYYMMDD(fchEmis)}
                onChange={(e) => setFchEmis(formatToDDMMYYYY(e.target.value))}
                className="h-7 px-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 outline-none focus:border-[#2383C2]"
              />
            </div>

            <div className="flex flex-col gap-0.5">
              <label className="text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase flex items-center gap-1">
                <Tag size={10} className="text-[#2383C2]" /> Ref. / OC
              </label>
              <input
                type="text"
                value={folioRef}
                onChange={(e) => {
                  setFolioRef(e.target.value);
                  setOrdenCompra(e.target.value);
                }}
                className="h-7 px-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 outline-none focus:border-[#2383C2]"
              />
            </div>

            <div className="flex flex-col gap-0.5 col-span-2 md:col-span-1">
              <label className="text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase flex items-center gap-1">
                <Building2 size={10} className="text-[#2383C2]" /> Razón Social
              </label>
              <input
                type="text"
                value={rznSoc}
                onChange={(e) => setRznSoc(e.target.value)}
                className="h-7 px-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 outline-none focus:border-[#2383C2] truncate"
              />
            </div>

            <div className="flex flex-col gap-0.5">
              <label className="text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase">Estado</label>
              <select
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
                className="h-7 px-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 outline-none focus:border-[#2383C2]"
              >
                <option value="">-- Estado --</option>
                <option value="Poceso Iniciado">Poceso Iniciado</option>
                <option value="Pendiente Vinculación">Pendiente Vinculación</option>
                <option value="Códigos Vinculados">Códigos Vinculados</option>
                <option value="Con Diferencias OC">Con Diferencias OC</option>
                <option value="Listo para Ingreso">Listo para Ingreso</option>
                <option value="Diferencias Reportadas">Diferencias Reportadas</option>
                <option value="En Revisión">En Revisión</option>
                <option value="Completado">Completado</option>
              </select>
            </div>

            <div className="flex flex-col gap-0.5">
              <label className="text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase">N° Acta</label>
              <input
                type="text"
                value={acta}
                onChange={(e) => setActa(e.target.value)}
                placeholder="Acta"
                className="h-7 px-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 outline-none focus:border-[#2383C2]"
              />
            </div>

            <div className="flex flex-col gap-0.5">
              <label className="text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase">Salida</label>
              <input
                type="text"
                value={salida}
                onChange={(e) => setSalida(e.target.value)}
                placeholder="Salida"
                className="h-7 px-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 outline-none focus:border-[#2383C2]"
              />
            </div>

            <div className="flex flex-col gap-0.5">
              <label className="text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase">Mes Imputado</label>
              <input
                type="text"
                value={mesImputado}
                onChange={(e) => setMesImputado(e.target.value)}
                placeholder="Mes"
                className="h-7 px-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 outline-none focus:border-[#2383C2] capitalize"
              />
            </div>

            <div className="flex flex-col gap-0.5">
              <label className="text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase flex items-center gap-1">
                <DollarSign size={10} className="text-[#2383C2]" /> Total Neto Calculado
              </label>
              <div className="h-7 px-2 border border-gray-200 dark:border-gray-700 rounded bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 font-bold flex items-center justify-end">
                ${totalCalculado.toLocaleString('es-CL')}
              </div>
            </div>

          </div>

          {/* SECCIÓN 2: BARRA DE ACCIÓN DE ÍTEMS */}
          <div className="px-4 py-1.5 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between shrink-0">
            <span className="text-[10px] font-bold uppercase text-gray-600 dark:text-gray-300">
              Detalle de Ítems ({detalles.length})
            </span>
            <button
              type="button"
              onClick={handleAddRow}
              className="h-6 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold transition flex items-center gap-1 shadow-xs"
            >
              <Plus size={12} /> Añadir Ítem
            </button>
          </div>

          {/* SECCIÓN 3: TABLA DE ÍTEMS EDITABLES */}
          <div className="flex-grow overflow-y-auto">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead className="bg-gray-100 dark:bg-gray-900 sticky top-0 z-20 shadow-xs">
                <tr className="text-gray-600 dark:text-gray-400 uppercase font-bold text-[10px]">
                  <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700 w-10 text-center">#</th>
                  <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700 w-28">Código</th>
                  <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700">Descripción / Nombre</th>
                  <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700 w-20 text-center">Cant.</th>
                  <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700 w-20 text-center">Unidad</th>
                  <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700 w-28 text-right">P. Unitario</th>
                  <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700 w-32 text-right">Total Línea</th>
                  <th className="py-1.5 px-2 border-b border-gray-200 dark:border-gray-700 w-12 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700/60 bg-white dark:bg-gray-800">
                {detalles.map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/80 dark:hover:bg-gray-700/40 transition-colors">
                    <td className="py-1 px-2 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-400 font-bold text-center">
                      {idx + 1}
                    </td>
                    <td className="py-1 px-1 border-b border-r border-gray-200 dark:border-gray-700/70">
                      <input
                        type="text"
                        value={item.codigo}
                        onChange={(e) => handleItemChange(idx, 'codigo', e.target.value)}
                        className="w-full h-6 px-1 border border-transparent hover:border-gray-300 focus:border-[#2383C2] rounded bg-transparent text-gray-800 dark:text-gray-100 font-mono outline-none"
                        placeholder="Sin cód."
                      />
                    </td>
                    <td className="py-1 px-1 border-b border-r border-gray-200 dark:border-gray-700/70">
                      <input
                        type="text"
                        value={item.nombre}
                        onChange={(e) => handleItemChange(idx, 'nombre', e.target.value)}
                        className="w-full h-6 px-1 border border-transparent hover:border-gray-300 focus:border-[#2383C2] rounded bg-transparent text-gray-800 dark:text-gray-100 font-medium outline-none"
                        placeholder="Descripción del producto o servicio"
                      />
                    </td>
                    <td className="py-1 px-1 border-b border-r border-gray-200 dark:border-gray-700/70">
                      <input
                        type="number"
                        min="0"
                        value={item.cantidad}
                        onChange={(e) => handleItemChange(idx, 'cantidad', e.target.value)}
                        className="w-full h-6 px-1 border border-transparent hover:border-gray-300 focus:border-[#2383C2] rounded bg-transparent text-gray-800 dark:text-gray-100 text-center font-medium outline-none"
                      />
                    </td>
                    <td className="py-1 px-1 border-b border-r border-gray-200 dark:border-gray-700/70">
                      <input
                        type="text"
                        value={item.unidad}
                        onChange={(e) => handleItemChange(idx, 'unidad', e.target.value)}
                        className="w-full h-6 px-1 border border-transparent hover:border-gray-300 focus:border-[#2383C2] rounded bg-transparent text-gray-800 dark:text-gray-100 text-center uppercase outline-none text-[10px]"
                      />
                    </td>
                    <td className="py-1 px-1 border-b border-r border-gray-200 dark:border-gray-700/70">
                      <input
                        type="number"
                        min="0"
                        value={item.precio}
                        onChange={(e) => handleItemChange(idx, 'precio', e.target.value)}
                        className="w-full h-6 px-1 border border-transparent hover:border-gray-300 focus:border-[#2383C2] rounded bg-transparent text-gray-800 dark:text-gray-100 text-right outline-none"
                      />
                    </td>
                    <td className="py-1 px-2 border-b border-r border-gray-200 dark:border-gray-700 text-right font-bold text-gray-800 dark:text-gray-100">
                      ${(Number(item.monto) || 0).toLocaleString('es-CL')}
                    </td>
                    <td className="py-1 px-1 border-b border-gray-200 dark:border-gray-700 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(idx)}
                        className="text-gray-400 hover:text-red-500 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        title="Eliminar fila"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* PIE DE MODAL */}
          <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex justify-between items-center shrink-0">
            <p className="text-[9px] text-gray-400 italic">Los cambios modifican directamente la información guardada en la base de datos.</p>
            
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="h-7 px-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded text-[10px] font-bold transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="h-7 px-4 bg-[#2383C2] hover:bg-[#1c6fa6] text-white rounded text-[10px] font-bold transition shadow-sm flex items-center gap-1.5 disabled:opacity-50"
              >
                <Save size={12} />
                {loading ? 'Guardando...' : 'Guardar Todo'}
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};

export default ConfigDetallesFacturas;