import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import {
  BarChart3, ChevronDown, ChevronRight, PackageOpen,
  CalendarRange, FolderOpen, Inbox
} from 'lucide-react';
import { useToast } from '../../../context/ToastContext';
import Spinner from '../../ui/Spinner';

// 1. Configuración de anchos iniciales con las 4 nuevas columnas agregadas al principio
const INITIAL_COL_WIDTHS = {
  num: 50,
  orden: 100,       // Nueva columna
  despacho: 100,    // Nueva columna
  guia: 100,        // Nueva columna
  factura: 100,     // Nueva columna
  admision: 100,
  paciente: 220,
  medico: 200,
  fecha: 100,
  codigo: 110,
  descripcion: 240,
  cantidad: 60,
  precioCosto: 90,
  atributo: 100,
  lote: 90,
  fechaVencimiento: 90,
  delivery: 130,
  folioGuia: 110,
  referencia: 150,
  fechaExportacion: 140,
};

const COL_KEYS = Object.keys(INITIAL_COL_WIDTHS);

const OMITIR_DESCRIPCIONES = ["KITMANGACRL", "KITBYPASSTCRL2", "KITBYPASSTCRL"];

const MESES_LABEL = {
  '01': 'Enero', '02': 'Febrero', '03': 'Marzo', '04': 'Abril',
  '05': 'Mayo', '06': 'Junio', '07': 'Julio', '08': 'Agosto',
  '09': 'Septiembre', '10': 'Octubre', '11': 'Noviembre', '12': 'Diciembre'
};

const limpiarCodigo = (codigo) => {
  if (!codigo) return 'N/A';
  return codigo.toString().trim().split(' ')[0].replace(/_+$/, '');
};

const formatMoneda = (valor) => {
  if (valor === undefined || valor === null || isNaN(valor)) return '$0';
  return `$${Number(valor).toLocaleString('es-CL')}`;
};

const formatFechaExportacion = (valor) => {
  if (!valor) return 'N/A';
  try {
    const d = typeof valor.toDate === 'function' ? valor.toDate() : new Date(valor.seconds * 1000);
    return d.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return 'N/A';
  }
};

function useColumnResize(initialWidths) {
  const [widths, setWidths] = useState(initialWidths);
  const resizingRef = useRef(null);

  const onMouseDown = useCallback((key, e) => {
    e.preventDefault();
    resizingRef.current = { key, startX: e.clientX, startWidth: widths[key] };

    const onMouseMove = (ev) => {
      if (!resizingRef.current || !resizingRef.current.key) return;
      const delta = ev.clientX - resizingRef.current.startX;
      const newW = Math.max(30, resizingRef.current.startWidth + delta);

      if (!isNaN(newW)) {
        setWidths(prev => {
          if (!resizingRef.current || !resizingRef.current.key) return prev;
          return { ...prev, [resizingRef.current.key]: newW };
        });
      }
    };

    const onMouseUp = () => {
      resizingRef.current = null;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, [widths]);

  return { widths, onMouseDown };
}

const Seguimiento = () => {
  const { showToast } = useToast();
  const { widths, onMouseDown: onColMouseDown } = useColumnResize(INITIAL_COL_WIDTHS);

  const [anios, setAnios] = useState([]);
  const [cargandoAnios, setCargandoAnios] = useState(true);
  const [anioSeleccionado, setAnioSeleccionado] = useState('');

  const [meses, setMeses] = useState([]);
  const [cargandoMeses, setCargandoMeses] = useState(false);
  const [mesSeleccionado, setMesSeleccionado] = useState('');

  const [registros, setRegistros] = useState([]);
  const [cargandoRegistros, setCargandoRegistros] = useState(false);

  const [expandedRows, setExpandedRows] = useState([]);

  // 1. Escuchar los años disponibles en consignacion_historial
  useEffect(() => {
    const qAnios = collection(db, "consignacion_historial");
    const unsubscribe = onSnapshot(
      qAnios,
      (snap) => {
        const lista = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => b.id.localeCompare(a.id));
        setAnios(lista);
        setCargandoAnios(false);
      },
      (error) => {
        console.error("Error al cargar años de consignacion_historial:", error);
        showToast("Error al cargar el historial de consignación.", "error");
        setCargandoAnios(false);
      }
    );
    return () => unsubscribe();
  }, [showToast]);

  // 2. Al elegir un año, escuchar sus meses
  useEffect(() => {
    setMeses([]);
    setMesSeleccionado('');
    setRegistros([]);

    if (!anioSeleccionado) return;

    setCargandoMeses(true);
    const qMeses = collection(db, "consignacion_historial", anioSeleccionado, "meses");
    const unsubscribe = onSnapshot(
      qMeses,
      (snap) => {
        const lista = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => a.id.localeCompare(b.id));
        setMeses(lista);
        setCargandoMeses(false);
      },
      (error) => {
        console.error("Error al cargar meses:", error);
        showToast("Error al cargar los meses del año seleccionado.", "error");
        setCargandoMeses(false);
      }
    );
    return () => unsubscribe();
  }, [anioSeleccionado, showToast]);

  // 3. Al elegir un mes, escuchar sus registros (datos)
  useEffect(() => {
    setRegistros([]);
    setExpandedRows([]);

    if (!anioSeleccionado || !mesSeleccionado) return;

    setCargandoRegistros(true);
    const qDatos = collection(db, "consignacion_historial", anioSeleccionado, "meses", mesSeleccionado, "datos");
    const unsubscribe = onSnapshot(
      qDatos,
      (snap) => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setRegistros(data.sort((a, b) => (b.fechaExportacion?.seconds || 0) - (a.fechaExportacion?.seconds || 0)));
        setCargandoRegistros(false);
      },
      (error) => {
        console.error("Error al cargar registros del mes:", error);
        showToast("Error al cargar los registros del mes seleccionado.", "error");
        setCargandoRegistros(false);
      }
    );
    return () => unsubscribe();
  }, [anioSeleccionado, mesSeleccionado, showToast]);

  const toggleRowExpand = (id) => {
    setExpandedRows(prev =>
      prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]
    );
  };

  // Resumen numérico del mes seleccionado
  const totales = useMemo(() => {
    const totalRegistros = registros.length;
    const totalCantidad = registros.reduce((acc, r) => acc + (Number(r.cantidad) || 0), 0);
    const totalValorizado = registros.reduce(
      (acc, r) => acc + ((Number(r.cantidad) || 0) * (Number(r.precioCosto) || 0)),
      0
    );
    return { totalRegistros, totalCantidad, totalValorizado };
  }, [registros]);

  const TruncCell = ({ value, className = '' }) => (
    <div className={`truncate text-[12px] ${className}`} title={value || ''} style={{ maxWidth: '100%' }}>
      {value || 'N/A'}
    </div>
  );

  const thStyle = (key) => ({
    width: widths[key] || INITIAL_COL_WIDTHS[key],
    minWidth: widths[key] || INITIAL_COL_WIDTHS[key],
    maxWidth: widths[key] || INITIAL_COL_WIDTHS[key],
    position: 'relative', overflow: 'hidden', userSelect: 'none',
  });

  const tdStyle = (key) => ({
    width: widths[key] || INITIAL_COL_WIDTHS[key],
    minWidth: widths[key] || INITIAL_COL_WIDTHS[key],
    maxWidth: widths[key] || INITIAL_COL_WIDTHS[key],
    overflow: 'hidden',
  });

  const isHighlightedToken = (key) => ['codigo', 'cantidad', 'lote', 'fechaVencimiento'].includes(key);

  // 2. Array de Columnas con las nuevas incorporaciones ordenadas al inicio
  const COLUMNAS = [
    { key: 'num', label: '#' },
    { key: 'orden', label: 'Orden' },           // Nueva
    { key: 'despacho', label: 'Despacho' },     // Nueva
    { key: 'guia', label: 'Guía' },             // Nueva
    { key: 'factura', label: 'Factura' },       // Nueva
    { key: 'admision', label: 'Admisión' },
    { key: 'paciente', label: 'Paciente' },
    { key: 'medico', label: 'Médico' },
    { key: 'fecha', label: 'Fecha Cx' },
    { key: 'codigo', label: 'CÓDIGO' },
    { key: 'descripcion', label: 'DESCRIPCIÓN' },
    { key: 'cantidad', label: 'CANTI' },
    { key: 'precioCosto', label: 'PRECIO COST' },
    { key: 'atributo', label: 'ATRIBUTO' },
    { key: 'lote', label: 'LOTE' },
    { key: 'fechaVencimiento', label: 'F. VENCIMIENTO' },
    { key: 'delivery', label: 'DELIVERY' },
    { key: 'folioGuia', label: 'GUÍAS (FOLIO)' },
    { key: 'referencia', label: 'REFERENCIA' },
    { key: 'fechaExportacion', label: 'ARCHIVADO EL' },
  ];

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden relative transition-colors">
      {/* Cabecera de Módulo */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between gap-3 bg-gray-50/50 dark:bg-gray-900/20">
        <h2 className="text-[14px] font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2">
          <BarChart3 size={16} className="text-rose-500 dark:text-rose-400" />
          SEGUIMIENTO DE CONSIGNACIÓN (HISTORIAL)
        </h2>

        {/* Selectores Año / Mes */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <CalendarRange size={14} className="text-gray-400 dark:text-gray-500" />
            <select
              value={anioSeleccionado}
              onChange={(e) => setAnioSeleccionado(e.target.value)}
              disabled={cargandoAnios || anios.length === 0}
              className="text-[12px] font-semibold bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-rose-400 disabled:opacity-50"
            >
              <option value="">
                {cargandoAnios ? 'Cargando...' : (anios.length === 0 ? 'Sin años' : 'Seleccionar año')}
              </option>
              {anios.map(a => (
                <option key={a.id} value={a.id}>{a.anio || a.id}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <FolderOpen size={14} className="text-gray-400 dark:text-gray-500" />
            <select
              value={mesSeleccionado}
              onChange={(e) => setMesSeleccionado(e.target.value)}
              disabled={!anioSeleccionado || cargandoMeses || meses.length === 0}
              className="text-[12px] font-semibold bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-rose-400 disabled:opacity-50"
            >
              <option value="">
                {!anioSeleccionado
                  ? 'Elige un año primero'
                  : (cargandoMeses ? 'Cargando...' : (meses.length === 0 ? 'Sin meses' : 'Seleccionar mes'))}
              </option>
              {meses.map(m => (
                <option key={m.id} value={m.id}>{MESES_LABEL[m.id] || m.id}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Resumen numérico */}
      {anioSeleccionado && mesSeleccionado && registros.length > 0 && (
        <div className="px-4 py-2.5 border-b border-gray-200 dark:border-gray-700 flex flex-wrap gap-2 bg-white dark:bg-gray-800">
          <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 rounded-md px-3 py-1.5">
            <span className="text-[10px] uppercase tracking-wide text-rose-500 dark:text-rose-400 font-bold block">Registros</span>
            <span className="text-[13px] font-extrabold text-rose-700 dark:text-rose-300">{totales.totalRegistros}</span>
          </div>
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-md px-3 py-1.5">
            <span className="text-[10px] uppercase tracking-wide text-amber-600 dark:text-amber-400 font-bold block">Cantidad Total</span>
            <span className="text-[13px] font-extrabold text-amber-700 dark:text-amber-300">{totales.totalCantidad}</span>
          </div>
          <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/40 rounded-md px-3 py-1.5">
            <span className="text-[10px] uppercase tracking-wide text-green-600 dark:text-green-400 font-bold block">Valorizado</span>
            <span className="text-[13px] font-extrabold text-green-700 dark:text-green-300">{formatMoneda(totales.totalValorizado)}</span>
          </div>
        </div>
      )}

      {/* Cuerpo: estados vacíos o tabla */}
      <div className="flex-grow overflow-auto relative">
        {cargandoRegistros && (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm">
            <Spinner size="md" />
          </div>
        )}

        {!anioSeleccionado ? (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <div className="p-3 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-full mb-3">
              <BarChart3 size={28} />
            </div>
            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wide">
              Seguimiento de Consignación
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-xs">
              Selecciona un año para explorar los meses archivados y ver los registros del historial.
            </p>
          </div>
        ) : !mesSeleccionado ? (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <div className="p-3 bg-gray-100 dark:bg-gray-900/40 text-gray-400 dark:text-gray-500 rounded-full mb-3">
              <FolderOpen size={28} />
            </div>
            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wide">
              Elige un mes
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-xs">
              Ya seleccionaste el año {anioSeleccionado}. Ahora elige un mes para ver los registros archivados.
            </p>
          </div>
        ) : registros.length === 0 && !cargandoRegistros ? (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <div className="p-3 bg-gray-100 dark:bg-gray-900/40 text-gray-400 dark:text-gray-500 rounded-full mb-3">
              <Inbox size={28} />
            </div>
            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wide">
              Sin registros
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-xs">
              No hay registros archivados para {MESES_LABEL[mesSeleccionado] || mesSeleccionado} de {anioSeleccionado}.
            </p>
          </div>
        ) : (
          <table className="text-left text-[12px] border-collapse table-fixed" style={{ width: 'max-content', minWidth: '100%' }}>
            <colgroup>
              {COL_KEYS.map(k => <col key={k} style={{ width: widths[k] || INITIAL_COL_WIDTHS[k] }} />)}
            </colgroup>

            <thead className="bg-gray-100 dark:bg-gray-900 sticky top-0 z-10">
              <tr className="text-gray-600 dark:text-gray-400 uppercase font-bold text-[11px]">
                {COLUMNAS.map(({ key, label }) => {
                  const isSpecial = isHighlightedToken(key);
                  return (
                    <th
                      key={key}
                      style={thStyle(key)}
                      className={[
                        "p-3 border-b border-r border-gray-200 dark:border-gray-700 overflow-hidden transition-colors",
                        isSpecial
                          ? "bg-amber-100/60 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 font-extrabold border-r-gray-300 dark:border-r-gray-600"
                          : ""
                      ].join(' ')}
                    >
                      <span className="truncate block">{label}</span>
                      <div
                        onMouseDown={(e) => onColMouseDown(key, e)}
                        className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize hover:bg-rose-500/60 active:bg-rose-500 z-20 transition-colors"
                      />
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 text-gray-700 dark:text-gray-200">
              {registros.map((r, index) => {
                const subfilas = Array.isArray(r.subfilasGuia) ? r.subfilasGuia.filter(det => {
                  const texto = `${det.nombre || ''} ${det.dscItem || ''} ${det.codigo || ''}`.toUpperCase();
                  return !OMITIR_DESCRIPCIONES.some(termino => texto.includes(termino));
                }) : [];
                const tieneSubfilas = subfilas.length > 0;
                const isExpanded = expandedRows.includes(r.id);

                return (
                  <React.Fragment key={r.id}>
                    <tr className="border-l-4 border-transparent transition-colors hover:bg-gray-50/80 dark:hover:bg-gray-700/40">
                      {/* Columna # con botón de despliegue */}
                      <td style={tdStyle('num')} className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-500 dark:text-gray-400 font-bold flex items-center justify-between gap-1">
                        <span>{index + 1}</span>
                        {tieneSubfilas && (
                          <button
                            type="button"
                            onClick={() => toggleRowExpand(r.id)}
                            className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors text-rose-600 dark:text-rose-400 focus:outline-none"
                            title="Ver ítems de la guía asignada"
                          >
                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </button>
                        )}
                      </td>

                      {/* 3. Renderizado de las 4 nuevas celdas en el cuerpo principal */}
                      <td style={tdStyle('orden')} className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70 font-semibold text-gray-700 dark:text-gray-200">
                        <TruncCell value={r.orden} />
                      </td>
                      <td style={tdStyle('despacho')} className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70 font-semibold text-gray-700 dark:text-gray-200">
                        <TruncCell value={r.despacho} />
                      </td>
                      <td style={tdStyle('guia')} className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70 font-semibold text-gray-700 dark:text-gray-200">
                        <TruncCell value={r.guia} />
                      </td>
                      <td style={tdStyle('factura')} className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70 font-semibold text-gray-700 dark:text-gray-200">
                        <TruncCell value={r.factura} />
                      </td>

                      {/* Columnas originales */}
                      <td style={tdStyle('admision')} className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70 font-bold text-gray-800 dark:text-gray-100"><TruncCell value={r.admision} /></td>
                      <td style={tdStyle('paciente')} className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-600 dark:text-gray-300"><TruncCell value={r.paciente} /></td>
                      <td style={tdStyle('medico')} className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-600 dark:text-gray-300"><TruncCell value={r.medico} /></td>
                      <td style={tdStyle('fecha')} className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70"><TruncCell value={r.fecha || r.fechaCx} /></td>

                      <td style={tdStyle('codigo')} className="p-3 border-b border-r border-gray-300 dark:border-gray-600 bg-amber-50/10 dark:bg-amber-950/5 font-mono text-amber-600 dark:text-amber-400 font-bold">
                        <TruncCell value={limpiarCodigo(r.codigo)} />
                      </td>

                      <td style={tdStyle('descripcion')} className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-600 dark:text-gray-300">
                        <TruncCell value={r.descripcion} />
                      </td>

                      <td style={tdStyle('grid_cantidad_fila')} style={tdStyle('cantidad')} className="p-3 border-b border-r border-gray-300 dark:border-gray-600 bg-amber-50/10 dark:bg-amber-950/5 text-center font-bold text-gray-800 dark:text-gray-200"><TruncCell value={r.cantidad?.toString()} /></td>
                      <td style={tdStyle('precioCosto')} className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70 font-medium text-gray-700 dark:text-gray-200 text-right"><TruncCell value={formatMoneda(r.precioCosto)} /></td>
                      <td style={tdStyle('atributo')} className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-600 dark:text-gray-300"><TruncCell value={r.atributo} /></td>

                      <td style={tdStyle('lote')} className="p-3 border-b border-r border-gray-300 dark:border-gray-600 bg-amber-50/10 dark:bg-amber-950/5 font-mono font-bold text-gray-700 dark:text-gray-200"><TruncCell value={r.lote} /></td>
                      <td style={tdStyle('fechaVencimiento')} className="p-3 border-b border-r border-gray-300 dark:border-gray-600 bg-amber-50/10 dark:bg-amber-950/5 text-center font-semibold text-gray-700 dark:text-gray-200"><TruncCell value={r.fechaVencimiento} /></td>

                      <td style={tdStyle('delivery')} className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70 font-bold text-amber-600 dark:text-amber-400"><TruncCell value={r.delivery} /></td>

                      <td style={tdStyle('folioGuia')} className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70 font-bold text-green-600 dark:text-green-400 bg-green-50/5 dark:bg-green-950/5">
                        <TruncCell value={r.folioGuiaAsociada} />
                      </td>

                      <td style={tdStyle('referencia')} className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-600 dark:text-gray-300"><TruncCell value={r.referencia} /></td>

                      <td style={tdStyle('fechaExportacion')} className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-500 dark:text-gray-400 text-[11px]">
                        <TruncCell value={formatFechaExportacion(r.fechaExportacion)} />
                      </td>
                    </tr>

                    {/* Subfilas Anidadas de la Guía */}
                    {tieneSubfilas && isExpanded && (
                      subfilas.map((det, detIdx) => (
                        <tr
                          key={`${r.id}-det-${detIdx}`}
                          className="bg-blue-50/20 dark:bg-blue-950/5 border-l-4 border-blue-400 dark:border-blue-500/60 transition-colors hover:bg-blue-50/40 dark:hover:bg-blue-950/10 text-gray-500 dark:text-gray-400 opacity-75"
                        >
                          <td style={tdStyle('num')} className="p-2 border-b border-r border-gray-100 dark:border-gray-700/40 text-center text-blue-500 dark:text-blue-400 font-mono text-[10px]">
                            {detIdx === 0 && <PackageOpen size={12} className="inline-block mx-auto" />}
                          </td>

                          {/* 4. Renderizado de las 4 nuevas celdas correspondientes en la subfila */}
                          <td style={tdStyle('orden')} className="p-2 border-b border-r border-gray-100 dark:border-gray-700/40"><TruncCell value={r.orden} /></td>
                          <td style={tdStyle('despacho')} className="p-2 border-b border-r border-gray-100 dark:border-gray-700/40"><TruncCell value={r.despacho} /></td>
                          <td style={tdStyle('guia')} className="p-2 border-b border-r border-gray-100 dark:border-gray-700/40"><TruncCell value={r.guia} /></td>
                          <td style={tdStyle('factura')} className="p-2 border-b border-r border-gray-100 dark:border-gray-700/40"><TruncCell value={r.factura} /></td>

                          {/* Celdas originales de la subfila */}
                          <td style={tdStyle('admision')} className="p-2 border-b border-r border-gray-100 dark:border-gray-700/40 font-medium"><TruncCell value={r.admision} /></td>
                          <td style={tdStyle('paciente')} className="p-2 border-b border-r border-gray-100 dark:border-gray-700/40"><TruncCell value={r.paciente} /></td>
                          <td style={tdStyle('medico')} className="p-2 border-b border-r border-gray-100 dark:border-gray-700/40"><TruncCell value={r.medico} /></td>
                          <td style={tdStyle('fecha')} className="p-2 border-b border-r border-gray-100 dark:border-gray-700/40"><TruncCell value={r.fecha || r.fechaCx} /></td>

                          <td style={tdStyle('codigo')} className="p-2 border-b border-r border-gray-100 dark:border-gray-700/40 text-[11px] font-semibold text-gray-400 italic">
                            <TruncCell value="No lleva OC" />
                          </td>

                          <td style={tdStyle('descripcion')} className="p-2 border-b border-r border-gray-100 dark:border-gray-700/40 text-[11px] text-gray-600 dark:text-gray-300 font-medium">
                            <TruncCell value={det.descripcionResuelta || 'registrar en codigos'} />
                          </td>

                          <td style={tdStyle('cantidad')} className="p-2 border-b border-r border-blue-200/50 dark:border-blue-900/30 text-center font-bold text-blue-700 dark:text-blue-400 bg-blue-50/10 dark:bg-blue-950/5 opacity-100">
                            <TruncCell value={det.cantidad?.toString()} />
                          </td>

                          <td style={tdStyle('precioCosto')} className="p-2 border-b border-r border-gray-100 dark:border-gray-700/40 text-right text-gray-400">
                            <TruncCell value="0" />
                          </td>

                          <td style={tdStyle('atributo')} className="p-2 border-b border-r border-gray-100 dark:border-gray-700/40">
                            <TruncCell value={r.atributo} />
                          </td>

                          <td style={tdStyle('lote')} className="p-2 border-b border-r border-blue-200/50 dark:border-blue-900/30 font-mono text-gray-700 dark:text-gray-200 bg-blue-50/10 dark:bg-blue-950/5 opacity-100">
                            <TruncCell value={det.dscItem} />
                          </td>
                          <td style={tdStyle('fechaVencimiento')} className="p-2 border-b border-r border-blue-200/50 dark:border-blue-900/30 text-center text-gray-700 dark:text-gray-200 bg-blue-50/10 dark:bg-blue-950/5 opacity-100">
                            <TruncCell value={det.fchVenc} />
                          </td>

                          <td style={tdStyle('delivery')} className="p-2 border-b border-r border-gray-100 dark:border-gray-700/40 font-bold text-amber-600 dark:text-amber-400 opacity-100">
                            <TruncCell value={r.delivery} />
                          </td>
                          <td style={tdStyle('folioGuia')} className="p-2 border-b border-r border-gray-100 dark:border-gray-700/40 font-bold text-green-600 dark:text-green-400 bg-green-50/5 dark:bg-green-950/5 opacity-100">
                            <TruncCell value={r.folioGuiaAsociada} />
                          </td>

                          <td style={tdStyle('referencia')} className="p-2 border-b border-r border-blue-200/50 dark:border-blue-900/30 font-mono text-blue-600 dark:text-blue-400 font-bold bg-blue-50/10 dark:bg-blue-950/5 opacity-100">
                            <TruncCell value={det.codigoLimpio || limpiarCodigo(det.codigo)} />
                          </td>

                          <td style={tdStyle('fechaExportacion')} className="p-2 border-b border-r border-gray-100 dark:border-gray-700/40"></td>
                        </tr>
                      ))
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Seguimiento;