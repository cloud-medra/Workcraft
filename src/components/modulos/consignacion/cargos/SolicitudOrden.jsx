import React, { useEffect, useState } from 'react';
import { db } from '../../../../firebaseConfig';
import { collection, onSnapshot, query } from 'firebase/firestore';

const SolicitudOrden = () => {
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Apuntamos a la colección que acabamos de habilitar en las reglas
    const q = query(collection(db, 'consignacion_solicitud'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs = [];
        snapshot.forEach((doc) => {
          docs.push({ id: doc.id, ...doc.data() });
        });
        setRegistros(docs);
        setLoading(false);
      },
      (err) => {
        console.error("Error al cargar consignacion_solicitud:", err);
        setError("No tienes permisos o hubo un error al cargar los datos.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center flex-grow p-8">
        <div className="w-8 h-8 border-4 border-[#2383C2] border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-2 text-[12px] text-gray-500 dark:text-gray-400 font-medium tracking-wide uppercase">
          Cargando registros temporales...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 m-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
        <p className="text-sm text-red-600 dark:text-red-400 font-medium">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex-grow flex flex-col p-4 overflow-hidden h-full">
      {/* Cabecera interna */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div>
          <h2 className="text-[14px] font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
            Solicitudes en Tránsito
          </h2>
          <p className="text-[11px] text-gray-400 dark:text-gray-500">
            Registros pendientes de la colección temporal para traspaso masivo.
          </p>
        </div>
        <span className="px-2.5 py-1 text-[11px] font-semibold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full">
          {registros.length} {registros.length === 1 ? 'registro' : 'registros'}
        </span>
      </div>

      {/* Tabla de Datos */}
      <div className="flex-grow overflow-auto border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900/40">
        {registros.length === 0 ? (
          <div className="flex items-center justify-center h-full p-8 text-gray-400 dark:text-gray-500 italic text-[13px]">
            No hay registros temporales en esta colección.
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
                {/* Ajusta estas columnas según las propiedades reales de tus documentos */}
                <th className="px-4 py-2.5 text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">ID Documento</th>
                <th className="px-4 py-2.5 text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Detalle / Ítems</th>
                <th className="px-4 py-2.5 text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Fecha Creación</th>
                <th className="px-4 py-2.5 text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {registros.map((reg) => (
                <tr 
                  key={reg.id} 
                  className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors"
                >
                  <td className="px-4 py-3 text-[12px] font-mono text-gray-600 dark:text-gray-300 whitespace-nowrap">
                    {reg.id}
                  </td>
                  <td className="px-4 py-3 text-[12px] text-gray-700 dark:text-gray-300">
                    {/* Renderiza aquí algún campo identificatorio dinámico, por ejemplo reg.detalle o reg.nombre */}
                    {reg.detalle || reg.descripcion || JSON.stringify(reg.items || 'Sin descripción')}
                  </td>
                  <td className="px-4 py-3 text-[12px] text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    {reg.createdAt?.seconds 
                      ? new Date(reg.createdAt.seconds * 1000).toLocaleString() 
                      : reg.fecha || 'N/A'}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50">
                      {reg.estado || 'Pendiente'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default SolicitudOrden;