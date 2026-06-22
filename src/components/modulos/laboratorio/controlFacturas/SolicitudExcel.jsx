import React, { useState, useEffect } from 'react';
import { db } from '../../../../firebaseConfig';
import { collection, query, where, getDocs, writeBatch, doc } from 'firebase/firestore';
import Spinner from '../../../ui/Spinner';
import { useToast } from '../../../../context/ToastContext';
import { ArrowLeft, Eye, FileSpreadsheet, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

const SolicitudExcel = () => {
    const [ordenes, setOrdenes] = useState([]);
    const [detalleItems, setDetalleItems] = useState([]);
    const [cargando, setCargando] = useState(false);
    const [vistaActual, setVistaActual] = useState('lista');
    const [ordenActual, setOrdenActual] = useState(null);
    const { showToast } = useToast();

    const colorEstado = (estado) => {
        if (estado === 'Listo para Ingresar') return 'bg-green-100 text-green-700';
        if (estado === 'Iniciar Solicitud') return 'bg-orange-100 text-orange-700';
        return 'bg-gray-100 text-gray-600';
    };

    useEffect(() => { cargarOrdenesSolicitud(); }, []);

    const cargarOrdenesSolicitud = async () => {
        setCargando(true);
        try {
            const q = query(collection(db, "laboratorio_conciliaciones"), where("estado", "==", "Iniciar Solicitud"));
            const snap = await getDocs(q);
            setOrdenes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (error) {
            showToast("Error al cargar solicitudes", "error");
        } finally {
            setCargando(false);
        }
    };

    const exportarExcel = async () => {
        setCargando(true);
        try {
            const qFolios = query(collection(db, "laboratorio_conciliaciones"), where("estado", "==", "Iniciar Solicitud"));
            const snapFolios = await getDocs(qFolios);
            
            if (snapFolios.empty) {
                showToast("No hay folios pendientes", "info");
                return;
            }

            const foliosActivos = snapFolios.docs.map(d => d.data().folio);
            const qItems = query(collection(db, "laboratorio_conciliaciones_items"), where("folio", "in", foliosActivos.slice(0, 30)));
            const snapItems = await getDocs(qItems);

            const data = snapItems.docs.map(d => {
                const item = d.data();
                const dif = Number(item.diferenciaOrden || 0);
                
                return {
                    "Folio": item.folio || '',
                    "Orden": item.nroOrdenEnlazada || '',
                    "Empresa": item.proveedor || '',
                    "Código Maestro": item.codigoMaestro || '',
                    "Artículo Maestro": item.nombre || item.descripcion || '',
                    "Cantidad": item.cantidad || 0,
                    "Precio Unitario": item.precioUnitarioFactura || 0,
                    "Acción": dif !== 0 ? "Modificar" : "",
                    "Art. OC": item.articuloOrden || '',
                    "Cant. OC": item.cantidadOrden || 0,
                    "Precio OC": item.precioOrden || 0,
                    "Dif. OC": dif !== 0 ? dif : '',
                    ...Object.fromEntries(Object.entries(item).filter(([key]) =>
                        !['folio', 'nroOrdenEnlazada', 'proveedor', 'codigoMaestro', 'nombre', 'descripcion', 'cantidad', 'precioUnitarioFactura', 'articuloOrden', 'cantidadOrden', 'precioOrden', 'diferenciaOrden'].includes(key)
                    ))
                };
            });

            // Actualizar estados a "Solicitud Enviada"
            const batch = writeBatch(db);
            snapFolios.docs.forEach((d) => {
                batch.update(doc(db, "laboratorio_conciliaciones", d.id), { estado: "Solicitud Enviada" });
            });
            await batch.commit();

            const ws = XLSX.utils.json_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Solicitudes");
            XLSX.writeFile(wb, "Reporte_Solicitudes_Detallado.xlsx");

            showToast("Excel generado y estados actualizados", "success");
            cargarOrdenesSolicitud();
        } catch (error) {
            showToast("Error al exportar: " + error.message, "error");
        } finally {
            setCargando(false);
        }
    };

    const handleVerDetalle = (o) => {
        setOrdenActual(o);
        const fetchDetalle = async () => {
            setCargando(true);
            const q = query(collection(db, "laboratorio_conciliaciones_items"), where("folio", "==", o.folio));
            const snap = await getDocs(q);
            setDetalleItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            setCargando(false);
        };
        fetchDetalle();
        setVistaActual('detalle');
    };

    return (
        <div className="w-full h-full flex flex-col bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden p-0 relative">
            {cargando && (
                <div className="absolute inset-0 z-[100] flex items-center justify-center bg-gray-500/20 backdrop-blur-[2px]">
                    <Spinner size="md" color="#2383C2" />
                </div>
            )}

            <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h2 className="text-[14px] font-bold text-gray-700 flex items-center gap-2">
                    {vistaActual === 'detalle' && (
                        <button onClick={() => setVistaActual('lista')} className="text-[#2383C2] hover:bg-gray-100 p-1 rounded">
                            <ArrowLeft size={16} />
                        </button>
                    )}
                    {vistaActual === 'lista' ? 'SOLICITUDES PARA EXCEL' : `DETALLE FOLIO: ${ordenActual?.folio}`}
                </h2>
                {vistaActual === 'lista' && ordenes.length > 0 && (
                    <button onClick={exportarExcel} className="flex items-center gap-2 px-3 py-1.5 bg-[#2383C2] text-white text-[11px] font-bold rounded hover:bg-[#0b4a58] transition-colors">
                        <Download size={14} /> EXPORTAR EXCEL
                    </button>
                )}
            </div>

            <div className="flex-grow overflow-auto">
                <table className="w-full text-left text-[12px] border-collapse">
                    <thead className="bg-gray-100 sticky top-0">
                        <tr className="text-gray-600 uppercase font-bold text-[11px]">
                            {vistaActual === 'lista' ? (
                                <>
                                    <th className="p-3 border-b border-r border-gray-200">Folio</th>
                                    <th className="p-3 border-b border-r border-gray-200">Proveedor</th>
                                    <th className="p-3 border-b border-r border-gray-200">Total</th>
                                    <th className="p-3 border-b border-r border-gray-200">Estado</th>
                                    <th className="p-3 border-b border-gray-200">Acciones</th>
                                </>
                            ) : (
                                <>
                                    <th className="p-3 border-b border-r border-gray-200">Referencia</th>
                                    <th className="p-3 border-b border-r border-gray-200">Descripción</th>
                                    <th className="p-3 border-b border-r border-gray-200">Cant.</th>
                                    <th className="p-3 border-b border-r border-gray-200">Precio Unit.</th>
                                    <th className="p-3 border-b border-r border-gray-200 bg-green-50 text-green-700">Cod. Maestro</th>
                                    <th className="p-3 border-b border-r border-gray-200 bg-blue-50 text-blue-700">Art. OC</th>
                                    <th className="p-3 border-b border-r border-gray-200 bg-blue-50 text-blue-700">Cant. OC</th>
                                    <th className="p-3 border-b border-r border-gray-200 bg-blue-50 text-blue-700">Precio OC</th>
                                    <th className="p-3 border-b border-gray-200 bg-red-50 text-red-700">Dif. OC</th>
                                </>
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        {vistaActual === 'lista' ? (
                            ordenes.map(o => (
                                <tr key={o.id} onDoubleClick={() => handleVerDetalle(o)} className="border-l-4 border-transparent hover:border-[#2383C2] hover:bg-gray-50 transition-colors cursor-pointer">
                                    <td className="p-3 border-b border-r border-gray-200 font-bold text-[#2383C2]">{o.folio}</td>
                                    <td className="p-3 border-b border-r border-gray-200 text-gray-600">{o.rznSoc}</td>
                                    <td className="p-3 border-b border-r border-gray-200 text-gray-600">${Number(o.total || 0).toLocaleString()}</td>
                                    <td className="p-3 border-b border-r border-gray-200"><span className={`px-2 py-1 rounded text-[10px] font-bold ${colorEstado(o.estado)}`}>{o.estado}</span></td>
                                    <td className="p-3 border-b border-gray-200"><button onClick={() => handleVerDetalle(o)} className="text-gray-400 hover:text-[#2383C2]"><Eye size={16} /></button></td>
                                </tr>
                            ))
                        ) : (
                            detalleItems.map((item, i) => (
                                <tr key={`${item.id}-${i}`} className="border-l-4 border-transparent hover:border-[#2383C2] hover:bg-gray-50 transition-colors">
                                    <td className="p-3 border-b border-r border-gray-200 font-mono text-gray-600">{item.codigo}</td>
                                    <td className="p-3 border-b border-r border-gray-200 font-bold text-gray-800">{item.nombre || item.descripcion}</td>
                                    <td className="p-3 border-b border-r border-gray-200">{item.cantidad}</td>
                                    <td className="p-3 border-b border-r border-gray-200 text-gray-600">${Math.round(item.precioUnitarioFactura || 0).toLocaleString()}</td>
                                    <td className="p-3 border-b border-r border-gray-200 font-mono text-green-700">{item.codigoMaestro || '-'}</td>
                                    <td className="p-3 border-b border-r border-gray-200 text-blue-700">{item.articuloOrden || '-'}</td>
                                    <td className="p-3 border-b border-r border-gray-200 text-blue-700">{item.cantidadOrden || 0}</td>
                                    <td className="p-3 border-b border-r border-gray-200 text-blue-700">${Number(item.precioOrden || 0).toLocaleString()}</td>
                                    <td className={`p-3 border-b border-gray-200 font-bold ${Number(item.diferenciaOrden || 0) !== 0 ? 'text-red-600' : 'text-green-600'}`}>
                                        {Number(item.diferenciaOrden || 0) === 0 ? 'Sin diferencia' : `$${Number(item.diferenciaOrden || 0).toLocaleString()}`}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default SolicitudExcel;