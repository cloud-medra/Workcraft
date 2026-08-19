import React from 'react';
import { X, FileText, Package, User, Building2, Briefcase } from 'lucide-react';

const VizualizadorDetallesImputados = ({ documento, onClose }) => {
  if (!documento) return null;

  const formatearFechaConHora = (fecha) => {
    if (!fecha) return '-';

    if (typeof fecha === 'object') {
      if (typeof fecha.toDate === 'function') {
        fecha = fecha.toDate();
      } else if (fecha.seconds) {
        fecha = new Date(fecha.seconds * 1000);
      }
    }

    if (fecha instanceof Date) {
      const dia = String(fecha.getDate()).padStart(2, '0');
      const mes = String(fecha.getMonth() + 1).padStart(2, '0');
      const anio = fecha.getFullYear();
      
      let horas = fecha.getHours();
      const minutos = String(fecha.getMinutes()).padStart(2, '0');
      const segundos = String(fecha.getSeconds()).padStart(2, '0');
      
      const ampm = horas >= 12 ? 'p. m.' : 'a. m.';
      horas = horas % 12;
      horas = horas ? horas : 12;
      const horasStr = String(horas).padStart(2, '0');

      return `${dia}/${mes}/${anio}, ${horasStr}:${minutos}:${segundos} ${ampm}`;
    }

    return String(fecha);
  };

  const formatearFechaSolo = (fecha) => {
    if (!fecha) return '-';
    if (typeof fecha === 'object') {
      if (typeof fecha.toDate === 'function') fecha = fecha.toDate();
      else if (fecha.seconds) fecha = new Date(fecha.seconds * 1000);
    }
    if (fecha instanceof Date) {
      const dia = String(fecha.getDate()).padStart(2, '0');
      const mes = String(fecha.getMonth() + 1).padStart(2, '0');
      const anio = fecha.getFullYear();
      return `${dia}/${mes}/${anio}`;
    }
    const fechaStr = String(fecha);
    const soloFecha = fechaStr.split(',')[0].trim();
    const partes = soloFecha.replace(/-/g, '/').split('/');
    if (partes.length === 3 && partes[0].length === 4) {
      return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }
    return soloFecha;
  };

  const getEstadoBadgeClass = (estado) => {
    switch (estado?.toLowerCase()) {
      case 'finalizado':
      case 'completado':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      default:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800';
    }
  };

  const fechaIniciadaValor = documento.procesoIniciado?.fechaHora || documento.procesoIniciado || documento.fechaHora;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
      <div className="bg-white dark:bg-gray-900 w-full max-w-6xl max-h-[92vh] rounded-xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-gray-800 font-sans">
        
        {/* Header Corporativo */}
        <div className="px-6 py-3.5 border-b border-slate-200 dark:border-gray-800 flex justify-between items-center bg-slate-50 dark:bg-gray-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#2383C2]/10 text-[#2383C2] rounded-lg">
              <FileText size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-800 dark:text-gray-100 uppercase tracking-wide">
                  Documento Folio: {documento.folio || '-'}
                </h2>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getEstadoBadgeClass(documento.estado)}`}>
                  {documento.estado || 'Proceso'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-gray-400 font-medium">
                {documento.rznSoc || 'Sin Razón Social'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-700 dark:hover:text-gray-200 p-1.5 rounded-lg hover:bg-slate-200/60 dark:hover:bg-gray-800 transition"
            title="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-grow space-y-6 text-xs bg-slate-50/50 dark:bg-gray-900/40">
          
          {/* SECCIÓN 1: Datos Generales */}
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-slate-200/80 dark:border-gray-700/80 shadow-xs">
            <h3 className="text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-3 flex items-center gap-1.5 border-b border-slate-200 dark:border-gray-700 pb-2">
              <Building2 size={14} className="text-[#2383C2]" /> Datos Generales del Documento
            </h3>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              <div>
                <span className="text-slate-400 dark:text-gray-500 block">Folio Ref.</span>
                <span className="font-semibold text-slate-700 dark:text-gray-200">{documento.folioRef || '-'}</span>
              </div>
              <div>
                <span className="text-slate-400 dark:text-gray-500 block">Fch. Emisión</span>
                <span className="font-semibold text-slate-700 dark:text-gray-200">{formatearFechaSolo(documento.fchEmis)}</span>
              </div>
              <div>
                <span className="text-slate-400 dark:text-gray-500 block">Periodo (Mes / Año)</span>
                <span className="font-semibold text-slate-700 dark:text-gray-200 capitalize">{documento.mes || '-'}/{documento.anio || '-'}</span>
              </div>
              <div>
                <span className="text-slate-400 dark:text-gray-500 block">Imputado (Mes / Año)</span>
                <span className="font-semibold text-slate-700 dark:text-gray-200 capitalize">{documento.mesImputado || '-'}/{documento.anioImputado || '-'}</span>
              </div>
              <div>
                <span className="text-slate-400 dark:text-gray-500 block">Total Neto</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">${Number(documento.total || 0).toLocaleString('es-CL')}</span>
              </div>

              {/* Referencias operativas */}
              <div>
                <span className="text-slate-400 dark:text-gray-500 block">N° Orden</span>
                <span className="font-semibold text-slate-700 dark:text-gray-200">{documento.numeroOrden || '-'}</span>
              </div>
              <div>
                <span className="text-slate-400 dark:text-gray-500 block">N° Acta / Fecha</span>
                <span className="font-semibold text-slate-700 dark:text-gray-200">{documento.numeroActa || '-'} ({formatearFechaSolo(documento.fechaActa)})</span>
              </div>
              <div>
                <span className="text-slate-400 dark:text-gray-500 block">N° Salida / Fecha</span>
                <span className="font-semibold text-slate-700 dark:text-gray-200">{documento.numeroSalida || '-'} ({formatearFechaSolo(documento.fechaSalida)})</span>
              </div>
            </div>
          </div>

          {/* SECCIÓN 2: Tabla de Ítems Vinculados */}
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-slate-200/80 dark:border-gray-700/80 shadow-xs">
            <h3 className="text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-3 flex items-center gap-1.5 border-b border-slate-200 dark:border-gray-700 pb-2">
              <Package size={14} className="text-[#2383C2]" /> Ítems Vinculados y Detalle
            </h3>

            <div className="border border-slate-200 dark:border-gray-700 rounded-lg overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-slate-100 dark:bg-gray-900 text-slate-600 dark:text-gray-400 uppercase font-normal text-[10px]">
                  <tr>
                    <th className="p-2 text-center w-12">Lin.</th>
                    <th className="p-2">Código Doc.</th>
                    <th className="p-2">Cód. Maestro</th>
                    <th className="p-2">Nombre Ítem</th>
                    <th className="p-2">Descripción Maestro</th>
                    <th className="p-2 text-right">Cant.</th>
                    <th className="p-2 text-right">Monto</th>
                    <th className="p-2 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-gray-700">
                  {documento.detalles?.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-gray-700/40 transition">
                      <td className="p-2 text-center text-slate-500">{item.nroLin || idx + 1}</td>
                      <td className="p-2 text-slate-600 dark:text-gray-300">{item.codigo || '-'}</td>
                      <td className="p-2 font-semibold text-[#2383C2]">{item.codigoMaestro || '-'}</td>
                      <td className="p-2 text-slate-700 dark:text-gray-200" title={item.nombre}>{item.nombre || '-'}</td>
                      <td className="p-2 text-slate-600 dark:text-gray-400" title={item.descripcionMaestro}>{item.descripcionMaestro || '-'}</td>
                      <td className="p-2 text-right font-medium text-slate-700 dark:text-gray-200">{item.cantidad || '0'}</td>
                      <td className="p-2 text-right font-semibold text-slate-800 dark:text-gray-100">${Number(item.monto || 0).toLocaleString('es-CL')}</td>
                      <td className="p-2 text-center">
                        <span className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          {item.estadoItem || 'Vinculado'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* SECCIÓN 3: Información de Registro y OC Vinculada */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Registro */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-slate-200/80 dark:border-gray-700/80 shadow-xs">
              <h4 className="text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-2 flex items-center gap-1.5 border-b border-slate-200 dark:border-gray-700 pb-1.5">
                <User size={14} className="text-[#2383C2]" /> Información de Registro
              </h4>
              <div className="space-y-1 text-slate-600 dark:text-gray-300 pt-1">
                <p><span className="font-semibold text-slate-700 dark:text-gray-200">Usuario:</span> {documento.registeredPor || '-'}</p>
                <p><span className="font-semibold text-slate-700 dark:text-gray-200">Fecha Iniciada:</span> {formatearFechaConHora(fechaIniciadaValor)}</p>
                <p><span className="font-semibold text-slate-700 dark:text-gray-200">Fecha Finalizada:</span> {formatearFechaConHora(documento.fechaImputacionFinal)}</p>
              </div>
            </div>

            {/* OC Vinculada */}
            {documento.ordenCompraVinculada && (
              <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-slate-200/80 dark:border-gray-700/80 shadow-xs">
                <h4 className="text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-2 flex items-center gap-1.5 border-b border-slate-200 dark:border-gray-700 pb-1.5">
                  <Briefcase size={14} className="text-[#2383C2]" /> Orden de Compra Vinculada
                </h4>
                <div className="space-y-1 text-slate-600 dark:text-gray-300 pt-1">
                  <p><span className="font-semibold text-slate-700 dark:text-gray-200">Folio OC:</span> {documento.ordenCompraVinculada.folio || '-'}</p>
                  <p><span className="font-semibold text-slate-700 dark:text-gray-200">Fecha Vinculación:</span> {documento.ordenCompraVinculada.fechaVinculacion || '-'}</p>
                  <p><span className="font-semibold text-slate-700 dark:text-gray-200">Origen (Mes/Año):</span> {documento.ordenCompraVinculada.origenMes} / {documento.ordenCompraVinculada.origenAnio}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VizualizadorDetallesImputados;