import React, { useState, useEffect, useRef, useCallback } from 'react';
import { collectionGroup, writeBatch, doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../../../firebaseConfig';
import { Truck, CheckSquare, Square, RefreshCw } from 'lucide-react';
import { useToast } from '../../../../context/ToastContext';
import Spinner from '../../../ui/Spinner';

// Configuración de anchos iniciales exclusiva para las 11 columnas solicitadas
const INITIAL_COL_WIDTHS = {
  select: 40,
  num: 45,
  admision: 100,
  paciente: 220,
  medico: 200,
  fecha: 100,
  codigo: 110,
  descripcion: 240,
  cantidad: 80,
  precioCosto: 110,
  atributo: 100,
  lote: 110,
  fechaVencimiento: 120
};

const COL_KEYS = Object.keys(INITIAL_COL_WIDTHS);

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

const Delivery = () => {
  const [solicitudes, setSolicitudes] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [procesandoAccion, setProcesandoAccion] = useState(false);
  const { showToast } = useToast();
  const { widths, onMouseDown: onColMouseDown } = useColumnResize(INITIAL_COL_WIDTHS);

  // Escuchar solicitudes en estado INGRESAR L/F
  useEffect(() => {
    const qS = collectionGroup(db, "registros");

    const unsubscribe = onSnapshot(qS,
      (snap) => {
        const data = snap.docs
          .map(d => ({ 
            id: d.id, 
            path: d.ref.path, 
            ...d.data() 
          }))
          .filter(d => d.active === true && d.estado === 'INGRESAR L/F');
        
        setSolicitudes(data.sort((a, b) => b.fechaRegistro?.seconds - a.fechaRegistro?.seconds));
        setSelectedIds(prev => prev.filter(id => data.some(s => s.id === id)));
        setCargando(false);
      },
      (error) => {
        console.error("Error al cargar datos en Delivery:", error);
        showToast("Error de acceso a datos de despacho.", "error");
        setCargando(false);
      }
    );

    return () => unsubscribe();
  }, [showToast]);

  const handleSelectAll = () => {
    if (selectedIds.length === solicitudes.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(solicitudes.map(s => s.id));
    }
  };

  const handleSelectRow = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleDespacharMasivo = async () => {
    if (selectedIds.length === 0) return;
    
    setProcesandoAccion(true);
    try {
      const batch = writeBatch(db);
      
      selectedIds.forEach(id => {
        const item = solicitudes.find(s => s.id === id);
        if (item && item.path) {
          const docRef = doc(db, item.path);
          batch.update(docRef, { 
            estado: 'DESPACHADO', 
            fechaModificacion: new Date()
          });
        }
      });

      await batch.commit();
      showToast(`${selectedIds.length} registro(s) procesado(s) con éxito.`, "success");
      setSelectedIds([]);
    } catch (error) {
      console.error("Error en acción masiva de Delivery:", error);
      showToast("No se pudieron actualizar los registros.", "error");
    } finally {
      setProcesandoAccion(false);
    }
  };

  const formatMoneda = (valor) => {
    if (valor === undefined || valor === null || isNaN(valor)) return '$0';
    return `$${Number(valor).toLocaleString('es-CL')}`;
  };

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

  // Mantenemos destacado visual el bloque central crítico
  const isHighlightedToken = (key) => ['codigo', 'cantidad', 'lote', 'fechaVencimiento'].includes(key);

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden relative transition-colors">
      {(cargando || procesandoAccion) && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm">
          <Spinner size="md" />
        </div>
      )}

      {/* Cabecera de Módulo */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between gap-2 bg-gray-50/50 dark:bg-gray-900/20">
        <h2 className="text-[14px] font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2">
          <Truck size={16} className="text-amber-500 dark:text-amber-400" /> 
          DESPACHO / DELIVERY (INGRESAR L/F)
        </h2>

        {selectedIds.length > 0 && (
          <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-md">
            <span className="text-[12px] font-semibold text-amber-700 dark:text-amber-400">
              {selectedIds.length} fila(s) seleccionada(s)
            </span>
            <button
              onClick={handleDespacharMasivo}
              className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-[11px] uppercase tracking-wider px-3 py-1.5 rounded shadow-sm transition-all active:scale-95"
            >
              <RefreshCw size={12} className={procesandoAccion ? "animate-spin" : ""} />
              Procesar Despacho
            </button>
          </div>
        )}
      </div>

      {/* Tabla */}
      <div className="flex-grow overflow-auto">
        <table className="text-left text-[12px] border-collapse table-fixed" style={{ width: 'max-content', minWidth: '100%' }}>
          <colgroup>
            {COL_KEYS.map(k => <col key={k} style={{ width: widths[k] || INITIAL_COL_WIDTHS[k] }} />)}
          </colgroup>

          <thead className="bg-gray-100 dark:bg-gray-900 sticky top-0 z-10">
            <tr className="text-gray-600 dark:text-gray-400 uppercase font-bold text-[11px]">
              {[
                { key: 'select', label: '' },
                { key: 'num', label: '#' },
                { key: 'admision', label: 'Admisión' },
                { key: 'paciente', label: 'Paciente' },
                { key: 'medico', label: 'Médico' },
                { key: 'fecha', label: 'Fecha' },
                { key: 'codigo', label: 'CÓDIGO' },
                { key: 'descripcion', label: 'DESCRIPCIÓN' },
                { key: 'cantidad', label: 'CANTI' },
                { key: 'precioCosto', label: 'PRECIO COST' },
                { key: 'atributo', label: 'ATRIBUTO' },
                { key: 'lote', label: 'LOTE' },
                { key: 'fechaVencimiento', label: 'F. VENCIMIENTO' },
              ].map(({ key, label }) => {
                const isSpecial = isHighlightedToken(key);
                return (
                  <th 
                    key={key} 
                    style={thStyle(key)} 
                    className={[
                      "p-3 border-b border-r border-gray-200 dark:border-gray-700 overflow-hidden transition-colors",
                      key === 'select' ? "text-center" : "",
                      isSpecial 
                        ? "bg-amber-100/60 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 font-extrabold border-r-gray-300 dark:border-r-gray-600" 
                        : ""
                    ].join(' ')}
                  >
                    {key === 'select' ? (
                      <button 
                        type="button"
                        onClick={handleSelectAll}
                        disabled={solicitudes.length === 0}
                        className="text-gray-500 dark:text-gray-400 hover:text-amber-500 transition-colors focus:outline-none block mx-auto"
                      >
                        {solicitudes.length > 0 && selectedIds.length === solicitudes.length ? (
                          <CheckSquare size={16} className="text-amber-500" />
                        ) : (
                          <Square size={16} />
                        )}
                      </button>
                    ) : (
                      <>
                        <span className="truncate block">{label}</span>
                        <div 
                          onMouseDown={(e) => onColMouseDown(key, e)} 
                          className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize hover:bg-amber-500/60 active:bg-amber-500 z-20 transition-colors" 
                        />
                      </>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-200 dark:divide-gray-700 text-gray-700 dark:text-gray-200">
            {solicitudes.length === 0 ? (
              <tr>
                <td colSpan={COL_KEYS.length} className="p-8 text-center text-gray-400 italic text-[13px]">
                  No hay solicitudes pendientes en estado INGRESAR L/F.
                </td>
              </tr>
            ) : (
              solicitudes.map((s, index) => {
                const isRowSelected = selectedIds.includes(s.id);
                
                return (
                  <tr 
                    key={s.id} 
                    className={[
                      "border-l-4 transition-colors hover:bg-gray-50/80 dark:hover:bg-gray-700/40",
                      isRowSelected ? "border-amber-500 bg-amber-50/10 dark:bg-amber-950/5" : "border-transparent"
                    ].join(' ')}
                  >
                    <td style={tdStyle('select')} className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70 text-center">
                      <button
                        type="button"
                        onClick={() => handleSelectRow(s.id)}
                        className="text-gray-400 dark:text-gray-500 hover:text-amber-500 dark:hover:text-amber-400 transition-colors focus:outline-none block mx-auto"
                      >
                        {isRowSelected ? <CheckSquare size={16} className="text-amber-500 dark:text-amber-400" /> : <Square size={16} />}
                      </button>
                    </td>

                    <td style={tdStyle('num')} className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-500 dark:text-gray-400 font-bold">{index + 1}</td>
                    
                    <td style={tdStyle('admision')} className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70 font-bold text-gray-800 dark:text-gray-100"><TruncCell value={s.admision} /></td>
                    <td style={tdStyle('paciente')} className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-600 dark:text-gray-300"><TruncCell value={s.paciente} /></td>
                    <td style={tdStyle('medico')} className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-600 dark:text-gray-300"><TruncCell value={s.medico} /></td>
                    <td style={tdStyle('fecha')} className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70"><TruncCell value={s.fecha || s.fechaCx} /></td>
                    
                    <td style={tdStyle('codigo')} className="p-3 border-b border-r border-gray-300 dark:border-gray-600 bg-amber-50/10 dark:bg-amber-950/5 font-mono text-amber-600 dark:text-amber-400 font-bold"><TruncCell value={s.codigo} /></td>
                    <td style={tdStyle('descripcion')} className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-600 dark:text-gray-300"><TruncCell value={s.descripcion} /></td>
                    <td style={tdStyle('cantidad')} className="p-3 border-b border-r border-gray-300 dark:border-gray-600 bg-amber-50/10 dark:bg-amber-950/5 text-center font-bold text-gray-800 dark:text-gray-200"><TruncCell value={s.cantidad?.toString()} /></td>
                    
                    <td style={tdStyle('precioCosto')} className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70 font-medium text-gray-700 dark:text-gray-200 text-right"><TruncCell value={formatMoneda(s.precioCosto)} /></td>
                    <td style={tdStyle('atributo')} className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-600 dark:text-gray-300"><TruncCell value={s.atributo} /></td>
                    
                    <td style={tdStyle('lote')} className="p-3 border-b border-r border-gray-300 dark:border-gray-600 bg-amber-50/10 dark:bg-amber-950/5 font-mono font-bold text-gray-700 dark:text-gray-200"><TruncCell value={s.lote} /></td>
                    <td style={tdStyle('fechaVencimiento')} className="p-3 border-b border-r border-gray-300 dark:border-gray-600 bg-amber-50/10 dark:bg-amber-950/5 text-center font-semibold text-gray-700 dark:text-gray-200"><TruncCell value={s.fechaVencimiento} /></td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Delivery;