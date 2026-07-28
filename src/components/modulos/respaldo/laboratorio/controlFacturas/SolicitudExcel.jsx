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
        if (estado === 'Listo para Ingresar') return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
        if (estado === 'Iniciar Solicitud') return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
        return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400';
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
        <div className="w-full h-full flex flex-col bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden p-0 relative">
            {cargando && (
                <div className="absolute inset-0 z-[100] flex items-center justify-center bg-gray-500/20 dark:bg-gray-900/50 backdrop-blur-[2px]">
                    <Spinner size="md" color="#2383C2" />
                </div>
            )}

            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-[14px] font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2">
                    {vistaActual === 'detalle' && (
                        <button onClick={() => setVistaActual('lista')} className="text-[#2383C2] hover:bg-gray-100 dark:hover:bg-gray-700 p-1 rounded">
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
                    <thead className="bg-gray-100 dark:bg-gray-900 sticky top-0">
                        <tr className="text-gray-600 dark:text-gray-400 uppercase font-bold text-[11px]">
                            {vistaActual === 'lista' ? (
                                <>
                                    <th className="p-3 border-b border-r border-gray-200 dark:border-gray-700">Folio</th>
                                    <th className="p-3 border-b border-r border-gray-200 dark:border-gray-700">Proveedor</th>
                                    <th className="p-3 border-b border-r border-gray-200 dark:border-gray-700">Total</th>
                                    <th className="p-3 border-b border-r border-gray-200 dark:border-gray-700">Estado</th>
                                    <th className="p-3 border-b border-gray-200 dark:border-gray-700">Acciones</th>
                                </>
                            ) : (
                                <>
                                    <th className="p-3 border-b border-r border-gray-200 dark:border-gray-700">Referencia</th>
                                    <th className="p-3 border-b border-r border-gray-200 dark:border-gray-700">Descripción</th>
                                    <th className="p-3 border-b border-r border-gray-200 dark:border-gray-700">Cant.</th>
                                    <th className="p-3 border-b border-r border-gray-200 dark:border-gray-700">Precio Unit.</th>
                                    <th className="p-3 border-b border-r border-gray-200 dark:border-gray-700 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400">Cod. Maestro</th>
                                    <th className="p-3 border-b border-r border-gray-200 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400">Art. OC</th>
                                    <th className="p-3 border-b border-r border-gray-200 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400">Cant. OC</th>
                                    <th className="p-3 border-b border-r border-gray-200 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400">Precio OC</th>
                                    <th className="p-3 border-b border-gray-200 dark:border-gray-700 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400">Dif. OC</th>
                                </>
                            )}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {vistaActual === 'lista' ? (
                            ordenes.map(o => (
                                <tr key={o.id} onDoubleClick={() => handleVerDetalle(o)} className="border-l-4 border-transparent hover:border-[#2383C2] hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer">
                                    <td className="p-3 border-b border-r border-gray-200 dark:border-gray-700 font-bold text-[#2383C2]">{o.folio}</td>
                                    <td className="p-3 border-b border-r border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300">{o.rznSoc}</td>
                                    <td className="p-3 border-b border-r border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300">${Number(o.total || 0).toLocaleString()}</td>
                                    <td className="p-3 border-b border-r border-gray-200 dark:border-gray-700"><span className={`px-2 py-1 rounded text-[10px] font-bold ${colorEstado(o.estado)}`}>{o.estado}</span></td>
                                    <td className="p-3 border-b border-gray-200 dark:border-gray-700"><button onClick={() => handleVerDetalle(o)} className="text-gray-400 hover:text-[#2383C2]"><Eye size={16} /></button></td>
                                </tr>
                            ))
                        ) : (
                            detalleItems.map((item, i) => (
                                <tr key={`${item.id}-${i}`} className="border-l-4 border-transparent hover:border-[#2383C2] hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                    <td className="p-3 border-b border-r border-gray-200 dark:border-gray-700 font-mono text-gray-600 dark:text-gray-400">{item.codigo}</td>
                                    <td className="p-3 border-b border-r border-gray-200 dark:border-gray-700 font-bold text-gray-800 dark:text-gray-200">{item.nombre || item.descripcion}</td>
                                    <td className="p-3 border-b border-r border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300">{item.cantidad}</td>
                                    <td className="p-3 border-b border-r border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300">${Math.round(item.precioUnitarioFactura || 0).toLocaleString()}</td>
                                    <td className="p-3 border-b border-r border-gray-200 dark:border-gray-700 font-mono text-green-700 dark:text-green-400">{item.codigoMaestro || '-'}</td>
                                    <td className="p-3 border-b border-r border-gray-200 dark:border-gray-700 text-blue-700 dark:text-blue-400">{item.articuloOrden || '-'}</td>
                                    <td className="p-3 border-b border-r border-gray-200 dark:border-gray-700 text-blue-700 dark:text-blue-400">{item.cantidadOrden || 0}</td>
                                    <td className="p-3 border-b border-r border-gray-200 dark:border-gray-700 text-blue-700 dark:text-blue-400">${Number(item.precioOrden || 0).toLocaleString()}</td>
                                    <td className={`p-3 border-b border-gray-200 dark:border-gray-700 font-bold ${Number(item.diferenciaOrden || 0) !== 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
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