import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, collectionGroup, query, onSnapshot, orderBy, where, setDoc, doc } from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import { FilePlus, Save, CheckCircle } from 'lucide-react';
import { useToast } from '../../../context/ToastContext';
import { useUser } from '../../../context/UserContext';
import Spinner from '../../ui/Spinner';

const SolicitudIngresos = () => {
  const getFechaHoy = () => new Date().toISOString().split('T')[0];

  const [solicitudes, setSolicitudes] = useState([]);
  const [medicos, setMedicos] = useState([]);
  const [codigos, setCodigos] = useState([]);
  const [cargando, setCargando] = useState(false);

  const [showMedicoList, setShowMedicoList] = useState(false);
  const [showDescList, setShowDescList] = useState(false);

  const medicoRef = useRef(null);
  const descRef = useRef(null);

  const initialFormState = {
    fecha: getFechaHoy(),
    admision: '',
    paciente: '',
    medico: '',
    fechaCx: '',
    descripcion: '',
    cantidad: '',
    delivery: '',
    codigo: '',
    precioCosto: '',
    tipo: '',
    atributo: '',
    empresa: ''
  };

  const [formData, setFormData] = useState(initialFormState);
  const { showToast } = useToast();
  const { userData } = useUser();

  // Cargar datos
  useEffect(() => {
    const qM = query(collection(db, "maestros_medicos"), orderBy("nombre", "asc"));
    const qC = query(collection(db, "maestros_codigos"), where("active", "==", true));
    const qS = collectionGroup(db, "registros");

    const unsubM = onSnapshot(qM, (snap) => setMedicos(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubC = onSnapshot(qC, (snap) => setCodigos(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

    const unsubS = onSnapshot(qS,
      (snap) => {
        const data = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(d => d.active === true);
        setSolicitudes(data.sort((a, b) => b.fechaRegistro?.seconds - a.fechaRegistro?.seconds));
      },
      (error) => {
        console.error("Error al cargar datos:", error);
        showToast("Error de acceso a datos. Verifica los índices de Firestore.", "error");
      }
    );

    return () => { unsubM(); unsubC(); unsubS(); };
  }, []);

  const handleSelectDescripcion = (item) => {
    setFormData(prev => ({
      ...prev,
      descripcion: item.descripcion,
      codigo: item.codigo || '',
      precioCosto: item.precioCosto || '',
      tipo: item.tipo || '',
      atributo: item.atributo || '',
      empresa: item.empresa || ''
    }));
    setShowDescList(false);
  };

  const handleRegistrar = async (e) => {
    e.preventDefault();
    setCargando(true);
    try {
      const now = new Date();
      const anio = now.getFullYear().toString();
      const mes = (now.getMonth() + 1).toString().padStart(2, '0');

      const rutaAnio = `consignacion_ingresos/${anio}`;
      const rutaMes = `${rutaAnio}/meses/${mes}`;
      const pathRegistros = `${rutaMes}/registros`;

      // 1. Marcar año y mes como activos
      await setDoc(doc(db, "consignacion_ingresos", anio), { active: true }, { merge: true });
      await setDoc(doc(db, rutaMes, "_metadata"), { active: true }, { merge: true });

      // 2. Registrar el documento
      await addDoc(collection(db, pathRegistros), {
        ...formData,
        active: true,
        registradoPor: userData?.nombreCompleto || 'Usuario',
        fechaRegistro: now
      });

      showToast("Solicitud registrada con éxito", "success");

      // Limpiar solo campos de detalle
      setFormData(prev => ({
        ...prev,
        descripcion: '', cantidad: '', delivery: '',
        codigo: '', precioCosto: '', tipo: '', atributo: '', empresa: ''
      }));
    } catch (error) {
      showToast("Error: " + error.message, "error");
    } finally {
      setCargando(false);
    }
  };

  const medicosFiltrados = medicos.filter(m =>
    m.estado !== 'INACTIVO' &&
    m.nombre.toLowerCase().includes(formData.medico.toLowerCase())
  );
  const descFiltradas = codigos.filter(c =>
    c.descripcion?.toLowerCase().includes(formData.descripcion.toLowerCase())
  );

  const inputClass = "w-full h-8 px-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded text-[11px] outline-none focus:border-[#2383C2] dark:focus:border-[#369BCE]";
  const labelClass = "block text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1";
  const dropDownClass = "absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded shadow-lg max-h-40 overflow-y-auto";

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden relative transition-colors">
      {cargando && <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm"><Spinner size="md" /></div>}

      <h2 className="text-[14px] font-bold text-gray-700 dark:text-gray-200 p-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
        <FilePlus size={16} className="text-[#2383C2] dark:text-[#369BCE]" /> SOLICITUD DE INGRESOS
      </h2>

      <form onSubmit={handleRegistrar} className="p-4 flex flex-col gap-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40">
        <div className="flex flex-wrap gap-2">
          {[
            { key: 'fecha', label: 'Fecha', type: 'date', readOnly: true },
            { key: 'admision', label: 'Admisión' },
            { key: 'paciente', label: 'Paciente' },
            { key: 'medico', label: 'Médico', isMedico: true },
            { key: 'fechaCx', label: 'F. CX', type: 'date' },
            { key: 'descripcion', label: 'Descripción', isDesc: true },
            { key: 'cantidad', label: 'Cantidad', type: 'number' },
            { key: 'delivery', label: 'Delivery' }
          ].map((f) => (
            <div key={f.key} className="flex-1 min-w-[120px] relative" ref={f.isMedico ? medicoRef : f.isDesc ? descRef : null}>
              <label className={labelClass}>{f.label}</label>
              <input type={f.type || 'text'} value={formData[f.key]} onChange={e => setFormData({ ...formData, [f.key]: e.target.value })} readOnly={f.readOnly} className={inputClass} onFocus={() => f.isMedico ? setShowMedicoList(true) : f.isDesc ? setShowDescList(true) : null} />
              {f.isMedico && showMedicoList && (
                <div className={dropDownClass}>
                  {medicosFiltrados.map(m => <div key={m.id} className="px-3 py-2 text-[11px] cursor-pointer hover:bg-[#2383C2] hover:text-white" onClick={() => { setFormData({ ...formData, medico: m.nombre }); setShowMedicoList(false) }}>{m.nombre}</div>)}
                </div>
              )}
              {f.isDesc && showDescList && (
                <div className={dropDownClass}>
                  {descFiltradas.map((d, i) => <div key={i} className="px-3 py-2 text-[11px] cursor-pointer hover:bg-[#2383C2] hover:text-white" onClick={() => handleSelectDescripcion(d)}>{d.descripcion}</div>)}
                </div>
              )}
            </div>
          ))}
        </div>

        {formData.codigo && (
          <div className="flex flex-wrap gap-x-6 gap-y-2 py-2 px-3 bg-blue-50/50 border border-blue-100 rounded text-[11px] text-gray-600">
            <span><strong>Código:</strong> {formData.codigo}</span>
            <span><strong>Precio Costo:</strong> {formData.precioCosto}</span>
            <span><strong>Tipo:</strong> {formData.tipo}</span>
            <span><strong>Atributo:</strong> {formData.atributo}</span>
            <span><strong>Empresa:</strong> {formData.empresa}</span>
          </div>
        )}

        <div className="flex gap-2">
          <button type="submit" className="h-8 px-4 bg-[#2383C2] hover:bg-[#369BCE] text-white rounded font-bold text-[12px] flex items-center gap-2">
            <Save size={14} /> Registrar
          </button>
          <button type="button" onClick={() => setFormData(initialFormState)} className="h-8 px-4 bg-gray-500 hover:bg-gray-600 text-white rounded font-bold text-[12px] flex items-center gap-2">
            <CheckCircle size={14} /> Finalizar
          </button>
        </div>
      </form>

      <div className="flex-grow overflow-auto">
        <table className="w-full text-left text-[11px]">
          <thead className="bg-gray-100 text-gray-600 uppercase font-bold sticky top-0">
            <tr><th className="p-3">#</th>{['Fecha', 'Admisión', 'Paciente', 'Médico', 'Descripción', 'Cant', 'Empresa'].map(h => <th key={h} className="p-3 border-b">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y text-gray-700">
            {solicitudes.map((s, index) => (
              <tr key={s.id} className="hover:bg-gray-50">
                <td className="p-3 font-bold text-[#2383C2]">{index + 1}</td>
                <td className="p-3">{s.fecha}</td>
                <td className="p-3">{s.admision}</td>
                <td className="p-3">{s.paciente}</td>
                <td className="p-3">{s.medico}</td>
                <td className="p-3">{s.descripcion}</td>
                <td className="p-3">{s.cantidad}</td>
                <td className="p-3">{s.empresa}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SolicitudIngresos;