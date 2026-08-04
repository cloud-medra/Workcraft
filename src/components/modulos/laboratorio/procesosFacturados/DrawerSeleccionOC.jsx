// src/components/facturas/DrawerSeleccionOC.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../../../firebaseConfig';
import {
    ListOrdered,
    X,
    Search,
    RefreshCw,
    Tag,
    Loader2
} from 'lucide-react';

const COL_ORDENES = "laboratorio_ordenes";

const NOMBRES_MESES = {
    '01': 'Enero', '1': 'Enero',
    '02': 'Febrero', '2': 'Febrero',
    '03': 'Marzo', '3': 'Marzo',
    '04': 'Abril', '4': 'Abril',
    '05': 'Mayo', '5': 'Mayo',
    '06': 'Junio', '6': 'Junio',
    '07': 'Julio', '7': 'Julio',
    '08': 'Agosto', '8': 'Agosto',
    '09': 'Septiembre', '9': 'Septiembre',
    '10': 'Octubre',
    '11': 'Noviembre',
    '12': 'Diciembre'
};

const DrawerSeleccionOC = ({
    panelAbierto,
    setPanelAbierto,
    ocSeleccionada,
    setOcSeleccionada,
    onConfirmar
}) => {
    const [aniosDisponibles, setAniosDisponibles] = useState([]);
    const [mesesDisponibles, setMesesDisponibles] = useState([]);
    const [loadingMeses, setLoadingMeses] = useState(false);

    const [anioOC, setAnioOC] = useState('');
    const [mesOC, setMesOC] = useState('');
    const [ordenes, setOrdenes] = useState([]);
    const [loadingOC, setLoadingOC] = useState(false);
    const [busquedaOC, setBusquedaOC] = useState('');

    // Para saber qué orden está cargando sus ítems al hacer clic
    const [cargandoItemsId, setCargandoItemsId] = useState(null);

    // 1. Cargar Años Disponibles al abrir el panel
    useEffect(() => {
        const cargarAniosOC = async () => {
            try {
                const snap = await getDocs(collection(db, COL_ORDENES));
                const anios = snap.docs.map(d => d.id).sort((a, b) => b - a);
                setAniosDisponibles(anios);

                if (anios.length > 0) {
                    setAnioOC(anios[0]);
                }
            } catch (error) {
                console.error("Error al cargar años de OC:", error);
            }
        };

        if (panelAbierto) {
            cargarAniosOC();
        }
    }, [panelAbierto]);

    // 2. Cargar Meses para el Año seleccionado
    useEffect(() => {
        const cargarMesesOC = async () => {
            if (!anioOC) {
                setMesesDisponibles([]);
                setMesOC('');
                return;
            }

            setLoadingMeses(true);
            try {
                const snap = await getDocs(collection(db, COL_ORDENES, String(anioOC), "meses"));

                const meses = snap.docs
                    .map(d => {
                        const rawId = d.id;
                        const padId = rawId.length === 1 ? `0${rawId}` : rawId;
                        return {
                            id: rawId,
                            nombre: NOMBRES_MESES[padId] || NOMBRES_MESES[rawId] || `Mes ${rawId}`
                        };
                    })
                    .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));

                setMesesDisponibles(meses);

                if (meses.length > 0) {
                    setMesOC(meses[meses.length - 1].id);
                } else {
                    setMesOC('');
                }
            } catch (error) {
                console.error("Error al cargar meses de OC:", error);
                setMesesDisponibles([]);
                setMesOC('');
            } finally {
                setLoadingMeses(false);
            }
        };

        if (panelAbierto && anioOC) {
            cargarMesesOC();
        }
    }, [anioOC, panelAbierto]);

    // 3. Cargar Órdenes de Compra (solo cabeceras, sin ítems todavía)
    const cargarOrdenes = useCallback(async () => {
        if (!anioOC || !mesOC) {
            setOrdenes([]);
            return;
        }

        setLoadingOC(true);
        try {
            const pathSubcoleccion = collection(db, COL_ORDENES, String(anioOC), "meses", String(mesOC), "ordenes");
            const docSnap = await getDocs(pathSubcoleccion);

            const lista = docSnap.docs.map(d => {
                const data = d.data();
                return {
                    id: d.id,
                    ...data,
                    folioCalculado: data["Nro.Orden"] || d.id,
                    proveedorCalculado: data["Proveedor"] || 'Sin Razón Social',
                    montoCalculado: data.totalOrden || 0,
                    fechaCalculada: data["F.Orden"] || 'N/A'
                };
            });

            lista.sort((a, b) => {
                const parse = (f) => {
                    const [d, m, y] = (f || '').split('/');
                    return new Date(`${y}-${m}-${d}`);
                };
                return parse(b.fechaCalculada) - parse(a.fechaCalculada);
            });

            setOrdenes(lista);
        } catch (error) {
            console.error("Error al cargar Órdenes de Compra:", error);
            setOrdenes([]);
        } finally {
            setLoadingOC(false);
        }
    }, [anioOC, mesOC]);

    useEffect(() => {
        if (panelAbierto && anioOC && mesOC) {
            cargarOrdenes();
        }
    }, [anioOC, mesOC, panelAbierto, cargarOrdenes]);

    // 4. Al seleccionar una orden, traer recién ahí sus ítems reales
    //    desde la subcolección: laboratorio_ordenes/{año}/meses/{mes}/ordenes/{nro}/documentos
    const handleSeleccionarOrden = useCallback(async (oc) => {
        setCargandoItemsId(oc.id);
        try {
            const pathDocumentos = collection(
                db,
                COL_ORDENES,
                String(anioOC),
                "meses",
                String(mesOC),
                "ordenes",
                String(oc.id),
                "documentos"
            );
            const docSnap = await getDocs(pathDocumentos);
            const articulosOC = docSnap.docs.map(d => d.data());

            setOcSeleccionada({ ...oc, articulosOC });
        } catch (error) {
            console.error("Error al cargar ítems de la OC:", error);
            setOcSeleccionada({ ...oc, articulosOC: [] });
        } finally {
            setCargandoItemsId(null);
        }
    }, [anioOC, mesOC, setOcSeleccionada]);

    const ordenesFiltradas = ordenes.filter(oc => {
        const termino = busquedaOC.toLowerCase();
        const folioStr = String(oc.folioCalculado).toLowerCase();
        const proveedorStr = String(oc.proveedorCalculado).toLowerCase();
        return folioStr.includes(termino) || proveedorStr.includes(termino);
    });

    return (
        <>
            {/* OVERLAY */}
            {panelAbierto && (
                <div
                    className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 z-20"
                    onClick={() => setPanelAbierto(false)}
                />
            )}

            {/* PANEL DRAWER */}
            <div className={`absolute top-0 right-0 h-full w-full max-w-md bg-white dark:bg-gray-800 border-l border-slate-200 dark:border-gray-700 shadow-2xl z-30 transform transition-transform duration-300 flex flex-col ${panelAbierto ? 'translate-x-0' : 'translate-x-full'
                }`}>

                <div className="bg-slate-100 dark:bg-gray-900 border-b border-slate-200 dark:border-gray-700 px-3 py-2 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-1.5 text-slate-800 dark:text-gray-100 font-bold text-xs uppercase">
                        <ListOrdered size={15} className="text-[#2383C2]" />
                        <span>Seleccionar Orden de Compra</span>
                    </div>
                    <button onClick={() => setPanelAbierto(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-full">
                        <X size={16} />
                    </button>
                </div>

                {/* FILTROS AÑO / MES */}
                <div className="p-3 bg-slate-50 dark:bg-gray-800/60 border-b border-slate-200 dark:border-gray-700 flex flex-col gap-2 shrink-0">
                    <div className="grid grid-cols-2 gap-2">

                        {/* SELECTOR DE AÑO */}
                        <div>
                            <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-0.5">Año</label>
                            <select
                                value={anioOC}
                                onChange={(e) => setAnioOC(e.target.value)}
                                className="w-full h-7 border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-slate-800 dark:text-gray-100 rounded text-[11px] px-1.5 outline-none focus:border-[#2383C2]"
                            >
                                <option value="">Seleccionar Año</option>
                                {aniosDisponibles.map((a) => (
                                    <option key={`oc-anio-${a}`} value={a}>{a}</option>
                                ))}
                            </select>
                        </div>

                        {/* SELECTOR DE MES */}
                        <div>
                            <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-0.5">Mes</label>
                            <select
                                value={mesOC}
                                onChange={(e) => setMesOC(e.target.value)}
                                disabled={loadingMeses || mesesDisponibles.length === 0}
                                className="w-full h-7 border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-slate-800 dark:text-gray-100 rounded text-[11px] px-1.5 outline-none focus:border-[#2383C2] disabled:opacity-50"
                            >
                                {loadingMeses ? (
                                    <option value="">Cargando meses...</option>
                                ) : mesesDisponibles.length === 0 ? (
                                    <option value="">Sin meses registrados</option>
                                ) : (
                                    mesesDisponibles.map((m) => (
                                        <option key={`oc-mes-${m.id}`} value={m.id}>{m.nombre}</option>
                                    ))
                                )}
                            </select>
                        </div>
                    </div>

                    <div className="relative mt-1">
                        <Search className="absolute left-2 top-2 text-slate-400" size={13} />
                        <input
                            type="text"
                            value={busquedaOC}
                            onChange={(e) => setBusquedaOC(e.target.value)}
                            placeholder="Buscar por Folio u Orden..."
                            className="w-full h-7 pl-7 pr-2 border border-slate-300 dark:border-gray-600 rounded text-[11px] outline-none bg-white dark:bg-gray-900 text-slate-800 dark:text-gray-100 focus:border-[#2383C2]"
                        />
                    </div>
                </div>

                {/* LISTADO DE ORDENES */}
                <div className="flex-grow overflow-auto p-2">
                    {loadingOC ? (
                        <div className="h-40 flex items-center justify-center gap-2 text-xs text-slate-500">
                            <RefreshCw size={14} className="animate-spin text-[#2383C2]" />
                            <span>Cargando Órdenes...</span>
                        </div>
                    ) : !anioOC || !mesOC ? (
                        <div className="h-40 flex items-center justify-center text-xs text-slate-400 text-center px-4">
                            {mesesDisponibles.length === 0
                                ? `El año ${anioOC || ''} no contiene meses en Firestore.`
                                : 'Seleccione Año y Mes para consultar órdenes.'
                            }
                        </div>
                    ) : ordenesFiltradas.length === 0 ? (
                        <div className="h-40 flex items-center justify-center text-xs text-slate-400 text-center px-4">
                            No se encontraron Órdenes de Compra registradas en {NOMBRES_MESES[mesOC] || mesOC} de {anioOC}.
                        </div>
                    ) : (
                        <div className="flex flex-col gap-1.5">
                            {ordenesFiltradas.map((oc) => {
                                const esSeleccionado = ocSeleccionada?.id === oc.id;
                                const estaCargando = cargandoItemsId === oc.id;

                                return (
                                    <div
                                        key={oc.id}
                                        onClick={() => handleSeleccionarOrden(oc)}
                                        className={`relative p-2.5 rounded border text-left cursor-pointer transition-all flex flex-col gap-1 ${esSeleccionado
                                                ? 'border-[#2383C2] bg-blue-50/50 dark:bg-blue-950/40'
                                                : 'border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-slate-300'
                                            } ${estaCargando ? 'opacity-60 pointer-events-none' : ''}`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="font-bold text-slate-800 dark:text-gray-100 text-[11px] flex items-center gap-1">
                                                <Tag size={12} className="text-[#2383C2]" />
                                                OC #{oc.folioCalculado}
                                            </span>
                                            <span className="font-bold text-[#2383C2] text-[11px] flex items-center gap-1">
                                                {estaCargando && <Loader2 size={11} className="animate-spin" />}
                                                ${parseInt(oc.montoCalculado || 0).toLocaleString('es-CL')}
                                            </span>
                                        </div>

                                        <div className="text-[10px] text-slate-600 dark:text-gray-300 truncate">
                                            {oc.proveedorCalculado}
                                        </div>

                                        <div className="flex items-center justify-between text-[9px] text-slate-400 dark:text-gray-500 mt-1 pt-1 border-t border-slate-100 dark:border-gray-800">
                                            <span>Emisión: {oc.fechaCalculada}</span>
                                            <span className="font-medium px-1.5 py-0.2 rounded bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-gray-300">
                                                {oc.estado || 'Pendiente'}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* BOTÓN VINCULAR */}
                <div className="p-2.5 bg-slate-100 dark:bg-gray-900 border-t border-slate-200 dark:border-gray-700 flex items-center justify-end gap-2 shrink-0">
                    <button
                        onClick={() => setPanelAbierto(false)}
                        className="px-3 py-1.5 bg-slate-200 dark:bg-gray-700 hover:bg-slate-300 text-slate-700 dark:text-gray-200 rounded text-xs font-semibold transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={() => onConfirmar(ocSeleccionada)}
                        disabled={!ocSeleccionada || cargandoItemsId !== null}
                        className="px-3 py-1.5 bg-[#2383C2] hover:bg-[#1d6fa5] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded text-xs font-semibold transition-colors flex items-center gap-1"
                    >
                        Confirmar Vinculación
                    </button>
                </div>
            </div>
        </>
    );
};

export default DrawerSeleccionOC;