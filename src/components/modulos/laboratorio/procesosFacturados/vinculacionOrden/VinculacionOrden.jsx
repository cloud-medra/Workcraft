// src/components/modulos/laboratorio/procesosFacturados/vinculacionOrden/VinculacionOrden.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
    collection,
    getDocs,
    doc,
    updateDoc,
    addDoc,
    serverTimestamp,
    collectionGroup,
    query,
    where
} from 'firebase/firestore';
import { db, auth } from '../../../../../firebaseConfig';
import {
    ClipboardList,
    Search,
    RefreshCw,
    Eye
} from 'lucide-react';
import { useToast } from '../../../../../context/ToastContext';
import { useModal } from '../../../../../context/ModalContext';
import { useGranularPermission } from '../../../../../hooks/useGranularPermission';
import DetalleVinculacionOC from './DetalleVinculacionOC';

const VinculacionOrden = () => {
    const [facturas, setFacturas] = useState([]);
    const [aniosDisponibles, setAniosDisponibles] = useState([]);
    const [busqueda, setBusqueda] = useState('');
    const [filtroAnio, setFiltroAnio] = useState('');
    const [loading, setLoading] = useState(false);

    // Estado para la factura seleccionada
    const [facturaSeleccionada, setFacturaSeleccionada] = useState(null);

    const { showToast } = useToast();
    const { confirmAction } = useModal();
    const { hasPermission } = useGranularPermission();

    const PATH_VISTA = "/laboratorio/controlFactura";
    const COL_BASE = "laboratorio_facturasXml";

    // Formatear fecha dd/mm/yyyy
    const formatearFechaEmision = (fechaStr) => {
        if (!fechaStr) return '';
        const partes = fechaStr.replace(/-/g, '/').split('/');
        if (partes.length === 3) {
            const [anio, mes, dia] = partes;
            if (anio.length === 4) return `${dia}/${mes}/${anio}`;
        }
        return fechaStr;
    };

    // Helper para formatear el Mes Imputado o el mesId (ej: "01_enero" -> "Enero")
    const formatearMesImputado = (valMes) => {
        if (!valMes) return '-';
        if (typeof valMes === 'string' && valMes.includes('_')) {
            const partes = valMes.split('_');
            const nombreMes = partes[1] || partes[0];
            return nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1);
        }
        return valMes;
    };

    // Helper para parsear fecha al ordenar
    const parseFecha = (fechaStr) => {
        if (!fechaStr) return 0;
        if (fechaStr.includes('/')) {
            const [d, m, y] = fechaStr.split('/');
            return new Date(`${y}-${m}-${d}`).getTime() || 0;
        }
        return new Date(fechaStr).getTime() || 0;
    };

    // Cargar Años Disponibles
    useEffect(() => {
        const cargarAnios = async () => {
            try {
                const snap = await getDocs(collection(db, COL_BASE));
                const anios = snap.docs.map(d => d.id).sort((a, b) => b - a);
                setAniosDisponibles(anios);

                if (anios.length > 0) {
                    setFiltroAnio(prev => prev || anios[0]);
                }
            } catch (error) {
                console.error("Error al cargar años:", error);
            }
        };
        cargarAnios();
    }, []);

    const cargarFacturasProcesarOC = useCallback(async () => {
        if (!filtroAnio) {
            setFacturas([]);
            return;
        }

        setLoading(true);
        try {
            // Obtenemos todos los documentos del grupo sin el filtro 'where' inicial
            // para poder filtrar ambos estados manualmente
            const q = query(collectionGroup(db, "documentos"));

            const querySnapshot = await getDocs(q);
            const docsAcumulados = [];
            const estadosPermitidos = ["Procesar OC", "Solicitud Enviada"];

            querySnapshot.forEach((d) => {
                const data = d.data();
                const pathSegments = d.ref.path.split('/');
                const coleccionRaiz = pathSegments[0];
                const anioDoc = pathSegments[1];
                const mesId = pathSegments[3];

                // Filtramos por año, colección base Y los estados permitidos
                if (
                    coleccionRaiz === COL_BASE &&
                    anioDoc === filtroAnio &&
                    estadosPermitidos.includes(data.estado)
                ) {
                    docsAcumulados.push({
                        id: d.id,
                        mesId,
                        ...data
                    });
                }
            });

            docsAcumulados.sort((a, b) => parseFecha(b.fchEmis) - parseFecha(a.fchEmis));
            setFacturas(docsAcumulados);
        } catch (error) {
            console.error("Error al cargar facturas:", error);
            showToast("Error al obtener las facturas pendientes", "error");
        } finally {
            setLoading(false);
        }
    }, [filtroAnio, showToast]);

    // Reinicia la selección SOLO cuando cambia el año filtrado
    useEffect(() => {
        setFacturaSeleccionada(null);
    }, [filtroAnio]);

    // Carga las facturas cuando cambia el año (o cuando cambia la función por deps internas)
    useEffect(() => {
        cargarFacturasProcesarOC();
    }, [cargarFacturasProcesarOC]);

    // Selección y navegación
    const handleVerDetalles = (factura) => setFacturaSeleccionada(factura);
    const handleVolverALista = () => setFacturaSeleccionada(null);

    const handleVincularOrdenCompra = ({ ordenCompra, detallesActualizados, estadoGeneral }) => {
        if (!facturaSeleccionada) return;

        const folioOC = ordenCompra?.folioCalculado || ordenCompra?.folio || ordenCompra?.id || "N/A";
        const estadoFinal = estadoGeneral || "Diferencia Reportada";

        confirmAction(
            "Confirmar Vinculación de OC",
            `¿Desea cruzar los ítems de la factura con la Orden de Compra N° ${folioOC}?`,
            async () => {
                try {
                    const currentUser = auth.currentUser;
                    const usuarioInfo = {
                        uid: currentUser?.uid || "desconocido",
                        email: currentUser?.email || "usuario_anonimo",
                        nombre: currentUser?.displayName || currentUser?.email?.split('@')[0] || "Usuario"
                    };

                    const ahora = new Date();
                    const fechaHoraString = ahora.toLocaleString('es-CL');

                    const docRef = doc(
                        db,
                        COL_BASE,
                        filtroAnio,
                        "meses",
                        facturaSeleccionada.mesId,
                        "documentos",
                        facturaSeleccionada.id
                    );

                    await updateDoc(docRef, {
                        detalles: detallesActualizados,
                        estado: estadoFinal,
                        ordenCompraVinculada: {
                            id: ordenCompra?.id || null,
                            folio: folioOC,
                            fechaVinculacion: fechaHoraString
                        }
                    });

                    try {
                        const logsRef = collection(docRef, "logs");
                        await addDoc(logsRef, {
                            accion: "VINCULACION_OC",
                            detalle: `Cruce de ítems con OC N° ${folioOC} sobre folio ${facturaSeleccionada.folio || facturaSeleccionada.id} — Resultado: ${estadoFinal}`,
                            fechaHora: fechaHoraString,
                            timestamp: serverTimestamp(),
                            usuario: usuarioInfo,
                            ocVinculadaId: ordenCompra?.id || null,
                            estadoResultante: estadoFinal
                        });
                    } catch (logError) {
                        console.error("Error al registrar log de OC:", logError);
                    }

                    showToast(`Ítems cruzados con la OC N° ${folioOC} — ${estadoFinal}`, "success");

                    // Remover la factura procesada de la lista activa
                    setFacturas(prev => prev.filter(f => f.id !== facturaSeleccionada.id));
                    // (ya no volvemos automáticamente — el usuario decide con la flecha "Volver")
                } catch (error) {
                    console.error("Error al cruzar Orden de Compra:", error);
                    showToast("Error al procesar el cruce con la Orden de Compra", "error");
                }
            }
        );
    };

    // Búsqueda segura
    const busquedaLower = busqueda.trim().toLowerCase();
    const facturasFiltradas = facturas.filter(f => {
        if (!busquedaLower) return true;
        const folioStr = String(f.folio || '').toLowerCase();
        const rznSocStr = String(f.rznSoc || '').toLowerCase();
        const folioRefStr = String(f.folioRef || '').toLowerCase();
        const mesStr = String(f.mesImputado || f.mesId || '').toLowerCase();

        return folioStr.includes(busquedaLower) ||
            rznSocStr.includes(busquedaLower) ||
            folioRefStr.includes(busquedaLower) ||
            mesStr.includes(busquedaLower);
    });

    const renderBadgeEstadoGeneral = (estado) => {
        const estilos = {
            "Procesar OC": "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50",
            "Solicitud Enviada": "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/50", // Nuevo estilo
            "Listo para Ingreso": "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800/50",
            "Diferencia Reportada": "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800/50",
            "Rechazada": "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border-red-200 dark:border-red-800/50",
        };

        // Si el estado no existe en la lista, usamos uno por defecto (grey)
        const clase = estilos[estado] || "bg-gray-100 text-gray-800 border-gray-200";

        return (
            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold border ${clase}`}>
                {estado || 'Sin Estado'}
            </span>
        );
    };

    return (
        <div className="w-full h-full flex flex-col bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-lg shadow-xs overflow-hidden p-0 relative font-sans">

            {/* VISTA DETALLE O VISTA TABLA */}
            {facturaSeleccionada ? (
                <DetalleVinculacionOC
                    factura={facturaSeleccionada}
                    onVolver={handleVolverALista}
                    onVincular={handleVincularOrdenCompra}
                    formatearFechaEmision={formatearFechaEmision}
                    renderBadgeEstadoGeneral={renderBadgeEstadoGeneral}
                />
            ) : (
                <>
                    {/* CABECERA */}
                    <header className="bg-white dark:bg-gray-800 border-b border-slate-200 dark:border-gray-700 px-3 py-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <ClipboardList size={16} className="text-[#2383C2]" />
                            <span className="text-[12px] font-normal text-slate-800 dark:text-gray-100 tracking-wide uppercase">
                                Vinculación de Orden de Compra (Facturas Lista para OC)
                            </span>
                        </div>
                    </header>

                    {/* FILTROS Y BÚSQUEDA */}
                    <div className="bg-slate-100/70 dark:bg-gray-800/40 p-1.5 flex flex-wrap gap-1.5 items-center justify-between border-b border-slate-200 dark:border-gray-700">
                        <div className="flex flex-wrap gap-1.5 items-center flex-grow">
                            {hasPermission(PATH_VISTA, "filtros_busqueda", "select_anio") && (
                                <select
                                    value={filtroAnio}
                                    onChange={(e) => setFiltroAnio(e.target.value)}
                                    className="h-6 border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-slate-800 dark:text-gray-100 rounded text-[11px] px-1.5 outline-none focus:border-[#2383C2]"
                                >
                                    <option value="">Seleccionar Año</option>
                                    {aniosDisponibles.map((a, idx) => (
                                        <option key={`anio-${a}-${idx}`} value={a}>{a}</option>
                                    ))}
                                </select>
                            )}

                            {hasPermission(PATH_VISTA, "filtros_busqueda", "input_busqueda") && (
                                <div className="relative flex-grow max-w-xs">
                                    <Search className="absolute left-2 top-1.5 text-slate-400 dark:text-gray-500" size={12} />
                                    <input
                                        value={busqueda}
                                        onChange={e => setBusqueda(e.target.value)}
                                        className="w-full h-6 pl-7 pr-2 border border-slate-300 dark:border-gray-600 rounded text-[11px] outline-none bg-white dark:bg-gray-900 text-slate-800 dark:text-gray-100 focus:border-[#2383C2]"
                                        placeholder="Buscar por Folio, Ref, Mes o Razón Social..."
                                    />
                                </div>
                            )}
                        </div>

                        <button
                            onClick={cargarFacturasProcesarOC}
                            disabled={!filtroAnio || loading}
                            className="h-6 px-2 rounded text-[11px] font-medium bg-white dark:bg-gray-800 border border-slate-300 dark:border-gray-600 text-slate-700 dark:text-gray-200 hover:bg-slate-50 dark:hover:bg-gray-700 flex items-center gap-1 transition-colors disabled:opacity-50"
                            title="Recargar datos"
                        >
                            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
                            <span>Actualizar</span>
                        </button>
                    </div>

                    {/* TABLA PRINCIPAL */}
                    {hasPermission(PATH_VISTA, "tabla_facturas") && (
                        <div className="flex-grow overflow-auto">
                            {loading ? (
                                <div className="w-full h-40 flex items-center justify-center text-xs text-slate-500 dark:text-gray-400">
                                    Cargando facturas en estado "Procesar OC" del año {filtroAnio}...
                                </div>
                            ) : (
                                <table className="w-full text-left text-[11px] border-collapse table-fixed min-w-[950px]">
                                    <thead className="bg-slate-100 dark:bg-gray-900/80 sticky top-0 z-10">
                                        <tr className="text-slate-600 dark:text-gray-400 uppercase font-normal text-[10px] tracking-wider">
                                            <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700 w-[10%]">Folio</th>
                                            <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700 w-[10%]">Emisión</th>
                                            <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700 w-[12%]">Mes Imputado</th>
                                            <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700 w-[10%]">Ref.</th>
                                            <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700 w-[27%]">Razón Social</th>
                                            <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700 w-[12%] text-right">Total (Neto)</th>
                                            <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700 w-[12%] text-center">Estado</th>
                                            <th className="px-2 py-1.5 border-b border-slate-200 dark:border-gray-700 w-[7%] text-center">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200/60 dark:divide-gray-700/50 bg-white dark:bg-gray-800">
                                        {facturasFiltradas.length === 0 ? (
                                            <tr>
                                                <td colSpan="8" className="px-3 py-6 text-center text-slate-400 dark:text-gray-500 text-xs">
                                                    {filtroAnio
                                                        ? "No hay facturas listas para Orden de Compra (Procesar OC) en este año."
                                                        : "Seleccione un año para visualizar las facturas."}
                                                </td>
                                            </tr>
                                        ) : (
                                            facturasFiltradas.map((f) => (
                                                <tr
                                                    key={f.id}
                                                    onDoubleClick={() => handleVerDetalles(f)}
                                                    className="border-l-2 border-transparent hover:border-[#2383C2] hover:bg-gray-50/80 dark:hover:bg-gray-700/40 transition-colors cursor-pointer"
                                                    title="Doble clic para ver el detalle"
                                                >
                                                    <td className="px-2 py-1 border-b border-r border-slate-200/60 dark:border-gray-700/70 font-normal text-slate-800 dark:text-gray-100 truncate">
                                                        {f.folio}
                                                    </td>
                                                    <td className="px-2 py-1 border-b border-r border-slate-200/60 dark:border-gray-700/70 text-slate-600 dark:text-gray-400 whitespace-nowrap">
                                                        {formatearFechaEmision(f.fchEmis)}
                                                    </td>
                                                    <td className="px-2 py-1 border-b border-r border-slate-200/60 dark:border-gray-700/70 text-slate-700 dark:text-gray-300 whitespace-nowrap font-medium">
                                                        {formatearMesImputado(f.mesImputado || f.mesId)}
                                                    </td>
                                                    <td className="px-2 py-1 border-b border-r border-slate-200/60 dark:border-gray-700/70 text-slate-600 dark:text-gray-400 truncate">
                                                        {f.folioRef}
                                                    </td>
                                                    <td className="px-2 py-1 border-b border-r border-slate-200/60 dark:border-gray-700/70 text-slate-700 dark:text-gray-300 truncate" title={f.rznSoc}>
                                                        {f.rznSoc}
                                                    </td>
                                                    <td className="px-2 py-1 border-b border-r border-slate-200/60 dark:border-gray-700/70 text-slate-800 dark:text-gray-100 font-normal text-right whitespace-nowrap">
                                                        ${parseInt(f.total || 0, 10).toLocaleString('es-CL')}
                                                    </td>
                                                    <td className="px-2 py-1 border-b border-r border-slate-200/60 dark:border-gray-700/70 text-center whitespace-nowrap">
                                                        {renderBadgeEstadoGeneral(f.estado)}
                                                    </td>
                                                    <td className="px-2 py-1 border-b border-slate-200/60 dark:border-gray-700/70 text-center whitespace-nowrap">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleVerDetalles(f);
                                                            }}
                                                            className="p-1 text-slate-500 hover:text-[#2383C2] dark:text-gray-400 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-gray-700 rounded transition-colors"
                                                            title="Visualizar factura"
                                                        >
                                                            <Eye size={14} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default VinculacionOrden;