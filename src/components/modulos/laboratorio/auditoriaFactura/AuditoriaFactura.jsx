import React, { useState, useEffect } from 'react';
import { Search, ShieldCheck, Plus, X } from 'lucide-react';
import { writeBatch, query, collectionGroup, where, getDocs, collection, getDocs as getDocsSimple, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../../firebaseConfig';
import { useToast } from '../../../../context/ToastContext';
import Spinner from '../../../ui/Spinner';

const AuditoriaFacturas = () => {
    const [modoAuditoria, setModoAuditoria] = useState(false);
    const [folioInput, setFolioInput] = useState('');
    const [facturaEncontrada, setFacturaEncontrada] = useState(null);

    const [listaAuditorias, setListaAuditorias] = useState([]);

    const [filtroAnio, setFiltroAnio] = useState("");
    const [filtroMes, setFiltroMes] = useState("");

    const [aniosDisponibles, setAniosDisponibles] = useState([]);
    const [mesesDisponibles, setMesesDisponibles] = useState([]);

    const [busqueda, setBusqueda] = useState('');
    const [cargando, setCargando] = useState(false);

    const { showToast } = useToast();

    const [ordenInput, setOrdenInput] = useState('');
    const [ordenEncontrada, setOrdenEncontrada] = useState(null);

    const handleBuscarOrden = async () => {
        // ... tu código ...
        if (!ordenInput) return showToast("Ingrese un número de orden", "error");
        setCargando(true);
        try {
            // Trae todas las órdenes y filtra por ID en cliente
            const snap = await getDocs(collectionGroup(db, "ordenes"));

            const ordenDoc = snap.docs.find(d => d.id === ordenInput.trim());

            if (!ordenDoc) {
                showToast("Orden no encontrada", "error");
                setOrdenEncontrada(null);
            } else {
                const itemsSnap = await getDocs(collection(ordenDoc.ref, "documentos"));
                const itemsOrden = itemsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                setOrdenEncontrada({
                    id: ordenDoc.id, // Asegúrate de asignar el ID explícitamente
                    ...ordenDoc.data(),
                    items: itemsOrden
                });
                showToast("Orden cargada", "success");
            }
        } catch (error) {
            console.error(error);
            showToast("Error al buscar orden: " + error.message, "error");
        } finally {
            setCargando(false);
        }
    };

    const handleBuscarFolio = async () => {
        if (!folioInput) return showToast("Ingrese un número de folio", "error");
        setCargando(true);
        try {
            // 1. Buscar el Folio
            const q = query(collectionGroup(db, "documentos"), where("folio", "==", folioInput));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                showToast("No se encontró ninguna factura", "error");
                setFacturaEncontrada(null);
            } else {
                const docData = querySnapshot.docs[0].data();

                // 2. Cruzar datos con laboratorio_codigos
                // Obtenemos todos los códigos del sistema para comparar
                const codigosSnap = await getDocsSimple(collection(db, "laboratorio_codigos"));
                const listaCodigos = codigosSnap.docs.map(d => d.data());

                // Mapeamos los detalles de la factura enriqueciéndolos con los datos del sistema
                const detallesEnriquecidos = docData.detalles.map(detalle => {
                    const match = listaCodigos.find(c => c.referencia === detalle.codigo);
                    return {
                        ...detalle,
                        codigoSistema: match ? match.codigo : 'N/A',
                        precioSistema: match ? match.precio : 0
                    };
                });

                setFacturaEncontrada({
                    ...docData,
                    detalles: detallesEnriquecidos
                });
            }
        } catch (error) {
            console.error(error);
            showToast("Error al buscar", "error");
        } finally {
            setCargando(false);
        }
    };

    const handleGuardarAuditoria = async () => {
        if (!facturaEncontrada || !ordenEncontrada?.id) return;

        const fecha = new Date();
        const anio = fecha.getFullYear().toString();
        const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');

        setCargando(true);
        try {
            const batch = writeBatch(db);

            // 1. Referencias a los documentos de configuración (Año y Mes)
            const anioRef = doc(db, "laboratorio_auditoria", anio);
            const mesRef = doc(db, "laboratorio_auditoria", anio, "meses", mes);

            // 2. Referencia a la factura específica
            const docId = `${facturaEncontrada.folio}`;
            const facturaRef = doc(db, "laboratorio_auditoria", anio, "meses", mes, "facturas", docId);

            // Creamos (o mantenemos) el documento del año como activo
            batch.set(anioRef, { active: true }, { merge: true });

            // Creamos (o mantenemos) el documento del mes como activo
            batch.set(mesRef, { active: true, nombre: NOMBRES_MESES[mes] }, { merge: true });

            // Guardamos la factura con active: true
            const detallesConEstado = facturaEncontrada.detalles.map(det => ({
                ...det,
                active: true
            }));

            batch.set(facturaRef, {
                folio: facturaEncontrada.folio,
                fechaFolio: facturaEncontrada.fchEmis,
                orden: ordenEncontrada.id,
                totalFactura: facturaEncontrada.total,
                empresa: facturaEncontrada.rznSoc,
                active: true, // Campo en la factura
                detalles: detallesConEstado,
                fechaAuditoria: serverTimestamp()
            });

            await batch.commit();
            showToast("Auditoría guardada con éxito", "success");
            setModoAuditoria(false);
        } catch (error) {
            console.error("Error al guardar:", error);
            showToast("Error: " + error.message, "error");
        } finally {
            setCargando(false);
        }
    };

    const handleVerDetalle = (auditoria) => {
        setModoAuditoria(false); // IMPORTANTE: desactivar el modo de creación
        setAuditoriaSeleccionada(auditoria);
    };

    const cargarAuditorias = async () => {
        if (!filtroAnio || !filtroMes) return;
        setCargando(true);
        try {
            const colRef = collection(db, "laboratorio_auditoria", filtroAnio, "meses", filtroMes, "facturas");
            const snap = await getDocs(colRef);
            setListaAuditorias(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (e) {
            console.error(e);
            showToast("Error al cargar auditorías", "error");
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        const cargarAnios = async () => {
            try {
                const snap = await getDocs(collection(db, "laboratorio_auditoria"));
                const anios = snap.docs.map(doc => doc.id).sort((a, b) => b - a);
                setAniosDisponibles(anios);
            } catch (e) { console.error("Error al cargar años", e); }
        };
        cargarAnios();
    }, []);

    // 2. Cargar meses cuando el año cambia
    useEffect(() => {
        const cargarMeses = async () => {
            if (!filtroAnio) {
                setMesesDisponibles([]);
                return;
            }
            try {
                const snap = await getDocs(collection(db, "laboratorio_auditoria", filtroAnio, "meses"));
                const meses = snap.docs.map(doc => doc.id).sort();
                setMesesDisponibles(meses);
            } catch (e) { console.error("Error al cargar meses", e); }
        };
        cargarMeses();
        setFiltroMes(""); // Resetear mes al cambiar año
    }, [filtroAnio]);

    // 3. Cargar auditorías cuando cambian los filtros
    useEffect(() => {
        if (filtroAnio && filtroMes) {
            cargarAuditorias();
        } else {
            setListaAuditorias([]);
        }
    }, [filtroAnio, filtroMes]);

    return (
        <div className="w-full h-full flex flex-col bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden p-0 relative">

            {/* FILA 1: TÍTULO */}
            <h2 className="text-[14px] font-bold text-gray-700 p-4 flex items-center gap-2 border-b border-gray-200">
                <ShieldCheck size={16} className="text-[#0E5B6D]" /> AUDITORÍA DE FACTURAS
            </h2>

            {/* FILA 2: BOTÓN ACCIÓN O BUSCADOR */}
            <div className="p-4 border-b border-gray-200 bg-gray-50/50">
                {!modoAuditoria ? (
                    <button onClick={() => setModoAuditoria(true)} className="bg-[#0E5B6D] text-white px-3 py-1 rounded text-[11px] font-bold flex items-center gap-1 hover:bg-[#0a4856]">
                        <Plus size={12} /> Añadir Auditoría
                    </button>
                ) : (
                    <div className="flex gap-2 items-center">
                        {/* Buscador de Folio */}
                        <input
                            type="text"
                            value={folioInput}
                            onChange={(e) => setFolioInput(e.target.value)}
                            placeholder="Folio..."
                            className="h-8 w-32 border border-gray-300 rounded px-3 text-[12px] outline-none"
                        />
                        <button onClick={handleBuscarFolio} className="bg-[#0E5B6D] text-white px-3 py-1 rounded text-[11px] font-bold hover:bg-[#0a4856]">
                            Buscar Folio
                        </button>

                        {/* Buscador de Orden */}
                        <div className="h-6 w-px bg-gray-300 mx-2"></div>
                        <input
                            type="text"
                            value={ordenInput} // IMPORTANTE: faltaba asignar el value
                            onChange={(e) => setOrdenInput(e.target.value)}
                            placeholder="Orden..."
                            className="h-8 w-32 border border-gray-300 rounded px-3 text-[12px] outline-none"
                        />
                        <button
                            onClick={handleBuscarOrden} // ESTO ES LO QUE FALTABA
                            className="bg-[#0E5B6D] text-white px-3 py-1 rounded text-[11px] font-bold hover:bg-[#0a4856]"
                        >
                            Buscar Orden
                        </button>

                        <button onClick={() => {
                            setModoAuditoria(false);
                            setFacturaEncontrada(null);
                            setOrdenEncontrada(null); // Limpiamos también la orden
                        }} className="text-gray-500 hover:text-red-600 p-1 ml-2">
                            <X size={18} />
                        </button>
                    </div>
                )}
            </div>

            {/* FILA 3: FILTROS Y BUSCADOR (Siempre presentes, se esconden solo en modo auditoría si prefieres, o se mantienen) */}
            {!modoAuditoria && (
                <div className="bg-gray-50 p-3 flex flex-wrap gap-2 items-center border-b border-gray-200">
                    <select
                        value={filtroAnio}
                        onChange={(e) => setFiltroAnio(e.target.value)}
                        className="h-8 border border-gray-300 rounded text-[12px] px-2 outline-none"
                    >
                        <option value="">Seleccione Año</option>
                        {aniosDisponibles.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>

                    <select
                        value={filtroMes}
                        onChange={(e) => setFiltroMes(e.target.value)}
                        disabled={!filtroAnio}
                        className="h-8 border border-gray-300 rounded text-[12px] px-2 outline-none capitalize"
                    >
                        <option value="">Seleccione Mes</option>
                        {mesesDisponibles.map((mes) => (
                            <option key={mes} value={mes}>
                                {NOMBRES_MESES[mes] || mes}
                            </option>
                        ))}
                    </select>

                    <div className="relative flex-grow max-w-sm">
                        <Search className="absolute left-2 top-2 text-gray-400" size={14} />
                        <input
                            value={busqueda}
                            onChange={e => setBusqueda(e.target.value)}
                            className="w-full h-8 pl-8 pr-2 border border-gray-300 rounded text-[12px] outline-none"
                            placeholder="Buscar..."
                        />
                    </div>
                </div>
            )}

            {/* FILA 4: TABLA (Cambia según el estado) */}
            <div className="flex-grow overflow-auto">
                {!modoAuditoria ? (
                    <table className="w-full text-left text-[12px] border-collapse">
                        <thead className="bg-gray-100 sticky top-0">
                            <tr className="text-gray-600 uppercase font-bold text-[11px]">
                                <th className="p-3 border-b border-r border-gray-200">Folio</th>
                                <th className="p-3 border-b border-r border-gray-200">Fecha Folio</th>
                                <th className="p-3 border-b border-r border-gray-200">Orden</th>
                                <th className="p-3 border-b border-r border-gray-200">Total Factura</th>
                                <th className="p-3 border-b border-r border-gray-200">Estado</th>
                                <th className="p-3 border-b border-gray-200 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {listaAuditorias.map((aud) => (
                                <tr key={aud.id} className="border-b hover:bg-gray-50">
                                    <td className="p-3 text-gray-700 font-medium">{aud.folio}</td>
                                    <td className="p-3 text-gray-600">{aud.fechaFolio}</td>
                                    <td className="p-3 text-gray-600">{aud.orden}</td>
                                    <td className="p-3 text-gray-700 font-bold">
                                        ${parseFloat(aud.totalFactura || 0).toLocaleString()}
                                    </td>
                                    <td className="p-3">
                                        <span className="text-[10px] bg-green-100 text-green-700 px-2 py-1 rounded-full font-bold">
                                            AUDITADO
                                        </span>
                                    </td>
                                    <td className="p-3 text-center">
                                        {/* AQUÍ ES DONDE DEBE IR TU CÓDIGO */}
                                        <button
                                            onClick={() => handleVerDetalle(aud)}
                                            className="text-[#0E5B6D] hover:underline text-[11px] font-bold"
                                        >
                                            Ver Detalle
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {listaAuditorias.length === 0 && (
                                <tr>
                                    <td colSpan="6" className="p-4 text-center text-gray-400 text-[12px]">
                                        No hay auditorías registradas para este periodo.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                ) : (
                    /* TABLA DE AUDITORÍA (Detalles) */
                    facturaEncontrada && (
                        <div className="p-4">
                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4 text-[12px]">
                                <div className="grid grid-cols-4 gap-4 font-bold text-gray-700">
                                    <p>Folio: <span className="font-normal text-gray-500">{facturaEncontrada.folio}</span></p>
                                    <p>Fecha: <span className="font-normal text-gray-500">{facturaEncontrada.fchEmis}</span></p>
                                    <p>Empresa: <span className="font-normal text-gray-500">{facturaEncontrada.rznSoc}</span></p>
                                    <p>Total: <span className="font-normal text-gray-500">$ {parseInt(facturaEncontrada.total || 0).toLocaleString()}</span></p>
                                </div>
                                {ordenEncontrada && (
                                    <div className="mt-4 pt-4 border-t border-gray-200 flex justify-end">
                                        <button
                                            onClick={handleGuardarAuditoria}
                                            className="bg-green-600 text-white px-4 py-2 rounded font-bold hover:bg-green-700 text-[12px] flex items-center gap-2 shadow-sm transition-all"
                                        >
                                            <ShieldCheck size={14} /> Guardar Auditoría
                                        </button>
                                    </div>
                                )}
                            </div>
                            <table className="w-full text-left text-[12px] border-collapse">
                                <thead className="bg-gray-100 sticky top-0">
                                    <tr className="text-[10px] text-gray-600 uppercase font-bold">
                                        <th className="p-2 border border-gray-200">Ref (Factura)</th>
                                        <th className="p-2 border border-gray-200">Cant (Factura)</th>
                                        <th className="p-2 border border-gray-200">Precio (Factura)</th>
                                        <th className="p-2 border border-gray-200 bg-blue-50">Cód. Sistema</th>
                                        <th className="p-2 border border-gray-200 bg-blue-50">Precio Sistema</th>
                                        {ordenEncontrada && (
                                            <>
                                                <th className="p-2 border border-gray-200 bg-green-50 text-green-800">Cant. Orden</th>
                                                <th className="p-2 border border-gray-200 bg-green-50 text-green-800">Precio Orden</th>
                                                <th className="p-2 border border-gray-200 bg-red-50 text-red-800">Dif. Cant.</th>
                                                <th className="p-2 border border-gray-200 bg-red-50 text-red-800">Dif. Precio</th>
                                            </>
                                        )}
                                    </tr>
                                </thead>
                                <tbody>


                                    {facturaEncontrada.detalles?.map((det, idx) => {
                                        // 1. Normalización de datos
                                        const codSistema = String(det.codigoSistema || "").trim().toUpperCase();

                                        // 2. Búsqueda en la orden
                                        const itemOrden = ordenEncontrada?.items.find(i => {
                                            const codOrden = String(i["Cod.Artículo"] || "").trim().toUpperCase();
                                            return codOrden === codSistema;
                                        });

                                        // 3. Extracción de valores para comparación
                                        const cantFactura = parseInt(det.cantidad || 0);
                                        const cantOrden = itemOrden ? parseInt(itemOrden["Cant."] || itemOrden["Cantidad"] || 0) : 0;

                                        const precioFactura = parseFloat(det.precio || 0);
                                        const precioOrden = itemOrden ? parseFloat(itemOrden["P.Unitario"] || itemOrden["Precio"] || 0) : 0;

                                        // 4. Cálculo de diferencias
                                        const diffCant = cantFactura - cantOrden;
                                        const diffPrecio = precioFactura - precioOrden;

                                        // 5. Flags de alerta (Tolerancia de 1 para el precio)
                                        const hayDifCant = itemOrden && diffCant !== 0;
                                        const hayDifPrecio = itemOrden && Math.abs(diffPrecio) > 1;

                                        return (
                                            <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                                                <td className="p-2">{det.codigo}</td>
                                                <td className="p-2">{det.cantidad}</td>
                                                <td className="p-2">${parseFloat(det.precio || 0).toLocaleString()}</td>
                                                <td className="p-2 font-bold text-blue-700">{det.codigoSistema}</td>
                                                <td className="p-2 font-bold text-blue-700">${parseFloat(det.precioSistema || 0).toLocaleString()}</td>

                                                {ordenEncontrada && (
                                                    <>
                                                        {/* Cantidad Orden */}
                                                        <td className="p-2 font-bold text-green-700">
                                                            {itemOrden ? cantOrden : "-"}
                                                        </td>

                                                        {/* Precio Orden */}
                                                        <td className="p-2 font-bold text-green-700">
                                                            {itemOrden ? `$${precioOrden.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "-"}
                                                        </td>

                                                        {/* Diferencia Cantidad */}
                                                        <td className={`p-2 font-bold ${hayDifCant ? 'text-red-600 bg-red-50' : 'text-gray-400'}`}>
                                                            {itemOrden ? (diffCant === 0 ? "OK" : diffCant) : "-"}
                                                        </td>

                                                        {/* Diferencia Precio (Tolerancia <= 1) */}
                                                        <td className={`p-2 font-bold ${hayDifPrecio ? 'text-red-600 bg-red-50' : 'text-gray-400'}`}>
                                                            {itemOrden ? (Math.abs(diffPrecio) <= 1 ? "OK" : `$${diffPrecio.toLocaleString(undefined, { minimumFractionDigits: 2 })}`) : "-"}
                                                        </td>
                                                    </>
                                                )}
                                            </tr>
                                        );
                                    })}


                                </tbody>
                            </table>
                        </div>
                    )
                )}
            </div>

            {cargando && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/70 backdrop-blur-sm">
                    <Spinner size="md" />
                </div>
            )}
        </div>
    );
};

const NOMBRES_MESES = {
    "01": "Enero", "02": "Febrero", "03": "Marzo", "04": "Abril",
    "05": "Mayo", "06": "Junio", "07": "Julio", "08": "Agosto",
    "09": "Septiembre", "10": "Octubre", "11": "Noviembre", "12": "Diciembre"
};

export default AuditoriaFacturas;