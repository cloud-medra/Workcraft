import React, { useState, useEffect } from 'react';
import { X, Edit3, DollarSign } from 'lucide-react';
import Spinner from '../../../../../ui/Spinner';

const ModificarRegistroDrawer = ({
  show,
  onClose,
  itemSeleccionado,
  empresasMaestro,
  onActualizarRegistro,
  cargando
}) => {
  const [formData, setFormData] = useState({
    codigo: '',
    referencia: '',
    descriptorEmpresa: '',
    empresa: '',
    tipo: '',
    segmento: '',
    clase: '',
    descriptorAuto: '',
    precioNeto: '',
    cx: '',
    observacion: ''
  });

  const [mostrarDropdownEmpresa, setMostrarDropdownEmpresa] = useState(false);

  // Cargar los datos del item seleccionado al abrir el drawer
  useEffect(() => {
    if (itemSeleccionado) {
      setFormData({
        codigo: itemSeleccionado.codigo || '',
        referencia: itemSeleccionado.referencia || '',
        descriptorEmpresa: itemSeleccionado.descriptorEmpresa || '',
        empresa: itemSeleccionado.empresa || '',
        tipo: itemSeleccionado.tipo || '',
        segmento: itemSeleccionado.segmento || '',
        clase: itemSeleccionado.clase || '',
        descriptorAuto: itemSeleccionado.descriptorAuto || '',
        precioNeto: itemSeleccionado.precioNeto ? new Intl.NumberFormat('es-ES').format(itemSeleccionado.precioNeto) : '',
        cx: itemSeleccionado.cx || '',
        observacion: '' // Se limpia la observación para el nuevo registro de cambio
      });
    }
  }, [itemSeleccionado]);

  // Autogenerar descriptor si cambia referencia o descriptorEmpresa
  useEffect(() => {
    const parts = [formData.referencia, formData.descriptorEmpresa].filter(Boolean);
    if (parts.length > 0) {
      setFormData(prev => ({ ...prev, descriptorAuto: parts.join(' ').toUpperCase() }));
    } else {
      setFormData(prev => ({ ...prev, descriptorAuto: '' }));
    }
  }, [formData.referencia, formData.descriptorEmpresa]);

  if (!show) return null;

  const formatearMiles = (valor) => {
    if (valor === null || valor === undefined || valor === '') return '';
    const num = valor.toString().replace(/\D/g, '');
    if (num === '') return '';
    return new Intl.NumberFormat('es-ES').format(num);
  };

  const empresasFiltradasLista = empresasMaestro.filter(emp =>
    emp.nombre.toLowerCase().includes((formData.empresa || '').toLowerCase())
  );

  const handleSubmit = (e) => {
    e.preventDefault();

    // Convertir el precio neto a numérico eliminando puntos de miles
    const precioNumericoNuevo = Number(formData.precioNeto.toString().replace(/\./g, '').replace(/,/g, '') || 0);
    const precioNumericoAnterior = Number(itemSeleccionado?.precioNeto || 0);

    // Validar si hubo cambios reales para el log (especialmente el precio)
    const precioCambio = precioNumericoAnterior !== precioNumericoNuevo;

    // Estructuramos los datos incluyendo el payload detallado para el LOG de auditoría
    const datosConLog = {
      ...formData,
      precioNeto: precioNumericoNuevo,
      logAuditoria: {
        accion: 'ACTUALIZACION_REGISTRO',
        fecha: new Date().toISOString(),
        detalles: {
          codigo: formData.codigo,
          referencia: formData.referencia,
          empresa: formData.empresa,
          precioNetoAnterior: precioNumericoAnterior,
          precioNetoNuevo: precioNumericoNuevo,
          cambioPrecio: precioCambio ? `${precioNumericoAnterior} -> ${precioNumericoNuevo}` : 'Sin cambios en precio',
          observacionModificacion: formData.observacion || 'Sin observaciones adicionales'
        }
      }
    };

    onActualizarRegistro(itemSeleccionado.id, datosConLog);
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white dark:bg-gray-800 shadow-2xl border-l border-gray-200 dark:border-gray-700 flex flex-col transition-transform duration-300 text-[11px]">
      
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-900">
        <h3 className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2 text-[12px]">
          <Edit3 size={15} className="text-[#2383C2]" />
          MODIFICAR REGISTRO Y PRECIOS
        </h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-md transition cursor-pointer"
        >
          <X size={16} />
        </button>
      </div>

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto p-4 space-y-3">
        
        {/* Destacado principal: Precio Neto */}
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg">
          <div className="flex justify-between items-center mb-1">
            <label className="block text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase flex items-center gap-1">
              <DollarSign size={13} />
              Precio Neto Actualizado *
            </label>
            <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">
              Anterior: ${new Intl.NumberFormat('es-ES').format(itemSeleccionado?.precioNeto || 0)}
            </span>
          </div>
          <input
            required
            autoFocus
            type="text"
            value={formData.precioNeto}
            onChange={e => {
              const valorRaw = e.target.value.replace(/\D/g, '');
              setFormData({ ...formData, precioNeto: formatearMiles(valorRaw) });
            }}
            placeholder="Ingrese el nuevo precio..."
            className="w-full h-8 px-2 border border-emerald-300 dark:border-emerald-700 rounded text-[13px] font-bold outline-none focus:border-emerald-500 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100"
          />
        </div>

        {/* Código */}
        <div>
          <label className="block font-bold text-gray-500 dark:text-gray-400 uppercase mb-0.5">Código</label>
          <input
            value={formData.codigo}
            onChange={e => setFormData({ ...formData, codigo: e.target.value.toUpperCase() })}
            className="w-full h-7 px-2 border border-gray-300 dark:border-gray-600 rounded outline-none bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100 font-bold"
          />
        </div>

        <div>
          <label className="block font-bold text-gray-500 dark:text-gray-400 uppercase mb-0.5">Referencia</label>
          <input
            required
            value={formData.referencia}
            onChange={e => setFormData({ ...formData, referencia: e.target.value })}
            className="w-full h-7 px-2 border border-gray-300 dark:border-gray-600 rounded outline-none focus:border-[#2383C2] bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100"
          />
        </div>

        <div>
          <label className="block font-bold text-gray-500 dark:text-gray-400 uppercase mb-0.5">Descriptor Empresa</label>
          <input
            value={formData.descriptorEmpresa}
            onChange={e => setFormData({ ...formData, descriptorEmpresa: e.target.value })}
            className="w-full h-7 px-2 border border-gray-300 dark:border-gray-600 rounded outline-none focus:border-[#2383C2] bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100"
          />
        </div>

        {/* Empresa Autocompletable */}
        <div className="relative">
          <label className="block font-bold text-gray-500 dark:text-gray-400 uppercase mb-0.5">Empresa</label>
          <input
            required
            type="text"
            value={formData.empresa}
            onChange={e => {
              setFormData({ ...formData, empresa: e.target.value.toUpperCase() });
              setMostrarDropdownEmpresa(true);
            }}
            onFocus={() => setMostrarDropdownEmpresa(true)}
            onBlur={() => setTimeout(() => setMostrarDropdownEmpresa(false), 200)}
            className="w-full h-7 px-2 border border-gray-300 dark:border-gray-600 rounded outline-none bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 focus:border-[#2383C2]"
          />
          {mostrarDropdownEmpresa && (
            <ul className="absolute z-50 left-0 right-0 mt-1 max-h-36 overflow-y-auto bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded shadow-lg">
              {empresasFiltradasLista.length > 0 ? (
                empresasFiltradasLista.map(emp => (
                  <li
                    key={emp.id}
                    onMouseDown={() => {
                      setFormData({ ...formData, empresa: emp.nombre.toUpperCase() });
                      setMostrarDropdownEmpresa(false);
                    }}
                    className="px-2 py-1.5 hover:bg-[#2383C2]/10 cursor-pointer uppercase truncate text-gray-800 dark:text-gray-100"
                  >
                    {emp.nombre}
                  </li>
                ))
              ) : (
                <li className="px-2 py-1.5 text-gray-400 italic">No hay resultados</li>
              )}
            </ul>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block font-bold text-gray-500 dark:text-gray-400 uppercase mb-0.5">Tipo</label>
            <select
              value={formData.tipo}
              onChange={e => setFormData({ ...formData, tipo: e.target.value })}
              className="w-full h-7 px-1.5 border border-gray-300 dark:border-gray-600 rounded outline-none bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 cursor-pointer"
            >
              <option value="">Seleccione...</option>
              <option value="COTIZACION">COTIZACION</option>
              <option value="CONSIGNACION">CONSIGNACION</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-gray-500 dark:text-gray-400 uppercase mb-0.5">Segmento</label>
            <select
              value={formData.segmento}
              onChange={e => setFormData({ ...formData, segmento: e.target.value })}
              className="w-full h-7 px-1.5 border border-gray-300 dark:border-gray-600 rounded outline-none bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 cursor-pointer"
            >
              <option value="">Seleccione...</option>
              <option value="IMPLANTES">IMPLANTES</option>
              <option value="CONSIGNACION">CONSIGNACION</option>
              <option value="HEMODINAMIA">HEMODINAMIA</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block font-bold text-gray-500 dark:text-gray-400 uppercase mb-0.5">Clase</label>
            <select
              value={formData.clase}
              onChange={e => setFormData({ ...formData, clase: e.target.value })}
              className="w-full h-7 px-1.5 border border-gray-300 dark:border-gray-600 rounded outline-none bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 cursor-pointer"
            >
              <option value="">Seleccione...</option>
              <option value="IMPLANTE">IMPLANTE</option>
              <option value="INSUMOS">INSUMOS</option>
              <option value="PAD">PAD</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-gray-500 dark:text-gray-400 uppercase mb-0.5">CX</label>
            <input
              value={formData.cx}
              onChange={e => setFormData({ ...formData, cx: e.target.value })}
              className="w-full h-7 px-2 border border-gray-300 dark:border-gray-600 rounded outline-none bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100"
            />
          </div>
        </div>

        <div>
          <label className="block font-bold text-gray-500 dark:text-gray-400 uppercase mb-0.5">Descriptor Auto</label>
          <input
            readOnly
            value={formData.descriptorAuto}
            className="w-full h-7 px-2 border border-gray-300 dark:border-gray-600 rounded bg-gray-100 dark:bg-gray-900 text-gray-500 outline-none"
          />
        </div>

        <div>
          <label className="block font-bold text-gray-500 dark:text-gray-400 uppercase mb-0.5">Observación / Motivo actualización</label>
          <input
            value={formData.observacion}
            onChange={e => setFormData({ ...formData, observacion: e.target.value })}
            placeholder="Ej: Actualización de tarifas anuales..."
            className="w-full h-7 px-2 border border-gray-300 dark:border-gray-600 rounded outline-none bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100"
          />
        </div>

        {/* Footer actions */}
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-8 px-4 bg-gray-200 dark:bg-gray-700 rounded font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-300 transition cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={cargando}
            className="h-8 px-4 bg-[#2383C2] hover:bg-[#369BCE] text-white rounded font-bold flex items-center gap-1.5 transition cursor-pointer"
          >
            {cargando ? <Spinner size="sm" color="#ffffff" /> : <><Edit3 size={14} /> Guardar Cambios</>}
          </button>
        </div>

      </form>
    </div>
  );
};

export default ModificarRegistroDrawer;