import React, { useState, useEffect, useRef, useCallback } from 'react';
import { collectionGroup, query, onSnapshot } from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import { FileSpreadsheet } from 'lucide-react';
import { useToast } from '../../../context/ToastContext';
import Spinner from '../../ui/Spinner';

// Mantenemos los mismos anchos iniciales para conservar la consistencia visual
const INITIAL_COL_WIDTHS = {
  num: 40, fechaCx: 100, admision: 100, paciente: 130, medico: 150,
  codigo: 100, descripcion: 200, cant: 60, precioCosto: 90,
  empresa: 160, modalidad: 110, estado: 110,
  registradoPor: 130, fechaRegistro: 110
};

const COL_KEYS = Object.keys(INITIAL_COL_WIDTHS);

function useColumnResize(initialWidths) {
  const [widths, setWidths] = useState(initialWidths);
  const resizingRef = useRef(null);

  const onMouseDown = useCallback((key, e) => {
    e.preventDefault();
    resizingRef.current = { key, startX: e.clientX, startWidth: widths[key] };

    const onMouseMove = (ev) => {
      if (!resizingRef.current) return;
      const delta = ev.clientX - resizingRef.current.startX;
      const newW  = Math.max(40, resizingRef.current.startWidth + delta);
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

const CargaConsigna = () => {
  const [solicitudes, setSolicitudes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const { showToast } = useToast();
  const { widths, onMouseDown: onColMouseDown } = useColumnResize(INITIAL_COL_WIDTHS);

  useEffect(() => {
    const qS = collectionGroup(db, "registros");

    const unsubscribe = onSnapshot(qS,
      (snap) => {
        const data = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          // Filtramos: Solo activos y que tengan estado estrictamente 'INGRESADO'
          .filter(d => d.active === true && d.estado === 'INGRESADO');
        
        setSolicitudes(data.sort((a, b) => b.fechaRegistro?.seconds - a.fechaRegistro?.seconds));
        setCargando(false);
      },
      (error) => {
        console.error("Error al cargar datos en CargaConsigna:", error);
        showToast("Error de acceso a datos.", "error");
        setCargando(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const formatearFecha = (fecha) => {
    if (!fecha) return 'N/A';
    const date = fecha.toDate ? fecha.toDate() : new Date(fecha);
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const TruncCell = ({ value, className = '' }) => (
    <div
      className={`truncate text-[12px] ${className}`}
      title={value || ''}
      style={{ maxWidth: '100%' }}
    >
      {value || 'N/A'}
    </div>
  );

  const thStyle = (key) => ({
    width:     widths[key],
    minWidth: widths[key],
    maxWidth: widths[key],
    position: 'relative',
    overflow: 'hidden',
    userSelect: 'none',
  });

  const tdStyle = (key) => ({
    width:     widths[key],
    minWidth: widths[key],
    maxWidth: widths[key],
    overflow: 'hidden',
  });

  const ResizeHandle = ({ colKey }) => (
    <div
      onMouseDown={(e) => onColMouseDown(colKey, e)}
      className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize hover:bg-[#2383C2]/60 active:bg-[#2383C2] z-20 transition-colors"
      title="Arrastrar para redimensionar"
    />
  );

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden relative transition-colors">
      {cargando && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm">
          <Spinner size="md" />
        </div>
      )}

      {/* Cabecera limpia */}
      <h2 className="text-[14px] font-bold text-gray-700 dark:text-gray-200 p-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
        <FileSpreadsheet size={16} className="text-[#2383C2] dark:text-[#369BCE]" /> 
        CARGA DE CONSIGNACIONES (INGRESADOS)
      </h2>

      {/* Tabla de Datos Directa */}
      <div className="flex-grow overflow-auto">
        <table className="text-left text-[12px] border-collapse table-fixed" style={{ width: 'max-content', minWidth: '100%' }}>
          <colgroup>
            {COL_KEYS.map(k => <col key={k} style={{ width: widths[k] }} />)}
          </colgroup>

          <thead className="bg-gray-100 dark:bg-gray-900 sticky top-0 z-10">
            <tr className="text-gray-600 dark:text-gray-400 uppercase font-bold text-[11px]">
              {[
                { key: 'num',           label: '#'             },
                { key: 'fechaCx',       label: 'Fecha Cx'      },
                { key: 'admision',      label: 'Admisión'      },
                { key: 'paciente',      label: 'Paciente'      },
                { key: 'medico',        label: 'Médico'        },
                { key: 'codigo',        label: 'Código'        },
                { key: 'descripcion',   label: 'Descripción'   },
                { key: 'cant',          label: 'Cant'          },
                { key: 'precioCosto',   label: 'P. Costo'      },
                { key: 'empresa',       label: 'Empresa'       },
                { key: 'modalidad',     label: 'Modalidad'     },
                { key: 'estado',        label: 'Estado'        },
                { key: 'registradoPor', label: 'Registrado Por'},
                { key: 'fechaRegistro', label: 'F. Registro'   },
              ].map(({ key, label }) => (
                <th
                  key={key}
                  style={thStyle(key)}
                  className="p-3 border-b border-r border-gray-200 dark:border-gray-700 overflow-hidden"
                >
                  <span className="truncate block">{label}</span>
                  <ResizeHandle colKey={key} />
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-200 dark:divide-gray-700 text-gray-700 dark:text-gray-200">
            {solicitudes.length === 0 ? (
              <tr>
                <td colSpan={COL_KEYS.length} className="p-8 text-center text-gray-400 italic text-[13px]">
                  No hay solicitudes en estado INGRESADO actualmente.
                </td>
              </tr>
            ) : (
              solicitudes.map((s, index) => (
                <tr
                  key={s.id}
                  className="border-l-4 border-transparent transition-colors hover:border-[#2383C2] hover:bg-gray-50/80 dark:hover:bg-gray-700/40"
                >
                  <td style={tdStyle('num')} className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-500 dark:text-gray-400 font-bold">{index + 1}</td>
                  <td style={tdStyle('fechaCx')} className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70"><TruncCell value={s.fechaCx} className="font-medium text-gray-700 dark:text-gray-200" /></td>
                  <td style={tdStyle('admision')} className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70"><TruncCell value={s.admision} className="text-gray-600 dark:text-gray-300" /></td>
                  <td style={tdStyle('paciente')} className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70"><TruncCell value={s.paciente} className="text-gray-600 dark:text-gray-300" /></td>
                  <td style={tdStyle('medico')} className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70"><TruncCell value={s.medico} className="text-gray-600 dark:text-gray-300" /></td>
                  <td style={tdStyle('codigo')} className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70 font-mono font-medium">
                    <TruncCell value={s.codigo} className="text-blue-600 dark:text-blue-400 font-mono" />
                  </td>
                  <td style={tdStyle('descripcion')} className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-600 dark:text-gray-300"><TruncCell value={s.descripcion} /></td>
                  <td style={tdStyle('cant')} className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70"><TruncCell value={s.cantidad?.toString()} className="text-gray-600 dark:text-gray-300" /></td>
                  <td style={tdStyle('precioCosto')} className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70"><TruncCell value={`$${s.precioCosto || '0'}`} className="text-gray-600 dark:text-gray-300" /></td>
                  <td style={tdStyle('empresa')} className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70"><TruncCell value={s.empresa || 'N/A'} className="text-gray-600 dark:text-gray-300" /></td>
                  <td style={tdStyle('modalidad')} className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${s.modalidad === 'COTIZACION' ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400' : 'bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-400'}`}>
                      {s.modalidad || 'CONSIGNACION'}
                    </span>
                  </td>
                  <td style={tdStyle('estado')} className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70">
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400">
                      {s.estado}
                    </span>
                  </td>
                  <td style={tdStyle('registradoPor')} className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70"><TruncCell value={s.registradoPor || 'N/A'} className="text-gray-500 dark:text-gray-400" /></td>
                  <td style={tdStyle('fechaRegistro')} className="p-3 border-b border-gray-200 dark:border-gray-700"><TruncCell value={formatearFecha(s.fechaRegistro)} className="text-gray-500 dark:text-gray-400" /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CargaConsigna;