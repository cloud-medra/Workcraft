import React, { useState, useEffect, useRef, useCallback } from 'react';
import { collectionGroup, collection, writeBatch, doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../../../firebaseConfig';
import { Truck, CheckSquare, Square, RefreshCw, ChevronDown, ChevronRight, PackageOpen } from 'lucide-react';
import { useToast } from '../../../../context/ToastContext';
import Spinner from '../../../ui/Spinner';

// Configuración de anchos iniciales
const INITIAL_COL_WIDTHS = {
  select: 40,
  num: 60,
  admision: 100,
  paciente: 220,
  medico: 200,
  fecha: 100,
  codigo: 110,
  descripcion: 240,
  cantidad: 60,
  precioCosto: 80,
  atributo: 100,
  lote: 90,
  fechaVencimiento: 90,
  delivery: 130,
  folioGuia: 110,
  referencia: 150
};

const COL_KEYS = Object.keys(INITIAL_COL_WIDTHS);

const OMITIR_DESCRIPCIONES = ["KITMANGACRL", "KITBYPASSTCRL2", "KITBYPASSTCRL"];

const limpiarCodigo = (codigo) => {
  if (!codigo) return 'N/A';
  return codigo.toString().trim().split(' ')[0].replace(/_+$/, '');
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

const Delivery = () => {
  const [solicitudes, setSolicitudes] = useState([]);
  const [guiasMap, setGuiasMap] = useState({});
  const [codigosMap, setCodigosMap] = useState({});
  const [expandedRows, setExpandedRows] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [procesandoAccion, setProcesandoAccion] = useState(false);

  const { showToast } = useToast();
  const { widths, onMouseDown: onColMouseDown } = useColumnResize(INITIAL_COL_WIDTHS);

  // Escucha activa de maestros_codigos
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "maestros_codigos"),
      (snap) => {
        const mapa = {};
        snap.docs.forEach(d => {
          const data = d.data();
          if (data.referencia) {
            const refLimpia = limpiarCodigo(data.referencia).toUpperCase();
            mapa[refLimpia] = data.descripcion;
          }
        });
        setCodigosMap(mapa);
      },
      (error) => console.error("Error al cargar maestros_codigos:", error)
    );
    return () => unsubscribe();
  }, []);

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
          .filter(d => {
            if (!d.active || d.estado !== 'INGRESAR L/F' || !d.codigo) return false;

            const codigoLimpio = limpiarCodigo(d.codigo).toUpperCase();
            const descripcionUpper = (d.descripcion || '').toString().trim().toUpperCase();

            const coincideEnCodigo = OMITIR_DESCRIPCIONES.includes(codigoLimpio);
            const coincideEnDescripcion = OMITIR_DESCRIPCIONES.some(codigoOmitir =>
              descripcionUpper.includes(codigoOmitir)
            );
            return !coincideEnCodigo && !coincideEnDescripcion;
          });

        setSolicitudes(data.sort((a, b) => (b.fechaRegistro?.seconds || 0) - (a.fechaRegistro?.seconds || 0)));
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

  // Escuchar guías globalmente
  useEffect(() => {
    const qG = collectionGroup(db, "guias");
    const unsubscribe = onSnapshot(qG, (snap) => {
      const mapa = {};
      snap.docs.forEach(docSnap => {
        const gData = docSnap.data();
        if (gData.folioRef && gData.folioRef !== "N/A") {
          const key = gData.folioRef.trim();
          mapa[key] = gData;
        }
      });
      setGuiasMap(mapa);
    }, (error) => console.error("Error cargando mapeo global de guías:", error));
    return () => unsubscribe();
  }, []);

  const toggleRowExpand = (id) => {
    setExpandedRows(prev =>
      prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]
    );
  };

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

  // NUEVA FUNCIÓN: Mueve los datos a 'consignacion_solicitud' y los quita de su origen
  const handleDespacharMasivo = async () => {
    if (selectedIds.length === 0) return;

    setProcesandoAccion(true);
    try {
      const batch = writeBatch(db);
      const nuevaColeccionRef = collection(db, "consignacion_solicitud");

      selectedIds.forEach(id => {
        const item = solicitudes.find(s => s.id === id);
        if (item && item.path) {
          
          // 1. Resolver los datos de la Guía y sus Subfilas (detalles)
          const deliveryKey = item.delivery ? item.delivery.trim() : '';
          const guiaAsociada = deliveryKey ? guiasMap[deliveryKey] : null;

          // Filtramos las subfilas tal cual lo hace la vista de la tabla
          const detallesFiltrados = (guiaAsociada?.detalles || [])
            .filter(det => {
              const texto = `${det.nombre || ''} ${det.dscItem || ''} ${det.codigo || ''}`.toUpperCase();
              return !OMITIR_DESCRIPCIONES.some(termino => texto.includes(termino));
            })
            .map(det => {
              // Mapeamos e integramos la descripción de maestros_codigos a la data que se va a guardar
              const refSubfila = limpiarCodigo(det.codigo).toUpperCase();
              const descripcionEncontrada = codigosMap[refSubfila] || "registrar en codigos";
              
              return {
                ...det,
                codigoLimpio: refSubfila,
                descripcionResuelta: descripcionEncontrada
              };
            });

          // 2. Construir el objeto completo que se irá a la nueva colección
          const nuevoDocumentoData = {
            ...item,                                      // Todos los campos originales de la fila
            estado: 'SOLICITAR ORDEN',                    // Actualizamos el estado para la nueva colección
            fechaMovimiento: new Date(),                  // Timestamp del traspaso
            folioGuiaAsociada: guiaAsociada ? guiaAsociada.folio : 'No Encontrada',
            subfilasGuia: detallesFiltrados               // Guardamos el array completo de subfilas procesadas
          };

          // Eliminar el id y path del objeto para que no se dupliquen de forma extraña dentro de los campos
          delete nuevoDocumentoData.id;
          delete nuevoDocumentoData.path;

          // 3. Programar la creación en 'consignacion_solicitud' (usando el mismo ID para mantener trazabilidad si quieres)
          const nuevoDocRef = doc(nuevaColeccionRef, id);
          batch.set(nuevoDocRef, nuevoDocumentoData);

          // 4. Programar la eliminación del documento antiguo en su ruta original
          const antiguoDocRef = doc(db, item.path);
          batch.delete(antiguoDocRef); 
          
          /* 
            NOTA: Si en vez de BORRAR físicamente de Firestore prefieres sólo desactivarlo 
            para que no aparezca pero quede historial en la colección original, cambia 'batch.delete' por:
            batch.update(antiguoDocRef, { active: false, estado: 'MOVIDO A CONSIGNACION' });
          */
        }
      });

      // Ejecutar todas las operaciones de forma atómica
      await batch.commit();
      
      showToast(`${selectedIds.length} registro(s) movidos a Consignación con éxito.`, "success");
      setSelectedIds([]);
    } catch (error) {
      console.error("Error en el traspaso masivo a consignación_solicitud:", error);
      showToast("No se pudieron mover los registros.", "error");
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
              Solicitar Orden
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
              {/* Mapeo de cabeceras igual */}
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
                { key: 'delivery', label: 'DELIVERY' },
                { key: 'folioGuia', label: 'GUÍAS (FOLIO)' },
                { key: 'referencia', label: 'REFERENCIA' },
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
                const deliveryKey = s.delivery ? s.delivery.trim() : '';
                const guiaAsociada = deliveryKey ? guiasMap[deliveryKey] : null;

                const detallesFiltrados = (guiaAsociada?.detalles || []).filter(det => {
                  const texto = `${det.nombre || ''} ${det.dscItem || ''} ${det.codigo || ''}`.toUpperCase();
                  return !OMITIR_DESCRIPCIONES.some(termino => texto.includes(termino));
                });

                const tieneDetalles = detallesFiltrados.length > 0;
                const isExpanded = expandedRows.includes(s.id);

                return (
                  <React.Fragment key={s.id}>
                    {/* Fila Principal */}
                    <tr
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

                      <td style={tdStyle('num')} className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-500 dark:text-gray-400 font-bold flex items-center justify-between gap-1">
                        <span>{index + 1}</span>
                        {tieneDetalles && (
                          <button
                            type="button"
                            onClick={() => toggleRowExpand(s.id)}
                            className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors text-amber-600 dark:text-amber-400 focus:outline-none"
                            title="Ver ítems de la guía asignada"
                          >
                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </button>
                        )}
                      </td>

                      <td style={tdStyle('admision')} className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70 font-bold text-gray-800 dark:text-gray-100"><TruncCell value={s.admision} /></td>
                      <td style={tdStyle('paciente')} className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-600 dark:text-gray-300"><TruncCell value={s.paciente} /></td>
                      <td style={tdStyle('medico')} className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-600 dark:text-gray-300"><TruncCell value={s.medico} /></td>
                      <td style={tdStyle('fecha')} className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70"><TruncCell value={s.fecha || s.fechaCx} /></td>

                      <td style={tdStyle('codigo')} className="p-3 border-b border-r border-gray-300 dark:border-gray-600 bg-amber-50/10 dark:bg-amber-950/5 font-mono text-amber-600 dark:text-amber-400 font-bold">
                        <TruncCell value={limpiarCodigo(s.codigo)} />
                      </td>

                      <td style={tdStyle('descripcion')} className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-600 dark:text-gray-300">
                        <TruncCell value={s.descripcion} />
                      </td>

                      <td style={tdStyle('cantidad')} className="p-3 border-b border-r border-gray-300 dark:border-gray-600 bg-amber-50/10 dark:bg-amber-950/5 text-center font-bold text-gray-800 dark:text-gray-200"><TruncCell value={s.cantidad?.toString()} /></td>
                      <td style={tdStyle('precioCosto')} className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70 font-medium text-gray-700 dark:text-gray-200 text-right"><TruncCell value={formatMoneda(s.precioCosto)} /></td>
                      <td style={tdStyle('atributo')} className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-600 dark:text-gray-300"><TruncCell value={s.atributo} /></td>

                      <td style={tdStyle('lote')} className="p-3 border-b border-r border-gray-300 dark:border-gray-600 bg-amber-50/10 dark:bg-amber-950/5 font-mono font-bold text-gray-700 dark:text-gray-200"><TruncCell value={s.lote} /></td>
                      <td style={tdStyle('fechaVencimiento')} className="p-3 border-b border-r border-gray-300 dark:border-gray-600 bg-amber-50/10 dark:bg-amber-950/5 text-center font-semibold text-gray-700 dark:text-gray-200"><TruncCell value={s.fechaVencimiento} /></td>

                      <td style={tdStyle('delivery')} className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70 font-bold text-amber-600 dark:text-amber-400"><TruncCell value={s.delivery} /></td>

                      <td style={tdStyle('folioGuia')} className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70 font-bold text-green-600 dark:text-green-400 bg-green-50/5 dark:bg-green-950/5">
                        <TruncCell value={guiaAsociada ? guiaAsociada.folio : 'No Encontrada'} />
                      </td>

                      <td style={tdStyle('referencia')} className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-600 dark:text-gray-300"><TruncCell value={s.referencia} /></td>
                    </tr>

                    {/* Subfilas Anidadas de la Guía XML Asociada */}
                    {tieneDetalles && isExpanded && (
                      detallesFiltrados.map((det, detIdx) => {
                        const refSubfila = limpiarCodigo(det.codigo).toUpperCase();
                        const descripcionEncontrada = codigosMap[refSubfila];

                        const celdaDescripcionContenido = descripcionEncontrada
                          ? descripcionEncontrada
                          : "registrar en codigos";

                        const esCodigoFaltante = !descripcionEncontrada;

                        return (
                          <tr
                            key={`${s.id}-det-${detIdx}`}
                            className="bg-blue-50/20 dark:bg-blue-950/5 border-l-4 border-blue-400 dark:border-blue-500/60 transition-colors hover:bg-blue-50/40 dark:hover:bg-blue-950/10 text-gray-500 dark:text-gray-400 opacity-75"
                          >
                            <td style={tdStyle('select')} className="p-2 border-b border-r border-gray-100 dark:border-gray-700/40"></td>
                            <td style={tdStyle('num')} className="p-2 border-b border-r border-gray-100 dark:border-gray-700/40 text-center text-blue-500 dark:text-blue-400 font-mono text-[10px]">
                              {detIdx === 0 && <PackageOpen size={12} className="inline-block mx-auto" />}
                            </td>

                            <td style={tdStyle('admision')} className="p-2 border-b border-r border-gray-100 dark:border-gray-700/40 font-medium"><TruncCell value={s.admision} /></td>
                            <td style={tdStyle('paciente')} className="p-2 border-b border-r border-gray-100 dark:border-gray-700/40"><TruncCell value={s.paciente} /></td>
                            <td style={tdStyle('medico')} className="p-2 border-b border-r border-gray-100 dark:border-gray-700/40"><TruncCell value={s.medico} /></td>
                            <td style={tdStyle('fecha')} className="p-2 border-b border-r border-gray-100 dark:border-gray-700/40"><TruncCell value={s.fecha || s.fechaCx} /></td>

                            <td style={tdStyle('codigo')} className="p-2 border-b border-r border-gray-100 dark:border-gray-700/40 text-[11px] font-semibold text-gray-400 italic">
                              <TruncCell value="No lleva OC" />
                            </td>

                            <td
                              style={tdStyle('descripcion')}
                              className={[
                                "p-2 border-b border-r border-gray-100 dark:border-gray-700/40 text-[11px]",
                                esCodigoFaltante ? "text-red-500 dark:text-red-400 font-semibold italic" : "text-gray-600 dark:text-gray-300 font-medium"
                              ].join(' ')}
                            >
                              <TruncCell value={celdaDescripcionContenido} />
                            </td>

                            <td style={tdStyle('cantidad')} className="p-2 border-b border-r border-blue-200/50 dark:border-blue-900/30 text-center font-bold text-blue-700 dark:text-blue-400 bg-blue-50/10 dark:bg-blue-950/5 opacity-100">
                              <TruncCell value={det.cantidad?.toString()} />
                            </td>

                            <td style={tdStyle('precioCosto')} className="p-2 border-b border-r border-gray-100 dark:border-gray-700/40 text-right text-gray-400">
                              <TruncCell value="0" />
                            </td>

                            <td style={tdStyle('atributo')} className="p-2 border-b border-r border-gray-100 dark:border-gray-700/40">
                              <TruncCell value={s.atributo} />
                            </td>

                            <td style={tdStyle('lote')} className="p-2 border-b border-r border-blue-200/50 dark:border-blue-900/30 font-mono text-gray-700 dark:text-gray-200 bg-blue-50/10 dark:bg-blue-950/5 opacity-100">
                              <TruncCell value={det.dscItem} />
                            </td>
                            <td style={tdStyle('fechaVencimiento')} className="p-2 border-b border-r border-blue-200/50 dark:border-blue-900/30 text-center text-gray-700 dark:text-gray-200 bg-blue-50/10 dark:bg-blue-950/5 opacity-100">
                              <TruncCell value={det.fchVenc} />
                            </td>

                            <td style={tdStyle('delivery')} className="p-2 border-b border-r border-gray-100 dark:border-gray-700/40 font-bold text-amber-600 dark:text-amber-400 opacity-100">
                              <TruncCell value={s.delivery} />
                            </td>
                            <td style={tdStyle('folioGuia')} className="p-2 border-b border-r border-gray-100 dark:border-gray-700/40 font-bold text-green-600 dark:text-green-400 bg-green-50/5 dark:bg-green-950/5 opacity-100">
                              <TruncCell value={guiaAsociada ? guiaAsociada.folio : 'No Encontrada'} />
                            </td>

                            <td style={tdStyle('referencia')} className="p-2 border-b border-r border-blue-200/50 dark:border-blue-900/30 font-mono text-blue-600 dark:text-blue-400 font-bold bg-blue-50/10 dark:bg-blue-950/5 opacity-100">
                              <TruncCell value={limpiarCodigo(det.codigo)} />
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </React.Fragment>
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