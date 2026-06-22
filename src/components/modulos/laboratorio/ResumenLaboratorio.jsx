import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, getDocs } from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import { BarChart3 } from 'lucide-react';

const ResumenLaboratorio = () => {
  const [resumen, setResumen] = useState([]);
  const [aniosDisponibles, setAniosDisponibles] = useState([]);
  const [filtroAnio, setFiltroAnio] = useState(new Date().getFullYear().toString());

  const COL_RESUMEN = "laboratorio_resumen_financiero";

  // Cargar años disponibles
  useEffect(() => {
    const cargarAnios = async () => {
      const snap = await getDocs(collection(db, COL_RESUMEN));
      const anios = snap.docs.map(d => d.id).sort((a, b) => b - a);
      setAniosDisponibles(anios);
    };
    cargarAnios();
  }, []);

  // Cargar resumen por mes del año seleccionado
  useEffect(() => {
    if (!filtroAnio) return;
    const path = `${COL_RESUMEN}/${filtroAnio}/meses`;
    const q = query(collection(db, path));

    return onSnapshot(q, (snapshot) => {
      const datos = snapshot.docs.map(d => ({ mes: d.id, ...d.data() }));
      setResumen(datos);
    });
  }, [filtroAnio]);

  const formatCLP = (val) => val ? `$ ${Number(val).toLocaleString('es-CL')}` : '$ 0';

  return (
    <div className="w-full h-full flex flex-col bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
      <div className="p-4 border-b border-gray-200 flex justify-between items-center">
        <h2 className="text-[14px] font-bold text-gray-700 flex items-center gap-2">
          <BarChart3 size={16} className="text-[#2383C2]" /> RESUMEN FINANCIERO
        </h2>
        <select
          value={filtroAnio}
          onChange={(e) => setFiltroAnio(e.target.value)}
          className="h-8 border border-gray-300 rounded text-[12px] px-2 outline-none"
        >
          {aniosDisponibles.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      <div className="flex-grow overflow-auto">
        <table className="w-full text-left text-[11px] border-collapse">
          <thead className="bg-gray-100 sticky top-0 text-gray-600 uppercase font-bold">
            <tr>
              <th className="p-3 border-b border-r border-gray-200">Mes</th>
              <th className="p-3 border-b border-r border-gray-200">Total Acta</th>
              <th className="p-3 border-b border-r border-gray-200">Total Salida</th>
              <th className="p-3 border-b border-gray-200">Última Actualización</th>
            </tr>
          </thead>
          <tbody>
            {resumen.map((r) => (
              <tr key={r.mes} className="border-l-4 border-transparent hover:border-[#2383C2] hover:bg-gray-50 transition-colors uppercase">
                <td className="p-3 border-b border-r border-gray-200 font-bold text-gray-700">{r.mes}</td>
                <td className="p-3 border-b border-r border-gray-200 font-medium text-[#2383C2]">{formatCLP(r.totalActa)}</td>
                <td className="p-3 border-b border-r border-gray-200 font-medium text-amber-600">{formatCLP(r.totalSalida)}</td>
                <td className="p-3 border-b border-gray-200 text-gray-400">
                  {r.ultimaActualizacion?.toDate().toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ResumenLaboratorio;