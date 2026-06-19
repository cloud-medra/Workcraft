import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from "../../../../firebaseConfig";
import { ListFilter, FileText } from 'lucide-react';
import { useToast } from '../../../../context/ToastContext';
import Spinner from '../../../ui/Spinner';

const ResumenFacturas = () => {
  const [cargando, setCargando] = useState(false);
  const [resumenes, setResumenes] = useState([]);
  
  // Filtros
  const [anios, setAnios] = useState([]);
  const [filtroAnio, setFiltroAnio] = useState("");
  const [filtroMes, setFiltroMes] = useState("");
  
  const { showToast } = useToast();

  // 1. Cargar años únicos (o simplemente listar años existentes)
  // Nota: Si usas una estructura fija, esto puede variar
  useEffect(() => {
    // Simulamos la carga de años desde la colección de conciliaciones 
    // o puedes definir una lista fija
    setAnios(["2025", "2026"]); 
  }, []);

  // 2. Función para obtener los registros filtrados
  const fetchResumen = async () => {
    if (!filtroAnio || !filtroMes) return showToast("Selecciona Año y Mes", "error");
    
    setCargando(true);
    try {
      // Nota: Asumiendo que guardaste los registros con fecha o algún campo de fecha
      // Firestore requiere un índice si filtras por múltiples campos.
      const q = query(collection(db, "laboratorio_conciliaciones"));
      const snap = await getDocs(q);
      
      // Filtramos en cliente para asegurar coincidencia exacta de año/mes 
      // (ajusta la lógica si guardas la fecha en formato string YYYY-MM)
      const datos = snap.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(f => f.fchEmis?.includes(`${filtroAnio}-${filtroMes}`));

      setResumenes(datos);
    } catch (error) {
      showToast("Error al cargar resumen: " + error.message, "error");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden relative">
      {cargando && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-gray-500/20 backdrop-blur-[2px]">
          <Spinner size="md" color="#0E5B6D" />
        </div>
      )}

      <h2 className="text-[14px] font-bold text-gray-700 p-4 border-b border-gray-200 flex items-center gap-2">
        <FileText size={16} className="text-[#0E5B6D]" /> RESUMEN FACTURAS INGRESADAS
      </h2>

      <div className="bg-gray-50 p-3 flex gap-2 items-center border-b border-gray-200">
        <select value={filtroAnio} onChange={(e) => setFiltroAnio(e.target.value)} className="h-8 border border-gray-300 rounded text-[12px] px-2 outline-none">
          <option value="">Año</option>
          {anios.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={filtroMes} onChange={(e) => setFiltroMes(e.target.value)} className="h-8 border border-gray-300 rounded text-[12px] px-2 outline-none">
          <option value="">Mes</option>
          {["01","02","03","04","05","06","07","08","09","10","11","12"].map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <button onClick={fetchResumen} className="h-8 px-4 bg-[#0E5B6D] text-white rounded text-[12px] font-bold hover:bg-[#0a4856]">
          CONSULTAR
        </button>
      </div>

      <div className="flex-grow overflow-auto">
        <table className="w-full text-left text-[12px] border-collapse">
          <thead className="bg-gray-100 sticky top-0">
            <tr className="text-gray-600 uppercase font-bold text-[11px]">
              <th className="p-3 border-b">Folio</th>
              <th className="p-3 border-b">Fecha Emisión</th>
              <th className="p-3 border-b">Proveedor</th>
              <th className="p-3 border-b">Total</th>
              <th className="p-3 border-b">Estado</th>
            </tr>
          </thead>
          <tbody>
            {resumenes.map((f, i) => (
              <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="p-3 font-bold text-[#0E5B6D]">{f.folio}</td>
                <td className="p-3">{f.fchEmis}</td>
                <td className="p-3">{f.rznSoc}</td>
                <td className="p-3 font-bold text-gray-800">${Number(f.total || 0).toLocaleString()}</td>
                <td className="p-3 text-green-600 font-bold">Ingresado</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ResumenFacturas;