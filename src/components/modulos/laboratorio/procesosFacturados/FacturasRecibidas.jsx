import React, { useState, useEffect } from 'react';
import { collection, deleteDoc, doc, query, orderBy, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../../../../firebaseConfig';
import { FileText, Trash2, Search, Eye } from 'lucide-react';
import { useToast } from '../../../../context/ToastContext';
import { useModal } from '../../../../context/ModalContext';
import { useGranularPermission } from '../../../../hooks/useGranularPermission';
import DetalleFacturaModal from '../XmlDetallesFacturas';

const FacturasRecibidas = () => {
  const [facturas, setFacturas] = useState([]);
  const [aniosDisponibles, setAniosDisponibles] = useState([]);
  const [mesesDisponibles, setMesesDisponibles] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [facturaSeleccionada, setFacturaSeleccionada] = useState(null);
  const [filtroAnio, setFiltroAnio] = useState("");
  const [filtroMes, setFiltroMes] = useState("");

  const { showToast } = useToast();
  const { confirmAction } = useModal();
  const { hasPermission } = useGranularPermission();

  const PATH_VISTA = "/laboratorio/controlFactura";
  const COL_BASE = "laboratorio_facturasXml";

  // Cargar Años
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

  // Cargar Meses al seleccionar Año
  useEffect(() => {
    if (!filtroAnio) { setMesesDisponibles([]); return; }
    const cargarMeses = async () => {
      try {
        const snap = await getDocs(collection(db, COL_BASE, filtroAnio, "meses"));
        const meses = snap.docs.map(d => d.id);
        setMesesDisponibles(meses);
      } catch (error) {
        console.error("Error al cargar meses:", error);
      }
    };
    cargarMeses();
  }, [filtroAnio]);

  // Escuchar Facturas del Mes
  useEffect(() => {
    if (!filtroAnio || !filtroMes) { setFacturas([]); return; }
    const path = `${COL_BASE}/${filtroAnio}/meses/${filtroMes}/documentos`;
    const q = query(collection(db, path), orderBy("fchEmis", "desc"));
    return onSnapshot(q, (snapshot) => setFacturas(snapshot.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, [filtroAnio, filtroMes]);

  // Eliminar factura
  const handleDelete = (id) => {
    confirmAction("Eliminar Factura", "¿Estás seguro de eliminar este registro?", async () => {
      await deleteDoc(doc(db, COL_BASE, filtroAnio, "meses", filtroMes, "documentos", id));
      showToast("Factura eliminada", "info");
    });
  };

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
          <FileText size={16} className="text-[#2383C2]" />
          <span className="text-[12px] font-normal text-slate-800 dark:text-gray-100 tracking-wide uppercase">
            Facturas Recibidas (XML)
          </span>
        </div>
      </header>

      {/* FILTROS Y BÚSQUEDA */}
      <div className="bg-slate-100/70 dark:bg-gray-800/40 p-1.5 flex flex-wrap gap-1.5 items-center border-b border-slate-200 dark:border-gray-700">
        {hasPermission(PATH_VISTA, "filtros_busqueda", "select_anio") && (
          <select
            value={filtroAnio}
            onChange={(e) => { setFiltroAnio(e.target.value); setFiltroMes(""); }}
            className="h-6 border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-slate-800 dark:text-gray-100 rounded text-[11px] px-1.5 outline-none focus:border-[#2383C2]"
          >
            <option value="">Año</option>
            {aniosDisponibles.map((a, idx) => <option key={`anio-${a}-${idx}`} value={a}>{a}</option>)}
          </select>
        )}

        {hasPermission(PATH_VISTA, "filtros_busqueda", "select_mes") && (
          <select
            value={filtroMes}
            onChange={(e) => setFiltroMes(e.target.value)}
            className="h-6 border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-slate-800 dark:text-gray-100 rounded text-[11px] px-1.5 outline-none capitalize focus:border-[#2383C2]"
          >
            <option value="">Mes</option>
            {mesesDisponibles.map((m, idx) => <option key={`mes-${m}-${idx}`} value={m}>{m}</option>)}
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

      {/* TABLA DE FACTURAS */}
      {hasPermission(PATH_VISTA, "tabla_facturas") && (
        <div className="flex-grow overflow-auto">
          <table className="w-full text-left text-[11px] border-collapse table-fixed min-w-[900px]">
            <thead className="bg-slate-100 dark:bg-gray-900/80 sticky top-0 z-10">
              <tr className="text-slate-600 dark:text-gray-400 uppercase font-normal text-[10px] tracking-wider">
                <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700 w-[10%]">Folio</th>
                <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700 w-[10%]">Emisión</th>
                <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700 w-[10%]">Ref.</th>
                <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700 w-[24%]">Razón Social</th>
                <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700 w-[10%] text-right">Total (Neto)</th>
                
                {/* Nuevas Columnas */}
                <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700 w-[7%] text-center">Estado</th>
                <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700 w-[7%] text-center">Orden</th>
                <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700 w-[7%] text-center">Acta</th>
                <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700 w-[7%] text-center">Salida</th>
                <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700 w-[10%] text-center">Mes imputado</th>
                
                <th className="px-2 py-1.5 border-b border-slate-200 dark:border-gray-700 w-[8%] text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60 dark:divide-gray-700/50 bg-white dark:bg-gray-800">
              {facturasFiltradas.map((f) => (
                <tr key={f.id} className="hover:bg-slate-50 dark:hover:bg-gray-700/40 transition-colors">
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
                  
                  {/* Celdas Vacías Nuevas */}
                  <td className="px-2 py-1 border-b border-r border-slate-200/60 dark:border-gray-700/70 text-center text-slate-400 dark:text-gray-500"></td>
                  <td className="px-2 py-1 border-b border-r border-slate-200/60 dark:border-gray-700/70 text-center text-slate-400 dark:text-gray-500"></td>
                  <td className="px-2 py-1 border-b border-r border-slate-200/60 dark:border-gray-700/70 text-center text-slate-400 dark:text-gray-500"></td>
                  <td className="px-2 py-1 border-b border-r border-slate-200/60 dark:border-gray-700/70 text-center text-slate-400 dark:text-gray-500"></td>
                  <td className="px-2 py-1 border-b border-r border-slate-200/60 dark:border-gray-700/70 text-center text-slate-400 dark:text-gray-500"></td>

                  <td className="px-2 py-1 border-b border-slate-200/60 dark:border-gray-700 text-center">
                    <div className="flex justify-center gap-1.5">
                      {hasPermission(PATH_VISTA, "tabla_facturas", "btn_ver") && (
                        <button 
                          onClick={() => setFacturaSeleccionada(f)} 
                          className="text-slate-400 hover:text-[#2383C2] transition inline-flex items-center justify-center p-0.5 rounded hover:bg-slate-100 dark:hover:bg-gray-700"
                          title="Ver Detalle"
                        >
                          <Eye size={13} />
                        </button>
                      )}
                      {hasPermission(PATH_VISTA, "tabla_facturas", "btn_eliminar") && (
                        <button 
                          onClick={() => handleDelete(f.id)} 
                          className="text-slate-400 hover:text-red-500 transition inline-flex items-center justify-center p-0.5 rounded hover:bg-slate-100 dark:hover:bg-gray-700"
                          title="Eliminar"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL DETALLE DE FACTURA */}
      {facturaSeleccionada && (
        <DetalleFacturaModal 
          factura={facturaSeleccionada} 
          onClose={() => setFacturaSeleccionada(null)} 
        />
      )}
    </div>
  );
};

export default FacturasRecibidas;