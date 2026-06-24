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
    const [cargandoModal, setCargandoModal] = useState(false);
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
        setCargandoModal(true);
        try {
            const q = query(collection(db, "laboratorio_ordenes", filtroAnioBase, "meses", filtroMesBase, "ordenes", ordenSeleccionada.id, "documentos"));
            const snap = await getDocs(q);
            const itemsOrden = snap.docs.map(d => d.data());

            const batch = writeBatch(db);
            let hayDiferencias = false;

            const detalleConciliado = detalleItems.map(itemFactura => {
                const match = itemsOrden.find(i => String(i["Cod.Artículo"]) === String(itemFactura.codigoMaestro));
                const precioMaestro = Math.round(itemFactura.precioMaestro || 0);
                const precioOrden = Math.round(parseFloat(match?.["P.Unitario"] || 0));
                const diferencia = precioMaestro - precioOrden;

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

            const nuevoEstado = hayDiferencias ? "Iniciar Solicitud" : "Listo para Ingresar";
            const folio = String(ordenActual?.folio).trim();

            await setDoc(doc(db, "laboratorio_conciliaciones", folio), {
                estado: nuevoEstado,
                fechaEnlaceOrden: new Date(),
                nroOrdenEnlazada: ordenSeleccionada.id
            }, { merge: true });

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
            setCargandoModal(false);
        }
    };

    const handleVolverPaso2 = async () => {
        const folio = String(ordenActual?.folio).trim();
        if (!folio) return;
        setCargando(true);
        try {
            await setDoc(
                doc(db, "laboratorio_conciliaciones", folio),
                { estado: "Control Iniciado", fechaActualizacion: new Date() },
                { merge: true }
            );
            setOrdenes(prev => prev.filter(o => String(o.folio) !== folio));
            setVistaActual('lista');
            showToast("Folio enviado de vuelta al Paso 2", "success");
        } catch (error) {
            showToast("Error: " + error.message, "error");
        } finally {
            setCargando(false);
        }
    };

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
                        <Spinner size="md" color="#2383C2" />
                        <h3 className="text-[#2383C2] font-bold text-[15px]">Procesando...</h3>
                    </div>
                </div>
            )}

            <h2 className="text-[14px] font-bold text-gray-700 p-4 flex items-center gap-2 border-b border-gray-200">
                {vistaActual === 'detalle' && (
                    <button onClick={() => setVistaActual('lista')} className="text-[#2383C2] hover:bg-gray-100 p-1 rounded">
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
                        <button
                            onClick={handleVolverPaso2}
                            className="bg-orange-500 text-white px-3 py-1 rounded text-[11px] font-bold flex items-center gap-1 hover:bg-orange-700"
                        >
                            <ArrowLeft size={12} /> VOLVER A PASO 2
                        </button>
                        <button onClick={abrirModalEnlace} className="bg-[#2383C2] text-white px-3 py-1 rounded text-[11px] font-bold flex items-center gap-1 hover:bg-[#0a4856]">
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
                                <tr key={o.id} onDoubleClick={() => handleVerDetalle(o)} className="border-l-4 border-transparent hover:border-[#2383C2] hover:bg-gray-50 transition-colors">
                                    <td className="p-3 border-b border-r border-gray-200 font-bold text-[#2383C2]">{o.folio}</td>
                                    <td className="p-3 border-b border-r border-gray-200 text-gray-600">{o.rznSoc}</td>
                                    <td className="p-3 border-b border-r border-gray-200 text-gray-600">${Number(o.total || 0).toLocaleString()}</td>
                                    <td className="p-3 border-b border-r border-gray-200">
                                        <span className={`px-2 py-1 rounded text-[10px] font-bold ${colorEstado(o.estado)}`}>
                                            {o.estado || 'Pendiente'}
                                        </span>
                                    </td>
                                    <td className="p-3 border-b border-gray-200">
                                        <button onClick={() => handleVerDetalle(o)} className="text-gray-400 hover:text-[#2383C2]"><Eye size={16} /></button>
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
                <div className="fixed inset-0 bg-black/40 z-[200] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-[480px] rounded-2xl border border-gray-200/80 overflow-hidden flex flex-col max-h-[85vh] shadow-xl">

                        <div className="px-6 pt-5 pb-4 flex justify-between items-start border-b border-gray-100">
                            <div>
                                <h3 className="text-[14px] font-medium text-gray-900 leading-tight">Enlazar orden de compra</h3>
                                <p className="text-[12px] text-gray-400 mt-0.5">Seleccione el período y busque la orden a vincular</p>
                            </div>
                            <button
                                onClick={() => setShowModalEnlace(false)}
                                className="text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors p-1.5 rounded-lg mt-[-2px] ml-4"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div className="px-6 py-4 flex flex-col gap-3 border-b border-gray-100">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex flex-col gap-1.5">
                                    <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Año</span>
                                    <select
                                        onChange={(e) => setFiltroAnioBase(e.target.value)}
                                        className="w-full border border-gray-200 bg-gray-50 px-3 py-2 rounded-lg text-[13px] text-gray-700 outline-none focus:border-[#2383C2] focus:bg-white transition-colors"
                                    >
                                        <option value="">Seleccionar</option>
                                        {aniosBase.map(a => <option key={a} value={a}>{a}</option>)}
                                    </select>
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Mes</span>
                                    <select
                                        onChange={(e) => setFiltroMesBase(e.target.value)}
                                        className="w-full border border-gray-200 bg-gray-50 px-3 py-2 rounded-lg text-[13px] text-gray-700 capitalize outline-none focus:border-[#2383C2] focus:bg-white transition-colors"
                                    >
                                        <option value="">Seleccionar</option>
                                        {mesesBase.map(m => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                </div>
                            </div>
                            <button
                                onClick={buscarOrdenesEnBase}
                                className="w-full bg-[#2383C2] hover:bg-[#1a6da0] text-white py-2.5 rounded-lg text-[12px] font-medium flex items-center justify-center gap-2 transition-colors"
                            >
                                <Search size={13} />
                                Buscar órdenes
                            </button>
                        </div>

                        <div className="overflow-auto flex-grow relative">

                            {cargandoModal && (
                                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/80 backdrop-blur-[2px] gap-3">
                                    <Spinner size="sm" color="#2383C2" />
                                    <p className="text-[12px] text-gray-500 font-medium">Enlazando orden...</p>
                                </div>
                            )}

                            {ordenesEncontradas.length > 0 ? (
                                <table className="w-full text-left border-collapse">
                                    <thead className="sticky top-0 z-10">
                                        <tr className="bg-gray-50 border-b border-gray-100">
                                            <th className="px-6 py-3 text-[10px] font-medium text-gray-400 uppercase tracking-widest">Nro. orden</th>
                                            <th className="px-6 py-3 text-[10px] font-medium text-gray-400 uppercase tracking-widest">Proveedor</th>
                                            <th className="px-6 py-3"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {ordenesEncontradas.map((o) => (
                                            <tr
                                                key={o.id}
                                                onClick={() => handleSeleccionarOrden(o)}
                                                className="group cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
                                            >
                                                <td className="px-6 py-3.5">
                                                    <span className="font-mono text-[11px] px-2 py-1 rounded-md bg-blue-50 text-blue-600 border border-blue-100">
                                                        {o["Nro.Orden"]}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-3.5 text-[13px] text-gray-500">
                                                    {o["Proveedor"]}
                                                </td>
                                                <td className="px-6 py-3.5 text-right">
                                                    <span className="text-[#2383C2] opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <ArrowLeft size={14} className="rotate-180" />
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-56 gap-3 text-gray-400">
                                    <div className="w-11 h-11 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center">
                                        <Search size={16} className="text-gray-300" />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-[13px] text-gray-500 font-medium">Sin resultados</p>
                                        <p className="text-[11px] text-gray-400 mt-0.5">Seleccione año y mes, luego busque</p>
                                    </div>
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

