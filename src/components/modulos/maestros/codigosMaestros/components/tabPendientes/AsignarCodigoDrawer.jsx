import React, { useState, useEffect } from 'react';
import { X, Save, Tag } from 'lucide-react';
import Spinner from '../../../../../ui/Spinner';

const AsignarCodigoDrawer = ({
  show,
  onClose,
  itemSeleccionado,
  empresasMaestro,
  onGuardarCodigo,
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

  // Cargar los datos del item cuando se abre el drawer
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
        observacion: itemSeleccionado.observacion || ''
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
    if (!formData.codigo.trim()) {
      return; // El código es obligatorio para este panel
    }

    // Estructuramos los datos incluyendo el payload necesario para el LOG de auditoría
    const datosConLog = {
      ...formData,
      precioNeto: Number(formData.precioNeto.toString().replace(/\./g, '').replace(/,/g, '') || 0),
      // Añadimos la metadata para que el manejador principal cree el log de auditoría
      logAuditoria: {
        accion: 'ASIGNACION_CODIGO',
        fecha: new Date().toISOString(),
        detalles: {
          codigoAsignado: formData.codigo.trim().toUpperCase(),
          referencia: formData.referencia,
          empresa: formData.empresa,
          descriptorEmpresa: formData.descriptorEmpresa,
          tipo: formData.tipo,
          segmento: formData.segmento,
          clase: formData.clase,
          precioNeto: Number(formData.precioNeto.toString().replace(/\./g, '').replace(/,/g, '') || 0),
          cx: formData.cx,
          observacion: formData.observacion
        }
      }
    };

    onGuardarCodigo(itemSeleccionado.id, datosConLog);
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white dark:bg-gray-800 shadow-2xl border-l border-gray-200 dark:border-gray-700 flex flex-col transition-transform duration-300 text-[11px]">
      
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-900">
        <h3 className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2 text-[12px]">
          <Tag size={15} className="text-[#2383C2]" />
          ASIGNAR CÓDIGO Y EDITAR REGISTRO
        </h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-md transition"
        >
          <X size={16} />
        </button>
      </div>

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto p-4 space-y-3">
        
        {/* Campo Principal: Código */}
        <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
          <label className="block text-[10px] font-bold text-[#2383C2] dark:text-blue-400 uppercase mb-1">
            Código Definitivo *
          </label>
          <input
            required
            autoFocus
            type="text"
            value={formData.codigo}
            onChange={e => setFormData({ ...formData, codigo: e.target.value.toUpperCase() })}
            placeholder="Ingrese el código aquí..."
            className="w-full h-8 px-2 border border-blue-300 dark:border-blue-700 rounded text-[12px] font-bold uppercase outline-none focus:border-[#2383C2] bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100"
          />
        </div>

        <hr className="border-gray-200 dark:border-gray-700 my-2" />

        {/* Demás campos editables */}
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
              className="w-full h-7 px-1.5 border border-gray-300 dark:border-gray-600 rounded outline-none bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100"
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
              className="w-full h-7 px-1.5 border border-gray-300 dark:border-gray-600 rounded outline-none bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100"
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
              className="w-full h-7 px-1.5 border border-gray-300 dark:border-gray-600 rounded outline-none bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100"
            >
              <option value="">Seleccione...</option>
              <option value="IMPLANTE">IMPLANTE</option>
              <option value="INSUMOS">INSUMOS</option>
              <option value="PAD">PAD</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-gray-500 dark:text-gray-400 uppercase mb-0.5">Precio Neto</label>
            <input
              type="text"
              value={formData.precioNeto}
              onChange={e => {
                const valorRaw = e.target.value.replace(/\D/g, '');
                setFormData({ ...formData, precioNeto: formatearMiles(valorRaw) });
              }}
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

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block font-bold text-gray-500 dark:text-gray-400 uppercase mb-0.5">CX</label>
            <input
              value={formData.cx}
              onChange={e => setFormData({ ...formData, cx: e.target.value })}
              className="w-full h-7 px-2 border border-gray-300 dark:border-gray-600 rounded outline-none bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100"
            />
          </div>

          <div>
            <label className="block font-bold text-gray-500 dark:text-gray-400 uppercase mb-0.5">Observación</label>
            <input
              value={formData.observacion}
              onChange={e => setFormData({ ...formData, observacion: e.target.value })}
              className="w-full h-7 px-2 border border-gray-300 dark:border-gray-600 rounded outline-none bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100"
            />
          </div>
        </div>

        {/* Footer actions */}
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-8 px-4 bg-gray-200 dark:bg-gray-700 rounded font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-300 transition"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={cargando}
            className="h-8 px-4 bg-[#2383C2] hover:bg-[#369BCE] text-white rounded font-bold flex items-center gap-1.5 transition"
          >
            {cargando ? <Spinner size="sm" color="#ffffff" /> : <><Save size={14} /> Guardar Código</>}
          </button>
        </div>

      </form>
    </div>
  );
};

export default AsignarCodigoDrawer;