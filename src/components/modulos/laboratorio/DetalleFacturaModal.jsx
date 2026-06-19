import React from 'react';
import { X, FileText, Calendar, Hash, Building2, Tag } from 'lucide-react';

const DetalleFacturaModal = ({ factura, onClose }) => {
  if (!factura) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-[2px] p-4">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

        <div className="flex justify-between items-center px-8 py-6 border-b border-gray-200 bg-white">
          <div>
            <h3 className="text-xl font-extrabold text-gray-800 flex items-center gap-2">
              <FileText className="text-[#0E5B6D]" size={24} />
              Factura Electrónica
            </h3>
            <p className="text-sm text-gray-500 mt-1">Detalle de registro contable</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400">
            <X size={24} />
          </button>
        </div>

        <div className="px-8 py-6 bg-gray-50 grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { label: "Folio", value: factura.folio, icon: Hash },
            { label: "Fecha Emisión", value: factura.fchEmis, icon: Calendar },
            { label: "Ref. (OC)", value: factura.folioRef || "N/A", icon: Tag },
            { label: "Total", value: `$${parseInt(factura.total).toLocaleString()}`, icon: null }
          ].map((item, i) => (
            <div key={i}>
              <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-1">{item.label}</p>
              <p className="text-sm font-bold text-gray-700 truncate">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="px-8 py-4 border-b border-gray-100 flex items-center gap-3">
          <Building2 size={16} className="text-[#0E5B6D]" />
          <span className="text-xs font-bold text-gray-400 uppercase">Receptor:</span>
          <span className="text-sm font-semibold text-gray-800">{factura.rznSoc}</span>
        </div>

        <div className="flex-grow overflow-auto p-8">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-100">
                <th className="pb-3 text-[11px] font-bold text-gray-400 uppercase">Cód.</th>
                <th className="pb-3 text-[11px] font-bold text-gray-400 uppercase">Descripción</th>
                <th className="pb-3 text-[11px] font-bold text-gray-400 uppercase text-center">Cant.</th>
                <th className="pb-3 text-[11px] font-bold text-gray-400 uppercase text-right">Monto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {factura.detalles?.map((item, idx) => (
                <tr key={idx} className="group hover:bg-blue-50/50 transition-colors">
                  <td className="py-4 text-xs font-mono text-gray-500">{item.codigo || '-'}</td>
                  <td className="py-4 text-sm text-gray-700">{item.nombre}</td>
                  <td className="py-4 text-sm text-center text-gray-600">{item.cantidad}</td>
                  <td className="py-4 text-sm text-right font-bold text-gray-800">${parseInt(item.monto).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-8 py-5 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
          <p className="text-[10px] text-gray-400 italic">Documento procesado automáticamente.</p>
          <button
            onClick={onClose}
            className="bg-[#0E5B6D] hover:bg-[#0a4856] text-white px-8 py-2.5 rounded-lg text-xs font-bold transition-all shadow-lg shadow-[#0E5B6D]/20"
          >
            Cerrar Detalles
          </button>
        </div>
      </div>
    </div>
  );
};

export default DetalleFacturaModal;