import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, where, doc, setDoc, writeBatch } from 'firebase/firestore';
import { db } from '../../../../firebaseConfig';
import { ArrowLeft, CheckCircle, Eye } from 'lucide-react';
import { useToast } from '../../../../context/ToastContext';
import Spinner from '../../../ui/Spinner';

const GestionEstados = () => {
    const [listaConciliaciones, setListaConciliaciones] = useState([]);
    const [detalleItems, setDetalleItems] = useState([]);
    const [cargando, setCargando] = useState(false);
    const [vistaActual, setVistaActual] = useState('lista');
    const [conciliacionActual, setConciliacionActual] = useState(null);
    const [enlazado, setEnlazado] = useState(false);

    const { showToast } = useToast();

    useEffect(() => { cargarLista(); }, []);

    const cargarLista = async () => {
        setCargando(true);
        const q = query(
            collection(db, "laboratorio_conciliaciones"),
            where("estado", "in", ["Control Iniciado", "Códigos no registrados"])
        );
        const snap = await getDocs(q);
        const mapaUnico = {};
        snap.docs.forEach(d => {
            const data = { id: d.id, ...d.data() };
            if (!data.folio && data.folioRef) data.folio = data.folioRef;
            if (data.folio) mapaUnico[d.id] = data;
        });
        setListaConciliaciones(Object.values(mapaUnico));
        setCargando(false);
    };

    const handleDobleClick = (f) => {
        setConciliacionActual(f);
        cargarDetalle(f.folio);
    };

    const cargarDetalle = async (folio) => {
        setCargando(true);
        const q = query(collection(db, "laboratorio_conciliaciones_items"), where("folio", "==", folio));
        const snap = await getDocs(q);
        const mapaItems = {};
        snap.docs.forEach(d => {
            const data = { id: d.id, ...d.data() };
            if (data.codigo && !mapaItems[d.id]) mapaItems[d.id] = data;
        });
        const items = Object.values(mapaItems);
        setDetalleItems(items);
        // ✅ Activar enlazado si cualquier item tiene codigoMaestro guardado (incluso 'NO ENCONTRADO')
        setEnlazado(items.some(item => item.codigoMaestro !== undefined && item.codigoMaestro !== null || item.codigoMaestro === 'NO ENCONTRADO'));
        setVistaActual('detalle');
        setCargando(false);
    };

    const handleEnlazarCodigos = async () => {
        const folio = String(conciliacionActual?.folio).trim();

        if (!folio || detalleItems.length === 0) {
            showToast("Error: No hay datos para enlazar.", "error");
            return;
        }

        setCargando(true);
        try {
            const snapCodigos = await getDocs(collection(db, "laboratorio_codigos"));
            const mapaCodigos = {};
            snapCodigos.docs.forEach(d => {
                const data = d.data();
                const precioLimpio = String(data.precio || "0").replace(/\./g, '').replace(',', '.');
                mapaCodigos[data.referencia] = {
                    codigoMaestro: data.codigo,
                    precioMaestro: parseFloat(precioLimpio) || 0
                };
            });

            const batch = writeBatch(db);
            let hayFaltantes = false;

            const itemsActualizados = detalleItems.map(item => {
                if (!item.codigo) return null;
                const match = mapaCodigos[item.codigo];

                if (!match) {
                    hayFaltantes = true;
                    // ✅ Guardar en Firestore aunque no haya match
                    const nuevosDatos = {
                        codigoMaestro: 'NO ENCONTRADO',
                        precioMaestro: 0,
                        diferencia: 'Pendiente cálculo',
                        precioUnitarioFactura: parseFloat(item.precio) || 0
                    };
                    batch.set(doc(db, "laboratorio_conciliaciones_items", item.id), nuevosDatos, { merge: true });
                    return { ...item, ...nuevosDatos };
                }

                const cantidad = parseFloat(item.cantidad) || 1;
                const precioFactura = parseFloat(item.precio) || 0;
                const precioUnit = precioFactura / cantidad;
                const dif = precioUnit - match.precioMaestro;

                const nuevosDatos = {
                    precioUnitarioFactura: precioUnit,
                    codigoMaestro: match.codigoMaestro,
                    precioMaestro: match.precioMaestro,
                    diferencia: dif
                };

                batch.set(doc(db, "laboratorio_conciliaciones_items", item.id), nuevosDatos, { merge: true });
                return { ...item, ...nuevosDatos };
            }).filter(Boolean);

            await batch.commit();

            const nuevoEstado = hayFaltantes ? "Códigos no registrados" : "Procesar en Orden";

            await setDoc(doc(db, "laboratorio_conciliaciones", folio), {
                estado: nuevoEstado,
                fechaEnlace: new Date()
            }, { merge: true });

            setListaConciliaciones(prev => prev.map(item =>
                String(item.folio) === folio ? { ...item, estado: nuevoEstado } : item
            ));
            setConciliacionActual(prev => ({ ...prev, estado: nuevoEstado }));
            setDetalleItems(itemsActualizados);
            setEnlazado(true);

            showToast(`${enlazado ? 'Códigos actualizados' : 'Códigos enlazados'}: ${nuevoEstado}`, "success");
        } catch (error) {
            console.error("❌ Error completo:", error);
            showToast("Error: " + error.message, "error");
        } finally {
            setCargando(false);
        }
    };

    return (
        <div className="w-full h-full flex flex-col bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden p-0 relative">
            {cargando && (
                <div className="absolute inset-0 z-[100] flex items-center justify-center bg-gray-500/20 backdrop-blur-[2px]">
                    <div className="bg-white/90 p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-5">
                        <Spinner size="md" color="#0E5B6D" />
                        <h3 className="text-[#0E5B6D] font-bold text-[15px]">Procesando...</h3>
                    </div>
                </div>
            )}

            <h2 className="text-[14px] font-bold text-gray-700 p-4 flex items-center gap-2 border-b border-gray-200">
                {vistaActual === 'detalle' && (
                    <button onClick={() => setVistaActual('lista')} className="text-[#0E5B6D] hover:bg-gray-100 p-1 rounded">
                        <ArrowLeft size={16} />
                    </button>
                )}
                {vistaActual === 'lista' ? 'HISTORIAL DE CONCILIACIONES' : `DETALLE FOLIO: ${conciliacionActual?.folio}`}
                {vistaActual === 'detalle' && (
                    <button onClick={handleEnlazarCodigos} className="ml-auto bg-[#0E5B6D] text-white px-3 py-1 rounded text-[11px] font-bold flex items-center gap-1 hover:bg-[#0a4856]">
                        <CheckCircle size={12} /> {enlazado ? 'ACTUALIZAR CÓDIGOS' : 'ENLAZAR CÓDIGOS'}
                    </button>
                )}
            </h2>

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
                                    {enlazado && (
                                        <>
                                            <th className="p-3 border-b border-r border-gray-200 bg-green-50 text-green-700">Cod. Maestro</th>
                                            <th className="p-3 border-b border-r border-gray-200 bg-green-50 text-green-700">Precio M.</th>
                                            <th className="p-3 border-b border-gray-200 bg-green-50 text-green-700">Dif.</th>
                                        </>
                                    )}
                                </>
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        {vistaActual === 'lista' ? (
                            listaConciliaciones.map((f, i) => (
                                <tr key={`${f.id}-${i}`} onDoubleClick={() => handleDobleClick(f)} className="border-l-4 border-transparent hover:border-[#0E5B6D] hover:bg-gray-50 transition-colors">
                                    <td className="p-3 border-b border-r border-gray-200 font-bold text-[#0E5B6D]">{f.folio}</td>
                                    <td className="p-3 border-b border-r border-gray-200 text-gray-600">{f.rznSoc}</td>
                                    <td className="p-3 border-b border-r border-gray-200 text-gray-600">${Number(f.total || 0).toLocaleString()}</td>
                                    <td className="p-3 border-b border-r border-gray-200">
                                        <span className={`px-2 py-1 rounded text-[10px] font-bold ${f.estado === 'Procesar en Orden' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                            {f.estado || 'Iniciar'}
                                        </span>
                                    </td>
                                    <td className="p-3 border-b border-gray-200">
                                        <button onClick={() => handleDobleClick(f)} className="text-gray-400 hover:text-[#0E5B6D] transition-colors" title="Visualizar">
                                            <Eye size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            detalleItems.map((item, i) => (
                                <tr key={`${item.id || 'item'}-${i}`} className="border-l-4 border-transparent hover:border-[#0E5B6D] hover:bg-gray-50 transition-colors">
                                    <td className="p-3 border-b border-r border-gray-200 font-mono text-gray-600">{item.codigo}</td>
                                    <td className="p-3 border-b border-r border-gray-200 font-bold text-gray-800">{item.nombre || item.descripcion}</td>
                                    <td className="p-3 border-b border-r border-gray-200">{item.cantidad}</td>
                                    <td className="p-3 border-b border-r border-gray-200 text-gray-600">
                                        ${Math.round(item.precioUnitarioFactura ?? item.precio ?? 0).toLocaleString()}
                                    </td>
                                    {enlazado && (
                                        <>
                                            {/* Cod. Maestro */}
                                            <td className={`p-3 border-b border-r border-gray-200 font-mono ${item.codigoMaestro === 'NO ENCONTRADO' ? 'text-red-500' : 'text-green-700'}`}>
                                                {item.codigoMaestro || 'N/A'}
                                            </td>
                                            {/* Precio Maestro */}
                                            <td className="p-3 border-b border-r border-gray-200 font-bold text-green-700">
                                                {item.codigoMaestro === 'NO ENCONTRADO' ? '-' : `$${Math.round(item.precioMaestro ?? 0).toLocaleString()}`}
                                            </td>
                                            {/* Diferencia */}
                                            <td className={`p-3 border-b border-gray-200 font-bold ${item.diferencia === 'Pendiente cálculo'
                                                    ? 'text-gray-400 italic'
                                                    : (item.diferencia ?? 0) < 0 ? 'text-red-600' : 'text-blue-600'
                                                }`}>
                                                {item.diferencia === 'Pendiente cálculo'
                                                    ? 'Pendiente cálculo'
                                                    : `$${Math.round(item.diferencia ?? 0).toLocaleString()}`}
                                            </td>
                                        </>
                                    )}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default GestionEstados;