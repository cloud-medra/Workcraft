import React, { useState, useEffect, useCallback } from 'react';
import {
    collection,
    onSnapshot,
    doc,
    query,
    getDocs,
    writeBatch
} from 'firebase/firestore';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import { db } from '../../../firebaseConfig';
import { 
    ClipboardList, 
    Search, 
    Upload, 
    X, 
    Eye, 
    ArrowLeft, 
    FileSpreadsheet,
    Calendar,
    Building2,
    Hash,
    Receipt,
    PackageCheck
} from 'lucide-react';
import { useToast } from '../../../context/ToastContext';
import { useGranularPermission } from '../../../hooks/useGranularPermission';
import Spinner from '../../ui/Spinner';

const OrdenHemodinamia = () => {
    const [ordenes, setOrdenes] = useState([]);
    const [detalle, setDetalle] = useState([]);
    const [aniosDisponibles, setAniosDisponibles] = useState([]);
    const [mesesDisponibles, setMesesDisponibles] = useState([]);
    const [busqueda, setBusqueda] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [ordenSeleccionada, setOrdenSeleccionada] = useState(null);
    const [filtroAnio, setFiltroAnio] = useState("");
    const [filtroMes, setFiltroMes] = useState("");
    const [cargando, setCargando] = useState(false);

    const { showToast } = useToast();
    const { hasPermission } = useGranularPermission();

    const PATH_VISTA = "/hemodinamia/ordenHemodinamia";
    const COL_BASE = "hemodinamia_ordenes";

    const getMesNombre = (index) => ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"][index];

    // 1. Cargar años
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

    // 2. Cargar meses según año seleccionado
    useEffect(() => {
        if (!filtroAnio) { setMesesDisponibles([]); return; }
        const cargarMeses = async () => {
            try {
                const snap = await getDocs(collection(db, COL_BASE, filtroAnio, "meses"));
                const meses = snap.docs.map(d => d.id);
                setMesesDisponibles(meses);
            } catch (error) {
                console.error("Error al cargar meses:", error);
            }
        };
        cargarMeses();
    }, [filtroAnio]);

    // 3. Cargar órdenes según año y mes
    useEffect(() => {
        if (!filtroAnio || !filtroMes) {
            setOrdenes([]);
            return;
        }
        const path = `${COL_BASE}/${filtroAnio}/meses/${filtroMes}/ordenes`;
        const q = query(collection(db, path));

        return onSnapshot(q, (snapshot) => {
            setOrdenes(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        }, (err) => {
            console.error("ERROR EN SNAPSHOT ORDENES HEMODINAMIA:", err);
        });
    }, [filtroAnio, filtroMes]);

    // 4. Cargar detalle de orden
    useEffect(() => {
        if (!ordenSeleccionada || !filtroAnio || !filtroMes) { setDetalle([]); return; }
        const path = `${COL_BASE}/${filtroAnio}/meses/${filtroMes}/ordenes/${ordenSeleccionada.id}/documentos`;
        return onSnapshot(collection(db, path), (snap) => {
            setDetalle(snap.docs.map(d => d.data()));
        });
    }, [ordenSeleccionada, filtroAnio, filtroMes]);

    // 5. Lógica de Importación de Excel
    const onDrop = useCallback(async (acceptedFiles) => {
        setCargando(true);
        try {
            const batch = writeBatch(db);
            let fechaResult = { y: "", m: "" };

            for (const file of acceptedFiles) {
                const data = await file.arrayBuffer();
                const workbook = XLSX.read(data, { type: 'array' });
                const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

                const grupos = jsonData.reduce((acc, row) => {
                    const nro = String(row["Nro.Orden"]);
                    if (!acc[nro]) acc[nro] = { cabecera: row, items: [] };
                    acc[nro].items.push(row);
                    return acc;
                }, {});

                for (const nro in grupos) {
                    const { cabecera, items } = grupos[nro];
                    const [d, m, y] = cabecera["F.Orden"].split('/');
                    const nombreMes = getMesNombre(parseInt(m) - 1);
                    fechaResult = { y, m: nombreMes };

                    const totalItems = items.length;
                    const totalOrden = items.reduce((acc, item) => acc + ((parseFloat(item["Cant."]) || 0) * (parseFloat(item["P.Unitario"]) || 0)), 0);

                    const ordenRef = doc(db, COL_BASE, y, "meses", nombreMes, "ordenes", nro);

                    batch.set(doc(db, COL_BASE, y), { active: "true" }, { merge: true });
                    batch.set(doc(db, COL_BASE, y, "meses", nombreMes), { active: "true" }, { merge: true });
                    batch.set(ordenRef, {
                        "Nro.Orden": nro,
                        "F.Orden": cabecera["F.Orden"],
                        "Proveedor": cabecera["Proveedor"],
                        "Rut proveedor": cabecera["Rut proveedor"],
                        totalItems,
                        totalOrden,
                        fechaActualizacion: new Date()
                    }, { merge: true });

                    for (const item of items) {
                        if (item["Cod.Artículo"]) {
                            batch.set(doc(ordenRef, "documentos", String(item["Cod.Artículo"])), item, { merge: true });
                        }
                    }
                }
            }
            await batch.commit();

            if (fechaResult.y) setFiltroAnio(fechaResult.y);
            if (fechaResult.m) setFiltroMes(fechaResult.m);

            showToast("Importación exitosa", "success");
            setShowModal(false);
        } catch (e) {
            console.error(e);
            showToast("Error: " + e.message, "error");
        } finally {
            setCargando(false);
        }
    }, [showToast]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] }
    });

    // Cálculos para resumen de detalle
    const totalDetalle = detalle.reduce((acc, item) => {
        const cant = parseFloat(item["Cant."]) || 0;
        const pu = parseFloat(item["P.Unitario"]) || 0;
        return acc + (cant * pu);
    }, 0);

    const totalUnidades = detalle.reduce((acc, item) => acc + (parseFloat(item["Cant."]) || 0), 0);

    return (
        <div className="w-full h-full flex flex-col bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-lg shadow-sm overflow-hidden p-0 relative font-sans">
            {cargando && (
                <div className="absolute inset-0 z-[100] flex items-center justify-center bg-slate-900/30 dark:bg-black/50 backdrop-blur-[2px]">
                    <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-xl flex flex-col items-center gap-2 border border-slate-100 dark:border-gray-700">
                        <Spinner size="md" color="#2383C2" />
                        <h3 className="text-[#2383C2] font-normal text-[12px]">Procesando datos...</h3>
                    </div>
                </div>
            )}

            {/* CABECERA CORPORATIVA */}
            <header className="bg-white dark:bg-gray-800 border-b border-slate-200 dark:border-gray-700 px-3 py-2 flex items-center justify-between">
                {ordenSeleccionada ? (
                    <div className="flex items-center gap-3 w-full">
                        <button 
                            onClick={() => setOrdenSeleccionada(null)} 
                            className="p-1 rounded-md text-slate-500 hover:text-[#2383C2] hover:bg-slate-100 dark:hover:bg-gray-700 transition"
                            title="Volver al listado"
                        >
                            <ArrowLeft size={16} />
                        </button>
                        <div className="flex items-center gap-2 border-l border-slate-200 dark:border-gray-700 pl-3">
                            <Receipt size={16} className="text-[#2383C2]" />
                            <span className="text-[12px] font-normal text-slate-800 dark:text-gray-100 tracking-tight">
                                DETALLE DE ORDEN - HEMODINAMIA
                            </span>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center gap-2">
                        <ClipboardList size={16} className="text-[#2383C2]" />
                        <span className="text-[12px] font-normal text-slate-800 dark:text-gray-100 tracking-wide uppercase">
                            Órdenes de Hemodinamia
                        </span>
                    </div>
                )}

                {!ordenSeleccionada && hasPermission(PATH_VISTA, "cabecera_acciones", "btn_importar") && (
                    <button 
                        onClick={() => setShowModal(true)} 
                        className="bg-[#2383C2] hover:bg-[#1c6fa6] text-white px-2.5 py-1 rounded text-[10px] font-normal flex items-center gap-1.5 transition shadow-sm"
                    >
                        <Upload size={11} /> Importar Excel
                    </button>
                )}
            </header>

            {/* TARJETA INFORMATIVA CORPORATIVA (Solo en vista Detalle) */}
            {ordenSeleccionada && (
                <div className="bg-white dark:bg-gray-800/90 border-b border-slate-200 dark:border-gray-700/80 px-3 py-2">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                        
                        {/* N° Orden */}
                        <div className="bg-slate-50 dark:bg-gray-900/60 p-1.5 rounded border border-slate-200/80 dark:border-gray-700/50 flex items-center gap-2">
                            <div className="p-1 bg-[#2383C2]/10 rounded text-[#2383C2]">
                                <Hash size={13} />
                            </div>
                            <div>
                                <span className="block text-[9px] uppercase font-normal text-slate-400 dark:text-gray-400 leading-none">N° Orden</span>
                                <span className="text-[11px] font-normal text-slate-800 dark:text-gray-100">{ordenSeleccionada.id}</span>
                            </div>
                        </div>

                        {/* Fecha */}
                        <div className="bg-slate-50 dark:bg-gray-900/60 p-1.5 rounded border border-slate-200/80 dark:border-gray-700/50 flex items-center gap-2">
                            <div className="p-1 bg-slate-200/60 dark:bg-gray-700 text-slate-600 dark:text-gray-300 rounded">
                                <Calendar size={13} />
                            </div>
                            <div>
                                <span className="block text-[9px] uppercase font-normal text-slate-400 dark:text-gray-400 leading-none">Fecha Orden</span>
                                <span className="text-[11px] font-normal text-slate-700 dark:text-gray-200">{ordenSeleccionada["F.Orden"]}</span>
                            </div>
                        </div>

                        {/* RUT Proveedor */}
                        <div className="bg-slate-50 dark:bg-gray-900/60 p-1.5 rounded border border-slate-200/80 dark:border-gray-700/50 flex items-center gap-2">
                            <div className="p-1 bg-slate-200/60 dark:bg-gray-700 text-slate-600 dark:text-gray-300 rounded">
                                <Building2 size={13} />
                            </div>
                            <div>
                                <span className="block text-[9px] uppercase font-normal text-slate-400 dark:text-gray-400 leading-none">RUT Proveedor</span>
                                <span className="text-[11px] font-normal text-slate-700 dark:text-gray-200">{ordenSeleccionada["Rut proveedor"]}</span>
                            </div>
                        </div>

                        {/* Razon Social / Proveedor */}
                        <div className="bg-slate-50 dark:bg-gray-900/60 p-1.5 rounded border border-slate-200/80 dark:border-gray-700/50 flex items-center gap-2">
                            <div className="p-1 bg-slate-200/60 dark:bg-gray-700 text-slate-600 dark:text-gray-300 rounded">
                                <PackageCheck size={13} />
                            </div>
                            <div className="overflow-hidden">
                                <span className="block text-[9px] uppercase font-normal text-slate-400 dark:text-gray-400 leading-none">Proveedor</span>
                                <span className="text-[11px] font-normal text-slate-800 dark:text-gray-100 truncate block" title={ordenSeleccionada["Proveedor"]}>
                                    {ordenSeleccionada["Proveedor"]}
                                </span>
                            </div>
                        </div>

                    </div>
                </div>
            )}

            {/* FILTROS COMPACTOS (Vista Principal) */}
            {!ordenSeleccionada && (
                <div className="bg-slate-100/70 dark:bg-gray-800/40 p-1.5 flex flex-wrap gap-1.5 items-center border-b border-slate-200 dark:border-gray-700">
                    <select value={filtroAnio} onChange={(e) => setFiltroAnio(e.target.value)} className="h-6 border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-slate-800 dark:text-gray-100 rounded text-[11px] px-1.5 outline-none focus:border-[#2383C2]">
                        <option value="">Año</option>
                        {aniosDisponibles.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>

                    <select value={filtroMes} onChange={(e) => setFiltroMes(e.target.value)} className="h-6 border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-slate-800 dark:text-gray-100 rounded text-[11px] px-1.5 outline-none capitalize focus:border-[#2383C2]">
                        <option value="">Mes</option>
                        {mesesDisponibles.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>

                    <div className="relative flex-grow max-w-xs">
                        <Search className="absolute left-2 top-1.5 text-slate-400 dark:text-gray-500" size={12} />
                        <input value={busqueda} onChange={e => setBusqueda(e.target.value)} className="w-full h-6 pl-7 pr-2 border border-slate-300 dark:border-gray-600 rounded text-[11px] outline-none bg-white dark:bg-gray-900 text-slate-800 dark:text-gray-100 focus:border-[#2383C2]" placeholder="Buscar por N°, RUT o Proveedor..." />
                    </div>
                </div>
            )}

            {/* CONTENEDOR DE TABLAS */}
            <div className="flex-grow overflow-auto">
                {!ordenSeleccionada ? (
                    /* TABLA LISTADO PRINCIPAL */
                    <table className="w-full text-left text-[11px] border-collapse table-fixed">
                        <thead className="bg-slate-100 dark:bg-gray-900/80 sticky top-0 z-10">
                            <tr className="text-slate-600 dark:text-gray-400 uppercase font-normal text-[10px] tracking-wider">
                                <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700 w-[14%]">Nro.Orden</th>
                                <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700 w-[12%]">F.Orden</th>
                                <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700 w-[16%]">Rut Proveedor</th>
                                <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700 w-[38%]">Proveedor</th>
                                <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700 w-[6%] text-center">Items</th>
                                <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700 w-[14%] text-right">Total</th>
                                <th className="px-2 py-1.5 border-b border-slate-200 dark:border-gray-700 w-[6%] text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200/60 dark:divide-gray-700/50 bg-white dark:bg-gray-800">
                            {ordenes.filter(o =>
                                o["Nro.Orden"]?.includes(busqueda) ||
                                o["Proveedor"]?.toLowerCase().includes(busqueda.toLowerCase()) ||
                                o["Rut proveedor"]?.toLowerCase().includes(busqueda.toLowerCase())
                            ).map((o) => (
                                <tr 
                                    key={o.id} 
                                    onDoubleClick={() => setOrdenSeleccionada(o)} 
                                    className="hover:bg-slate-50 dark:hover:bg-gray-700/40 transition-all duration-150 cursor-pointer group border-l-2 border-l-transparent hover:border-l-[#2383C2]"
                                >
                                    <td className="px-2 py-1 border-b border-r border-slate-200/60 dark:border-gray-700/70 font-normal text-slate-700 dark:text-gray-200 truncate">{o["Nro.Orden"]}</td>
                                    <td className="px-2 py-1 border-b border-r border-slate-200/60 dark:border-gray-700/70 text-slate-600 dark:text-gray-400 whitespace-nowrap">{o["F.Orden"]}</td>
                                    <td className="px-2 py-1 border-b border-r border-slate-200/60 dark:border-gray-700/70 text-slate-600 dark:text-gray-400 whitespace-nowrap">{o["Rut proveedor"]}</td>
                                    <td className="px-2 py-1 border-b border-r border-slate-200/60 dark:border-gray-700/70 text-slate-700 dark:text-gray-300 truncate" title={o["Proveedor"]}>{o["Proveedor"]}</td>
                                    <td className="px-2 py-1 border-b border-r border-slate-200/60 dark:border-gray-700/70 text-slate-600 dark:text-gray-400 text-center font-normal">{o.totalItems}</td>
                                    <td className="px-2 py-1 border-b border-r border-slate-200/60 dark:border-gray-700/70 text-slate-800 dark:text-gray-100 font-normal text-right whitespace-nowrap">${o.totalOrden?.toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
                                    <td className="px-2 py-1 border-b border-slate-200/60 dark:border-gray-700 text-center">
                                        <button onClick={() => setOrdenSeleccionada(o)} className="text-slate-400 hover:text-[#2383C2] transition inline-flex items-center justify-center p-0.5 rounded hover:bg-slate-100 dark:hover:bg-gray-700">
                                            <Eye size={13} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    /* TABLA DETALLE DE ORDEN ESTILIZADA Y CORPORATIVA */
                    <div className="flex flex-col h-full justify-between">
                        <table className="w-full text-left text-[11px] border-collapse table-fixed">
                            <thead className="bg-slate-100/90 dark:bg-gray-900 sticky top-0 z-10 shadow-xs">
                                <tr className="text-slate-500 dark:text-gray-400 uppercase font-normal text-[10px] tracking-wider border-b border-slate-200 dark:border-gray-700">
                                    <th className="px-3 py-1.5 border-r border-slate-200 dark:border-gray-700/80 w-[15%]">Código</th>
                                    <th className="px-3 py-1.5 border-r border-slate-200 dark:border-gray-700/80 w-[50%]">Descripción del Artículo</th>
                                    <th className="px-3 py-1.5 border-r border-slate-200 dark:border-gray-700/80 w-[10%] text-center">Cant.</th>
                                    <th className="px-3 py-1.5 border-r border-slate-200 dark:border-gray-700/80 w-[12%] text-right">Precio Unit.</th>
                                    <th className="px-3 py-1.5 w-[13%] text-right">Subtotal</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200/60 dark:divide-gray-700/40 bg-white dark:bg-gray-800">
                                {detalle.map((item, i) => {
                                    const cantidad = parseFloat(item["Cant."]) || 0;
                                    const precioUnidad = parseFloat(item["P.Unitario"]) || 0;
                                    const totalLinea = cantidad * precioUnidad;

                                    return (
                                        <tr 
                                            key={i} 
                                            className="hover:bg-slate-50/80 dark:hover:bg-gray-700/30 transition-all duration-150 group border-l-2 border-l-transparent hover:border-l-[#2383C2]"
                                        >
                                            {/* Código */}
                                            <td className="px-3 py-1 border-r border-slate-200/50 dark:border-gray-700/50 text-[10px] text-slate-600 dark:text-gray-300">
                                                <span className="font-normal text-slate-700 dark:text-gray-200">
                                                    {item["Cod.Artículo"] || "N/A"}
                                                </span>
                                            </td>

                                            {/* Descripción */}
                                            <td className="px-3 py-1 border-r border-slate-200/50 dark:border-gray-700/50 text-slate-800 dark:text-gray-200 font-normal truncate" title={item["Artículo"]}>
                                                {item["Artículo"] || "Sin Descripción"}
                                            </td>

                                            {/* Cantidad */}
                                            <td className="px-3 py-1 border-r border-slate-200/50 dark:border-gray-700/50 text-slate-700 dark:text-gray-300 text-center font-normal">
                                                {cantidad}
                                            </td>

                                            {/* P. Unitario */}
                                            <td className="px-3 py-1 border-r border-slate-200/50 dark:border-gray-700/50 text-slate-600 dark:text-gray-300 text-right whitespace-nowrap text-[10px]">
                                                ${precioUnidad.toLocaleString('es-CL', { minimumFractionDigits: 0 })}
                                            </td>

                                            {/* Total Línea */}
                                            <td className="px-3 py-1 text-slate-900 dark:text-gray-100 font-normal text-right whitespace-nowrap">
                                                ${totalLinea.toLocaleString('es-CL', { minimumFractionDigits: 0 })}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>

                        {/* RESUMEN FINANCIERO / FOOTER DE LA TABLA */}
                        <div className="bg-slate-100 dark:bg-gray-900 border-t border-slate-200 dark:border-gray-700 p-2.5 flex items-center justify-between sticky bottom-0">
                            <div className="flex items-center gap-4 text-[10px] text-slate-500 dark:text-gray-400">
                                <span>Líneas: <strong className="text-slate-800 dark:text-gray-200 font-normal">{detalle.length}</strong></span>
                                <span>Unidades totales: <strong className="text-slate-800 dark:text-gray-200 font-normal">{totalUnidades}</strong></span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-normal text-slate-500 dark:text-gray-400 uppercase tracking-wider">Total Orden:</span>
                                <span className="text-[13px] font-normal text-[#2383C2] dark:text-[#369BCE] px-2 py-0.5 rounded bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700">
                                    ${(ordenSeleccionada.totalOrden || totalDetalle).toLocaleString('es-CL', { minimumFractionDigits: 0 })}
                                </span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* MODAL IMPORTACIÓN */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[1px]">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-4 border border-slate-200 dark:border-gray-700">
                        <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-gray-700">
                            <div className="flex items-center gap-2">
                                <FileSpreadsheet size={16} className="text-[#2383C2]" />
                                <h3 className="text-[13px] font-normal text-slate-800 dark:text-gray-100">
                                    Importar Órdenes de Hemodinamia
                                </h3>
                            </div>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-gray-200">
                                <X size={16} />
                            </button>
                        </div>

                        <div className="mt-4">
                            <div 
                                {...getRootProps()} 
                                className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer transition ${
                                    isDragActive 
                                        ? 'border-[#2383C2] bg-blue-50/50 dark:bg-blue-900/20' 
                                        : 'border-slate-300 dark:border-gray-600 hover:border-[#2383C2] bg-slate-50 dark:bg-gray-900/50'
                                }`}
                            >
                                <input {...getInputProps()} />
                                <Upload size={24} className="text-[#2383C2] mb-2" />
                                <p className="text-[11px] text-slate-600 dark:text-gray-300 text-center font-normal">
                                    Arrastra y suelta tu archivo Excel (.xlsx) aquí, o haz clic para seleccionar
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OrdenHemodinamia;