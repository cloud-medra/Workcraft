import React from 'react';
import { ShieldCheck, RefreshCw } from 'lucide-react';

export const DetalleFactura = ({ factura, esConsulta, onGuardar, onActualizarDatos }) => {
  if (!factura) return null;

  // La única fuente de verdad real es lo que viene procesado en la factura
  const detallesCruzados = factura.detalles || [];

  const handleGuardar = () => onGuardar(detallesCruzados);

  return (
    <div className="p-4">
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4 text-[12px]">
        {/* TITULAR CON EL BADGE DE ESTADO DINÁMICO */}
        <div className="flex items-center justify-between border-b border-gray-200 pb-3 mb-3">
          <div className="flex items-center gap-3">
            <span className="font-bold text-gray-700 uppercase text-[13px] tracking-wider">
              Resumen del Documento
            </span>

            {/* === BOTÓN ACTUALIZAR: Solo aparece en modo consulta pura === */}
            {esConsulta && (
              <button
                onClick={onActualizarDatos}
                className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-[11px] font-bold flex items-center gap-1 transition-colors shadow-sm"
                title="Volver a consultar los códigos del sistema y actualizar montos de la orden"
              >
                <RefreshCw size={12} /> Actualizar Datos del Sistema
              </button>
            )}
          </div>

          <span className={`px-2 py-1 rounded text-[11px] font-bold shadow-sm border ${
            factura.estado === 'AUDITADO' ? 'bg-green-100 text-green-800 border-green-300' :
            factura.estado === 'CON DIFERENCIAS' ? 'bg-red-100 text-red-700 border-red-300 animate-pulse' :
            factura.estado === 'POR ACTUALIZAR' ? 'bg-yellow-100 text-yellow-700 border-yellow-300' :
            'bg-gray-100 text-gray-600 border-gray-300'
          }`}>
            {factura.estado || "NUEVA AUDITORÍA"}
          </span>
        </div>

        <div className="grid grid-cols-4 gap-4 font-bold text-gray-700">
          <p>Folio: <span className="font-normal text-gray-500">{factura.folio}</span></p>
          <p>Fecha: <span className="font-normal text-gray-500">{factura.fechaFolio || factura.fchEmis}</span></p>
          <p>Empresa: <span className="font-normal text-gray-500">{factura.empresa || factura.rznSoc}</span></p>
          <p>Orden Asignada: <span className="font-normal text-blue-600">{factura.orden || "No asociada"}</span></p>
        </div>

        {/* === El botón Guardar aparece cuando desactivamos esConsulta tras presionar actualizar === */}
        {!esConsulta && (
          <div className="mt-4 pt-4 border-t border-gray-200 flex justify-end">
            <button
              onClick={handleGuardar}
              className="bg-green-600 text-white px-4 py-2 rounded font-bold hover:bg-green-700 text-[12px] flex items-center gap-2 shadow-sm transition-all"
            >
              <ShieldCheck size={14} /> Guardar Cambios Auditados
            </button>
          </div>
        )}
      </div>

      {/* Tabla — Muestra directo los detalles ya cruzados con la orden */}
      <table className="w-full text-left text-[12px] border-collapse">
        <thead className="bg-gray-100 sticky top-0">
          <tr className="text-[10px] text-gray-600 uppercase font-bold">
            <th className="p-2 border border-gray-200">Ref (Factura)</th>
            <th className="p-2 border border-gray-200">Cant (Factura)</th>
            <th className="p-2 border border-gray-200">Precio (Factura)</th>
            <th className="p-2 border border-gray-200 bg-blue-50">Cód. Sistema</th>
            <th className="p-2 border border-gray-200 bg-blue-50">Precio Sistema</th>
            <th className="p-2 border border-gray-200 bg-green-50 text-green-800">Cant. Orden</th>
            <th className="p-2 border border-gray-200 bg-green-50 text-green-800">Precio Orden</th>
            <th className="p-2 border border-gray-200 bg-red-50 text-red-800">Dif. Cant.</th>
            <th className="p-2 border border-gray-200 bg-red-50 text-red-800">Dif. Precio</th>
          </tr>
        </thead>
        <tbody>
          {detallesCruzados.map((det, idx) => {
            const hayDifCant = det.enlazadoConOrden && det.difCant !== 0;
            const hayDifPrecio = det.enlazadoConOrden && Math.abs(det.difPrecio) > 1;

            return (
              <tr key={det.idFila ?? idx} className="border-b border-gray-200 hover:bg-gray-50">
                <td className="p-2">{det.codigo}</td>
                <td className="p-2">{det.cantidad}</td>
                <td className="p-2">${parseFloat(det.precio || 0).toLocaleString()}</td>
                <td className="p-2 font-bold text-blue-700">{det.codigoSistema}</td>
                <td className="p-2 font-bold text-blue-700">${parseFloat(det.precioSistema || 0).toLocaleString()}</td>
                
                <td className="p-2 font-bold text-green-700">
                  {det.enlazadoConOrden ? det.cantOrden : "-"}
                </td>
                <td className="p-2 font-bold text-green-700">
                  {det.enlazadoConOrden ? `$${parseFloat(det.precioOrden || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "-"}
                </td>
                <td className={`p-2 font-bold ${hayDifCant ? 'text-red-600 bg-red-50' : 'text-gray-400'}`}>
                  {det.enlazadoConOrden ? (det.difCant === 0 ? "OK" : det.difCant) : "-"}
                </td>
                <td className={`p-2 font-bold ${hayDifPrecio ? 'text-red-600 bg-red-50' : 'text-gray-400'}`}>
                  {det.enlazadoConOrden ? (Math.abs(det.difPrecio) <= 1 ? "OK" : `$${parseFloat(det.difPrecio || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`) : "-"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};