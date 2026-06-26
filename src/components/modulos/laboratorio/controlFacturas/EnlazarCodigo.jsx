import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, where, doc, setDoc, writeBatch } from 'firebase/firestore';
import { db } from '../../../../firebaseConfig';
import { ArrowLeft, CheckCircle, Eye, Trash2 } from 'lucide-react';
import { useToast } from '../../../../context/ToastContext';
import { useModal } from '../../../../context/ModalContext';
import Spinner from '../../../ui/Spinner';

const EnlazarCodigo = () => {
    const [listaConciliaciones, setListaConciliaciones] = useState([]);
    const [detalleItems, setDetalleItems] = useState([]);
    const [cargando, setCargando] = useState(false);
    const [vistaActual, setVistaActual] = useState('lista');
    const [conciliacionActual, setConciliacionActual] = useState(null);
    const [enlazado, setEnlazado] = useState(false);

    const [observacionEditando, setObservacionEditando] = useState(null);
    const [observacionTexto, setObservacionTexto] = useState('');

    const { showToast } = useToast();
    const { confirmAction } = useModal();

    useEffect(() => { cargarLista(); }, []);

    const cargarLista = async () => {
        setCargando(true);
        try {
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
        } catch (error) {
            console.error(error);
        } finally {
            setCargando(false);
        }
    };

    const handleDobleClick = (f) => {
        setConciliacionActual(f);
        cargarDetalle(f.folio);
    };

    const cargarDetalle = async (folio) => {
        setCargando(true);
        try {
            const q = query(collection(db, "laboratorio_conciliaciones_items"), where("folio", "==", folio));
            const snap = await getDocs(q);
            const mapaItems = {};
            snap.docs.forEach(d => {
                const data = { id: d.id, ...d.data() };
                if (data.codigo && !mapaItems[d.id]) mapaItems[d.id] = data;
            });
            const items = Object.values(mapaItems);
            setDetalleItems(items);
            setEnlazado(items.some(item => item.codigoMaestro !== undefined && item.codigoMaestro !== null || item.codigoMaestro === 'NO ENCONTRADO'));
            setVistaActual('detalle');
        } catch (error) {
            console.error(error);
        } finally {
            setCargando(false);
        }
    };

    const handleEliminarConciliacion = (e, conciliacion) => {
        e.stopPropagation();
        const folioStr = String(conciliacion.folio);
        confirmAction(
            "¿Eliminar Conciliación?",
            `¿Estás completamente seguro de que deseas eliminar el Folio ${folioStr}? Esta acción borrará la conciliación y todos sus ítems de forma irreversible.`,
            async () => {
                setCargando(true);
                try {
                    const batch = writeBatch(db);
                    const qItems = query(collection(db, "laboratorio_conciliaciones_items"), where("folio", "==", conciliacion.folio));
                    const snapItems = await getDocs(qItems);
                    snapItems.docs.forEach(docSnap => { batch.delete(docSnap.ref); });
                    const docConciliacionRef = doc(db, "laboratorio_conciliaciones", folioStr);
                    batch.delete(docConciliacionRef);
                    await batch.commit();
                    setListaConciliaciones(prev => prev.filter(item => String(item.folio) !== folioStr));
                    showToast(`Folio ${folioStr} eliminado correctamente.`, "success");
                } catch (error) {
                    console.error("❌ Error al eliminar conciliación:", error);
                    showToast("Error al eliminar: " + error.message, "error");
                } finally {
                    setCargando(false);
                }
            }
        );
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
                if (item.anulado) return item;

                const match = mapaCodigos[item.codigo];
                if (!match) {
                    hayFaltantes = true;
                    const nuevosDatos = {
                        codigoMaestro: 'NO ENCONTRADO',
                        precioMaestro: 0,
                        diferencia: 'Pendiente cálculo',
                        precioUnitarioFactura: parseFloat(item.precio) || 0
                    };
                    batch.set(doc(db, "laboratorio_conciliaciones_items", item.id), nuevosDatos, { merge: true });
                    return { ...item, ...nuevosDatos };
                }

                const precioUnit = parseFloat(item.precio) || 0;
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

    const handleGuardarObservacion = async (item) => {
        if (!observacionTexto.trim()) return showToast("Ingresa una observación", "warning");
        setCargando(true);
        try {
            const nuevosDatos = {
                observacion: observacionTexto.trim(),
                anulado: true,
                codigoMaestro: 'ANULADO'
            };
            await setDoc(
                doc(db, "laboratorio_conciliaciones_items", item.id),
                nuevosDatos,
                { merge: true }
            );

            const itemsActualizados = detalleItems.map(i =>
                i.id === item.id ? { ...i, ...nuevosDatos } : i
            );
            setDetalleItems(itemsActualizados);

            const todosResueltos = itemsActualizados.every(
                i => i.codigoMaestro && i.codigoMaestro !== 'NO ENCONTRADO'
            );

            if (todosResueltos) {
                const folio = String(conciliacionActual.folio);
                await setDoc(
                    doc(db, "laboratorio_conciliaciones", folio),
                    { estado: "Procesar en Orden", fechaActualizacion: new Date() },
                    { merge: true }
                );
                setConciliacionActual(prev => ({ ...prev, estado: "Procesar en Orden" }));
                setListaConciliaciones(prev =>
                    prev.map(i => String(i.folio) === folio ? { ...i, estado: "Procesar en Orden" } : i)
                );
                showToast("Ítem anulado. Estado cambiado a Procesar en Orden ✅", "success");
            } else {
                showToast("Observación guardada. Ítem anulado.", "success");
            }

            setObservacionEditando(null);
            setObservacionTexto('');
        } catch (error) {
            showToast("Error al guardar: " + error.message, "error");
        } finally {
            setCargando(false);
        }
    };

    const colSpanDetalle = enlazado ? 7 : 4;

    return (
        <div className="w-full h-full flex flex-col bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden relative">
            {cargando && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-gray-500/20 dark:bg-black/40 backdrop-blur-[2px]">
                    <div className="bg-white/90 dark:bg-gray-800/90 p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-5">
                        <Spinner size="md" color="#2383C2" />
                        <h3 className="text-[#2383C2] font-bold text-[15px]">Procesando...</h3>
                    </div>
                </div>
            )}

            <h2 className="text-[14px] font-bold text-gray-700 dark:text-gray-100 p-4 flex items-center gap-2 border-b border-gray-200 dark:border-gray-700">
                {vistaActual === 'detalle' && (
                    <button onClick={() => setVistaActual('lista')} className="text-[#2383C2] hover:bg-gray-100 dark:hover:bg-gray-700 p-1 rounded transition">
                        <ArrowLeft size={16} />
                    </button>
                )}
                <span className="uppercase">{vistaActual === 'lista' ? 'Historial de Conciliaciones' : `Detalle Folio: ${conciliacionActual?.folio}`}</span>
                {vistaActual === 'detalle' && (
                    <button onClick={handleEnlazarCodigos} className="ml-auto bg-[#2383C2] hover:bg-[#1d6b9e] text-white px-3 h-7 rounded text-[11px] font-bold flex items-center gap-1 transition">
                        <CheckCircle size={12} /> {enlazado ? 'ACTUALIZAR CÓDIGOS' : 'ENLAZAR CÓDIGOS'}
                    </button>
                )}
            </h2>

            <div className="flex-grow overflow-auto">
                <table className="w-full text-left text-[11px] border-collapse table-fixed">
                    <thead className="bg-gray-100 dark:bg-gray-900 sticky top-0 z-10 text-gray-600 dark:text-gray-400 uppercase font-bold">
                        <tr>
                            {vistaActual === 'lista' ? (
                                <>
                                    <th className="p-3 border-b border-r border-gray-200 dark:border-gray-700 w-[100px]">Folio</th>
                                    <th className="p-3 border-b border-r border-gray-200 dark:border-gray-700 w-[220px]">Proveedor</th>
                                    <th className="p-3 border-b border-r border-gray-200 dark:border-gray-700 w-[120px]">Total</th>
                                    <th className="p-3 border-b border-r border-gray-200 dark:border-gray-700 w-[150px]">Estado</th>
                                    <th className="p-3 border-b border-gray-200 dark:border-gray-700 w-[100px] text-center">Acciones</th>
                                </>
                            ) : (
                                <>
                                    <th className="p-3 border-b border-r border-gray-200 dark:border-gray-700 w-[130px]">Referencia</th>
                                    <th className="p-3 border-b border-r border-gray-200 dark:border-gray-700 w-[180px]">Descripción</th>
                                    <th className="p-3 border-b border-r border-gray-200 dark:border-gray-700 w-[60px]">Cant.</th>
                                    <th className="p-3 border-b border-r border-gray-200 dark:border-gray-700 w-[100px]">Precio Unit.</th>
                                    {enlazado && (
                                        <>
                                            <th className="p-3 border-b border-r border-gray-200 dark:border-gray-700 text-green-700 dark:text-green-400 w-[150px]">Cod. Maestro</th>
                                            <th className="p-3 border-b border-r border-gray-200 dark:border-gray-700 text-green-700 dark:text-green-400 w-[100px]">Precio M.</th>
                                            <th className="p-3 border-b border-gray-200 dark:border-gray-700 text-green-700 dark:text-green-400 w-[110px]">Dif.</th>
                                        </>
                                    )}
                                </>
                            )}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                        {vistaActual === 'lista' ? (
                            listaConciliaciones.map((f, i) => (
                                <tr key={`${f.id}-${i}`} onDoubleClick={() => handleDobleClick(f)} className="border-l-4 border-transparent hover:border-[#2383C2] hover:bg-gray-50/80 dark:hover:bg-gray-700/40 transition-colors cursor-pointer">
                                    <td className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70 font-bold text-[#2383C2]">{f.folio}</td>
                                    <td className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-600 dark:text-gray-300 truncate">{f.rznSoc}</td>
                                    <td className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-700 dark:text-gray-200 font-bold">${Number(f.total || 0).toLocaleString()}</td>
                                    <td className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${f.estado === 'Procesar en Orden' ? 'bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-400' : 'bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-400'}`}>
                                            {f.estado || 'Iniciar'}
                                        </span>
                                    </td>
                                    <td className="p-3 border-b border-gray-200 dark:border-gray-700 text-center">
                                        <div className="flex items-center justify-center gap-3">
                                            <button onClick={() => handleDobleClick(f)} className="text-gray-400 hover:text-[#2383C2] transition" title="Visualizar">
                                                <Eye size={15} />
                                            </button>
                                            <button onClick={(e) => handleEliminarConciliacion(e, f)} className="text-gray-400 hover:text-red-500 transition" title="Eliminar Conciliación">
                                                <Trash2 size={15} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            detalleItems.map((item, i) => (
                                <React.Fragment key={`${item.id || 'item'}-${i}`}>
                                    {/* ✅ Corregido: Se removió el border-b de aquí para evitar que se pinte la línea horizontal encima del hover */}
                                    <tr className={`border-l-4 transition-colors ${item.anulado
                                        ? 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/40 opacity-60 hover:border-gray-400'
                                        : 'border-transparent hover:border-[#2383C2] hover:bg-gray-50/80 dark:hover:bg-gray-700/40 bg-white dark:bg-gray-800'
                                        }`}>
                                        {/* ✅ Corregido: Se añadió el border-b individual de forma explícita a cada td (igual a la primera tabla) */}
                                        <td className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70 font-mono text-gray-500 dark:text-gray-400 truncate">{item.codigo}</td>
                                        <td className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70 font-bold text-gray-800 dark:text-gray-200 truncate">
                                            <span className={item.anulado ? 'line-through text-gray-400 dark:text-gray-500' : ''}>
                                                {item.nombre || item.descripcion}
                                            </span>
                                        </td>
                                        <td className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-700 dark:text-gray-300">{item.cantidad}</td>
                                        <td className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-600 dark:text-gray-400">
                                            ${Math.round(item.precioUnitarioFactura ?? item.precio ?? 0).toLocaleString()}
                                        </td>
                                        {enlazado && (
                                            <>
                                                <td className={`p-3 border-b border-r border-gray-200 dark:border-gray-700/70 font-mono ${item.codigoMaestro === 'NO ENCONTRADO' ? 'text-red-500 dark:text-red-400 font-bold' :
                                                    item.codigoMaestro === 'ANULADO' ? 'text-gray-400 dark:text-gray-500' :
                                                        'text-green-700 dark:text-green-400 font-bold'
                                                    }`}>
                                                    <div className="flex items-center gap-2 overflow-hidden">
                                                        <span className={item.anulado ? 'line-through' : 'truncate'}>
                                                            {item.codigoMaestro || 'N/A'}
                                                        </span>

                                                        {item.codigoMaestro === 'NO ENCONTRADO' && !item.anulado && (
                                                            <button
                                                                onClick={() => {
                                                                    setObservacionEditando(item.id);
                                                                    setObservacionTexto(item.observacion || '');
                                                                }}
                                                                className="text-[10px] text-orange-600 dark:text-orange-400 border border-orange-300 dark:border-orange-800/60 rounded px-1.5 h-5 hover:bg-orange-50 dark:hover:bg-orange-950/30 font-bold transition shrink-0"
                                                            >
                                                                Anular
                                                            </button>
                                                        )}

                                                        {item.anulado && item.observacion && (
                                                            <span className="text-[10px] text-gray-400 dark:text-gray-500 italic truncate max-w-[90px]" title={item.observacion}>
                                                                ({item.observacion})
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70 font-bold text-green-700 dark:text-green-400">
                                                    {item.codigoMaestro === 'NO ENCONTRADO' || item.codigoMaestro === 'ANULADO'
                                                        ? '-'
                                                        : `$${Math.round(item.precioMaestro ?? 0).toLocaleString()}`}
                                                </td>
                                                <td className={`p-3 border-b font-bold truncate ${item.anulado ? 'text-gray-400 dark:text-gray-500 italic font-normal border-gray-200 dark:border-gray-700/70' :
                                                    item.diferencia === 'Pendiente cálculo' ? 'text-gray-400 dark:text-gray-500 italic font-normal border-gray-200 dark:border-gray-700/70' :
                                                        (item.diferencia ?? 0) < 0 ? 'text-red-600 dark:text-red-400 border-gray-200 dark:border-gray-700/70' : 'text-blue-600 dark:text-blue-400 border-gray-200 dark:border-gray-700/70'
                                                    }`}>
                                                    {item.anulado
                                                        ? 'Anulado'
                                                        : item.diferencia === 'Pendiente cálculo'
                                                            ? 'Pendiente cálculo'
                                                            : `$${Math.round(item.diferencia ?? 0).toLocaleString()}`}
                                                </td>
                                            </>
                                        )}
                                    </tr>

                                    {observacionEditando === item.id && (
                                        <tr className="bg-orange-50/40 dark:bg-orange-950/10 border-l-4 border-orange-400 transition-colors">
                                            <td colSpan={colSpanDetalle} className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[11px] font-bold text-orange-700 dark:text-orange-400 shrink-0">
                                                        Motivo de anulación:
                                                    </span>
                                                    <input
                                                        autoFocus
                                                        value={observacionTexto}
                                                        onChange={e => setObservacionTexto(e.target.value)}
                                                        onKeyDown={e => e.key === 'Enter' && handleGuardarObservacion(item)}
                                                        className="flex-grow h-7 border border-orange-300 dark:border-orange-900 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 rounded text-[11px] px-2 outline-none focus:border-orange-500 placeholder-gray-400 dark:placeholder-gray-500"
                                                        placeholder="Ej: Solicitar nota de crédito..."
                                                    />
                                                    <button
                                                        onClick={() => handleGuardarObservacion(item)}
                                                        className="h-7 px-3 bg-orange-500 hover:bg-orange-600 text-white rounded text-[11px] font-bold transition shrink-0"
                                                    >
                                                        Confirmar
                                                    </button>
                                                    <button
                                                        onClick={() => { setObservacionEditando(null); setObservacionTexto(''); }}
                                                        className="h-7 px-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-[11px] transition shrink-0"
                                                    >
                                                        Cancelar
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default EnlazarCodigo;