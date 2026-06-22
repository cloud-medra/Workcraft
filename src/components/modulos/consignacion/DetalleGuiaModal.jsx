import React from 'react';
import { X, FileText, Download, FileType, Calendar, User, Hash, ShieldCheck } from 'lucide-react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useGranularPermission } from '../../../hooks/useGranularPermission';

const DetalleGuiaModal = ({ guia, onClose }) => {
  const { hasPermission } = useGranularPermission();
  const PATH_VISTA = "/consignacion/guias";

  if (!guia) return null;

  const descargarExcel = () => {
    const data = guia.detalles.map((item) => ({
      Nro: item.nroLin,
      Item: item.nombre,
      Codigo: item.codigo,
      Descripcion: item.dscItem || "-",
      Cantidad: item.cantidad,
      FechaVencimiento: item.fchVenc || "N/A"
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Detalle");
    XLSX.writeFile(wb, `Guia_${guia.folio}.xlsx`);
  };

  const verPDF = () => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const primaryColor = [14, 91, 109];
    const textColor = [70, 70, 70];

    doc.setTextColor(...primaryColor);
    doc.setFontSize(22);
    doc.text("DETALLE DE GUÍA", 14, 20);
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(0.5);
    doc.line(14, 25, 196, 25);

    doc.setFontSize(10);
    doc.setTextColor(...textColor);
    doc.text(`Folio: ${guia.folio}`, 14, 35);
    doc.text(`Razón Social: ${guia.rznSoc}`, 14, 42);
    doc.text(`Folio Referencia: ${guia.folioRef}`, 14, 49);
    doc.text(`Fecha Emisión: ${guia.fchEmis || 'N/A'}`, 140, 35);

    autoTable(doc, {
      startY: 55,
      head: [['Nro', 'Ítem', 'Código', 'Descripción', 'Cant.', 'Fch. Venc']],
      body: guia.detalles.map(i => [
        i.nroLin,
        i.nombre,
        i.codigo,
        i.dscItem || "-",
        { content: i.cantidad, styles: { halign: 'center' } },
        i.fchVenc || "N/A"
      ]),
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center'
      },
      bodyStyles: { fontSize: 9, textColor: [50, 50, 50] },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { top: 60, left: 14, right: 14 },
      didDrawPage: (data) => {
        doc.setFontSize(8);
        doc.text(
          `Generado el: ${new Date().toLocaleDateString()} | Registrado por: ${guia.registradoPor}`,
          14,
          doc.internal.pageSize.height - 10
        );
      }
    });

    const pdfBlob = doc.output('blob');
    const url = URL.createObjectURL(pdfBlob);
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4 transition-all duration-300 animate-fadeIn">
      <div className="bg-white w-full max-w-5xl rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] overflow-hidden flex flex-col max-h-[85vh] border border-slate-100">
        
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#0E5B6D]/10 rounded-lg text-[#0E5B6D]">
              <FileText size={20} className="stroke-[2.5]" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 tracking-wider uppercase">Documento de Consignación</span>
              <h3 className="font-bold text-slate-800 text-lg leading-tight">Detalle Guía: Folio {guia.folio}</h3>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {hasPermission(PATH_VISTA, "modal_detalles", "btn_exportar_excel") && (
              <button 
                onClick={descargarExcel} 
                className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-3 py-1.5 rounded-lg text-[12px] font-semibold flex items-center gap-1.5 transition-all duration-200"
              >
                <Download size={14} className="stroke-[2.5]" /> Exportar Excel
              </button>
            )}
            {hasPermission(PATH_VISTA, "modal_detalles", "btn_exportar_pdf") && (
              <button 
                onClick={verPDF} 
                className="bg-rose-50 text-rose-700 hover:bg-rose-100 px-3 py-1.5 rounded-lg text-[12px] font-semibold flex items-center gap-1.5 transition-all duration-200"
              >
                <FileType size={14} className="stroke-[2.5]" /> Vista PDF
              </button>
            )}
            <div className="w-[1px] h-6 bg-slate-200 mx-1" />
            <button 
              onClick={onClose} 
              className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-100 rounded-lg transition-colors duration-200"
            >
              <X size={18} className="stroke-[2.5]" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto flex-grow space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-3">
              <div className="p-2 bg-white rounded-lg text-slate-400 border border-slate-100 shadow-sm">
                <ShieldCheck size={16} />
              </div>
              <div>
                <p className="text-slate-400 uppercase font-bold text-[10px] tracking-wider">Razón Social</p>
                <p className="font-bold text-slate-700 text-[13px] mt-0.5 break-words line-clamp-2" title={guia.rznSoc}>
                  {guia.rznSoc}
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-3">
              <div className="p-2 bg-white rounded-lg text-slate-400 border border-slate-100 shadow-sm">
                <Hash size={16} />
              </div>
              <div>
                <p className="text-slate-400 uppercase font-bold text-[10px] tracking-wider">Folio Referencia</p>
                <p className="font-mono font-bold text-slate-700 text-[14px] mt-0.5">
                  {guia.folioRef || "N/A"}
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-3">
              <div className="p-2 bg-white rounded-lg text-slate-400 border border-slate-100 shadow-sm">
                <Calendar size={16} />
              </div>
              <div>
                <p className="text-slate-400 uppercase font-bold text-[10px] tracking-wider">Fecha de Emisión</p>
                <p className="font-bold text-slate-700 text-[13px] mt-0.5">
                  {guia.fchEmis || "N/A"}
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-3">
              <div className="p-2 bg-white rounded-lg text-slate-400 border border-slate-100 shadow-sm">
                <User size={16} />
              </div>
              <div>
                <p className="text-slate-400 uppercase font-bold text-[10px] tracking-wider">Gestor de Carga</p>
                <p className="font-bold text-slate-700 text-[13px] mt-0.5 truncate" title={guia.registradoPor}>
                  {guia.registradoPor || "Sistema"}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200/80 overflow-hidden shadow-sm">
            <table className="w-full text-[12px] border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-600 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                  <th className="p-3.5 text-center w-14">Nro</th>
                  <th className="p-3.5 text-left">Ítem / Descripción</th>
                  <th className="p-3.5 text-left w-40">Código</th>
                  <th className="p-3.5 text-left w-48">Descripción (Lote)</th>
                  <th className="p-3.5 text-center w-24">Cantidad</th>
                  <th className="p-3.5 text-center w-32">Fch. Venc.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {guia.detalles?.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 odd:bg-white even:bg-slate-50/30 transition-colors duration-150">
                    <td className="p-3.5 text-center font-medium text-slate-400">{item.nroLin}</td>
                    <td className="p-3.5 font-semibold text-slate-700 max-w-xs truncate" title={item.nombre}>
                      {item.nombre}
                    </td>
                    <td className="p-3.5 font-mono text-slate-500 font-medium">{item.codigo}</td>
                    <td className="p-3.5 font-bold text-[#0E5B6D]">{item.dscItem || "-"}</td>
                    <td className="p-3.5 text-center">
                      <span className="inline-block bg-slate-100 text-slate-800 px-2.5 py-1 rounded-md font-bold text-[12px] min-w-[36px]">
                        {item.cantidad}
                      </span>
                    </td>
                    <td className="p-3.5 text-center text-slate-500 font-medium">
                      {item.fchVenc ? (
                        <span className="bg-amber-50 text-amber-800 px-2 py-0.5 rounded text-[11px] font-semibold border border-amber-100">
                          {item.fchVenc}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center text-[11px] text-slate-400 font-medium">
          <div>Consignación Control Center v2.1</div>
          <div className="flex items-center gap-1">
            <span>ID Registro:</span>
            <span className="font-mono bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold">{guia.id || 'N/A'}</span>
          </div>
        </div>

      </div>
    </div>
  );
};

export default DetalleGuiaModal;