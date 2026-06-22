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

    // Reutilizamos tu lógica de colores para consistencia
    const colorEstado = (estado) => {
        if (estado === 'Listo para Ingresar') return 'bg-green-100 text-green-700';
        return 'bg-gray-100 text-gray-600';
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
                    {vistaActual === 'lista' ? 'FACTURAS LISTAS PARA INGRESAR' : `DETALLE FOLIO: ${ordenActual?.folio}`}
                </h2>
            </div>

            <div className="flex-grow overflow-auto">
                <table className="w-full text-left text-[12px] border-collapse">
                    <thead className="bg-gray-100 sticky top-0">
                        {vistaActual === 'lista' ? (
                            <tr className="text-gray-600 uppercase font-bold text-[11px]">
                                <th className="p-3 border-b border-r border-gray-200">Folio</th>
                                <th className="p-3 border-b border-r border-gray-200">Proveedor</th>
                                <th className="p-3 border-b border-r border-gray-200">Total</th>
                                <th className="p-3 border-b border-r border-gray-200">Estado</th>
                                <th className="p-3 border-b border-gray-200">Acciones</th>
                            </tr>
                        ) : (
                            <tr className="text-gray-600 uppercase font-bold text-[11px]">
                                <th className="p-3 border-b border-r border-gray-200">Referencia</th>
                                <th className="p-3 border-b border-r border-gray-200">Descripción</th>
                                <th className="p-3 border-b border-r border-gray-200">Cant.</th>
                                <th className="p-3 border-b border-r border-gray-200">Precio Unit.</th>
                                <th className="p-3 border-b border-gray-200">Dif. OC</th>
                            </tr>
                        )}
                    </thead>
                    <tbody>
                        {vistaActual === 'lista' ? (
                            ordenes.map(o => (
                                <tr key={o.id} onDoubleClick={() => handleVerDetalle(o)} className="border-l-4 border-transparent hover:border-[#2383C2] hover:bg-gray-50 transition-colors cursor-pointer">
                                    <td className="p-3 border-b border-r border-gray-200 font-bold text-[#2383C2]">{o.folio}</td>
                                    <td className="p-3 border-b border-r border-gray-200 text-gray-600">{o.rznSoc}</td>
                                    <td className="p-3 border-b border-r border-gray-200 text-gray-600">${Number(o.total || 0).toLocaleString()}</td>
                                    <td className="p-3 border-b border-r border-gray-200">
                                        <span className={`px-2 py-1 rounded text-[10px] font-bold ${colorEstado(o.estado)}`}>
                                            {o.estado}
                                        </span>
                                    </td>
                                    <td className="p-3 border-b border-gray-200">
                                        <button onClick={() => handleVerDetalle(o)} className="text-gray-400 hover:text-[#2383C2]">
                                            <Eye size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            detalleItems.map((item, i) => (
                                <tr key={`${item.id}-${i}`} className="border-l-4 border-transparent hover:border-[#2383C2] hover:bg-gray-50 transition-colors">
                                    <td className="p-3 border-b border-r border-gray-200 font-mono text-gray-600">{item.codigo}</td>
                                    <td className="p-3 border-b border-r border-gray-200 font-bold text-gray-800">{item.nombre || item.descripcion}</td>
                                    <td className="p-3 border-b border-r border-gray-200">{item.cantidad}</td>
                                    <td className="p-3 border-b border-r border-gray-200 text-gray-600">${Math.round(item.precioUnitarioFactura || 0).toLocaleString()}</td>
                                    <td className="p-3 border-b border-gray-200 text-red-600 font-bold">{item.diferenciaOrden ? `$${item.diferenciaOrden}` : 'Sin dif.'}</td>
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