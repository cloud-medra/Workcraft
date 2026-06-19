import React, { useState } from 'react';
import { Search, ShieldCheck, Plus, X } from 'lucide-react';
import { query, collectionGroup, where, getDocs, collection, getDocs as getDocsSimple } from 'firebase/firestore';
import { db } from '../../../../firebaseConfig';
import { useToast } from '../../../../context/ToastContext';
import Spinner from '../../../ui/Spinner';

const AuditoriaFacturas = () => {
    const [modoAuditoria, setModoAuditoria] = useState(false);
    const [folioInput, setFolioInput] = useState('');
    const [facturaEncontrada, setFacturaEncontrada] = useState(null);

    // Estados para la tabla principal
    const [filtroAnio, setFiltroAnio] = useState("");
    const [filtroMes, setFiltroMes] = useState("");
    const [busqueda, setBusqueda] = useState('');
    const [cargando, setCargando] = useState(false);

    const { showToast } = useToast();

    const [ordenInput, setOrdenInput] = useState('');
    const [ordenEncontrada, setOrdenEncontrada] = useState(null);

    // AuditoriaFacturas.jsx

    const handleBuscarOrden = async () => {
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
                setOrdenEncontrada({ ...ordenDoc.data(), items: itemsOrden });
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
                    <select value={filtroAnio} onChange={(e) => setFiltroAnio(e.target.value)} className="h-8 border border-gray-300 rounded text-[12px] px-2 outline-none">
                        <option value="">Año</option>
                    </select>
                    <select value={filtroMes} onChange={(e) => setFiltroMes(e.target.value)} className="h-8 border border-gray-300 rounded text-[12px] px-2 outline-none capitalize">
                        <option value="">Mes</option>
                    </select>
                    <div className="relative flex-grow max-w-sm">
                        <Search className="absolute left-2 top-2 text-gray-400" size={14} />
                        <input value={busqueda} onChange={e => setBusqueda(e.target.value)} className="w-full h-8 pl-8 pr-2 border border-gray-300 rounded text-[12px] outline-none" placeholder="Buscar..." />
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
                        <tbody>{/* Datos de auditorías previas */}</tbody>
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
                                            </>
                                        )}
                                    </tr>
                                </thead>
                                <tbody>


                                    {facturaEncontrada.detalles?.map((det, idx) => {
                                        // 1. Normalizamos a string, quitamos espacios y convertimos a minúsculas
                                        const codFactura = String(det.codigo || "").trim();

                                        const codSistema = String(det.codigoSistema || "").trim().toUpperCase();  // ✅ usa el código ya enriquecido

                                        const itemOrden = ordenEncontrada?.items.find(i => {
                                            const codOrden = String(i["Cod.Artículo"] || "").trim().toUpperCase();
                                            return codOrden === codSistema;
                                        });

                                        // 2. Extraemos valores buscando los nombres de campos que confirmaste en consola
                                        // Buscamos "Cant." o "Cantidad"
                                        const valCant = itemOrden ? (itemOrden["Cant."] || itemOrden["Cantidad"] || null) : null;

                                        // Buscamos "P.Unitario" o "Precio"
                                        const valPrecio = itemOrden ? (itemOrden["P.Unitario"] || itemOrden["Precio"] || null) : null;

                                        const precioFactura = parseFloat(det.precio || 0);
                                        const precioOrdenNum = valPrecio !== null ? parseFloat(valPrecio) : null;

                                        // Discrepancia: Solo si encontramos precio y es distinto
                                        const esPrecioDiferente = precioOrdenNum !== null && Math.abs(precioOrdenNum - precioFactura) > 0.01;

                                        return (
                                            <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                                                <td className="p-2">{det.codigo}</td>
                                                <td className="p-2">{det.cantidad}</td>
                                                <td className="p-2">${parseFloat(det.precio || 0).toLocaleString()}</td>
                                                <td className="p-2 font-bold text-blue-700">{det.codigoSistema}</td>
                                                <td className="p-2 font-bold text-blue-700">${parseFloat(det.precioSistema || 0).toLocaleString()}</td>

                                                {ordenEncontrada && (
                                                    <>
                                                        <td className="p-2 font-bold text-green-700">
                                                            {valCant !== null ? valCant : "-"}
                                                        </td>
                                                        <td className={`p-2 font-bold ${esPrecioDiferente ? 'text-red-600' : 'text-green-700'}`}>
                                                            {precioOrdenNum !== null ? `$${precioOrdenNum.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "-"}
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

export default AuditoriaFacturas;