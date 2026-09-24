import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    collection,
    doc,
    query,
    orderBy,
    documentId,
    where,
    getDocs,
    writeBatch,
    updateDoc,
    serverTimestamp
} from 'firebase/firestore';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import { db, auth } from '../../../../../firebaseConfig';
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
    Building2,
    Loader2,
    Tag
} from 'lucide-react';
import { useToast } from '../../../../../context/ToastContext';
import { useGranularPermission } from '../../../../../hooks/useGranularPermission';
import Spinner from '../../../../ui/Spinner';
import PaginacionSimple from '../../../../ui/PaginacionSimple';
import MultiSelectFiltro from '../../../../ui/MultiSelectFiltro';
import { ThRedimensionable, ColgroupRedimensionable } from '../../../../ui/ThRedimensionable';
import { useColumnResize } from '../../../../../hooks/useColumnResize';
import { useDebouncedValue } from '../../../../../hooks/useDebouncedValue';
import { incluyeTexto } from '../../../../../utils/normalizarTexto';

// Estado de revisión de cada registro. Se guarda en el mismo documento del
// registro (campo `revisado`); si no existe se considera "Pendiente", así que
// los registros ya importados no necesitan migración. Reimportar no lo pisa:
// la importación omite los IDs que ya existen.
const REVISADO = {
    REVISADO: 'Revisado',
    PENDIENTE: 'Pendiente',
    NO_APLICA: 'No aplica'
};
const OPCIONES_REVISADO = [REVISADO.REVISADO, REVISADO.PENDIENTE, REVISADO.NO_APLICA];
const CLASE_REVISADO = {
    [REVISADO.REVISADO]: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
    [REVISADO.PENDIENTE]: 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
    [REVISADO.NO_APLICA]: 'bg-slate-200 text-slate-700 border-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600'
};
const getRevisado = (r) => (OPCIONES_REVISADO.includes(r.revisado) ? r.revisado : REVISADO.PENDIENTE);

const SIN_ARANCEL = '(Sin arancel)';
const getArancel = (r) => String(r["Arancel"] ?? '').trim() || SIN_ARANCEL;

const COLUMNAS = [
    { key: 'fecha', ancho: 90, min: 70 },
    { key: 'admision', ancho: 90, min: 60 },
    { key: 'paciente', ancho: 180, min: 80 },
    { key: 'edad', ancho: 55, min: 40 },
    { key: 'codArt', ancho: 90, min: 60 },
    { key: 'descripcion', ancho: 220, min: 90 },
    { key: 'arancel', ancho: 200, min: 90 },
    { key: 'prevision', ancho: 150, min: 80 },
    { key: 'cirujano', ancho: 170, min: 80 },
    { key: 'cantidad', ancho: 60, min: 45 },
    { key: 'revisado', ancho: 115, min: 95 },
];

const ReportesInfo = () => {
    const [reportes, setReportes] = useState([]);
    const [aniosDisponibles, setAniosDisponibles] = useState([]);
    const [mesesDisponibles, setMesesDisponibles] = useState([]);
    const [busqueda, setBusqueda] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [filtroAnio, setFiltroAnio] = useState('');
    const [filtroMes, setFiltroMes] = useState('');
    const [cargando, setCargando] = useState(false);
    const [cargandoLista, setCargandoLista] = useState(false);
    const [filtroRevisado, setFiltroRevisado] = useState('');
    const [filtroAranceles, setFiltroAranceles] = useState([]);
    const [pagina, setPagina] = useState(1);
    const [tamanoPagina, setTamanoPagina] = useState(25);

    const busquedaDebounced = useDebouncedValue(busqueda);
    const { anchos, handleResize, anchoTotalTabla } = useColumnResize(COLUMNAS);

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

    // Se trae el mes completo con un getDocs (sin listener en vivo): los
    // filtros (Revisado, Arancel, búsqueda) y la lista de aranceles deben
    // considerar TODOS los registros del mes antes de paginar, y la
    // paginación se hace en memoria.
    const cargarPrimeraPagina = useCallback(async (anioOverride, mesOverride) => {
        const anio = anioOverride ?? filtroAnio;
        const mes = mesOverride ?? filtroMes;

        if (!anio || !mes) {
            setReportes([]);
            return;
        }

        setCargandoLista(true);
        try {
            const path = `${COL_BASE}/${anio}/meses/${mes}/registros`;
            const snap = await getDocs(query(collection(db, path), orderBy("Fecha", "desc")));
            setReportes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            setPagina(1);
        } catch (err) {
            console.error("Error al cargar reportes:", err);
            showToast("Error al cargar los reportes", "error");
        } finally {
            setCargandoLista(false);
        }
    }, [filtroAnio, filtroMes, showToast]);

    useEffect(() => {
        cargarPrimeraPagina();
    }, [cargarPrimeraPagina]);

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

                    // 1. Verificar duplicados SOLO para los IDs que se van a
                    // importar (antes se leía la colección "registros"
                    // COMPLETA del mes en cada importación, aunque el mes ya
                    // tuviera miles de filas cargadas de antes). Como el ID
                    // de cada registro es determinístico, se puede consultar
                    // por documentId() 'in' en lotes de 30 (límite de Firestore).
                    const idsUnicos = [...new Set(items.map(item => item.docId))];
                    const idsExistentes = new Set();
                    const regsCol = collection(db, COL_BASE, y, "meses", m, "registros");
                    for (let i = 0; i < idsUnicos.length; i += 30) {
                        const loteIds = idsUnicos.slice(i, i + 30);
                        const snapLote = await getDocs(
                            query(regsCol, where(documentId(), "in", loteIds))
                        );
                        snapLote.docs.forEach(d => idsExistentes.add(d.id));
                    }

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

            // Ya no hay listener en vivo: se refresca explícitamente la
            // primera página con los valores recién importados (por si
            // año/mes no cambiaron y el efecto no se vuelve a disparar solo).
            if (fechaResult.y && fechaResult.m) {
                cargarPrimeraPagina(fechaResult.y, fechaResult.m);
            }

            showToast(`Importación realizada: ${totalNuevos} agregados, ${totalOmitidos} omitidos por duplicado`, "success");
            setShowModal(false);
        } catch (e) {
            console.error(e);
            showToast("Error en importación: " + e.message, "error");
        } finally {
            setCargando(false);
        }
    }, [showToast, cargarPrimeraPagina]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] }
    });

    const opcionesArancel = useMemo(
        () => [...new Set(reportes.map(getArancel))].sort((a, b) => a.localeCompare(b, 'es')),
        [reportes]
    );

    const reportesFiltrados = useMemo(() => {
        const aranceles = new Set(filtroAranceles);
        return reportes.filter(r => {
            if (filtroRevisado && getRevisado(r) !== filtroRevisado) return false;
            if (aranceles.size > 0 && !aranceles.has(getArancel(r))) return false;
            return (
                incluyeTexto(r["Admisión"], busquedaDebounced) ||
                incluyeTexto(r["Paciente"], busquedaDebounced) ||
                incluyeTexto(r["Descripción"], busquedaDebounced) ||
                incluyeTexto(r["1° Cirujano"], busquedaDebounced) ||
                incluyeTexto(r["Cod.Artículo"], busquedaDebounced) ||
                incluyeTexto(r["Arancel"], busquedaDebounced)
            );
        });
    }, [reportes, filtroRevisado, filtroAranceles, busquedaDebounced]);

    const conteoRevisado = useMemo(() => reportes.reduce((acc, r) => {
        const estado = getRevisado(r);
        acc[estado] = (acc[estado] || 0) + 1;
        return acc;
    }, {}), [reportes]);

    // Los filtros se aplican antes de paginar; cualquier cambio de filtro
    // vuelve a la página 1.
    const totalFilas = reportesFiltrados.length;
    const totalPaginas = Math.max(1, Math.ceil(totalFilas / tamanoPagina));
    const paginaActual = Math.min(pagina, totalPaginas);
    const reportesPagina = reportesFiltrados.slice((paginaActual - 1) * tamanoPagina, paginaActual * tamanoPagina);

    const conResetPagina = (setter) => (valor) => { setter(valor); setPagina(1); };

    const cambiarRevisado = async (registro, nuevoEstado) => {
        const anterior = registro.revisado;
        setReportes(prev => prev.map(r => r.id === registro.id ? { ...r, revisado: nuevoEstado } : r));
        try {
            await updateDoc(doc(db, COL_BASE, filtroAnio, "meses", filtroMes, "registros", registro.id), {
                revisado: nuevoEstado,
                revisadoPor: auth.currentUser?.email || '',
                revisadoFecha: serverTimestamp()
            });
        } catch (err) {
            console.error("Error al guardar estado de revisión:", err);
            setReportes(prev => prev.map(r => r.id === registro.id ? { ...r, revisado: anterior } : r));
            showToast("No se pudo guardar el estado de revisión", "error");
        }
    };

    const th = (i, label, extra = '') => (
        <ThRedimensionable col={COLUMNAS[i]} anchos={anchos} onResize={handleResize} className={`px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700 ${extra}`}>
            {label}
        </ThRedimensionable>
    );

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
                <select value={filtroAnio} onChange={(e) => conResetPagina(setFiltroAnio)(e.target.value)} className="h-6 border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-slate-800 dark:text-gray-100 rounded text-[11px] px-1.5 outline-none focus:border-[#2383C2]">
                    <option value="">Año</option>
                    {aniosDisponibles.map(a => <option key={a} value={a}>{a}</option>)}
                </select>

                <select value={filtroMes} onChange={(e) => conResetPagina(setFiltroMes)(e.target.value)} className="h-6 border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-slate-800 dark:text-gray-100 rounded text-[11px] px-1.5 outline-none capitalize focus:border-[#2383C2]">
                    <option value="">Mes</option>
                    {mesesDisponibles.map(m => <option key={m} value={m}>{m}</option>)}
                </select>

                <div className="relative flex-grow max-w-xs">
                    <Search className="absolute left-2 top-1.5 text-slate-400 dark:text-gray-500" size={12} />
                    <input
                        value={busqueda}
                        onChange={e => conResetPagina(setBusqueda)(e.target.value)}
                        className="w-full h-6 pl-7 pr-2 border border-slate-300 dark:border-gray-600 rounded text-[11px] outline-none bg-white dark:bg-gray-900 text-slate-800 dark:text-gray-100 focus:border-[#2383C2]"
                        placeholder="Buscar por Admisión, Paciente, Descripción, Cirujano, Arancel..."
                    />
                </div>

                <select
                    value={filtroRevisado}
                    onChange={(e) => conResetPagina(setFiltroRevisado)(e.target.value)}
                    className={`h-6 border rounded text-[11px] px-1.5 outline-none focus:border-[#2383C2] ${filtroRevisado ? 'border-[#2383C2] text-[#2383C2] bg-blue-50 dark:bg-blue-950/30 font-semibold' : 'border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-slate-800 dark:text-gray-100'}`}
                >
                    <option value="">Revisado (Todos)</option>
                    {OPCIONES_REVISADO.map(o => <option key={o} value={o}>{o}</option>)}
                </select>

                <MultiSelectFiltro
                    opciones={opcionesArancel}
                    seleccionados={filtroAranceles}
                    onChange={conResetPagina(setFiltroAranceles)}
                    etiqueta="Aranceles"
                    icono={<Tag size={12} className="shrink-0" />}
                    anchoMenu="w-80"
                />
            </div>

            {/* Tabla Principal */}
            {cargandoLista ? (
                <div className="flex-grow flex items-center justify-center gap-2 text-slate-400 dark:text-gray-500 text-[11px]">
                    <Loader2 size={14} className="animate-spin" /> Cargando registros...
                </div>
            ) : (
            <div className="flex-grow overflow-auto">
                <table
                    className="text-left text-[11px] border-collapse"
                    style={{ tableLayout: 'fixed', width: anchoTotalTabla, minWidth: '100%' }}
                >
                    <ColgroupRedimensionable columnas={COLUMNAS} anchos={anchos} />
                    <thead className="bg-slate-100 dark:bg-gray-900/80 sticky top-0 z-10">
                        <tr className="text-slate-600 dark:text-gray-400 uppercase font-normal text-[10px] tracking-wider">
                            {th(0, 'Fecha')}
                            {th(1, 'Admisión')}
                            {th(2, 'Paciente')}
                            {th(3, 'Edad', 'text-center')}
                            {th(4, 'Cod.Art.')}
                            {th(5, 'Descripción')}
                            {th(6, 'Arancel')}
                            {th(7, 'Previsión / Isapre')}
                            {th(8, 'Cirujano')}
                            {th(9, 'Cant.', 'text-center')}
                            {th(10, 'Revisado', 'text-center')}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/60 dark:divide-gray-700/50 bg-white dark:bg-gray-800">
                        {reportesPagina.length === 0 ? (
                            <tr>
                                <td colSpan={COLUMNAS.length} className="px-4 py-6 text-center text-slate-400 dark:text-gray-500 text-xs">
                                    No hay registros disponibles para el período o filtros seleccionados.
                                </td>
                            </tr>
                        ) : (
                            reportesPagina.map((item) => {
                                const revisado = getRevisado(item);
                                return (
                                    <tr
                                        key={item.id}
                                        className="hover:bg-slate-50 dark:hover:bg-gray-700/40 transition-all duration-150 border-l-2 border-l-transparent hover:border-l-[#2383C2]"
                                    >
                                        <td className="px-2 py-1 border-b border-r border-slate-200/60 dark:border-gray-700/70 truncate text-slate-600 dark:text-gray-400">
                                            {item["Fecha"]}
                                        </td>
                                        <td className="px-2 py-1 border-b border-r border-slate-200/60 dark:border-gray-700/70 text-slate-700 dark:text-gray-200 font-normal truncate">
                                            {item["Admisión"]}
                                        </td>
                                        <td className="px-2 py-1 border-b border-r border-slate-200/60 dark:border-gray-700/70 text-slate-800 dark:text-gray-100 font-normal truncate" title={item["Paciente"]}>
                                            {item["Paciente"]}
                                        </td>
                                        <td className="px-2 py-1 border-b border-r border-slate-200/60 dark:border-gray-700/70 text-slate-600 dark:text-gray-400 text-center truncate">
                                            {item["Edad"]}
                                        </td>
                                        <td className="px-2 py-1 border-b border-r border-slate-200/60 dark:border-gray-700/70 text-slate-600 dark:text-gray-400 truncate">
                                            {item["Cod.Artículo"]}
                                        </td>
                                        <td className="px-2 py-1 border-b border-r border-slate-200/60 dark:border-gray-700/70 text-slate-700 dark:text-gray-300 truncate" title={item["Descripción"]}>
                                            {item["Descripción"]}
                                        </td>
                                        <td
                                            className="px-2 py-1 border-b border-r border-slate-200/60 dark:border-gray-700/70 text-slate-700 dark:text-gray-300 truncate"
                                            title={[item["Cód.Arancel"], item["Arancel"]].filter(Boolean).join(' — ')}
                                        >
                                            {item["Arancel"] || <span className="text-slate-400 dark:text-gray-500">-</span>}
                                        </td>
                                        <td className="px-2 py-1 border-b border-r border-slate-200/60 dark:border-gray-700/70 text-slate-600 dark:text-gray-400 truncate" title={`${item["Previsión"] || ''} - ${item["Isapre"] || ''}`}>
                                            {item["Previsión"]} {item["Isapre"] ? `(${item["Isapre"]})` : ''}
                                        </td>
                                        <td className="px-2 py-1 border-b border-r border-slate-200/60 dark:border-gray-700/70 text-slate-700 dark:text-gray-300 truncate" title={item["1° Cirujano"]}>
                                            {item["1° Cirujano"]}
                                        </td>
                                        <td className="px-2 py-1 border-b border-r border-slate-200/60 dark:border-gray-700/70 text-slate-800 dark:text-gray-100 text-center font-normal">
                                            {item["Cant.Art."]}
                                        </td>
                                        <td className="px-1.5 py-0.5 border-b border-slate-200/60 dark:border-gray-700/70 text-center">
                                            <select
                                                value={revisado}
                                                onChange={(e) => cambiarRevisado(item, e.target.value)}
                                                title={item.revisadoPor ? `Última modificación: ${item.revisadoPor}` : undefined}
                                                className={`w-full h-5 px-1 rounded-full border text-[10px] font-semibold outline-none cursor-pointer focus:ring-1 focus:ring-[#2383C2] ${CLASE_REVISADO[revisado]}`}
                                            >
                                                {OPCIONES_REVISADO.map(o => <option key={o} value={o}>{o}</option>)}
                                            </select>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
            )}

            <PaginacionSimple
                pagina={paginaActual}
                totalPaginas={totalPaginas}
                totalFilas={totalFilas}
                setPagina={setPagina}
                tamanoPagina={tamanoPagina}
                setTamanoPagina={setTamanoPagina}
            />

            {/* Totalizador Footer */}
            <div className="bg-slate-100 dark:bg-gray-900 border-t border-slate-200 dark:border-gray-700 p-2 flex items-center justify-between">
                <div className="text-[10px] text-slate-500 dark:text-gray-400">
                    Registros del mes: <strong className="text-slate-800 dark:text-gray-200 font-normal">{reportes.length}</strong>
                    {totalFilas !== reportes.length && <> · Filtrados: <strong className="text-slate-800 dark:text-gray-200 font-normal">{totalFilas}</strong></>}
                </div>
                <div className="flex items-center gap-1.5 text-[10px]">
                    {OPCIONES_REVISADO.map(o => (
                        <span key={o} className={`px-1.5 py-0.5 rounded-full border ${CLASE_REVISADO[o]}`}>
                            {o}: {conteoRevisado[o] || 0}
                        </span>
                    ))}
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