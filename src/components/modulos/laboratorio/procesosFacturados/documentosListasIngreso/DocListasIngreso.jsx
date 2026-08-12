// src/components/modulos/laboratorio/procesosFacturados/facturasListasIngreso/DocListasIngreso.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../../../../firebaseConfig';
import {
    CheckCircle2,
    Search,
    RefreshCw,
    Eye,
    AlertTriangle,
    DollarSign,
    FileText
} from 'lucide-react';
import { useToast } from '../../../../../context/ToastContext';
import { useModal } from '../../../../../context/ModalContext';
import { useGranularPermission } from '../../../../../hooks/useGranularPermission';
import DetalleListasIngreso from './DetalleListasIngreso';

const DocListasIngreso = () => {
    const [facturas, setFacturas] = useState([]);
    const [aniosDisponibles, setAniosDisponibles] = useState([]);
    const [busqueda, setBusqueda] = useState('');
    const [filtroAnio, setFiltroAnio] = useState('');
    const [loading, setLoading] = useState(false);

    const [facturaSeleccionada, setFacturaSeleccionada] = useState(null);

    const { showToast } = useToast();
    const { hasPermission } = useGranularPermission();

    const PATH_VISTA = "/laboratorio/controlFactura";
    const COL_BASE = "laboratorio_facturasXml";

    const ESTADOS_PERMITIDOS = [
        "Listo para Ingreso",
        "Listos para Ingreso",
        "Listo Para Ingreso"
    ];

    const formatearFechaEmision = (fechaStr) => {
        if (!fechaStr) return '';
        const partes = fechaStr.replace(/-/g, '/').split('/');
        if (partes.length === 3) {
            const [anio, mes, dia] = partes;
            if (anio.length === 4) {
                return `${dia}/${mes}/${anio}`;
            }
        }
        return fechaStr;
    };

    const obtenerMesImputacion = (factura) => {
        const valor = factura?.mesImputado || factura?.mes_imputado;
        if (!valor) return '—';

        if (typeof valor === 'string') {
            if (valor.includes('-')) {
                const [anio, mes] = valor.split('-');
                return `${mes}/${anio}`;
            }
            return valor;
        }

        const fecha = valor.toDate ? valor.toDate() : new Date(valor);
        if (isNaN(fecha.getTime())) return '—';

        return fecha.toLocaleDateString('es-CL', { month: '2-digit', year: 'numeric' });
    };

    useEffect(() => {
        const cargarAnios = async () => {
            try {
                const snap = await getDocs(collection(db, COL_BASE));
                const anios = snap.docs.map(d => d.id).sort((a, b) => b - a);
                setAniosDisponibles(anios);
            } catch (error) {
                console.error("Error al cargar años:", error);
            }
        };
        cargarAnios();
    }, []);

    const cargarFacturasListas = useCallback(async () => {
        if (!filtroAnio) {
            setFacturas([]);
            return;
        }

        setLoading(true);
        try {
            const mesesSnap = await getDocs(collection(db, COL_BASE, filtroAnio, "meses"));

            const promesasMeses = mesesSnap.docs.map(async (mesDoc) => {
                const mesId = mesDoc.id;
                const docsSnap = await getDocs(collection(db, COL_BASE, filtroAnio, "meses", mesId, "documentos"));

                return docsSnap.docs
                    .map(d => ({ id: d.id, mesId, anio: filtroAnio, ...d.data() }))
                    .filter(data => ESTADOS_PERMITIDOS.includes(data.estado));
            });

            const resultadosPorMes = await Promise.all(promesasMeses);
            const docsAcumulados = resultadosPorMes.flat();

            docsAcumulados.sort((a, b) => new Date(b.fchEmis || 0) - new Date(a.fchEmis || 0));
            setFacturas(docsAcumulados);
        } catch (error) {
            console.error("Error al cargar facturas listas para ingreso:", error);
            showToast("Error al obtener las facturas listas para ingreso", "error");
        } finally {
            setLoading(false);
        }
    }, [filtroAnio, showToast]);

    useEffect(() => {
        cargarFacturasListas();
    }, [cargarFacturasListas]);

    const handleVerDetalles = (factura) => setFacturaSeleccionada(factura);
    const handleVolverALista = () => setFacturaSeleccionada(null);

    const facturasFiltradas = useMemo(() => {
        const query = busqueda.toLowerCase().trim();
        if (!query) return facturas;
        return facturas.filter(f =>
            (f.folio && String(f.folio).toLowerCase().includes(query)) ||
            (f.rznSoc && f.rznSoc.toLowerCase().includes(query)) ||
            (f.folioRef && String(f.folioRef).toLowerCase().includes(query)) ||
            (f.rutEmisor && f.rutEmisor.toLowerCase().includes(query)) ||
            (f.estado && f.estado.toLowerCase().includes(query)) ||
            (f.mesImputado && String(f.mesImputado).toLowerCase().includes(query)) ||
            (f.mes_imputado && String(f.mes_imputado).toLowerCase().includes(query))
        );
    }, [facturas, busqueda]);

    const totalMontoListas = useMemo(() => {
        return facturasFiltradas.reduce((acc, f) => acc + (Math.round(Number(f.total) || 0)), 0);
    }, [facturasFiltradas]);

    const renderBadgeEstadoGeneral = (estado) => {
        return (
            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold border bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50">
                {estado || 'Listo para Ingreso'}
            </span>
        );
    };

    return (
        <div className="w-full h-full flex flex-col bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-lg shadow-xs overflow-hidden p-0 relative font-sans">
            {facturaSeleccionada ? (
                <DetalleListasIngreso
                    factura={facturaSeleccionada}
                    formatearFechaEmision={formatearFechaEmision}
                    renderBadgeEstadoGeneral={renderBadgeEstadoGeneral}
                    onVolver={handleVolverALista}
                    onActualizarFactura={(facturaActualizada) => {
                        setFacturas(prev =>
                            prev.map(f => (f.id === facturaActualizada.id ? { ...f, ...facturaActualizada } : f))
                        );
                        setFacturaSeleccionada(facturaActualizada);
                    }}
                />
            ) : (
                <>
                    <header className="bg-white dark:bg-gray-800 border-b border-slate-200 dark:border-gray-700 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800">
                                <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <div>
                                <h1 className="text-[12px] font-normal text-slate-800 dark:text-gray-100 uppercase tracking-wide">
                                    Facturas Listas para Ingreso
                                </h1>
                                <p className="text-[11px] text-slate-500 dark:text-gray-400">
                                    Gestión y seguimiento de facturas validadas y listas para su contabilización o ingreso final
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 text-xs">
                            <div className="px-2.5 py-1 rounded bg-slate-100 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 flex items-center gap-1.5">
                                <FileText size={13} className="text-slate-500" />
                                <span className="text-slate-600 dark:text-gray-400">Total Casos:</span>
                                <span className="font-semibold text-slate-800 dark:text-gray-200">{facturasFiltradas.length}</span>
                            </div>
                            <div className="px-2.5 py-1 rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-1.5">
                                <DollarSign size={13} className="text-emerald-600 dark:text-emerald-400" />
                                <span className="text-emerald-700 dark:text-emerald-300">Monto:</span>
                                <span className="font-semibold text-emerald-900 dark:text-emerald-200">
                                    ${totalMontoListas.toLocaleString('es-CL')}
                                </span>
                            </div>
                        </div>
                    </header>

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
                                        placeholder="Buscar por Folio, RUT, Ref, Estado..."
                                    />
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={cargarFacturasListas}
                                disabled={!filtroAnio || loading}
                                className="h-6 px-2 rounded text-[11px] font-medium bg-white dark:bg-gray-800 border border-slate-300 dark:border-gray-600 text-slate-700 dark:text-gray-200 hover:bg-slate-50 dark:hover:bg-gray-700 flex items-center gap-1 transition-colors disabled:opacity-50 cursor-pointer"
                                title="Recargar datos"
                            >
                                <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
                                <span>Actualizar</span>
                            </button>
                        </div>
                    </div>

                    {hasPermission(PATH_VISTA, "tabla_facturas") && (
                        <div className="flex-grow overflow-auto">
                            {loading ? (
                                <div className="w-full h-40 flex items-center justify-center text-xs text-slate-500 dark:text-gray-400 gap-2">
                                    <RefreshCw size={16} className="animate-spin text-emerald-500" />
                                    <span>Cargando facturas listas para ingreso del año {filtroAnio}...</span>
                                </div>
                            ) : (
                                <table className="w-full text-left text-[11px] border-collapse table-fixed min-w-[950px]">
                                    <thead className="bg-slate-100 dark:bg-gray-900/80 sticky top-0 z-10">
                                        <tr className="text-slate-600 dark:text-gray-400 uppercase font-normal text-[10px] tracking-wider">
                                            <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700 w-[10%]">Folio</th>
                                            <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700 w-[10%]">Emisión</th>
                                            <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700 w-[11%] text-center">Mes Imputación</th>
                                            <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700 w-[10%]">Ref. (OC)</th>
                                            <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700 w-[27%]">Razón Social</th>
                                            <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700 w-[12%] text-right">Total (Neto)</th>
                                            <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700 w-[12%] text-center">Estado</th>
                                            <th className="px-2 py-1.5 border-b border-slate-200 dark:border-gray-700 w-[8%] text-center">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200/60 dark:divide-gray-700/50 bg-white dark:bg-gray-800">
                                        {facturasFiltradas.length === 0 ? (
                                            <tr>
                                                <td colSpan="8" className="px-3 py-6 text-center text-slate-400 dark:text-gray-500 text-xs">
                                                    <div className="flex flex-col items-center gap-1.5">
                                                        <AlertTriangle size={18} className="text-slate-300 dark:text-gray-600" />
                                                        <span>
                                                            {filtroAnio
                                                                ? "No se encontraron registros en estado 'Listo para Ingreso' para este año."
                                                                : "Seleccione un año para visualizar las facturas."}
                                                        </span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            facturasFiltradas.map((f) => (
                                                <tr
                                                    key={f.id}
                                                    onDoubleClick={() => handleVerDetalles(f)}
                                                    className="border-l-2 border-transparent hover:border-emerald-500 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 transition-colors cursor-pointer"
                                                    title="Doble clic para ver el detalle"
                                                >
                                                    <td className="px-2 py-1 border-b border-r border-slate-200/60 dark:border-gray-700/70 font-normal text-slate-800 dark:text-gray-100 truncate">
                                                        #{f.folio}
                                                    </td>
                                                    <td className="px-2 py-1 border-b border-r border-slate-200/60 dark:border-gray-700/70 text-slate-600 dark:text-gray-400 whitespace-nowrap">
                                                        {formatearFechaEmision(f.fchEmis)}
                                                    </td>
                                                    <td className="px-2 py-1 border-b border-r border-slate-200/60 dark:border-gray-700/70 text-slate-700 dark:text-gray-300 text-center font-medium whitespace-nowrap">
                                                        {obtenerMesImputacion(f)}
                                                    </td>
                                                    <td className="px-2 py-1 border-b border-r border-slate-200/60 dark:border-gray-700/70 text-slate-600 dark:text-gray-400 truncate">
                                                        {f.folioRef || 'S/R'}
                                                    </td>
                                                    <td className="px-2 py-1 border-b border-r border-slate-200/60 dark:border-gray-700/70 text-slate-700 dark:text-gray-300 truncate" title={f.rznSoc}>
                                                        {f.rznSoc || 'Sin Razón Social'}
                                                    </td>
                                                    <td className="px-2 py-1 border-b border-r border-slate-200/60 dark:border-gray-700/70 text-slate-800 dark:text-gray-100 font-normal text-right whitespace-nowrap">
                                                        ${Math.round(Number(f.total || 0)).toLocaleString('es-CL')}
                                                    </td>
                                                    <td className="px-1 py-1 border-b border-r border-slate-200/60 dark:border-gray-700/70 text-center whitespace-nowrap">
                                                        {renderBadgeEstadoGeneral(f.estado)}
                                                    </td>
                                                    <td className="px-2 py-1 border-b border-slate-200/60 dark:border-gray-700/70 text-center whitespace-nowrap">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleVerDetalles(f);
                                                            }}
                                                            className="p-1 text-slate-500 hover:text-emerald-600 dark:text-gray-400 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-gray-700 rounded transition-colors"
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

export default DocListasIngreso;