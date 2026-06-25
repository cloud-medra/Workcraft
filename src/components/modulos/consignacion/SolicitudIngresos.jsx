import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import { FilePlus, Save } from 'lucide-react';
import { useToast } from '../../../context/ToastContext';
import { useUser } from '../../../context/UserContext';
import { useGranularPermission } from '../../../hooks/useGranularPermission';
import Spinner from '../../ui/Spinner';

const SolicitudIngresos = () => {
  const { hasPermission } = useGranularPermission();
  const PATH_VISTA = "/consignacion/solicitudIngresos";
  const getFechaHoy = () => new Date().toISOString().split('T')[0];

  const [solicitudes, setSolicitudes] = useState([]);
  const [medicos, setMedicos] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [showMedicoList, setShowMedicoList] = useState(false);
  const wrapperRef = useRef(null);

  const [formData, setFormData] = useState({
    fecha: getFechaHoy(),
    admision: '',
    paciente: '',
    medico: '',
    fechaCx: '',
    descripcion: '',
    cantidad: '',
    delivery: ''
  });

  const { showToast } = useToast();
  const { userData } = useUser();
  const COL_SOLICITUDES = "consignacion_solicitudes_ingreso";

  // Cargar solicitudes
  useEffect(() => {
    const q = query(collection(db, COL_SOLICITUDES), orderBy("fechaRegistro", "desc"));
    return onSnapshot(q, (snapshot) => {
      setSolicitudes(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, []);

  // Cargar médicos para el autocompletado
  useEffect(() => {
    const q = query(collection(db, "maestros_medicos"), orderBy("nombre", "asc"));
    return onSnapshot(q, (snapshot) => {
      setMedicos(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, []);

  // Cerrar menú al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setShowMedicoList(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleGuardar = async (e) => {
    e.preventDefault();
    setCargando(true);
    try {
      await addDoc(collection(db, COL_SOLICITUDES), {
        ...formData,
        registradoPor: userData?.nombreCompleto || 'Usuario',
        fechaRegistro: new Date()
      });
      showToast("Solicitud registrada con éxito", "success");
      setFormData({
        fecha: getFechaHoy(),
        admision: '', paciente: '', medico: '',
        fechaCx: '', descripcion: '', cantidad: '', delivery: ''
      });
    } catch (error) {
      showToast("Error: " + error.message, "error");
    } finally {
      setCargando(false);
    }
  };

  const medicosFiltrados = medicos.filter(m => 
    m.nombre.toLowerCase().includes(formData.medico.toLowerCase())
  );

  const inputClass = "w-full h-8 px-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded text-[11px] outline-none focus:border-[#2383C2] dark:focus:border-[#369BCE]";
  const labelClass = "block text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1";

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden relative transition-colors">
      {cargando && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm">
          <Spinner size="md" />
        </div>
      )}

      <h2 className="text-[14px] font-bold text-gray-700 dark:text-gray-200 p-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
        <FilePlus size={16} className="text-[#2383C2] dark:text-[#369BCE]" /> SOLICITUD DE INGRESOS
      </h2>

      <form onSubmit={handleGuardar} className="p-4 flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40">
        {[
          { key: 'fecha', label: 'Fecha', type: 'date', readOnly: true },
          { key: 'admision', label: 'Admisión' },
          { key: 'paciente', label: 'Paciente' },
          { key: 'medico', label: 'Médico', isMedico: true },
          { key: 'fechaCx', label: 'F. CX', type: 'date' },
          { key: 'descripcion', label: 'Descripción' },
          { key: 'cantidad', label: 'Cantidad', type: 'number' },
          { key: 'delivery', label: 'Delivery' }
        ].map((f) => (
          <div key={f.key} className="flex-1 min-w-[120px]" ref={f.isMedico ? wrapperRef : null}>
            <label className={labelClass}>{f.label}</label>
            <input
              type={f.type || 'text'}
              value={formData[f.key]}
              onChange={e => {
                setFormData({ ...formData, [f.key]: e.target.value });
                if(f.isMedico) setShowMedicoList(true);
              }}
              onFocus={() => f.isMedico && setShowMedicoList(true)}
              readOnly={f.readOnly}
              className={`${inputClass} ${f.readOnly ? 'bg-gray-100 dark:bg-gray-700/50 cursor-not-allowed text-gray-500' : ''}`}
            />
            
            {f.isMedico && showMedicoList && formData.medico && (
              <div className="absolute z-50 w-[180px] mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded shadow-lg max-h-40 overflow-y-auto">
                {medicosFiltrados.map(m => (
                  <div key={m.id} className="px-3 py-2 text-[11px] cursor-pointer hover:bg-[#2383C2] hover:text-white dark:hover:bg-gray-700"
                    onClick={() => { setFormData({ ...formData, medico: m.nombre }); setShowMedicoList(false); }}>
                    {m.nombre}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        
        <button type="submit" className="h-8 mt-auto px-4 bg-[#2383C2] hover:bg-[#369BCE] text-white rounded font-bold text-[12px] flex items-center gap-2 shrink-0">
          <Save size={14} /> Registrar
        </button>
      </form>

      <div className="flex-grow overflow-auto">
        <table className="w-full text-left text-[11px]">
          <thead className="bg-gray-100 dark:bg-gray-900 text-gray-600 uppercase font-bold sticky top-0">
            <tr>
              {['Fecha', 'Admisión', 'Paciente', 'Médico', 'F. CX', 'Descripción', 'Cant', 'Delivery'].map(h => (
                <th key={h} className="p-3 border-b border-gray-200 dark:border-gray-700">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {solicitudes.map(s => (
              <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                <td className="p-3">{s.fecha}</td>
                <td className="p-3 font-bold">{s.admision}</td>
                <td className="p-3">{s.paciente}</td>
                <td className="p-3">{s.medico}</td>
                <td className="p-3">{s.fechaCx}</td>
                <td className="p-3">{s.descripcion}</td>
                <td className="p-3">{s.cantidad}</td>
                <td className="p-3">{s.delivery}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SolicitudIngresos;