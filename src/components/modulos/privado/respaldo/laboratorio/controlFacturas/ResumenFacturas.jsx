import React, { useState, useEffect } from 'react';
import { collection, getDocs, query } from 'firebase/firestore';
import { db } from "../../../../firebaseConfig";
import { FileText } from 'lucide-react';
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

  useEffect(() => {
    setAnios(["2025", "2026"]); 
  }, []);

  const fetchResumen = async () => {
    if (!filtroAnio || !filtroMes) return showToast("Selecciona Año y Mes", "error");
    
    setCargando(true);
    try {
      const q = query(collection(db, "laboratorio_conciliaciones"));
      const snap = await getDocs(q);
      
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
    <div className="w-full h-full flex flex-col bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden relative">
      {cargando && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-gray-500/20 dark:bg-gray-900/50 backdrop-blur-[2px]">
          <Spinner size="md" color="#2383C2" />
        </div>
      )}

      <h2 className="text-[14px] font-bold text-gray-700 dark:text-gray-200 p-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
        <FileText size={16} className="text-[#2383C2]" /> RESUMEN FACTURAS INGRESADAS
      </h2>

      <div className="bg-gray-50 dark:bg-gray-900 p-3 flex gap-2 items-center border-b border-gray-200 dark:border-gray-700">
        <select 
          value={filtroAnio} 
          onChange={(e) => setFiltroAnio(e.target.value)} 
          className="h-8 border border-gray-300 dark:border-gray-600 rounded text-[12px] px-2 outline-none bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200"
        >
          <option value="">Año</option>
          {anios.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select 
          value={filtroMes} 
          onChange={(e) => setFiltroMes(e.target.value)} 
          className="h-8 border border-gray-300 dark:border-gray-600 rounded text-[12px] px-2 outline-none bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200"
        >
          <option value="">Mes</option>
          {["01","02","03","04","05","06","07","08","09","10","11","12"].map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <button 
          onClick={fetchResumen} 
          className="h-8 px-4 bg-[#2383C2] text-white rounded text-[12px] font-bold hover:bg-[#0a4856] transition-colors"
        >
          CONSULTAR
        </button>
      </div>

      <div className="flex-grow overflow-auto">
        <table className="w-full text-left text-[12px] border-collapse">
          <thead className="bg-gray-100 dark:bg-gray-900 sticky top-0">
            <tr className="text-gray-600 dark:text-gray-400 uppercase font-bold text-[11px]">
              <th className="p-3 border-b border-gray-200 dark:border-gray-700">Folio</th>
              <th className="p-3 border-b border-gray-200 dark:border-gray-700">Fecha Emisión</th>
              <th className="p-3 border-b border-gray-200 dark:border-gray-700">Proveedor</th>
              <th className="p-3 border-b border-gray-200 dark:border-gray-700">Total</th>
              <th className="p-3 border-b border-gray-200 dark:border-gray-700">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {resumenes.map((f, i) => (
              <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <td className="p-3 font-bold text-[#2383C2]">{f.folio}</td>
                <td className="p-3 text-gray-600 dark:text-gray-300">{f.fchEmis}</td>
                <td className="p-3 text-gray-600 dark:text-gray-300">{f.rznSoc}</td>
                <td className="p-3 font-bold text-gray-800 dark:text-gray-200">${Number(f.total || 0).toLocaleString()}</td>
                <td className="p-3 text-green-600 dark:text-green-400 font-bold">Ingresado</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ResumenFacturas;