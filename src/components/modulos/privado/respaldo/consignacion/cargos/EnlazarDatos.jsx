import React, { useState, useEffect, useRef, useCallback } from 'react';
import { collectionGroup, collection, doc, query, onSnapshot, getDocs, updateDoc, where } from 'firebase/firestore';
import { db } from '../../../../firebaseConfig';
import { Link2, Sparkles, AlertCircle, Play } from 'lucide-react';
import { useToast } from '../../../../context/ToastContext';
import Spinner from '../../../ui/Spinner';

const INITIAL_COL_WIDTHS = {
  num: 40,
  fechaCx: 100,
  admision: 100,
  paciente: 160,
  codigo: 90,
  descripcion: 180,
  empresa: 140,
  estado: 100
};

const COL_KEYS = Object.keys(INITIAL_COL_WIDTHS);
const COL_BASE = "documentos_reporte_pabellon";
const MESES_NOMBRES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

function useColumnResize(initialWidths) {
  const [widths, setWidths] = useState(initialWidths);
  const resizingRef = useRef(null);

  const onMouseDown = useCallback((key, e) => {
    e.preventDefault();
    resizingRef.current = { key, startX: e.clientX, startWidth: widths[key] };

    const onMouseMove = (ev) => {
      if (!resizingRef.current) return;
      const delta = ev.clientX - resizingRef.current.startX;
      const newW = Math.max(40, resizingRef.current.startWidth + delta);
      setWidths(prev => ({ ...prev, [resizingRef.current.key]: newW }));
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

const EnlazarDatos = () => {
  const [solicitudes, setSolicitudes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [procesandoTodo, setProcesandoTodo] = useState(false);
  const [progresoTexto, setProgresoTexto] = useState("");
  
  const { showToast } = useToast();
  const { widths, onMouseDown: onColMouseDown } = useColumnResize(INITIAL_COL_WIDTHS);

  // Escuchar solicitudes en estado INGRESADO
  useEffect(() => {
    const qS = collectionGroup(db, "registros");
    const unsubscribe = onSnapshot(qS, 
      (snap) => {
        const data = snap.docs
          .map(d => ({ 
            id: d.id, 
            refPath: d.ref.path, 
            ...d.data() 
          }))
          .filter(d => d.active === true && d.estado === 'INGRESADO');
        
        setSolicitudes(data.sort((a, b) => b.fechaRegistro?.seconds - a.fechaRegistro?.seconds));
        setCargando(false);
      },
      (error) => {
        console.error("Error en EnlazarDatos:", error);
        showToast("Error al cargar registros ingresados.", "error");
        setCargando(false);
      }
    );
    return () => unsubscribe();
  }, [showToast]);

  // Función para procesar y enlazar TODAS las filas en pantalla de forma masiva
  const handleEnlazarTodo = async () => {
    if (solicitudes.length === 0) return;
    
    setProcesandoTodo(true);
    let enlazadosExitosos = 0;
    let noEncontrados = 0;

    for (let i = 0; i < solicitudes.length; i++) {
      const registro = solicitudes[i];
      const { refPath, fechaCx, admision } = registro;

      setProgresoTexto(`Procesando fila ${i + 1} de ${solicitudes.length}... (Admisión: ${admision || 'N/A'})`);

      if (!fechaCx || !admision) {
        noEncontrados++;
        continue;
      }

      try {
        // 1. Parsear año y mes desde fechaCx (YYYY-MM-DD)
        const partes = String(fechaCx).trim().split('-');
        if (partes.length < 2) continue;
        
        const anio = partes[0];
        const mesIdx = parseInt(partes[1], 10) - 1;
        if (isNaN(mesIdx) || mesIdx < 0 || mesIdx > 11) continue;
        const nombreMes = MESES_NOMBRES[mesIdx];

        // 2. Consultar el Reporte de Pabellón correspondiente
        const pathRegistrosPlanos = `${COL_BASE}/${anio}/meses/${nombreMes}/registros_planos`;
        const qPabellon = query(
          collection(db, pathRegistrosPlanos), 
          where("Admisión", "==", String(admision).trim())
        );

        const snapPabellon = await getDocs(qPabellon);

        if (snapPabellon.empty) {
          noEncontrados++;
          continue;
        }

        // Extraer la primera coincidencia válida del reporte masivo
        const datosPabellon = snapPabellon.docs[0].data();
        const isapreExtraida = datosPabellon["Isapre"] || "N/A";
        const convenioExtraido = datosPabellon["Convenio"] || "N/A";
        const descripcionPabellon = datosPabellon["Descripción"] || "N/A";

        // 3. Modificar el documento original
        const docRefOriginal = doc(db, refPath);
        await updateDoc(docRefOriginal, {
          isapre: isapreExtraida,
          convenio: convenioExtraido,
          descripcionPabellon: descripcionPabellon,
          estado: 'ENLAZADO',
          fechaEnlace: new Date()
        });

        enlazadosExitosos++;
      } catch (err) {
        console.error(`Error procesando admisión ${admision}:`, err);
      }
    }

    setProcesandoTodo(false);
    setProgresoTexto("");

    // Feedback final al usuario
    if (enlazadosExitosos > 0) {
      showToast(`Proceso masivo completado. Se enlazaron exitosamente ${enlazadosExitosos} registros.`, "success");
    }
    if (noEncontrados > 0) {
      showToast(`${noEncontrados} registros no encontraron coincidencias en el Reporte de Pabellón.`, "info");
    }
  };

  const TruncCell = ({ value, className = '' }) => (
    <div className={`truncate text-[12px] ${className}`} title={value || ''} style={{ maxWidth: '100%' }}>
      {value || 'N/A'}
    </div>
  );

  const thStyle = (key) => ({
    width: widths[key], minWidth: widths[key], maxWidth: widths[key],
    position: 'relative', overflow: 'hidden', userSelect: 'none',
  });

  const tdStyle = (key) => ({
    width: widths[key], minWidth: widths[key], maxWidth: widths[key], overflow: 'hidden',
  });

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden relative transition-colors">
      {(cargando || procesandoTodo) && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
          <Spinner size="md" color="#6366f1" />
          {procesandoTodo && (
            <p className="mt-3 text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider animate-pulse">
              {progresoTexto}
            </p>
          )}
        </div>
      )}

      {/* Cabecera limpia con Botón de Proceso Masivo */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-[14px] font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2">
          <Link2 size={16} className="text-indigo-500 dark:text-indigo-400" /> 
          CONCILIACIÓN Y ENLACE DE DATOS
        </h2>
        
        {solicitudes.length > 0 && (
          <button
            onClick={handleEnlazarTodo}
            disabled={procesandoTodo}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-1.5 px-3 rounded text-[11px] flex items-center gap-1.5 transition shadow-sm uppercase tracking-wider disabled:bg-gray-300 dark:disabled:bg-gray-700"
          >
            <Sparkles size={13} /> Enlazar Todos los Registros ({solicitudes.length})
          </button>
        )}
      </div>

      {/* Tabla */}
      <div className="flex-grow overflow-auto">
        <table className="text-left text-[12px] border-collapse table-fixed" style={{ width: 'max-content', minWidth: '100%' }}>
          <colgroup>
            {COL_KEYS.map(k => <col key={k} style={{ width: widths[k] }} />)}
          </colgroup>

          <thead className="bg-gray-100 dark:bg-gray-900 sticky top-0 z-10">
            <tr className="text-gray-600 dark:text-gray-400 uppercase font-bold text-[11px]">
              {[
                { key: 'num', label: '#' },
                { key: 'fechaCx', label: 'Fecha Cx' },
                { key: 'admision', label: 'Admisión' },
                { key: 'paciente', label: 'Paciente' },
                { key: 'codigo', label: 'Código' },
                { key: 'descripcion', label: 'Descripción' },
                { key: 'empresa', label: 'Empresa' },
                { key: 'estado', label: 'Estado' },
              ].map(({ key, label }) => (
                <th key={key} style={thStyle(key)} className="p-3 border-b border-r border-gray-200 dark:border-gray-700 overflow-hidden">
                  <span className="truncate block">{label}</span>
                  <div onMouseDown={(e) => onColMouseDown(key, e)} className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize hover:bg-indigo-500/60 active:bg-indigo-500 z-20 transition-colors" />
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-200 dark:divide-gray-700 text-gray-700 dark:text-gray-200">
            {solicitudes.length === 0 ? (
              <tr>
                <td colSpan={COL_KEYS.length} className="p-8 text-center text-gray-400 italic text-[13px]">
                  <div className="flex flex-col items-center gap-2 justify-center">
                    <AlertCircle size={20} className="text-gray-300 animate-bounce" />
                    <span>No hay solicitudes pendientes en estado INGRESADO actualmente.</span>
                  </div>
                </td>
              </tr>
            ) : (
              solicitudes.map((s, index) => (
                <tr key={s.id} className="border-l-4 border-transparent transition-colors hover:border-indigo-500 hover:bg-gray-50/80 dark:hover:bg-gray-700/40">
                  <td style={tdStyle('num')} className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-500 dark:text-gray-400 font-bold">{index + 1}</td>
                  <td style={tdStyle('fechaCx')} className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70 font-medium text-gray-700 dark:text-gray-200"><TruncCell value={s.fechaCx} /></td>
                  <td style={tdStyle('admision')} className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70 font-semibold"><TruncCell value={s.admision} /></td>
                  <td style={tdStyle('paciente')} className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-600 dark:text-gray-300"><TruncCell value={s.paciente} /></td>
                  <td style={tdStyle('codigo')} className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70 font-mono"><TruncCell value={s.codigo} className="text-blue-600 dark:text-blue-400" /></td>
                  <td style={tdStyle('descripcion')} className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-600 dark:text-gray-300"><TruncCell value={s.descripcion} /></td>
                  <td style={tdStyle('empresa')} className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-600 dark:text-gray-300"><TruncCell value={s.empresa} /></td>
                  <td style={tdStyle('estado')} className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70">
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400">
                      {s.estado}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default EnlazarDatos;