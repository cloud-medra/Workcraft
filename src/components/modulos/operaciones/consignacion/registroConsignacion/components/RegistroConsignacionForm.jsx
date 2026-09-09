import React, { useState, useRef, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../../../../../firebaseConfig'; // AJUSTAR según la ubicación real de este archivo
import { Plus, Save, X, Eraser, Info, Loader2, AlertCircle, List } from 'lucide-react';
import { buscarReporteInfoPorAdmision } from '../utils/buscarReporteInfoPorAdmision'; // AJUSTAR ruta si es necesario

const TIPOS = ['CONSIGNACION', 'COTIZACION'];
const CENTRO_FIJO = 'PABELLON';
const ESTADO_FIJO = 'INGRESADO';

const ESTADO_INICIAL = {
  gestionId: '',
  nombre: '',
  medico: '',
  fecha: '',
  referencia: '', 
  codigo: '', 
  cantidad: '',
  delivery: '', 
  empresa: '', // NUEVO: se completa automáticamente al elegir la Descripción/Referencia

  costo: '',
  convenio: '',
  prevision: '',   
  descripcion: '', 
  descripcionPabellon: ''
};

const RegistroConsignacionForm = ({ onRegistrar, valoresIniciales = null, onCancelar }) => {
  const [formData, setFormData] = useState(ESTADO_INICIAL);
  const [errores, setErrores] = useState({});

  const editando = !!valoresIniciales;

  const setField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errores[field]) setErrores(prev => ({ ...prev, [field]: false }));
  };

  useEffect(() => {
    if (valoresIniciales) {
      setFormData({
        gestionId: valoresIniciales.gestionId || '',
        nombre: valoresIniciales.nombre || '',
        medico: valoresIniciales.medico || '',
        fecha: valoresIniciales.fecha || '',
        referencia: valoresIniciales.referencia || '',
        codigo: valoresIniciales.codigo || '',
        cantidad: valoresIniciales.cantidad !== undefined && valoresIniciales.cantidad !== null ? String(valoresIniciales.cantidad) : '',
        delivery: valoresIniciales.delivery || '',
        empresa: valoresIniciales.empresa || '',
        costo: valoresIniciales.costo !== undefined && valoresIniciales.costo !== null ? String(valoresIniciales.costo) : '',
        convenio: valoresIniciales.convenio || '',
        prevision: valoresIniciales.prevision || '',
        descripcion: valoresIniciales.descripcion || '',
        descripcionPabellon: valoresIniciales.descripcionPabellon || ''
      });
      setTipoFiltro(valoresIniciales.tipo || valoresIniciales.atributo || 'CONSIGNACION');
      setErrores({});
    } else {
      setFormData(ESTADO_INICIAL);
      setTipoFiltro('CONSIGNACION');
    }
  }, [valoresIniciales]);

  const [cargandoVinculacion, setCargandoVinculacion] = useState(false);
  const vinculacionDebounceRef = useRef(null);

  useEffect(() => {
    const idTexto = formData.gestionId.trim();

    clearTimeout(vinculacionDebounceRef.current);

    if (!idTexto) {
      setFormData(prev => ({ ...prev, convenio: '', prevision: '', descripcionPabellon: '' }));
      return;
    }

    vinculacionDebounceRef.current = setTimeout(async () => {
      setCargandoVinculacion(true);
      try {
        const datos = await buscarReporteInfoPorAdmision(db, idTexto);
        setFormData(prev => ({
          ...prev,
          convenio: datos?.['Convenio'] || '',
          prevision: datos?.['Isapre'] || '',
          descripcionPabellon: datos?.['Descripción'] || ''
        }));
      } finally {
        setCargandoVinculacion(false);
      }
    }, 500);

    return () => clearTimeout(vinculacionDebounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.gestionId]);

  const [medicos, setMedicos] = useState([]);
  const [abiertoMedico, setAbiertoMedico] = useState(false);
  const [verTodosMedicos, setVerTodosMedicos] = useState(false);
  const medicoRef = useRef(null);

  useEffect(() => {
    const q = query(collection(db, 'maestros_prestadores'), orderBy('nombre', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(p => (p.estado || 'ACTIVO').toUpperCase() !== 'INACTIVO');
      setMedicos(data);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (medicoRef.current && !medicoRef.current.contains(e.target)) setAbiertoMedico(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const medicosFiltrados = (verTodosMedicos || !formData.medico.trim())
    ? medicos
    : medicos.filter(m =>
        m.nombre.toLowerCase().includes(formData.medico.toLowerCase()) ||
        (m.especialidad || '').toLowerCase().includes(formData.medico.toLowerCase())
      );

  const handleAbrirListaMedicos = () => {
    setVerTodosMedicos(true);
    setAbiertoMedico(true);
  };

  const handleSeleccionarMedico = (m) => {
    setField('medico', m.nombre);
    setVerTodosMedicos(false);
    setAbiertoMedico(false);
  };

  const [tipoFiltro, setTipoFiltro] = useState('CONSIGNACION');
  const [codigosDisponibles, setCodigosDisponibles] = useState([]);
  const [cargandoCodigos, setCargandoCodigos] = useState(false);
  const [abiertoDescripcion, setAbiertoDescripcion] = useState(false);
  const [verTodosCodigos, setVerTodosCodigos] = useState(false);
  const descripcionRef = useRef(null);

  useEffect(() => {
    setCargandoCodigos(true);
    const q = query(collection(db, 'maestros_codigos'), where('tipo', '==', tipoFiltro));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setCodigosDisponibles(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setCargandoCodigos(false);
      },
      () => setCargandoCodigos(false)
    );
    return () => unsub();
  }, [tipoFiltro]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (descripcionRef.current && !descripcionRef.current.contains(e.target)) setAbiertoDescripcion(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const sugerenciasDescripcion = (verTodosCodigos || !formData.referencia.trim())
    ? codigosDisponibles
    : codigosDisponibles.filter(item => {
        const t = formData.referencia.toLowerCase();
        return (
          (item.referencia || '').toLowerCase().includes(t) ||
          (item.descriptorAuto || '').toLowerCase().includes(t) ||
          (item.descriptorEmpresa || '').toLowerCase().includes(t) ||
          (item.codigo || '').toLowerCase().includes(t)
        );
      });

  const handleAbrirListaDescripcion = () => {
    setVerTodosCodigos(true);
    setAbiertoDescripcion(true);
  };

  const handleCambiarTipo = (nuevoTipo) => {
    if (nuevoTipo === tipoFiltro) return;
    setTipoFiltro(nuevoTipo);
  };

  const handleSeleccionarDescripcion = (item) => {
    setFormData(prev => ({
      ...prev,
      referencia: item.referencia || prev.referencia,
      codigo: item.codigo || '',
      costo: item.precioNeto ?? '',
      descripcion: item.descriptorEmpresa || item.descriptorAuto || '',
      empresa: item.empresa || '' // NUEVO: trae la empresa desde maestros_codigos
    }));
    setVerTodosCodigos(false);
    setAbiertoDescripcion(false);
  };

  const renderValorVinculado = (valor) => (valor === '' || valor === undefined || valor === null ? 'P' : valor);

  const handleRegistrar = (e) => {
    e.preventDefault();

    const err = {};
    if (!formData.fecha || formData.fecha.trim() === '') err.fecha = true;
    if (!formData.referencia || formData.referencia.trim() === '') err.referencia = true;
    if (!formData.cantidad || Number(formData.cantidad) <= 0) err.cantidad = true;

    if (Object.keys(err).length > 0) {
      setErrores(err);
      return;
    }
    setErrores({});

    onRegistrar && onRegistrar({
      ...formData,
      tipo: tipoFiltro,
      atributo: tipoFiltro, 
      centro: CENTRO_FIJO,
      estado: ESTADO_FIJO
    });

    if (!editando) {
      setFormData(prev => ({
        ...prev,
        referencia: '',
        codigo: '',
        cantidad: '',
        delivery: '',
        costo: '',
        descripcion: '',
        empresa: ''
      }));
    }
  };

  const handleLimpiar = () => {
    if (editando) {
      onCancelar && onCancelar();
      return; 
    }
    setFormData(ESTADO_INICIAL);
    setErrores({});
    setTipoFiltro('CONSIGNACION');
    setVerTodosMedicos(false);
    setVerTodosCodigos(false);
    setAbiertoMedico(false);
    setAbiertoDescripcion(false);
  };

  return (
    <form onSubmit={handleRegistrar} className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50/30 dark:bg-gray-800/20 flex flex-col gap-2">
      <div className="flex flex-wrap items-end gap-2.5">

        <div className="w-[100px]">
          <label className="block text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-0.5">ID</label>
          <input
            type="text"
            inputMode="numeric"
            value={formData.gestionId}
            onChange={e => setField('gestionId', e.target.value.replace(/\D/g, ''))}
            className="w-full h-7 px-2 border border-gray-300 dark:border-gray-600 rounded text-[11px] outline-none focus:border-[#2383C2] bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 font-semibold"
            placeholder="Ej: 102"
          />
        </div>

        <div className="w-[160px]">
          <label className="block text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-0.5">Nombre</label>
          <input
            value={formData.nombre}
            onChange={e => setField('nombre', e.target.value.toUpperCase())}
            className="w-full h-7 px-2 border border-gray-300 dark:border-gray-600 rounded text-[11px] outline-none focus:border-[#2383C2] bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 uppercase"
            placeholder="Nombre del paciente"
          />
        </div>

        <div className="w-[170px] relative" ref={medicoRef}>
          <label className="block text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-0.5">Médico</label>
          <div className="relative">
            <input
              type="text"
              autoComplete="off"
              value={formData.medico}
              onChange={e => { setField('medico', e.target.value); setVerTodosMedicos(false); }}
              onFocus={() => setAbiertoMedico(true)}
              className="w-full h-7 pl-2 pr-6 border border-gray-300 dark:border-gray-600 rounded text-[11px] outline-none focus:border-[#2383C2] bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 uppercase"
              placeholder="Buscar médico..."
            />
            <button
              type="button"
              onClick={handleAbrirListaMedicos}
              title="Ver listado completo de médicos"
              className="absolute right-1 top-1 p-0.5 text-gray-400 hover:text-[#2383C2] transition"
            >
              <List size={13} />
            </button>
          </div>

          {abiertoMedico && (
            <div className="absolute top-full left-0 mt-1 w-56 max-h-48 overflow-y-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-lg z-30">
              {medicosFiltrados.length === 0 ? (
                <div className="px-2.5 py-2 text-[10px] text-gray-400">Sin coincidencias</div>
              ) : (
                medicosFiltrados.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => handleSeleccionarMedico(m)}
                    className="w-full text-left px-2.5 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700/60 border-b border-gray-100 dark:border-gray-700/50 last:border-b-0"
                  >
                    <div className="text-[10px] font-semibold text-gray-700 dark:text-gray-200 truncate">{m.nombre}</div>
                    {m.especialidad && (
                      <div className="text-[9px] text-gray-400 dark:text-gray-500 truncate">{m.especialidad}</div>
                    )}
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <div className="w-[130px]">
          <label className="block text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-0.5 flex justify-between">
            <span>Fecha</span>
            <span className="text-red-500 font-bold">*</span>
          </label>
          <input
            type="date"
            value={formData.fecha}
            onChange={e => setField('fecha', e.target.value)}
            className={`w-full h-7 px-2 border rounded text-[11px] outline-none transition bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 ${errores.fecha
              ? 'border-red-500 ring-1 ring-red-500/30 bg-red-50/20'
              : 'border-gray-300 dark:border-gray-600 focus:border-[#2383C2]'
              }`}
          />
        </div>

        <div className="w-[230px] relative" ref={descripcionRef}>
          <label className="mb-0.5 flex items-center justify-between gap-1">
            <span className="text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase flex items-center gap-1">
              Descripción / Referencia <span className="text-red-500 font-bold">*</span>
            </span>
            <span className="flex items-center rounded overflow-hidden border border-gray-300 dark:border-gray-600 text-[8px] font-bold uppercase">
              {TIPOS.map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleCambiarTipo(t)}
                  className={`px-1.5 py-0.5 transition ${tipoFiltro === t
                    ? 'bg-[#2383C2] text-white'
                    : 'bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                >
                  {t === 'CONSIGNACION' ? 'CONSIG.' : 'COTIZ.'}
                </button>
              ))}
            </span>
          </label>

          <div className="relative">
            <input
              type="text"
              autoComplete="off"
              value={formData.referencia}
              onChange={e => { setField('referencia', e.target.value); setVerTodosCodigos(false); }}
              onFocus={() => setAbiertoDescripcion(true)}
              className={`w-full h-7 pl-2 pr-6 border rounded text-[11px] outline-none bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 ${errores.referencia
                ? 'border-red-500 ring-1 ring-red-500/30'
                : 'border-gray-300 dark:border-gray-600 focus:border-[#2383C2]'
                }`}
              placeholder="Buscar descripción / referencia..."
            />
            <button
              type="button"
              onClick={handleAbrirListaDescripcion}
              title="Ver listado completo"
              className="absolute right-1 top-1 p-0.5 text-gray-400 hover:text-[#2383C2] transition"
            >
              <List size={13} />
            </button>
          </div>

          {abiertoDescripcion && (
            <div className="absolute top-full left-0 mt-1 w-full max-h-48 overflow-y-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-lg z-30">
              {cargandoCodigos ? (
                <div className="px-2.5 py-2 text-[10px] text-gray-400 flex items-center gap-1.5">
                  <Loader2 size={11} className="animate-spin" /> Buscando...
                </div>
              ) : sugerenciasDescripcion.length === 0 ? (
                <div className="px-2.5 py-2 text-[10px] text-gray-400">Sin coincidencias en {tipoFiltro}</div>
              ) : (
                sugerenciasDescripcion.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSeleccionarDescripcion(item)}
                    className="w-full text-left px-2.5 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700/60 border-b border-gray-100 dark:border-gray-700/50 last:border-b-0"
                  >
                    <div className="text-[10px] font-semibold text-gray-700 dark:text-gray-200 truncate flex items-center gap-1.5">
                      {item.referencia}
                      <span className="font-mono text-[8px] text-emerald-600 dark:text-emerald-400">{item.codigo || 'S/C'}</span>
                    </div>
                    <div className="text-[9px] text-gray-400 dark:text-gray-500 truncate">
                      {item.descriptorEmpresa || item.descriptorAuto || 'Sin descripción'} · {item.empresa || 'N/A'}
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <div className="w-[85px]">
          <label className="block text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-0.5 flex justify-between">
            <span>Cant.</span>
            <span className="text-red-500 font-bold">*</span>
          </label>
          <input
            type="number"
            value={formData.cantidad}
            onChange={e => setField('cantidad', e.target.value)}
            className={`w-full h-7 px-2 border rounded text-[11px] outline-none bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 ${errores.cantidad
              ? 'border-red-500 ring-1 ring-red-500/30'
              : 'border-gray-300 dark:border-gray-600 focus:border-[#2383C2]'
              }`}
            placeholder="1"
          />
        </div>

        <div className="w-[130px]">
          <label className="block text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-0.5">Delivery</label>
          <input
            type="text"
            value={formData.delivery}
            onChange={e => setField('delivery', e.target.value)}
            className="w-full h-7 px-2 border border-gray-300 dark:border-gray-600 rounded text-[11px] outline-none focus:border-[#2383C2] bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100"
            placeholder="Ej: 3 días hábiles"
          />
        </div>

        <div className="flex items-end gap-1.5">
          <button
            type="submit"
            className={`h-7 px-3 rounded font-bold text-[11px] flex items-center gap-1.5 text-white transition shrink-0 ${editando ? 'bg-amber-600 hover:bg-amber-700' : 'bg-[#2383C2] hover:bg-[#369BCE]'}`}
          >
            {editando ? <><Save size={13} /> Actualizar</> : <><Plus size={13} /> Registrar</>}
          </button>

          <button
            type="button"
            onClick={handleLimpiar}
            className="h-7 px-3 bg-gray-200 dark:bg-gray-700 rounded font-bold text-[11px] text-gray-600 dark:text-gray-300 flex items-center gap-1.5 hover:bg-gray-300 dark:hover:bg-gray-600 transition shrink-0"
          >
            {editando ? <><X size={13} /> Cancelar</> : <><Eraser size={13} /> Limpiar</>}
          </button>
        </div>
      </div>

      {(errores.fecha || errores.referencia || errores.cantidad) && (
        <div className="text-[9px] text-red-500 font-medium flex items-center gap-1">
          <AlertCircle size={10} /> Fecha, Descripción/Referencia y Cantidad son obligatorios
        </div>
      )}

      <div className="flex flex-wrap items-center gap-6 pt-1 px-2 bg-gray-100/60 dark:bg-gray-900/40 rounded border border-dashed border-gray-200 dark:border-gray-700/60 py-1.5 text-[11px]">
        <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
          <Info size={13} className="text-[#2383C2]" />
          <span className="text-[10px] font-bold uppercase text-gray-400 dark:text-gray-500">Datos Vinculados:</span>
          {cargandoVinculacion && (
            <Loader2 size={11} className="animate-spin text-[#2383C2]" />
          )}
        </div>

        <div className="flex items-center gap-1">
          <span className="font-bold text-gray-500 dark:text-gray-400 text-[10px] uppercase">Centro:</span>
          <span className="font-semibold text-gray-700 dark:text-gray-200 bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded text-[10px]">
            {CENTRO_FIJO}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <span className="font-bold text-gray-500 dark:text-gray-400 text-[10px] uppercase">Atributo:</span>
          <span className="font-semibold text-gray-700 dark:text-gray-200 bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded text-[10px]">
            {tipoFiltro}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <span className="font-bold text-gray-500 dark:text-gray-400 text-[10px] uppercase">Estado:</span>
          <span className="font-semibold text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/40 px-1.5 py-0.5 rounded text-[10px]">
            {ESTADO_FIJO}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <span className="font-bold text-gray-500 dark:text-gray-400 text-[10px] uppercase">Código:</span>
          <span className="font-mono font-semibold text-gray-700 dark:text-gray-200 bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded text-[10px]">
            {renderValorVinculado(formData.codigo)}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <span className="font-bold text-gray-500 dark:text-gray-400 text-[10px] uppercase">Empresa:</span>
          <span className="font-semibold text-gray-700 dark:text-gray-200 bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded text-[10px]">
            {renderValorVinculado(formData.empresa)}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <span className="font-bold text-gray-500 dark:text-gray-400 text-[10px] uppercase">Costo:</span>
          <span className="font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/40 px-1.5 py-0.5 rounded text-[10px]">
            {formData.costo !== '' ? `$${Number(formData.costo).toLocaleString('es-CL')}` : 'P'}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <span className="font-bold text-gray-500 dark:text-gray-400 text-[10px] uppercase">Convenio:</span>
          <span className="font-medium text-gray-700 dark:text-gray-200">
            {renderValorVinculado(formData.convenio)}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <span className="font-bold text-gray-500 dark:text-gray-400 text-[10px] uppercase">Previsión:</span>
          <span className="font-medium text-gray-700 dark:text-gray-200">
            {renderValorVinculado(formData.prevision)}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <span className="font-bold text-gray-500 dark:text-gray-400 text-[10px] uppercase">Descripción:</span>
          <span className="font-medium text-gray-700 dark:text-gray-200 truncate max-w-[250px]" title={renderValorVinculado(formData.descripcion)}>
            {renderValorVinculado(formData.descripcion)}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <span className="font-bold text-gray-500 dark:text-gray-400 text-[10px] uppercase">Descripción Pabellón:</span>
          <span className="font-medium text-gray-700 dark:text-gray-200 truncate max-w-[250px]" title={renderValorVinculado(formData.descripcionPabellon)}>
            {renderValorVinculado(formData.descripcionPabellon)}
          </span>
        </div>
      </div>
    </form>
  );
};

export default RegistroConsignacionForm;