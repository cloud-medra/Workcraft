import React from 'react';
import { User, Building2, Stethoscope, Calendar as CalendarIcon, DollarSign } from 'lucide-react';

const InformacionTab = ({ formData, onChange }) => {
  const setField = (field, value) => onChange(field, value);

  return (
    <div className="p-4 max-w-6xl mx-auto w-full space-y-4">
      <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700/80 rounded-lg shadow-xs overflow-hidden">
        <div className="px-3 py-1.5 bg-slate-50/80 dark:bg-gray-800/80 border-b border-slate-200 dark:border-gray-700 flex items-center gap-1.5">
          <User size={13} className="text-[#2383C2]" />
          <h3 className="text-[11px] font-bold text-slate-700 dark:text-gray-200 uppercase tracking-wide">
            Información General
          </h3>
        </div>

        <div className="p-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
          <div className="flex flex-col gap-1">
            <label className="font-semibold text-slate-600 dark:text-gray-300">Nombre del Paciente</label>
            <input
              type="text"
              value={formData.nombre}
              onChange={e => setField('nombre', e.target.value.toUpperCase())}
              className="h-6.5 px-2 text-[10px] border border-slate-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-slate-800 dark:text-gray-100 focus:ring-1 focus:ring-[#2383C2] outline-none uppercase"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-semibold text-slate-600 dark:text-gray-300 flex items-center gap-1">
              <Stethoscope size={11} className="text-slate-400" /> Médico
            </label>
            <input
              type="text"
              value={formData.medico}
              onChange={e => setField('medico', e.target.value)}
              className="h-6.5 px-2 text-[10px] border border-slate-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-slate-800 dark:text-gray-100 focus:ring-1 focus:ring-[#2383C2] outline-none"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-semibold text-slate-600 dark:text-gray-300 flex items-center gap-1">
              <CalendarIcon size={11} className="text-slate-400" /> Fecha
            </label>
            <input
              type="date"
              value={formData.fecha}
              onChange={e => setField('fecha', e.target.value)}
              className="h-6.5 px-2 text-[10px] border border-slate-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-slate-800 dark:text-gray-100 focus:ring-1 focus:ring-[#2383C2] outline-none"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-semibold text-slate-600 dark:text-gray-300 flex items-center gap-1">
              <Building2 size={11} className="text-slate-400" /> Empresa
            </label>
            <input
              type="text"
              value={formData.empresa}
              onChange={e => setField('empresa', e.target.value)}
              className="h-6.5 px-2 text-[10px] border border-slate-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-slate-800 dark:text-gray-100 focus:ring-1 focus:ring-[#2383C2] outline-none"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-semibold text-slate-600 dark:text-gray-300">Centro</label>
            <input
              type="text"
              value={formData.centro}
              onChange={e => setField('centro', e.target.value)}
              className="h-6.5 px-2 text-[10px] border border-slate-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-slate-800 dark:text-gray-100 focus:ring-1 focus:ring-[#2383C2] outline-none"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-semibold text-slate-600 dark:text-gray-300">Atributo</label>
            <select
              value={formData.atributo}
              onChange={e => setField('atributo', e.target.value)}
              className="h-6.5 px-2 text-[10px] border border-slate-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-slate-800 dark:text-gray-100 focus:ring-1 focus:ring-[#2383C2] outline-none"
            >
              <option value="CONSIGNACION">CONSIGNACION</option>
              <option value="COTIZACION">COTIZACION</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-semibold text-slate-600 dark:text-gray-300 flex items-center gap-1">
              <DollarSign size={11} className="text-slate-400" /> Costo
            </label>
            <input
              type="number"
              value={formData.costo}
              onChange={e => setField('costo', e.target.value)}
              className="h-6.5 px-2 text-[10px] border border-slate-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-slate-800 dark:text-gray-100 focus:ring-1 focus:ring-[#2383C2] outline-none"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-semibold text-slate-600 dark:text-gray-300">Convenio</label>
            <input
              type="text"
              value={formData.convenio}
              onChange={e => setField('convenio', e.target.value)}
              className="h-6.5 px-2 text-[10px] border border-slate-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-slate-800 dark:text-gray-100 focus:ring-1 focus:ring-[#2383C2] outline-none"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-semibold text-slate-600 dark:text-gray-300">Previsión</label>
            <input
              type="text"
              value={formData.prevision}
              onChange={e => setField('prevision', e.target.value)}
              className="h-6.5 px-2 text-[10px] border border-slate-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-slate-800 dark:text-gray-100 focus:ring-1 focus:ring-[#2383C2] outline-none"
            />
          </div>

          <div className="flex flex-col gap-1 md:col-span-2 lg:col-span-3">
            <label className="font-semibold text-slate-600 dark:text-gray-300">Descripción Pabellón</label>
            <textarea
              rows={2}
              value={formData.descripcionPabellon}
              onChange={e => setField('descripcionPabellon', e.target.value)}
              className="p-2 text-[10px] border border-slate-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-slate-800 dark:text-gray-100 focus:ring-1 focus:ring-[#2383C2] outline-none resize-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default InformacionTab;