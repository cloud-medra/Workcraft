import React, { useState, useEffect, useRef, useCallback } from 'react';
import { collection, addDoc, collectionGroup, query, onSnapshot, orderBy, setDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import { FilePlus, Save, CheckCircle, AlertCircle, Edit2, X, Trash2, Undo2 } from 'lucide-react';
import { useToast } from '../../../context/ToastContext';
import { useUser } from '../../../context/UserContext';
import Spinner from '../../ui/Spinner';

const INITIAL_COL_WIDTHS = {
  num: 40, fechaCx: 100, admision: 100, paciente: 130, medico: 150,
  codigo: 100, descripcion: 200, cant: 60, precioCosto: 90,
  empresa: 160, modalidad: 110, estado: 110, acciones: 110,
  registradoPor: 130, fechaRegistro: 110
};

const COL_KEYS = Object.keys(INITIAL_COL_WIDTHS);

function useColumnResize(initialWidths) {
  const [widths, setWidths] = useState(initialWidths);
  const resizingRef = useRef(null); // { key, startX, startWidth }

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

const SolicitudIngresos = () => {
  const getFechaHoy = () => new Date().toISOString().split('T')[0];

  const [solicitudes, setSolicitudes] = useState([]);
  const [medicos, setMedicos] = useState([]);
  const [codigos, setCodigos] = useState([]);
  const [cargando, setCargando] = useState(false);

  const [showMedicoList, setShowMedicoList] = useState(false);
  const [showDescList, setShowDescList] = useState(false);
  
  const [editandoId, setEditandoId] = useState(null);
  const [editRefPath, setEditRefPath] = useState(null);

  const [asignandoCodigoId, setAsignandoCodigoId] = useState(null);
  const [showEditDescList, setShowEditDescList] = useState(false);
  const [editFormData, setEditFormData] = useState({ descripcion: '', codigo: '', precioCosto: '', tipo: '', atributo: '', empresa: '' });

  const medicoRef   = useRef(null);
  const descRef     = useRef(null);
  const editDescRef = useRef(null);

  const [codigoNoRegistrado, setCodigoNoRegistrado] = useState(false);

  const { widths, onMouseDown: onColMouseDown } = useColumnResize(INITIAL_COL_WIDTHS);

  const initialFormState = {
    fecha: getFechaHoy(),
    admision: '',
    paciente: '',
    medico: '',
    fechaCx: '',
    modalidad: 'CONSIGNACION', 
    descripcion: '',
    cantidad: '',
    delivery: '',
    codigo: '',
    precioCosto: '',
    tipo: '',
    atributo: '',
    empresa: '',
    estado: 'INGRESADO'
  };

  const [formData, setFormData] = useState(initialFormState);
  const { showToast } = useToast();
  const { userData } = useUser();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (medicoRef.current && !medicoRef.current.contains(event.target))   setShowMedicoList(false);
      if (descRef.current     && !descRef.current.contains(event.target))     setShowDescList(false);
      if (editDescRef.current && !editDescRef.current.contains(event.target)) setShowEditDescList(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const qM = query(collection(db, "maestros_medicos"), orderBy("nombre", "asc"));
    const qC = query(collection(db, "maestros_codigos"));
    const qS = collectionGroup(db, "registros");

    const unsubM = onSnapshot(qM, (snap) => setMedicos(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubC = onSnapshot(qC, (snap) => setCodigos(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

    const unsubS = onSnapshot(qS,
      (snap) => {
        const data = snap.docs.map(d => ({ id: d.id, refPath: d.ref.path, ...d.data() })).filter(d => d.active === true);
        setSolicitudes(data.sort((a, b) => b.fechaRegistro?.seconds - a.fechaRegistro?.seconds));
      },
      (error) => {
        console.error("Error al cargar datos:", error);
        showToast("Error de acceso a datos.", "error");
      }
    );

    return () => { unsubM(); unsubC(); unsubS(); };
  }, []);

  const formatearFecha = (fecha) => {
    if (!fecha) return 'N/A';
    const date = fecha.toDate ? fecha.toDate() : new Date(fecha);
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const handleModalidadChange = (e) => {
    const nuevaModalidad = e.target.value;
    setFormData(prev => ({
      ...prev,
      modalidad: nuevaModalidad,
      descripcion: '', cantidad: '', delivery: '',
      codigo: '', precioCosto: '', tipo: '', atributo: '', empresa: ''
    }));
    setCodigoNoRegistrado(false);
  };

  const handleSelectDescripcion = (item) => {
    setFormData(prev => ({
      ...prev,
      descripcion:  item.descripcion,
      codigo:       item.codigo      || '',
      precioCosto:  item.precioCosto || '',
      tipo:         item.tipo        || '',
      atributo:     item.atributo    || '',
      empresa:      item.empresa     || ''
    }));
    setShowDescList(false);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setCargando(true);
    try {
      if (editandoId) {
        const docRef = doc(db, editRefPath);
        const estadoFinal = codigoNoRegistrado ? 'PENDIENTE_CODIGO' : formData.estado;
        await updateDoc(docRef, {
          admision:    formData.admision,
          paciente:    formData.paciente,
          medico:      formData.medico,
          fechaCx:     formData.fechaCx,
          modalidad:   formData.modalidad,
          descripcion: formData.descripcion,
          cantidad:    formData.cantidad,
          delivery:    formData.delivery,
          codigo:      formData.codigo,
          precioCosto: formData.precioCosto,
          tipo:        formData.tipo,
          atributo:    formData.atributo,
          empresa:     formData.empresa,
          estado:      estadoFinal
        });
        showToast("Solicitud actualizada con éxito", "success");
        setEditandoId(null);
        setEditRefPath(null);
      } else {
        const now  = new Date();
        const anio = now.getFullYear().toString();
        const mes  = (now.getMonth() + 1).toString().padStart(2, '0');
        const estadoFinal = codigoNoRegistrado ? 'PENDIENTE_CODIGO' : 'INGRESADO';

        await setDoc(doc(db, "consignacion_ingresos", anio), { active: true }, { merge: true });
        await setDoc(doc(db, "consignacion_ingresos", anio, "meses", mes), { active: true }, { merge: true });
        await addDoc(collection(db, "consignacion_ingresos", anio, "meses", mes, "registros"), {
          ...formData,
          estado:        estadoFinal,
          active:        true,
          registradoPor: userData?.nombreCompleto || 'Usuario',
          fechaRegistro: now
        });

        showToast(codigoNoRegistrado ? "Registrado como Pendiente de Código" : "Solicitud registrada con éxito", "success");
      }

      setFormData(initialFormState);
      setCodigoNoRegistrado(false);
    } catch (error) {
      showToast("Error: " + error.message, "error");
    } finally {
      setCargando(false);
    }
  };

  const handleIniciarEdicionFormulario = (solicitud) => {
    setEditandoId(solicitud.id);
    setEditRefPath(solicitud.refPath);
    setCodigoNoRegistrado(solicitud.estado === 'PENDIENTE_CODIGO');
    setFormData({
      fecha:       solicitud.fecha       || getFechaHoy(),
      admision:    solicitud.admision    || '',
      paciente:    solicitud.paciente    || '',
      medico:      solicitud.medico      || '',
      fechaCx:     solicitud.fechaCx     || '',
      modalidad:   solicitud.modalidad   || 'CONSIGNACION',
      descripcion: solicitud.descripcion || '',
      cantidad:    solicitud.cantidad    || '',
      delivery:    solicitud.delivery    || '',
      codigo:      solicitud.codigo      || '',
      precioCosto: solicitud.precioCosto || '',
      tipo:        solicitud.tipo        || '',
      atributo:    solicitud.atributo    || '',
      empresa:     solicitud.empresa     || '',
      estado:      solicitud.estado      || 'INGRESADO'
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelarEdicion = () => {
    setFormData(initialFormState);
    setEditandoId(null);
    setEditRefPath(null);
    setCodigoNoRegistrado(false);
  };

  const handleEliminarFila = async (refPath) => {
    if (!window.confirm("¿Estás seguro de que deseas eliminar este registro?")) return;
    setCargando(true);
    try {
      const docRef = doc(db, refPath);
      await updateDoc(docRef, { active: false });
      showToast("Registro eliminado con éxito", "success");
      if (refPath === editRefPath) handleCancelarEdicion();
    } catch (error) {
      showToast("Error al eliminar: " + error.message, "error");
    } finally {
      setCargando(false);
    }
  };

  const handleIniciarAsignacion = (solicitud) => {
    setAsignandoCodigoId(solicitud.id);
    setEditFormData({
      descripcion: solicitud.descripcion,
      codigo: '', precioCosto: '', tipo: '', empresa: '',
      atributo: solicitud.modalidad
    });
  };

  const handleSelectEditDescripcion = (item) => {
    setEditFormData({
      descripcion: item.descripcion,
      codigo:      item.codigo      || '',
      precioCosto: item.precioCosto || '',
      tipo:        item.tipo        || '',
      atributo:    item.atributo    || '',
      empresa:     item.empresa     || ''
    });
    setShowEditDescList(false);
  };

  const handleGuardarCodigoNuevo = async (refPath) => {
    if (!editFormData.codigo) {
      showToast("Debes seleccionar un código válido", "error");
      return;
    }
    setCargando(true);
    try {
      const docRef = doc(db, refPath);
      await updateDoc(docRef, {
        descripcion: editFormData.descripcion,
        codigo:      editFormData.codigo,
        precioCosto: editFormData.precioCosto,
        tipo:        editFormData.tipo,
        atributo:    editFormData.atributo,
        empresa:     editFormData.empresa,
        estado:      'INGRESADO'
      });
      showToast("Código asignado con éxito", "success");
      setAsignandoCodigoId(null);
    } catch (error) {
      showToast("Error al actualizar: " + error.message, "error");
    } finally {
      setCargando(false);
    }
  };

  const medicosFiltrados = medicos.filter(m => m.estado !== 'INACTIVO' && m.nombre.toLowerCase().includes((formData.medico || '').toLowerCase()) );
  const descFiltradas = codigos.filter(c => c.atributo === formData.modalidad && (c.descripcion?.toLowerCase() || '').includes((formData.descripcion || '').toLowerCase()) );
  const editDescFiltradas = codigos.filter(c => c.atributo === editFormData.atributo && (c.descripcion?.toLowerCase() || '').includes((editFormData.descripcion || '').toLowerCase()) );
  const inputClass    = "w-full h-8 px-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded text-[11px] outline-none focus:border-[#2383C2] dark:focus:border-[#369BCE]";
  const labelClass    = "block text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1";
  const dropDownClass = "absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded shadow-lg max-h-40 overflow-y-auto shadow-xl";

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
    width:    widths[key],
    minWidth: widths[key],
    maxWidth: widths[key],
    position: 'relative',
    overflow: 'hidden',
    userSelect: 'none',
  });

  const tdStyle = (key) => ({
    width:    widths[key],
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

      <h2 className="text-[14px] font-bold text-gray-700 dark:text-gray-200 p-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
        <FilePlus size={16} className="text-[#2383C2] dark:text-[#369BCE]" /> 
        {editandoId ? "MODIFICAR SOLICITUD" : "SOLICITUD DE INGRESOS"}
      </h2>

      {/* FORMULARIO PRINCIPAL */}
      <form onSubmit={handleFormSubmit} className={`p-4 flex flex-col gap-4 border-b transition-colors duration-300 ${editandoId ? 'border-amber-300 bg-amber-50/10 dark:border-amber-700' : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40'}`}>
        <div className="flex flex-wrap gap-2">
          <div className="flex-1 min-w-[110px]"><label className={labelClass}>Fecha</label><input type="date" value={formData.fecha} readOnly className={inputClass} /></div>
          <div className="flex-1 min-w-[110px]"><label className={labelClass}>Admisión</label><input type="text" value={formData.admision} onChange={e => setFormData({ ...formData, admision: e.target.value })} className={inputClass} required /></div>
          <div className="flex-1 min-w-[110px]"><label className={labelClass}>Paciente</label><input type="text" value={formData.paciente} onChange={e => setFormData({ ...formData, paciente: e.target.value })} className={inputClass} required /></div>
          
          <div className="flex-1 min-w-[140px] relative" ref={medicoRef}>
            <label className={labelClass}>Médico</label>
            <input type="text" value={formData.medico} onFocus={() => setShowMedicoList(true)} onChange={e => setFormData({ ...formData, medico: e.target.value })} className={inputClass} required />
            {showMedicoList && (
              <div className={dropDownClass}>
                {medicosFiltrados.map(m => <div key={m.id} className="px-3 py-1.5 text-[11px] cursor-pointer hover:bg-[#2383C2] hover:text-white" onClick={() => { setFormData({ ...formData, medico: m.nombre }); setShowMedicoList(false) }}>{m.nombre}</div>)}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-[110px]"><label className={labelClass}>F. CX</label><input type="date" value={formData.fechaCx} onChange={e => setFormData({ ...formData, fechaCx: e.target.value })} className={inputClass} required /></div>
          
          <div className="flex-1 min-w-[120px]">
            <label className={labelClass}>Tipo Reg.</label>
            <select value={formData.modalidad} onChange={handleModalidadChange} className={inputClass}>
              <option value="CONSIGNACION">CONSIGNACION</option>
              <option value="COTIZACION">COTIZACION</option>
            </select>
          </div>

          <div className="flex-[2] min-w-[220px] relative" ref={descRef}>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase">Descripción</label>
              <label className="flex items-center gap-1 text-[9px] font-semibold text-amber-600 dark:text-amber-400 cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={codigoNoRegistrado} 
                  onChange={(e) => {
                    setCodigoNoRegistrado(e.target.checked);
                    setFormData({ ...formData, descripcion: '', codigo: '', precioCosto: '', tipo: '', empresa: '' });
                  }}
                  className="rounded border-gray-300 text-[#2383C2] focus:ring-0 w-3 h-3 cursor-pointer"
                />
                ¿Código No Registrado?
              </label>
            </div>
            <input 
              type="text" 
              value={formData.descripcion} 
              onFocus={() => !codigoNoRegistrado && setShowDescList(true)} 
              onChange={e => setFormData({ ...formData, descripcion: e.target.value })} 
              className={`${inputClass} ${codigoNoRegistrado ? 'border-amber-400 dark:border-amber-600 focus:border-amber-500 bg-amber-50/20' : ''}`}
              placeholder={codigoNoRegistrado ? "Escribe la descripción manualmente..." : "Buscar en maestro..."}
              required
            />
            {!codigoNoRegistrado && showDescList && (
              <div className={dropDownClass}>
                {descFiltradas.map((d, i) => <div key={i} className="px-3 py-1.5 text-[11px] cursor-pointer hover:bg-[#2383C2] hover:text-white" onClick={() => handleSelectDescripcion(d)}>{d.descripcion}</div>)}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-[70px]"><label className={labelClass}>Cant</label><input type="number" value={formData.cantidad} onChange={e => setFormData({ ...formData, cantidad: e.target.value })} className={inputClass} required /></div>
          <div className="flex-1 min-w-[100px]"><label className={labelClass}>Delivery</label><input type="text" value={formData.delivery} onChange={e => setFormData({ ...formData, delivery: e.target.value })} className={inputClass} /></div>
        </div>

        <div className="flex flex-wrap justify-between items-center w-full gap-4">
          <div className="flex gap-2 shrink-0">
            {editandoId ? (
              <>
                <button type="submit" className="h-8 px-4 bg-green-600 hover:bg-green-700 text-white rounded font-bold text-[12px] flex items-center gap-2 transition shadow-sm">
                  <Save size={14} /> Guardar Cambios
                </button>
                <button type="button" onClick={handleCancelarEdicion} className="h-8 px-4 bg-gray-500 hover:bg-gray-600 text-white rounded font-bold text-[12px] flex items-center gap-2 transition">
                  <X size={14} /> Cancelar
                </button>
              </>
            ) : (
              <>
                <button type="submit" className="h-8 px-4 bg-[#2383C2] hover:bg-[#369BCE] text-white rounded font-bold text-[12px] flex items-center gap-2 transition">
                  <Save size={14} /> Registrar
                </button>
                <button type="button" onClick={() => { setFormData(initialFormState); setCodigoNoRegistrado(false); }} className="h-8 px-4 bg-gray-500 hover:bg-gray-600 text-white rounded font-bold text-[12px] flex items-center gap-2 transition">
                  <CheckCircle size={14} /> Finalizar
                </button>
              </>
            )}
          </div>

          {formData.codigo ? (
            <div className="flex flex-wrap flex-grow justify-end gap-x-6 gap-y-1 py-1.5 px-3 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/50 rounded text-[11px] text-gray-600 dark:text-gray-300 max-w-full md:max-w-max">
              <span><strong>Código:</strong> <span className="font-mono">{formData.codigo}</span></span>
              <span><strong>Precio Costo:</strong> ${formData.precioCosto}</span>
              <span><strong>Tipo:</strong> {formData.tipo}</span>
              <span><strong>Atributo:</strong> {formData.atributo}</span>
              <span><strong>Empresa:</strong> {formData.empresa}</span>
            </div>
          ) : codigoNoRegistrado && formData.descripcion ? (
            <div className="flex items-center gap-2 py-1.5 px-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 text-amber-700 dark:text-amber-400 rounded text-[11px]">
              <AlertCircle size={14} />
              <span>Este registro se guardará temporalmente como <strong>Pendiente de Código</strong>.</span>
            </div>
          ) : null}
        </div>
      </form>

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
                { key: 'acciones',      label: 'Acciones'      },
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
            {solicitudes.map((s, index) => (
              <tr
                key={s.id}
                className={`border-l-4 border-transparent transition-colors hover:border-[#2383C2] hover:bg-gray-50/80 dark:hover:bg-gray-700/40 ${editandoId === s.id ? 'bg-amber-50/20 dark:bg-amber-950/10 border-l-amber-500 hover:border-l-amber-500' : ''} `}
              >
                <td style={tdStyle('num')} className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-500 dark:text-gray-400 font-bold">{index + 1}</td>
                <td style={tdStyle('fechaCx')} className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70"><TruncCell value={s.fechaCx} className="font-medium text-gray-700 dark:text-gray-200" /></td>
                <td style={tdStyle('admision')} className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70"><TruncCell value={s.admision} className="text-gray-600 dark:text-gray-300" /></td>
                <td style={tdStyle('paciente')} className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70"><TruncCell value={s.paciente} className="text-gray-600 dark:text-gray-300" /></td>
                <td style={tdStyle('medico')} className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70"><TruncCell value={s.medico} className="text-gray-600 dark:text-gray-300" /></td>

                <td style={tdStyle('codigo')} className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70 font-mono font-medium">
                  {asignandoCodigoId === s.id ? (
                    <span className="text-gray-400 text-[10px] italic">Auto-asignando</span>
                  ) : s.codigo ? (
                    <TruncCell value={s.codigo} className="text-blue-600 dark:text-blue-400 font-mono" />
                  ) : (
                    <span className="text-amber-600 dark:text-amber-400 font-sans italic text-[11px]">S/C (Pendiente)</span>
                  )}
                </td>

                <td style={tdStyle('descripcion')} className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-600 dark:text-gray-300">
                  {asignandoCodigoId === s.id ? (
                    <div className="relative w-full" ref={editDescRef}>
                      <input 
                        type="text"
                        value={editFormData.descripcion}
                        onFocus={() => setShowEditDescList(true)}
                        onChange={e => setEditFormData({ ...editFormData, descripcion: e.target.value })}
                        className="w-full h-7 px-2 border border-blue-400 rounded text-[11px] outline-none bg-white dark:bg-gray-800"
                        placeholder="Buscar código creado..."
                      />
                      {showEditDescList && (
                        <div className={dropDownClass}>
                          {editDescFiltradas.map((d, i) => (
                            <div key={i} className="px-3 py-1.5 text-[11px] cursor-pointer hover:bg-[#2383C2] hover:text-white" onClick={() => handleSelectEditDescripcion(d)}>
                              <strong>{d.codigo}</strong> - {d.descripcion}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <TruncCell value={s.descripcion} />
                  )}
                </td>

                <td style={tdStyle('cant')} className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70"><TruncCell value={s.cantidad?.toString()} className="text-gray-600 dark:text-gray-300" /></td>

                <td style={tdStyle('precioCosto')} className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70">
                  <TruncCell
                    value={`$${asignandoCodigoId === s.id ? (editFormData.precioCosto || '0') : (s.precioCosto || '0')}`}
                    className="text-gray-600 dark:text-gray-300"
                  />
                </td>

                <td style={tdStyle('empresa')} className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70">
                  <TruncCell
                    value={asignandoCodigoId === s.id ? (editFormData.empresa || 'N/A') : (s.empresa || 'N/A')}
                    className="text-gray-600 dark:text-gray-300"
                  />
                </td>

                <td style={tdStyle('modalidad')} className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${s.modalidad === 'COTIZACION' ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400' : 'bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-400'}`}>
                    {s.modalidad || 'CONSIGNACION'}
                  </span>
                </td>

                <td style={tdStyle('estado')} className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70">
                  {s.estado === 'PENDIENTE_CODIGO' ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 animate-pulse">
                      PENDIENTE CÓD.
                    </span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400">
                      {s.estado || 'INGRESADO'}
                    </span>
                  )}
                </td>

                <td style={tdStyle('acciones')} className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70 text-center">
                  {asignandoCodigoId === s.id ? (
                    <div className="flex justify-center gap-1">
                      <button type="button" onClick={() => handleGuardarCodigoNuevo(s.refPath)} className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-[10px] font-bold transition">
                        Guardar
                      </button>
                      <button type="button" onClick={() => setAsignandoCodigoId(null)} className="p-1 bg-gray-400 hover:bg-gray-500 text-white rounded transition">
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex justify-center gap-1">
                      {s.estado === 'PENDIENTE_CODIGO' && !editandoId && (
                        <button type="button" onClick={() => handleIniciarAsignacion(s)} className="px-1.5 py-0.5 bg-amber-500 hover:bg-amber-600 text-white rounded text-[10px] font-bold flex items-center gap-1 transition" title="Asignar Código">
                          Asignar
                        </button>
                      )}
                      <button 
                        type="button" 
                        onClick={() => handleIniciarEdicionFormulario(s)} 
                        className={`p-1 rounded transition ${editandoId === s.id ? 'bg-amber-500 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                        title="Editar en formulario principal"
                        disabled={!!asignandoCodigoId}
                      >
                        <Edit2 size={11} />
                      </button>
                      <button 
                        type="button" 
                        onClick={() => handleEliminarFila(s.refPath)} 
                        className="p-1 bg-red-600 hover:bg-red-700 text-white rounded transition" 
                        title="Eliminar Fila"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  )}
                </td>

                <td style={tdStyle('registradoPor')} className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70"><TruncCell value={s.registradoPor || 'N/A'} className="text-gray-500 dark:text-gray-400" /></td>
                <td style={tdStyle('fechaRegistro')} className="p-3 border-b border-gray-200 dark:border-gray-700"><TruncCell value={formatearFecha(s.fechaRegistro)} className="text-gray-500 dark:text-gray-400" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SolicitudIngresos;