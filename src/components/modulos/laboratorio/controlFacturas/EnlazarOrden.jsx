import React, { useState, useEffect } from 'react';
import { db } from '../../../../firebaseConfig';
import { collection, query, where, getDocs, writeBatch, doc, setDoc } from 'firebase/firestore';
import Spinner from '../../../ui/Spinner';
import { useToast } from '../../../../context/ToastContext';
import { ArrowLeft, CheckCircle, Eye, X, Search } from 'lucide-react';

const EnlazarOrden = () => {
    const [ordenes, setOrdenes] = useState([]);
    const [detalleItems, setDetalleItems] = useState([]);
    const [cargando, setCargando] = useState(false);
    const [vistaActual, setVistaActual] = useState('lista');
    const [ordenActual, setOrdenActual] = useState(null);
    const [ordenEnlazada, setOrdenEnlazada] = useState(false);

    const [showModalEnlace, setShowModalEnlace] = useState(false);
    const [aniosBase, setAniosBase] = useState([]);
    const [mesesBase, setMesesBase] = useState([]);
    const [filtroAnioBase, setFiltroAnioBase] = useState("");
    const [filtroMesBase, setFiltroMesBase] = useState("");
    const [ordenesEncontradas, setOrdenesEncontradas] = useState([]);

    const { showToast } = useToast();

    useEffect(() => { cargarOrdenes(); }, []);

    const cargarOrdenes = async () => {
        setCargando(true);
        try {
            const q = query(
                collection(db, "laboratorio_conciliaciones"),
                where("estado", "in", ["Procesar en Orden", "Iniciar Solicitud", "Solicitud Enviada"])
            );
            const snap = await getDocs(q);
            setOrdenes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (error) {
            showToast("Error al cargar las órdenes", "error");
        } finally {
            setCargando(false);
        }
    };

    const cargarDetalle = async (folio) => {
        setCargando(true);
        try {
            const q = query(collection(db, "laboratorio_conciliaciones_items"), where("folio", "==", folio));
            const snap = await getDocs(q);
            const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setDetalleItems(items);
            setOrdenEnlazada(items.some(item => item.articuloOrden !== undefined));
        } catch (error) {
            showToast("Error al cargar detalles", "error");
        } finally {
            setCargando(false);
        }
    };

    const handleVerDetalle = (o) => {
        setOrdenActual(o);
        cargarDetalle(o.folio);
        setVistaActual('detalle');
    };

    const abrirModalEnlace = async () => {
        setShowModalEnlace(true);
        setOrdenesEncontradas([]);
        setFiltroAnioBase("");
        setFiltroMesBase("");
        try {
            const snap = await getDocs(collection(db, "laboratorio_ordenes"));
            setAniosBase(snap.docs.map(d => d.id).sort((a, b) => b - a));
        } catch (error) {
            showToast("Error al cargar años", "error");
        }
    };

    useEffect(() => {
        if (filtroAnioBase) {
            const cargarMeses = async () => {
                const snap = await getDocs(collection(db, "laboratorio_ordenes", filtroAnioBase, "meses"));
                setMesesBase(snap.docs.map(d => d.id));
            };
            cargarMeses();
        }
    }, [filtroAnioBase]);

    const buscarOrdenesEnBase = async () => {
        if (!filtroAnioBase || !filtroMesBase) return showToast("Seleccione año y mes", "warning");
        try {
            const q = query(collection(db, "laboratorio_ordenes", filtroAnioBase, "meses", filtroMesBase, "ordenes"));
            const snap = await getDocs(q);
            setOrdenesEncontradas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (error) {
            showToast("Error al buscar órdenes", "error");
        }
    };

    const handleSeleccionarOrden = async (ordenSeleccionada) => {
        setCargando(true);
        try {
            const q = query(collection(db, "laboratorio_ordenes", filtroAnioBase, "meses", filtroMesBase, "ordenes", ordenSeleccionada.id, "documentos"));
            const snap = await getDocs(q);
            const itemsOrden = snap.docs.map(d => d.data());

            const batch = writeBatch(db);
            let hayDiferencias = false;

            const detalleConciliado = detalleItems.map(itemFactura => {
                const match = itemsOrden.find(i => String(i["Cod.Artículo"]) === String(itemFactura.codigoMaestro));

                // ✅ Redondear a entero para evitar diferencias por decimales
                const precioMaestro = Math.round(itemFactura.precioMaestro || 0);
                const precioOrden = Math.round(parseFloat(match?.["P.Unitario"] || 0));
                const diferencia = precioMaestro - precioOrden;

                // ✅ Solo hay diferencia real si es mayor a 0 en enteros
                if (diferencia !== 0) hayDiferencias = true;

                const nuevosDatos = {
                    articuloOrden: match?.["Artículo"] || "N/A",
                    cantidadOrden: match?.["Cant."] || 0,
                    precioOrden,
                    diferenciaOrden: diferencia,
                    nroOrdenEnlazada: ordenSeleccionada.id
                };

                batch.set(
                    doc(db, "laboratorio_conciliaciones_items", itemFactura.id),
                    nuevosDatos,
                    { merge: true }
                );

                return { ...itemFactura, ...nuevosDatos };
            });

            await batch.commit();

            // ✅ Estado según si hay diferencias
            const nuevoEstado = hayDiferencias ? "Iniciar Solicitud" : "Listo para Ingresar";
            const folio = String(ordenActual?.folio).trim();

            await setDoc(doc(db, "laboratorio_conciliaciones", folio), {
                estado: nuevoEstado,
                fechaEnlaceOrden: new Date(),
                nroOrdenEnlazada: ordenSeleccionada.id
            }, { merge: true });

            // Actualizar lista local
            setOrdenes(prev => prev.map(o =>
                String(o.folio) === folio ? { ...o, estado: nuevoEstado } : o
            ));
            setOrdenActual(prev => ({ ...prev, estado: nuevoEstado }));
            setDetalleItems(detalleConciliado);
            setOrdenEnlazada(true);
            setShowModalEnlace(false);

            showToast(`Orden enlazada: ${nuevoEstado}`, "success");
        } catch (error) {
            console.error("Error al cruzar información:", error);
            showToast("Error: " + error.message, "error");
        } finally {
            setCargando(false);
        }
    };

    // Helper color estado
    const colorEstado = (estado) => {
        if (estado === 'Listo para Ingresar') return 'bg-green-100 text-green-700';
        if (estado === 'Iniciar Solicitud') return 'bg-orange-100 text-orange-700';
        if (estado === 'Procesar en Orden') return 'bg-blue-100 text-blue-700';
        return 'bg-gray-100 text-gray-600';
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
                {vistaActual === 'lista' ? 'PROCESAR ÓRDENES (PENDIENTES)' : `DETALLE FOLIO: ${ordenActual?.folio}`}
                {vistaActual === 'detalle' && (
                    <div className="ml-auto flex items-center gap-2">
                        {ordenActual?.estado && (
                            <span className={`px-2 py-1 rounded text-[10px] font-bold ${colorEstado(ordenActual.estado)}`}>
                                {ordenActual.estado}
                            </span>
                        )}
                        <button onClick={abrirModalEnlace} className="bg-[#0E5B6D] text-white px-3 py-1 rounded text-[11px] font-bold flex items-center gap-1 hover:bg-[#0a4856]">
                            <CheckCircle size={12} /> {ordenEnlazada ? 'ACTUALIZAR ORDEN' : 'ENLAZAR ORDEN'}
                        </button>
                    </div>
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
                                    <th className="p-3 border-b border-r border-gray-200 bg-green-50 text-green-700">Cod. Maestro</th>
                                    {ordenEnlazada && (
                                        <>
                                            <th className="p-3 border-b border-r border-gray-200 bg-blue-50 text-blue-700">Art. OC</th>
                                            <th className="p-3 border-b border-r border-gray-200 bg-blue-50 text-blue-700">Cant. OC</th>
                                            <th className="p-3 border-b border-r border-gray-200 bg-blue-50 text-blue-700">Precio OC</th>
                                            <th className="p-3 border-b border-gray-200 bg-red-50 text-red-700">Dif. OC</th>
                                        </>
                                    )}
                                </>
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        {vistaActual === 'lista' ? (
                            ordenes.map(o => (
                                <tr key={o.id} onDoubleClick={() => handleVerDetalle(o)} className="border-l-4 border-transparent hover:border-[#0E5B6D] hover:bg-gray-50 transition-colors">
                                    <td className="p-3 border-b border-r border-gray-200 font-bold text-[#0E5B6D]">{o.folio}</td>
                                    <td className="p-3 border-b border-r border-gray-200 text-gray-600">{o.rznSoc}</td>
                                    <td className="p-3 border-b border-r border-gray-200 text-gray-600">${Number(o.total || 0).toLocaleString()}</td>
                                    <td className="p-3 border-b border-r border-gray-200">
                                        <span className={`px-2 py-1 rounded text-[10px] font-bold ${colorEstado(o.estado)}`}>
                                            {o.estado || 'Pendiente'}
                                        </span>
                                    </td>
                                    <td className="p-3 border-b border-gray-200">
                                        <button onClick={() => handleVerDetalle(o)} className="text-gray-400 hover:text-[#0E5B6D]"><Eye size={16} /></button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            detalleItems.map((item, i) => (
                                <tr key={`${item.id}-${i}`} className="border-l-4 border-transparent hover:border-[#0E5B6D] hover:bg-gray-50 transition-colors">
                                    <td className="p-3 border-b border-r border-gray-200 font-mono text-gray-600">{item.codigo}</td>
                                    <td className="p-3 border-b border-r border-gray-200 font-bold text-gray-800">{item.nombre || item.descripcion}</td>
                                    <td className="p-3 border-b border-r border-gray-200">{item.cantidad}</td>
                                    <td className="p-3 border-b border-r border-gray-200 text-gray-600">${Math.round(item.precioUnitarioFactura || 0).toLocaleString()}</td>
                                    <td className="p-3 border-b border-r border-gray-200 font-mono text-green-700">{item.codigoMaestro}</td>
                                    {ordenEnlazada && (
                                        <>
                                            <td className="p-3 border-b border-r border-gray-200 text-blue-700">{item.articuloOrden}</td>
                                            <td className="p-3 border-b border-r border-gray-200 text-blue-700">{item.cantidadOrden}</td>
                                            <td className="p-3 border-b border-r border-gray-200 text-blue-700">${Number(item.precioOrden || 0).toLocaleString()}</td>
                                            <td className={`p-3 border-b border-gray-200 font-bold ${(item.diferenciaOrden || 0) !== 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                {(item.diferenciaOrden || 0) === 0 ? 'Sin diferencia' : `$${Number(item.diferenciaOrden || 0).toLocaleString()}`}
                                            </td>
                                        </>
                                    )}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {showModalEnlace && (
                <div className="fixed inset-0 bg-gray-900/50 z-[200] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] border border-gray-200">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/80">
                            <h3 className="font-bold text-gray-700 text-[14px] uppercase tracking-wider">Seleccionar Orden</h3>
                            <button onClick={() => setShowModalEnlace(false)} className="text-gray-400 hover:text-red-500 transition-colors p-1">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-4 grid grid-cols-2 gap-3 border-b border-gray-100 bg-white">
                            <select onChange={(e) => setFiltroAnioBase(e.target.value)} className="w-full border border-gray-200 px-3 py-2 rounded-lg text-[12px] outline-none focus:border-[#0E5B6D] transition-colors">
                                <option value="">Año</option>
                                {aniosBase.map(a => <option key={a} value={a}>{a}</option>)}
                            </select>
                            <select onChange={(e) => setFiltroMesBase(e.target.value)} className="w-full border border-gray-200 px-3 py-2 rounded-lg text-[12px] capitalize outline-none focus:border-[#0E5B6D] transition-colors">
                                <option value="">Mes</option>
                                {mesesBase.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                            <button onClick={buscarOrdenesEnBase} className="col-span-2 bg-[#0E5B6D] text-white py-2 rounded-lg text-[12px] font-bold hover:bg-[#0a4856] transition-all">
                                BUSCAR ÓRDENES
                            </button>
                        </div>
                        <div className="overflow-auto flex-grow bg-white">
                            {ordenesEncontradas.length > 0 ? (
                                <table className="w-full text-left border-collapse">
                                    <thead className="sticky top-0 z-10 bg-white border-b border-gray-200">
                                        <tr>
                                            <th className="px-6 py-3.5 text-[11px] font-bold text-gray-400 uppercase tracking-[0.05em]">Nro. Orden</th>
                                            <th className="px-6 py-3.5 text-[11px] font-bold text-gray-400 uppercase tracking-[0.05em]">Proveedor</th>
                                            <th className="px-6 py-3.5 text-[11px] font-bold text-gray-400 uppercase tracking-[0.05em] text-right">Acción</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {ordenesEncontradas.map((o) => (
                                            <tr key={o.id} onClick={() => handleSeleccionarOrden(o)} className="group hover:bg-[#F8FAFB] cursor-pointer transition-all duration-200">
                                                <td className="px-6 py-4 text-[13px] font-semibold text-gray-700">
                                                    <span className="bg-gray-100 px-2 py-0.5 rounded font-mono text-[11px] text-gray-500 group-hover:bg-[#0E5B6D] group-hover:text-white transition-colors">
                                                        {o["Nro.Orden"]}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-[13px] text-gray-600 font-medium group-hover:text-[#0E5B6D] transition-colors">
                                                    {o["Proveedor"]}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className="inline-flex items-center text-[11px] font-bold text-[#0E5B6D] opacity-0 group-hover:opacity-100 transition-opacity">
                                                        SELECCIONAR →
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-60 text-gray-400 gap-3">
                                    <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center">
                                        <Search size={20} className="text-gray-300" />
                                    </div>
                                    <p className="text-[12px] font-medium text-gray-500">No se encontraron resultados</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EnlazarOrden;