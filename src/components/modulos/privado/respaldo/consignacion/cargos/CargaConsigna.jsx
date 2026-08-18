import React, { useState, useEffect, useRef, useCallback } from 'react';
import { collectionGroup, writeBatch, doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../../../firebaseConfig';
import { FileSpreadsheet, CheckSquare, Square, RefreshCw } from 'lucide-react';
import { useToast } from '../../../../context/ToastContext';
import Spinner from '../../../ui/Spinner';

const INITIAL_COL_WIDTHS = {
  select: 40,
  num: 45,
  isapre: 220,
  convenio: 130,
  fechaCx: 100,
  paciente: 220,
  admision: 95,      
  codigo: 105,       
  cantidad: 80,      
  venta: 105,        
  descripcion: 240,
  precioCosto: 110,
  estado: 110,
  margenPct: 85      
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

const CargaConsigna = () => {
  const [solicitudes, setSolicitudes] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [margenesConfig, setMargenesConfig] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [procesandoAccion, setProcesandoAccion] = useState(false);
  const { showToast } = useToast();
  const { widths, onMouseDown: onColMouseDown } = useColumnResize(INITIAL_COL_WIDTHS);

  // Guardamos una referencia mutables de la configuración para usarla dentro del snapshot de solicitudes
  const margenesConfigRef = useRef([]);

  // 1. Cargar la configuración global de márgenes de Consignación
  useEffect(() => {
    const docRef = doc(db, "maestros_margenes", "configuracion");
    const unsubMargenes = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const rangosOrdenados = (data.consignacion || []).sort((a, b) => a.hasta - b.hasta);
        setMargenesConfig(rangosOrdenados);
        margenesConfigRef.current = rangosOrdenados; // Actualizamos la referencia
      }
    });
    return () => unsubMargenes();
  }, []);

  // Helpers para los cálculos
  const obtenerPorcentajeMargen = (precioCosto, rangos) => {
    if (!precioCosto || isNaN(Number(precioCosto))) return 0;
    const costo = Number(precioCosto);
    const rangoEncontrado = rangos.find(r => costo <= r.hasta);
    if (rangoEncontrado) return rangoEncontrado.margen;
    if (rangos.length > 0) return rangos[rangos.length - 1].margen;
    return 0;
  };

  const calcularPrecioVenta = (precioCosto, margenPct) => {
    if (!precioCosto || isNaN(Number(precioCosto))) return 0;
    const costo = Number(precioCosto);
    return Math.round(costo + (costo * (margenPct / 100)));
  };

  // 2. Escuchar solicitudes en estado ENLAZADO y auto-guardar cálculos vacíos
  useEffect(() => {
    const qS = collectionGroup(db, "registros");

    const unsubscribe = onSnapshot(qS,
      async (snap) => {
        const data = snap.docs
          .map(d => ({ 
            id: d.id, 
            path: d.ref.path, 
            ...d.data() 
          }))
          .filter(d => d.active === true && d.estado === 'ENLAZADO');

        // --- BLOQUE DE AUTO-CALCULO Y AUTO-GUARDADO SILENCIOSO ---
        const rangosActuales = margenesConfigRef.current;
        if (rangosActuales.length > 0) {
          const batch = writeBatch(db);
          let requiereUpdate = false;

          data.forEach(item => {
            // Evaluamos si el registro carece de precioVenta o margenPct en la BD
            if (item.precioVenta === undefined || item.margenPct === undefined) {
              const pct = obtenerPorcentajeMargen(item.precioCosto, rangosActuales);
              const vta = calcularPrecioVenta(item.precioCosto, pct);
              
              const docRef = doc(db, item.path);
              batch.update(docRef, {
                margenPct: pct,
                precioVenta: vta
              });
              
              // Modificamos el objeto en memoria temporalmente para que la UI no parpadee en blanco
              item.margenPct = pct;
              item.precioVenta = vta;
              requiereUpdate = true;
            }
          });

          if (requiereUpdate) {
            try {
              await batch.commit();
              // Se guarda en background de forma silenciosa sin interrumpir al usuario
            } catch (err) {
              console.error("Error en el auto-guardado de márgenes:", err);
            }
          }
        }
        // --------------------------------------------------------
        
        setSolicitudes(data.sort((a, b) => b.fechaRegistro?.seconds - a.fechaRegistro?.seconds));
        setSelectedIds(prev => prev.filter(id => data.some(s => s.id === id)));
        setCargando(false);
      },
      (error) => {
        console.error("Error al cargar datos en CargaConsigna:", error);
        showToast("Error de acceso a datos.", "error");
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

  const handleCambiarEstadoMasivo = async () => {
    if (selectedIds.length === 0) return;
    
    setProcesandoAccion(true);
    try {
      const batch = writeBatch(db);
      
      selectedIds.forEach(id => {
        const item = solicitudes.find(s => s.id === id);
        if (item && item.path) {
          const docRef = doc(db, item.path);
          batch.update(docRef, { 
            estado: 'INGRESAR L/F',
            fechaModificacion: new Date()
          });
        }
      });

      await batch.commit();
      showToast(`${selectedIds.length} registro(s) actualizados a 'INGRESAR L/F'.`, "success");
      setSelectedIds([]);
    } catch (error) {
      console.error("Error en el cambio masivo de estado:", error);
      showToast("No se pudieron actualizar los estados.", "error");
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

  const isHighlightedToken = (key) => ['admision', 'codigo', 'cantidad', 'venta'].includes(key);

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden relative transition-colors">
      {(cargando || procesandoAccion) && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm">
          <Spinner size="md" />
        </div>
      )}

      {/* Cabecera y Barra de Acciones */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between gap-2 bg-gray-50/50 dark:bg-gray-900/20">
        <h2 className="text-[14px] font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2">
          <FileSpreadsheet size={16} className="text-[#2383C2] dark:text-[#369BCE]" /> 
          CARGA DE CONSIGNACIONES
        </h2>

        {selectedIds.length > 0 && (
          <div className="flex items-center gap-3 bg-[#2383C2]/10 border border-[#2383C2]/30 px-3 py-1.5 rounded-md">
            <span className="text-[12px] font-semibold text-[#1e6b9e] dark:text-[#49aee6]">
              {selectedIds.length} fila(s) seleccionada(s)
            </span>
            <button
              onClick={handleCambiarEstadoMasivo}
              className="flex items-center gap-1.5 bg-[#2383C2] hover:bg-[#1a6699] text-white font-bold text-[11px] uppercase tracking-wider px-3 py-1.5 rounded shadow-sm transition-all active:scale-95"
            >
              <RefreshCw size={12} className={procesandoAccion ? "animate-spin" : ""} />
              INGRESAR L/F
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
                { key: 'isapre', label: 'Isapre' },
                { key: 'convenio', label: 'Convenio' },
                { key: 'fechaCx', label: 'Fecha' },
                { key: 'paciente', label: 'Paciente' },
                { key: 'admision', label: 'Admisión' },
                { key: 'codigo', label: 'CÓDIGO' },
                { key: 'cantidad', label: 'CANTI' },
                { key: 'venta', label: 'VENTA' },
                { key: 'descripcion', label: 'DESCRIPCIÓN' },
                { key: 'precioCosto', label: 'PRECIO COST' },
                { key: 'estado', label: 'ESTADO' },
                { key: 'margenPct', label: 'MARGEN %' }, 
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
                        ? "bg-gray-200/80 dark:bg-gray-800 text-[#1e6b9e] dark:text-[#49aee6] font-extrabold border-r-gray-300 dark:border-r-gray-600" 
                        : "",
                      key === 'margenPct' ? "bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 font-extrabold" : ""
                    ].join(' ')}
                  >
                    {key === 'select' ? (
                      <button 
                        type="button"
                        onClick={handleSelectAll}
                        disabled={solicitudes.length === 0}
                        className="text-gray-500 dark:text-gray-400 hover:text-[#2383C2] transition-colors focus:outline-none block mx-auto"
                      >
                        {solicitudes.length > 0 && selectedIds.length === solicitudes.length ? (
                          <CheckSquare size={16} className="text-[#2383C2]" />
                        ) : (
                          <Square size={16} />
                        )}
                      </button>
                    ) : (
                      <>
                        <span className="truncate block">{label}</span>
                        <div 
                          onMouseDown={(e) => onColMouseDown(key, e)} 
                          className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize hover:bg-[#2383C2]/60 active:bg-[#2383C2] z-20 transition-colors" 
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
                  No hay solicitudes en estado ENLAZADO actualmente.
                </td>
              </tr>
            ) : (
              solicitudes.map((s, index) => {
                const isRowSelected = selectedIds.includes(s.id);
                
                // Leemos directamente lo que ya viene calculado (o auto-calculado arriba)
                const pctCelda = s.margenPct || 0;
                const ventaCelda = s.precioVenta || 0;
                
                return (
                  <tr 
                    key={s.id} 
                    className={[
                      "border-l-4 transition-colors hover:bg-gray-50/80 dark:hover:bg-gray-700/40",
                      isRowSelected ? "border-[#2383C2] bg-blue-50/20 dark:bg-blue-950/5" : "border-transparent"
                    ].join(' ')}
                  >
                    <td style={tdStyle('select')} className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70 text-center">
                      <button
                        type="button"
                        onClick={() => handleSelectRow(s.id)}
                        className="text-gray-400 dark:text-gray-500 hover:text-[#2383C2] dark:hover:text-[#369BCE] transition-colors focus:outline-none block mx-auto"
                      >
                        {isRowSelected ? <CheckSquare size={16} className="text-[#2383C2] dark:text-[#369BCE]" /> : <Square size={16} />}
                      </button>
                    </td>

                    <td style={tdStyle('num')} className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-500 dark:text-gray-400 font-bold">{index + 1}</td>
                    
                    <td style={tdStyle('isapre')} className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70 font-medium text-gray-700 dark:text-gray-200"><TruncCell value={s.isapre} /></td>
                    <td style={tdStyle('convenio')} className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-600 dark:text-gray-300"><TruncCell value={s.convenio} /></td>
                    
                    <td style={tdStyle('fechaCx')} className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70"><TruncCell value={s.fechaCx} /></td>
                    <td style={tdStyle('paciente')} className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-600 dark:text-gray-300"><TruncCell value={s.paciente} /></td>
                    
                    {/* --- BLOQUE DESTACADO CENTRAL --- */}
                    <td style={tdStyle('admision')} className="p-3 border-b border-r border-gray-300 dark:border-gray-600 bg-blue-50/40 dark:bg-blue-950/10 font-bold text-gray-800 dark:text-gray-100"><TruncCell value={s.admision} /></td>
                    <td style={tdStyle('codigo')} className="p-3 border-b border-r border-gray-300 dark:border-gray-600 bg-blue-50/40 dark:bg-blue-950/10 font-mono"><TruncCell value={s.codigo} className="text-blue-600 dark:text-blue-400 font-bold" /></td>
                    <td style={tdStyle('cantidad')} className="p-3 border-b border-r border-gray-300 dark:border-gray-600 bg-blue-50/40 dark:bg-blue-950/10 text-center font-bold text-gray-800 dark:text-gray-200"><TruncCell value={s.cantidad?.toString()} /></td>
                    
                    <td style={tdStyle('venta')} className="p-3 border-b border-r border-gray-300 dark:border-gray-600 bg-blue-50/40 dark:bg-blue-950/10 font-bold text-emerald-600 dark:text-emerald-400 text-right">
                      <TruncCell value={formatMoneda(ventaCelda)} className="font-extrabold" />
                    </td>
                    {/* -------------------------------- */}
                    
                    <td style={tdStyle('descripcion')} className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-600 dark:text-gray-300"><TruncCell value={s.descripcion} /></td>
                    <td style={tdStyle('precioCosto')} className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70 font-medium text-gray-700 dark:text-gray-200 text-right"><TruncCell value={formatMoneda(s.precioCosto)} /></td>
                    
                    <td style={tdStyle('estado')} className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70">
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400">
                        {s.estado}
                      </span>
                    </td>

                    <td style={tdStyle('margenPct')} className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70 bg-indigo-50/20 dark:bg-indigo-950/5 text-center font-extrabold text-indigo-600 dark:text-indigo-400">
                      {pctCelda}%
                    </td>
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

export default CargaConsigna;