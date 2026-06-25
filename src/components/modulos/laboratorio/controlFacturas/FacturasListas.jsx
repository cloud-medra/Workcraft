import React, { useState, useEffect } from 'react';
import { db } from '../../../../firebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';
import Spinner from '../../../ui/Spinner';
import { useToast } from '../../../../context/ToastContext';
import { ArrowLeft, Eye } from 'lucide-react';

const FacturasListas = () => {
    const [ordenes, setOrdenes] = useState([]);
    const [detalleItems, setDetalleItems] = useState([]);
    const [cargando, setCargando] = useState(false);
    const [vistaActual, setVistaActual] = useState('lista');
    const [ordenActual, setOrdenActual] = useState(null);
    const { showToast } = useToast();

    const colorEstado = (estado) => {
        if (estado === 'Listo para Ingresar') return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
        return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400';
    };

    useEffect(() => { cargarFacturasListas(); }, []);

    const cargarFacturasListas = async () => {
        setCargando(true);
        try {
            const q = query(collection(db, "laboratorio_conciliaciones"), where("estado", "==", "Listo para Ingresar"));
            const snap = await getDocs(q);
            setOrdenes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (error) {
            showToast("Error al cargar facturas listas", "error");
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
                    {vistaActual === 'lista' ? 'FACTURAS LISTAS PARA INGRESAR' : `DETALLE FOLIO: ${ordenActual?.folio}`}
                </h2>
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
                                    <th className="p-3 border-b border-gray-200 dark:border-gray-700">Dif. OC</th>
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
                                    <td className="p-3 border-b border-r border-gray-200 dark:border-gray-700">
                                        <span className={`px-2 py-1 rounded text-[10px] font-bold ${colorEstado(o.estado)}`}>
                                            {o.estado}
                                        </span>
                                    </td>
                                    <td className="p-3 border-b border-gray-200 dark:border-gray-700">
                                        <button onClick={() => handleVerDetalle(o)} className="text-gray-400 hover:text-[#2383C2]">
                                            <Eye size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            detalleItems.map((item, i) => (
                                <tr key={`${item.id}-${i}`} className="border-l-4 border-transparent hover:border-[#2383C2] hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                    <td className="p-3 border-b border-r border-gray-200 dark:border-gray-700 font-mono text-gray-600 dark:text-gray-400">{item.codigo}</td>
                                    <td className="p-3 border-b border-r border-gray-200 dark:border-gray-700 font-bold text-gray-800 dark:text-gray-200">{item.nombre || item.descripcion}</td>
                                    <td className="p-3 border-b border-r border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300">{item.cantidad}</td>
                                    <td className="p-3 border-b border-r border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300">${Math.round(item.precioUnitarioFactura || 0).toLocaleString()}</td>
                                    <td className="p-3 border-b border-gray-200 dark:border-gray-700 text-red-600 dark:text-red-400 font-bold">{item.diferenciaOrden ? `$${item.diferenciaOrden}` : 'Sin dif.'}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default FacturasListas;