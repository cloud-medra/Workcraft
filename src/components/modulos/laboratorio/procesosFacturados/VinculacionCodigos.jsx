// src/components/facturas/VinculacionCodigos.jsx
import React, { useState, useEffect } from 'react';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../../../firebaseConfig';
import { ClipboardList, Search, RefreshCw, Link as LinkIcon } from 'lucide-react';
import { useToast } from '../../../../context/ToastContext';
import { useModal } from '../../../../context/ModalContext';
import { useGranularPermission } from '../../../../hooks/useGranularPermission';

const VinculacionCodigos = () => {
  const [facturas, setFacturas] = useState([]);
  const [aniosDisponibles, setAniosDisponibles] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [filtroAnio, setFiltroAnio] = useState('');
  const [loading, setLoading] = useState(false);

  const { showToast } = useToast();
  const { confirmAction } = useModal();
  const { hasPermission } = useGranularPermission();

  const PATH_VISTA = "/laboratorio/controlFactura";
  const COL_BASE = "laboratorio_facturasXml";

  // Cargar Años Disponibles
  useEffect(() => {
    const cargarAnios = async () => {
      try {
        const snap = await getDocs(collection(db, COL_BASE));
        const anios = snap.docs.map(d => d.id).sort((a, b) => b - a);
        setAniosDisponibles(anios);
      } catch (error) {
        console.error("Error al cargar años:", error);
      }
    };
    cargarAnios();
  }, []);

  // Cargar facturas en estado "En Proceso"
  const cargarFacturasEnProceso = async () => {
    if (!filtroAnio) {
      setFacturas([]);
      return;
    }

    setLoading(true);
    try {
      const mesesSnap = await getDocs(collection(db, COL_BASE, filtroAnio, "meses"));
      let docsAcumulados = [];

      for (const mesDoc of mesesSnap.docs) {
        const mesId = mesDoc.id;
        const docsSnap = await getDocs(collection(db, COL_BASE, filtroAnio, "meses", mesId, "documentos"));
        
        docsSnap.docs.forEach(d => {
          const data = d.data();
          if (data.estado === "En Proceso") {
            docsAcumulados.push({
              id: d.id,
              mesId,
              ...data
            });
          }
        });
      }

      docsAcumulados.sort((a, b) => new Date(b.fchEmis || 0) - new Date(a.fchEmis || 0));
      setFacturas(docsAcumulados);
    } catch (error) {
      console.error("Error al cargar facturas en proceso:", error);
      showToast("Error al obtener las facturas en proceso", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarFacturasEnProceso();
  }, [filtroAnio]);

  const facturasFiltradas = facturas.filter(f => 
    f.folio?.includes(busqueda) || 
    f.rznSoc?.toLowerCase().includes(busqueda.toLowerCase()) || 
    f.folioRef?.includes(busqueda)
  );

  return (
    <div className="w-full h-full flex flex-col bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-lg shadow-xs overflow-hidden p-0 relative font-sans">
      
      {/* CABECERA */}
      <header className="bg-white dark:bg-gray-800 border-b border-slate-200 dark:border-gray-700 px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardList size={16} className="text-[#2383C2]" />
          <span className="text-[12px] font-normal text-slate-800 dark:text-gray-100 tracking-wide uppercase">
            Vinculación de Códigos (Estado: En Proceso)
          </span>
        </div>
      </header>

      {/* FILTROS Y BÚSQUEDA */}
      <div className="bg-slate-100/70 dark:bg-gray-800/40 p-1.5 flex flex-wrap gap-1.5 items-center justify-between border-b border-slate-200 dark:border-gray-700">
        <div className="flex flex-wrap gap-1.5 items-center flex-grow">
          {hasPermission(PATH_VISTA, "filtros_busqueda", "select_anio") && (
            <select
              value={filtroAnio}
              onChange={(e) => setFiltroAnio(e.target.value)}
              className="h-6 border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-slate-800 dark:text-gray-100 rounded text-[11px] px-1.5 outline-none focus:border-[#2383C2]"
            >
              <option value="">Seleccionar Año</option>
              {aniosDisponibles.map((a, idx) => (
                <option key={`anio-${a}-${idx}`} value={a}>{a}</option>
              ))}
            </select>
          )}

          {hasPermission(PATH_VISTA, "filtros_busqueda", "input_busqueda") && (
            <div className="relative flex-grow max-w-xs">
              <Search className="absolute left-2 top-1.5 text-slate-400 dark:text-gray-500" size={12} />
              <input
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                className="w-full h-6 pl-7 pr-2 border border-slate-300 dark:border-gray-600 rounded text-[11px] outline-none bg-white dark:bg-gray-900 text-slate-800 dark:text-gray-100 focus:border-[#2383C2]"
                placeholder="Buscar por Folio, Ref o Razón Social..."
              />
            </div>
          )}
        </div>

        <button
          onClick={cargarFacturasEnProceso}
          disabled={!filtroAnio || loading}
          className="h-6 px-2 rounded text-[11px] font-medium bg-white dark:bg-gray-800 border border-slate-300 dark:border-gray-600 text-slate-700 dark:text-gray-200 hover:bg-slate-50 dark:hover:bg-gray-700 flex items-center gap-1 transition-colors"
          title="Recargar datos"
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          <span>Actualizar</span>
        </button>
      </div>

      {/* TABLA DE FACTURAS EN PROCESO */}
      {hasPermission(PATH_VISTA, "tabla_facturas") && (
        <div className="flex-grow overflow-auto">
          {loading ? (
            <div className="w-full h-40 flex items-center justify-center text-xs text-slate-500 dark:text-gray-400">
              Cargando facturas en proceso del año {filtroAnio}...
            </div>
          ) : (
            <table className="w-full text-left text-[11px] border-collapse table-fixed min-w-[800px]">
              <thead className="bg-slate-100 dark:bg-gray-900/80 sticky top-0 z-10">
                <tr className="text-slate-600 dark:text-gray-400 uppercase font-normal text-[10px] tracking-wider">
                  <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700 w-[12%]">Folio</th>
                  <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700 w-[12%]">Emisión</th>
                  <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700 w-[12%]">Ref.</th>
                  <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700 w-[36%]">Razón Social</th>
                  <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700 w-[14%] text-right">Total (Neto)</th>
                  <th className="px-2 py-1.5 border-b border-slate-200 dark:border-gray-700 w-[14%] text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/60 dark:divide-gray-700/50 bg-white dark:bg-gray-800">
                {facturasFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-3 py-6 text-center text-slate-400 dark:text-gray-500 text-xs">
                      {filtroAnio 
                        ? "No hay facturas en estado 'En Proceso' para este año." 
                        : "Seleccione un año para visualizar las facturas."}
                    </td>
                  </tr>
                ) : (
                  facturasFiltradas.map((f) => (
                    <tr 
                      key={f.id} 
                      className="border-l-2 border-transparent hover:border-[#2383C2] hover:bg-gray-50/80 dark:hover:bg-gray-700/40 transition-colors"
                    >
                      <td className="px-2 py-1 border-b border-r border-slate-200/60 dark:border-gray-700/70 font-normal text-slate-800 dark:text-gray-100 truncate">
                        {f.folio}
                      </td>
                      <td className="px-2 py-1 border-b border-r border-slate-200/60 dark:border-gray-700/70 text-slate-600 dark:text-gray-400 whitespace-nowrap">
                        {f.fchEmis}
                      </td>
                      <td className="px-2 py-1 border-b border-r border-slate-200/60 dark:border-gray-700/70 text-slate-600 dark:text-gray-400 truncate">
                        {f.folioRef}
                      </td>
                      <td className="px-2 py-1 border-b border-r border-slate-200/60 dark:border-gray-700/70 text-slate-700 dark:text-gray-300 truncate" title={f.rznSoc}>
                        {f.rznSoc}
                      </td>
                      <td className="px-2 py-1 border-b border-r border-slate-200/60 dark:border-gray-700/70 text-slate-800 dark:text-gray-100 font-normal text-right whitespace-nowrap">
                        ${parseInt(f.total || 0).toLocaleString('es-CL')}
                      </td>
                      <td className="px-2 py-1 border-b border-slate-200/60 dark:border-gray-700/70 text-center whitespace-nowrap">
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50">
                          {f.estado}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};

export default VinculacionCodigos;