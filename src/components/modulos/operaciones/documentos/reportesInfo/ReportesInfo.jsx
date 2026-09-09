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
import { db } from '../../../../../firebaseConfig';
import {
    ClipboardList,
    Search,
    Upload,
    X,
    FileSpreadsheet,
    Calendar,
    Hash,
    User,
    Activity,
    Stethoscope,
    Building2
} from 'lucide-react';
import { useToast } from '../../../../../context/ToastContext';
import { useGranularPermission } from '../../../../../hooks/useGranularPermission';
import Spinner from '../../../../ui/Spinner';

const ReportesInfo = () => {
    const [reportes, setReportes] = useState([]);
    const [aniosDisponibles, setAniosDisponibles] = useState([]);
    const [mesesDisponibles, setMesesDisponibles] = useState([]);
    const [busqueda, setBusqueda] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [filtroAnio, setFiltroAnio] = useState('');
    const [filtroMes, setFiltroMes] = useState('');
    const [cargando, setCargando] = useState(false);

    const { showToast } = useToast();
    const { hasPermission } = useGranularPermission();

    const PATH_VISTA = "/laboratorio/reportesInfo";
    const COL_BASE = "documentos_reportesInfo";

    const getMesNombre = (index) => [
        "enero", "febrero", "marzo", "abril", "mayo", "junio",
        "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
    ][index];

    // Cargar Años disponibles
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

    // Cargar Meses disponibles según año
    useEffect(() => {
        if (!filtroAnio) {
            setMesesDisponibles([]);
            return;
        }
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

    // Listener en tiempo real de registros
    useEffect(() => {
        if (!filtroAnio || !filtroMes) {
            setReportes([]);
            return;
        }
        const path = `${COL_BASE}/${filtroAnio}/meses/${filtroMes}/registros`;
        const q = query(collection(db, path));

        return onSnapshot(q, (snapshot) => {
            setReportes(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        }, (err) => {
            console.error("ERROR EN SNAPSHOT REPORTES:", err);
        });
    }, [filtroAnio, filtroMes]);

    // Función para formatear fechas de Excel (Date objects, texto YYYY-MM-DD o seriales)
    const formatearFecha = (valorFecha) => {
        if (!valorFecha) return '';
        if (valorFecha instanceof Date) {
            return valorFecha.toISOString().split('T')[0];
        }
        if (typeof valorFecha === 'number') {
            const dateObj = XLSX.SSF.parse_date_code(valorFecha);
            const y = dateObj.y;
            const m = String(dateObj.m).padStart(2, '0');
            const d = String(dateObj.d).padStart(2, '0');
            return `${y}-${m}-${d}`;
        }
        const str = String(valorFecha).trim();
        if (str.includes('/')) {
            const parts = str.split('/');
            if (parts.length === 3) {
                const [d, m, y] = parts;
                return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
            }
        }
        return str.split('T')[0];
    };

    const onDrop = useCallback(async (acceptedFiles) => {
        setCargando(true);
        try {
            let fechaResult = { y: "", m: "" };
            let totalNuevos = 0;
            let totalOmitidos = 0;

            for (const file of acceptedFiles) {
                const data = await file.arrayBuffer();
                const workbook = XLSX.read(data, { type: 'array', cellDates: true });
                const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

                // Agrupar filas por año y mes
                const gruposPorAnoMes = {};

                jsonData.forEach((row) => {
                    const rawFecha = row["Fecha"];
                    const fechaFormatted = formatearFecha(rawFecha);

                    if (!fechaFormatted) return;

                    const dateParts = fechaFormatted.split('-');
                    const y = dateParts[0];
                    const mIndex = parseInt(dateParts[1], 10) - 1;
                    const nombreMes = getMesNombre(mIndex);

                    if (!y || !nombreMes) return;

                    const keyGroup = `${y}___${nombreMes}`;
                    if (!gruposPorAnoMes[keyGroup]) {
                        gruposPorAnoMes[keyGroup] = { y, m: nombreMes, items: [] };
                    }

                    // Eliminar la columna 'Rut'
                    const { Rut, ...restoFila } = row;

                    const admision = String(row["Admisión"] || '').trim();
                    const codArt = String(row["Cod.Artículo"] || '').trim();
                    
                    // ID Único compuesto por Admisión + Cod.Artículo + Fecha
                    const docId = `${admision}_${codArt}_${fechaFormatted}`;

                    gruposPorAnoMes[keyGroup].items.push({
                        docId,
                        data: {
                            ...restoFila,
                            Fecha: fechaFormatted,
                            fechaActualizacion: new Date()
                        }
                    });
                });

                // Procesar cada grupo de Año / Mes
                for (const keyGroup in gruposPorAnoMes) {
                    const { y, m, items } = gruposPorAnoMes[keyGroup];
                    fechaResult = { y, m };

                    // 1. Obtener registros existentes para verificar duplicados
                    const snapshotExistentes = await getDocs(
                        collection(db, COL_BASE, y, "meses", m, "registros")
                    );
                    const idsExistentes = new Set(snapshotExistentes.docs.map(d => d.id));

                    // 2. Filtrar solo los registros que NO existen
                    const itemsNuevos = items.filter(item => !idsExistentes.has(item.docId));
                    totalOmitidos += (items.length - itemsNuevos.length);

                    if (itemsNuevos.length === 0) continue;

                    // 3. Insertar nuevos registros en batches (máximo 500 operaciones por batch)
                    const CHUNK_SIZE = 450;
                    for (let i = 0; i < itemsNuevos.length; i += CHUNK_SIZE) {
                        const batch = writeBatch(db);
                        
                        // Asegurar la metadata de carpetas padre
                        batch.set(doc(db, COL_BASE, y), { active: "true" }, { merge: true });
                        batch.set(doc(db, COL_BASE, y, "meses", m), { active: "true" }, { merge: true });

                        const chunk = itemsNuevos.slice(i, i + CHUNK_SIZE);
                        chunk.forEach(({ docId, data }) => {
                            const regRef = doc(db, COL_BASE, y, "meses", m, "registros", docId);
                            batch.set(regRef, data, { merge: true });
                        });

                        await batch.commit();
                        totalNuevos += chunk.length;
                    }
                }
            }

            if (fechaResult.y) setFiltroAnio(fechaResult.y);
            if (fechaResult.m) setFiltroMes(fechaResult.m);

            showToast(`Importación realizada: ${totalNuevos} agregados, ${totalOmitidos} omitidos por duplicado`, "success");
            setShowModal(false);
        } catch (e) {
            console.error(e);
            showToast("Error en importación: " + e.message, "error");
        } finally {
            setCargando(false);
        }
    }, [showToast]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] }
    });

    const reportesFiltrados = reportes.filter(r => {
        const queryStr = busqueda.toLowerCase();
        return (
            String(r["Admisión"] || '').toLowerCase().includes(queryStr) ||
            String(r["Paciente"] || '').toLowerCase().includes(queryStr) ||
            String(r["Descripción"] || '').toLowerCase().includes(queryStr) ||
            String(r["1° Cirujano"] || '').toLowerCase().includes(queryStr) ||
            String(r["Cod.Artículo"] || '').toLowerCase().includes(queryStr)
        );
    });

    return (
        <div className="w-full h-full flex flex-col bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-lg shadow-sm overflow-hidden p-0 relative font-sans">
            {cargando && (
                <div className="absolute inset-0 z-[100] flex items-center justify-center bg-slate-900/30 dark:bg-black/50 backdrop-blur-[2px]">
                    <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-xl flex flex-col items-center gap-2 border border-slate-100 dark:border-gray-700">
                        <Spinner size="md" color="#2383C2" />
                        <h3 className="text-[#2383C2] font-normal text-[12px]">Procesando y omitiendo duplicados...</h3>
                    </div>
                </div>
            )}

            <header className="bg-white dark:bg-gray-800 border-b border-slate-200 dark:border-gray-700 px-3 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <ClipboardList size={16} className="text-[#2383C2]" />
                    <span className="text-[12px] font-normal text-slate-800 dark:text-gray-100 tracking-wide uppercase">
                        Reportes de Cirugías / Información
                    </span>
                </div>

                {hasPermission(PATH_VISTA, "cabecera_acciones", "btn_importar") && (
                    <button
                        onClick={() => setShowModal(true)}
                        className="bg-[#2383C2] hover:bg-[#1c6fa6] text-white px-2.5 py-1 rounded text-[10px] font-normal flex items-center gap-1.5 transition shadow-sm"
                    >
                        <Upload size={11} /> Importar Excel
                    </button>
                )}
            </header>

            {/* Filtros */}
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
                    <input
                        value={busqueda}
                        onChange={e => setBusqueda(e.target.value)}
                        className="w-full h-6 pl-7 pr-2 border border-slate-300 dark:border-gray-600 rounded text-[11px] outline-none bg-white dark:bg-gray-900 text-slate-800 dark:text-gray-100 focus:border-[#2383C2]"
                        placeholder="Buscar por Admisión, Paciente, Descripción, Cirujano..."
                    />
                </div>
            </div>

            {/* Tabla Principal */}
            <div className="flex-grow overflow-auto">
                <table className="w-full text-left text-[11px] border-collapse min-w-[1000px]">
                    <thead className="bg-slate-100 dark:bg-gray-900/80 sticky top-0 z-10">
                        <tr className="text-slate-600 dark:text-gray-400 uppercase font-normal text-[10px] tracking-wider">
                            <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700">Fecha</th>
                            <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700">Admisión</th>
                            <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700">Paciente</th>
                            <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700">Edad</th>
                            <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700">Cod.Art.</th>
                            <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700">Descripción</th>
                            <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700">Previsión / Isapre</th>
                            <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700">Cirujano</th>
                            <th className="px-2 py-1.5 border-b border-slate-200 dark:border-gray-700 text-center">Cant.</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/60 dark:divide-gray-700/50 bg-white dark:bg-gray-800">
                        {reportesFiltrados.length === 0 ? (
                            <tr>
                                <td colSpan={9} className="px-4 py-6 text-center text-slate-400 dark:text-gray-500 text-xs">
                                    No hay registros disponibles para el período o búsqueda seleccionada.
                                </td>
                            </tr>
                        ) : (
                            reportesFiltrados.map((item) => (
                                <tr
                                    key={item.id}
                                    className="hover:bg-slate-50 dark:hover:bg-gray-700/40 transition-all duration-150 border-l-2 border-l-transparent hover:border-l-[#2383C2]"
                                >
                                    <td className="px-2 py-1 border-b border-r border-slate-200/60 dark:border-gray-700/70 whitespace-nowrap text-slate-600 dark:text-gray-400">
                                        {item["Fecha"]}
                                    </td>
                                    <td className="px-2 py-1 border-b border-r border-slate-200/60 dark:border-gray-700/70 text-slate-700 dark:text-gray-200 font-normal">
                                        {item["Admisión"]}
                                    </td>
                                    <td className="px-2 py-1 border-b border-r border-slate-200/60 dark:border-gray-700/70 text-slate-800 dark:text-gray-100 font-normal truncate max-w-[180px]" title={item["Paciente"]}>
                                        {item["Paciente"]}
                                    </td>
                                    <td className="px-2 py-1 border-b border-r border-slate-200/60 dark:border-gray-700/70 text-slate-600 dark:text-gray-400 text-center">
                                        {item["Edad"]}
                                    </td>
                                    <td className="px-2 py-1 border-b border-r border-slate-200/60 dark:border-gray-700/70 text-slate-600 dark:text-gray-400">
                                        {item["Cod.Artículo"]}
                                    </td>
                                    <td className="px-2 py-1 border-b border-r border-slate-200/60 dark:border-gray-700/70 text-slate-700 dark:text-gray-300 truncate max-w-[220px]" title={item["Descripción"]}>
                                        {item["Descripción"]}
                                    </td>
                                    <td className="px-2 py-1 border-b border-r border-slate-200/60 dark:border-gray-700/70 text-slate-600 dark:text-gray-400 truncate max-w-[150px]" title={`${item["Previsión"] || ''} - ${item["Isapre"] || ''}`}>
                                        {item["Previsión"]} {item["Isapre"] ? `(${item["Isapre"]})` : ''}
                                    </td>
                                    <td className="px-2 py-1 border-b border-r border-slate-200/60 dark:border-gray-700/70 text-slate-700 dark:text-gray-300 truncate max-w-[180px]" title={item["1° Cirujano"]}>
                                        {item["1° Cirujano"]}
                                    </td>
                                    <td className="px-2 py-1 border-b border-slate-200/60 dark:border-gray-700/70 text-slate-800 dark:text-gray-100 text-center font-normal">
                                        {item["Cant.Art."]}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Totalizador Footer */}
            <div className="bg-slate-100 dark:bg-gray-900 border-t border-slate-200 dark:border-gray-700 p-2 flex items-center justify-between">
                <div className="text-[10px] text-slate-500 dark:text-gray-400">
                    Total registros cargados: <strong className="text-slate-800 dark:text-gray-200 font-normal">{reportesFiltrados.length}</strong>
                </div>
            </div>

            {/* Modal Importar */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-sans">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-xl shadow-2xl overflow-hidden border border-slate-200 dark:border-gray-700">
                        <div className="px-4 py-3 border-b border-slate-100 dark:border-gray-700 flex justify-between items-center bg-slate-50/50 dark:bg-gray-900/40">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-[#2383C2]/10 rounded-lg">
                                    <Upload size={16} className="text-[#2383C2]" />
                                </div>
                                <h3 className="font-normal text-xs text-slate-800 dark:text-gray-100">Importar Reporte de Cirugías</h3>
                            </div>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-gray-300 transition p-1">
                                <X size={16} />
                            </button>
                        </div>
                        <div className="p-6">
                            <div {...getRootProps()} className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer flex flex-col items-center justify-center gap-3 transition ${isDragActive ? "border-[#2383C2] bg-[#2383C2]/5" : "border-slate-200 dark:border-gray-700 hover:border-[#2383C2]/50 hover:bg-slate-50 dark:hover:bg-gray-700/30"}`}>
                                <input {...getInputProps()} />
                                <div className="bg-slate-100 dark:bg-gray-900 p-3 rounded-full">
                                    <FileSpreadsheet size={24} className="text-slate-400 dark:text-gray-500" />
                                </div>
                                <div>
                                    <p className="text-xs font-normal text-slate-700 dark:text-gray-200">Arrastra tu archivo Excel aquí</p>
                                    <p className="text-[10px] text-slate-400 dark:text-gray-400 mt-0.5">La columna 'Rut' será omitida automáticamente y se evitarán registros duplicados.</p>
                                </div>
                            </div>
                        </div>
                        <div className="px-4 py-3 bg-slate-50 dark:bg-gray-900/40 border-t border-slate-100 dark:border-gray-700 flex justify-end">
                            <button onClick={() => setShowModal(false)} className="text-[11px] font-normal text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-gray-200 px-3 py-1 rounded-lg transition">
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReportesInfo;