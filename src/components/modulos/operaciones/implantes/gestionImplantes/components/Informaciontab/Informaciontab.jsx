import React from 'react';
import {
  FileText,
  Building2,
  User,
  Stethoscope,
  DollarSign,
  Calendar as CalendarIcon,
  Tag,
  ShieldCheck,
  ChevronDown,
  AlertCircle
} from 'lucide-react';
import EmpresaSelect from '../EmpresaSelect';

const formatearMiles = (valor) => {
  if (valor === null || valor === undefined || valor === '') return '';
  const num = valor.toString().replace(/\D/g, '');
  if (num === '') return '';
  return new Intl.NumberFormat('es-CL').format(num);
};

export const InformacionTab = ({
  formData,
  handleGeneralChange,
  handleBloqueChange,
  bloqueActivoIndex,
  erroresFecha
}) => {
  return (
    <>
      <div className="sticky top-0 z-20 bg-white dark:bg-gray-800 border-b border-slate-200 dark:border-gray-700 px-4 py-2 shadow-xs">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-400 dark:text-gray-400">
              Admisión Unificada
            </span>
            <span className="text-slate-300 dark:text-gray-600">/</span>
            <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] bg-blue-50 dark:bg-blue-950/50 text-[#2383C2] dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/40 font-bold">
              #{formData.gestionId || 'N/A'}
            </span>
          </div>
          <h2 className="text-[13px] font-bold text-slate-800 dark:text-gray-100 leading-tight">
            Detalle General de Implante ({formData.bloques.length} registros vinculados)
          </h2>
        </div>
      </div>

      <div className="p-4 max-w-7xl mx-auto w-full space-y-4">

        <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700/80 rounded-lg shadow-xs overflow-hidden">
          <div className="px-3 py-1.5 bg-slate-50/80 dark:bg-gray-800/80 border-b border-slate-200 dark:border-gray-700 flex items-center gap-1.5">
            <User size={13} className="text-[#2383C2]" />
            <h3 className="text-[11px] font-bold text-slate-700 dark:text-gray-200 uppercase tracking-wide">
              Información General del Paciente
            </h3>
          </div>

          <div className="p-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
            <div className="flex flex-col gap-1">
              <label className="font-semibold text-slate-600 dark:text-gray-300">ID / Nº Admisión</label>
              <input
                type="text"
                name="gestionId"
                value={formData.gestionId}
                onChange={handleGeneralChange}
                className="h-6.5 px-2 text-[10px] border border-slate-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-slate-800 dark:text-gray-100 focus:ring-1 focus:ring-[#2383C2] outline-none"
              />
            </div>

            <div className="flex flex-col gap-1 md:col-span-2">
              <label className="font-semibold text-slate-600 dark:text-gray-300">Nombre Completo del Paciente</label>
              <input
                type="text"
                name="nombre"
                value={formData.nombre}
                onChange={handleGeneralChange}
                placeholder="Nombre del paciente"
                className="h-6.5 px-2 text-[10px] border border-slate-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-slate-800 dark:text-gray-100 focus:ring-1 focus:ring-[#2383C2] outline-none"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-semibold text-slate-600 dark:text-gray-300">Convenio</label>
              <input
                type="text"
                name="convenio"
                value={formData.convenio}
                onChange={handleGeneralChange}
                className="h-6.5 px-2 text-[10px] border border-slate-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-slate-800 dark:text-gray-100 focus:ring-1 focus:ring-[#2383C2] outline-none"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-semibold text-slate-600 dark:text-gray-300 flex items-center gap-1">
                <ShieldCheck size={11} className="text-slate-400" /> Previsión
              </label>
              <input
                type="text"
                name="prevision"
                value={formData.prevision}
                onChange={handleGeneralChange}
                className="h-6.5 px-2 text-[10px] border border-slate-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-slate-800 dark:text-gray-100 focus:ring-1 focus:ring-[#2383C2] outline-none"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-semibold text-slate-600 dark:text-gray-300 flex items-center gap-1">
                <Stethoscope size={11} className="text-slate-400" /> Médico Tratante
              </label>
              <input
                type="text"
                name="medico"
                value={formData.medico}
                onChange={handleGeneralChange}
                className="h-6.5 px-2 text-[10px] border border-slate-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-slate-800 dark:text-gray-100 focus:ring-1 focus:ring-[#2383C2] outline-none"
              />
            </div>
          </div>
        </div>

        {formData.bloques[bloqueActivoIndex] && (
          <div className="bg-white dark:bg-gray-800 border border-blue-200/80 dark:border-blue-800/50 rounded-lg p-3 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-gray-700/60 pb-1.5">
              <span className="font-bold text-[#2383C2] dark:text-blue-400 flex items-center gap-1.5 text-[11px]">
                <Building2 size={13} />
                Empresa y Fecha vinculadas a esta Admisión
              </span>
              <span className="text-[9px] bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-200/50 px-2 py-0.5 rounded font-mono font-semibold">
                Bloque {bloqueActivoIndex + 1} de {formData.bloques.length}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-600 dark:text-gray-300">Empresa / Proveedor</label>
                <EmpresaSelect
                  value={formData.bloques[bloqueActivoIndex].empresa}
                  onChange={(empresaSeleccionada) =>
                    handleBloqueChange(bloqueActivoIndex, 'empresa', empresaSeleccionada.nombre)
                  }
                  placeholder="Seleccionar empresa..."
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-600 dark:text-gray-300 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <CalendarIcon size={11} className="text-slate-400" /> Fecha Agenda
                  </span>
                  <span className="text-red-500 font-bold">*</span>
                </label>
                <input
                  type="date"
                  value={formData.bloques[bloqueActivoIndex].fecha}
                  onChange={(e) => handleBloqueChange(bloqueActivoIndex, 'fecha', e.target.value)}
                  className={`h-6.5 px-2 text-[10px] border rounded bg-white dark:bg-gray-900 text-slate-800 dark:text-gray-100 outline-none transition ${erroresFecha[bloqueActivoIndex]
                    ? 'border-red-500 ring-1 ring-red-500/30 bg-red-50/20'
                    : 'border-slate-300 dark:border-gray-600 focus:ring-1 focus:ring-[#2383C2]'
                    }`}
                />
                {erroresFecha[bloqueActivoIndex] && (
                  <span className="text-[8px] text-red-500 font-medium flex items-center gap-0.5">
                    <AlertCircle size={9} /> Requerido
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-600 dark:text-gray-300">Costo ($)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none text-slate-400">
                    <DollarSign size={11} />
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formatearMiles(formData.bloques[bloqueActivoIndex].costo)}
                    onChange={(e) => {
                      const soloNumeros = e.target.value.replace(/\D/g, '');
                      handleBloqueChange(bloqueActivoIndex, 'costo', soloNumeros ? Number(soloNumeros) : 0);
                    }}
                    className="w-full h-6.5 pl-5 pr-2 text-[10px] text-slate-800 dark:text-gray-100 border border-slate-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 focus:ring-1 focus:ring-[#2383C2] outline-none"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700/80 rounded-lg shadow-xs overflow-hidden">
          <div className="px-3 py-1.5 bg-slate-50/80 dark:bg-gray-800/80 border-b border-slate-200 dark:border-gray-700 flex items-center gap-1.5">
            <Tag size={13} className="text-[#2383C2]" />
            <h3 className="text-[11px] font-bold text-slate-700 dark:text-gray-200 uppercase tracking-wide">
              Clasificación & Estado Operativo
            </h3>
          </div>

          <div className="p-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5">
            <div className="flex flex-col gap-1">
              <label className="font-semibold text-slate-600 dark:text-gray-300">Estado Operativo</label>
              <div className="relative">
                <select
                  name="estado"
                  value={formData.estado}
                  onChange={handleGeneralChange}
                  className="w-full h-6.5 pl-2 pr-6 text-[10px] border border-slate-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-slate-800 dark:text-gray-100 focus:ring-1 focus:ring-[#2383C2] outline-none appearance-none"
                >
                  <option value="AGENDADO">AGENDADO</option>
                  <option value="PENDIENTE">PENDIENTE</option>
                  <option value="REVISAR">REVISAR</option>
                  <option value="CARGADO">CARGADO</option>
                  <option value="S/COTIZACION">S/COTIZACION</option>
                  <option value="INCOMPLETO">INCOMPLETO</option>
                </select>
                <ChevronDown size={12} className="absolute right-2 top-1.5 pointer-events-none text-slate-400" />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-semibold text-slate-600 dark:text-gray-300">Estado de Informe</label>
              <div className="relative">
                <select
                  name="informe"
                  value={formData.informe}
                  onChange={handleGeneralChange}
                  className="w-full h-6.5 pl-2 pr-6 text-[10px] border border-slate-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-slate-800 dark:text-gray-100 focus:ring-1 focus:ring-[#2383C2] outline-none appearance-none"
                >
                  <option value="PENDIENTE">PENDIENTE</option>
                  <option value="DISPONIBLE">DISPONIBLE</option>
                  <option value="NO APLICA">NO APLICA</option>
                </select>
                <ChevronDown size={12} className="absolute right-2 top-1.5 pointer-events-none text-slate-400" />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-semibold text-slate-600 dark:text-gray-300">Atributo</label>
              <input
                type="text"
                name="atributo"
                value={formData.atributo}
                onChange={handleGeneralChange}
                className="h-6.5 px-2 text-[10px] border border-slate-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-slate-800 dark:text-gray-100 focus:ring-1 focus:ring-[#2383C2] outline-none"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-semibold text-slate-600 dark:text-gray-300">Centro Médico / Pabellón</label>
              <input
                type="text"
                name="centro"
                value={formData.centro}
                onChange={handleGeneralChange}
                className="h-6.5 px-2 text-[10px] border border-slate-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-slate-800 dark:text-gray-100 focus:ring-1 focus:ring-[#2383C2] outline-none"
              />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700/80 rounded-lg shadow-xs overflow-hidden">
          <div className="px-3 py-1.5 bg-slate-50/80 dark:bg-gray-800/80 border-b border-slate-200 dark:border-gray-700 flex items-center gap-1.5">
            <FileText size={13} className="text-[#2383C2]" />
            <h3 className="text-[11px] font-bold text-slate-700 dark:text-gray-200 uppercase tracking-wide">
              Observaciones y Detalles Clínicos
            </h3>
          </div>

          <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="font-semibold text-slate-600 dark:text-gray-300">Descripción / Nota Operatoria</label>
              <textarea
                name="descripcion"
                rows={3}
                value={formData.descripcion}
                onChange={handleGeneralChange}
                placeholder="Ingrese detalles técnicos..."
                className="p-2 text-[10px] border border-slate-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-slate-800 dark:text-gray-100 focus:ring-1 focus:ring-[#2383C2] outline-none resize-none"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-semibold text-slate-600 dark:text-gray-300">Texto Libre / Notas Adicionales</label>
              <textarea
                name="observacion"
                rows={3}
                value={formData.observacion}
                onChange={handleGeneralChange}
                placeholder="Observaciones adicionales..."
                className="p-2 text-[10px] border border-slate-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-slate-800 dark:text-gray-100 focus:ring-1 focus:ring-[#2383C2] outline-none resize-none"
              />
            </div>
          </div>
        </div>

      </div>
    </>
  );
};

export default InformacionTab;