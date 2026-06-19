import React from 'react';
import { X, FileText, Download, FileType } from 'lucide-react';
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
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
          <div className="flex items-center gap-2">
            <FileText className="text-[#0E5B6D]" size={20} />
            <h3 className="font-bold text-gray-700">Detalle Guía: {guia.folio}</h3>
          </div>
          <div className="flex gap-2">
            {hasPermission(PATH_VISTA, "modal_detalles", "btn_exportar_excel") && (
              <button onClick={descargarExcel} className="bg-green-600 text-white px-3 py-1 rounded text-[11px] font-bold flex items-center gap-1 hover:bg-green-700 transition-all">
                <Download size={12} /> Excel
              </button>
            )}
            {hasPermission(PATH_VISTA, "modal_detalles", "btn_exportar_pdf") && (
              <button onClick={verPDF} className="bg-red-600 text-white px-3 py-1 rounded text-[11px] font-bold flex items-center gap-1 hover:bg-red-700 transition-all">
                <FileType size={12} /> PDF
              </button>
            )}
            <button onClick={onClose} className="text-gray-500 hover:text-red-500 ml-2 transition-colors"><X size={20} /></button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto">
          <div className="grid grid-cols-2 gap-4 mb-6 text-[13px] p-4 bg-gray-50 rounded-lg border border-gray-100">
            <div>
              <p className="text-gray-400 uppercase font-bold text-[10px]">Razón Social</p>
              <p className="font-semibold text-gray-700">{guia.rznSoc}</p>
            </div>
            <div>
              <p className="text-gray-400 uppercase font-bold text-[10px]">Folio Referencia</p>
              <p className="font-semibold text-gray-700">{guia.folioRef}</p>
            </div>
          </div>

          <table className="w-full text-[12px] border-collapse border border-gray-200">
            <thead className="bg-gray-100 text-gray-600 uppercase font-bold">
              <tr>
                <th className="p-3 text-left border-b border-r border-gray-200">Nro</th>
                <th className="p-3 text-left border-b border-r border-gray-200">Ítem</th>
                <th className="p-3 text-left border-b border-r border-gray-200">Código</th>
                <th className="p-3 text-left border-b border-r border-gray-200">Descripción (Lote)</th>
                <th className="p-3 text-center border-b border-r border-gray-200">Cant.</th>
                <th className="p-3 text-center border-b border-gray-200">Fch. Venc.</th>
              </tr>
            </thead>
            <tbody>
              {guia.detalles?.map((item, idx) => (
                <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                  <td className="p-3 text-gray-500 border-r border-gray-200">{item.nroLin}</td>
                  <td className="p-3 font-medium text-gray-700 border-r border-gray-200">{item.nombre}</td>
                  <td className="p-3 font-mono text-gray-500 border-r border-gray-200">{item.codigo}</td>
                  <td className="p-3 font-bold text-[#0E5B6D] border-r border-gray-200">{item.dscItem || "-"}</td>
                  <td className="p-3 text-center font-bold border-r border-gray-200">{item.cantidad}</td>
                  <td className="p-3 text-center text-gray-600">{item.fchVenc || "N/A"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-3 border-t border-gray-200 bg-gray-50 text-[11px] text-gray-500 text-right">
          Registrado por: <span className="font-bold">{guia.registradoPor}</span>
        </div>
      </div>
    </div>
  );
};

export default DetalleGuiaModal;