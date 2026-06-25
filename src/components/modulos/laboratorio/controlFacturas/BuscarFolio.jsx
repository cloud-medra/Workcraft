import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from "../../../../firebaseConfig";
import { FileCheck, Search, Save, Trash2 } from 'lucide-react';
import { useToast } from '../../../../context/ToastContext';
import Spinner from '../../../ui/Spinner';

const BuscarFolio = () => {
  const [cargando, setCargando] = useState(false);
  const [folioBusqueda, setFolioBusqueda] = useState('');
  const [anios, setAnios] = useState([]);
  const [meses, setMeses] = useState([]);
  const [filtroAnio, setFiltroAnio] = useState("");
  const [filtroMes, setFiltroMes] = useState("");

  const [facturaEncontrada, setFacturaEncontrada] = useState(null);
  const [buffer, setBuffer] = useState([]);

  const { showToast } = useToast();

  useEffect(() => {
    const cargarAnios = async () => {
      try {
        const snap = await getDocs(collection(db, "laboratorio_facturasXml"));
        setAnios(snap.docs.map(d => d.id).sort((a, b) => b - a));
      } catch (e) { console.error("Error cargando años:", e); }
    };
    cargarAnios();
  }, []);

  useEffect(() => {
    setFiltroMes("");
    if (!filtroAnio) { setMeses([]); return; }
    const cargarMeses = async () => {
      try {
        const snap = await getDocs(collection(db, "laboratorio_facturasXml", filtroAnio, "meses"));
        setMeses(snap.docs.map(d => d.id));
      } catch (e) { console.error("Error cargando meses:", e); }
    };
    cargarMeses();
  }, [filtroAnio]);

  const handleBuscarFolio = async () => {
    if (!filtroAnio || !filtroMes || !folioBusqueda) return showToast("Selecciona Año, Mes y Folio", "error");
    setCargando(true);
    try {
      const path = `laboratorio_facturasXml/${filtroAnio}/meses/${filtroMes}/documentos`;
      const querySnapshot = await getDocs(collection(db, path));
      const docEncontrado = querySnapshot.docs.find(d => String(d.data().folio).trim() === String(folioBusqueda).trim());

      if (!docEncontrado) {
        showToast("No se encontró factura.", "warning");
        setFacturaEncontrada(null);
      } else {
        const data = { id: docEncontrado.id, ...docEncontrado.data() };
        const docRef = doc(db, "laboratorio_conciliaciones", String(data.folio));
        const docSnap = await getDoc(docRef);
        setFacturaEncontrada({ ...data, yaRegistrado: docSnap.exists() });
      }
    } catch (error) {
      console.error("Error buscando folio:", error);
      showToast("Error buscando: " + error.message, "error");
    } finally { setCargando(false); }
  };

  const handleAnadirAlBuffer = () => {
    if (buffer.find(f => f.folio === facturaEncontrada.folio)) return showToast("Ya está en la lista", "warning");
    setBuffer([...buffer, { ...facturaEncontrada, estado: "Control Iniciado" }]);
    setFacturaEncontrada(null);
    setFolioBusqueda('');
  };

  const cleanData = (obj) => {
    const cleaned = { ...obj };
    Object.keys(cleaned).forEach(key => {
      if (cleaned[key] === undefined) delete cleaned[key];
      else if (typeof cleaned[key] === 'object' && cleaned[key] !== null) cleaned[key] = cleanData(cleaned[key]);
    });
    return cleaned;
  };

  const handleGuardarMasivo = async () => {
    if (buffer.length === 0) return;
    setCargando(true);
    try {
      for (const f of buffer) {
        await setDoc(
          doc(db, "laboratorio_conciliaciones", String(f.folio)),
          cleanData({ ...f, estado: f.estado, fechaActualizacion: new Date() })
        );
        if (f.detalles) {
          for (const item of f.detalles) {
            if (!item.codigo) continue; 
            const codigoSanitizado = String(item.codigo).replace(/\//g, "_");
            await setDoc(
              doc(db, "laboratorio_conciliaciones_items", `${f.folio}_${codigoSanitizado}`),
              cleanData({ ...item, folio: f.folio, proveedor: f.rznSoc, fechaFactura: f.fchEmis })
            );
          }
        }
      }
      showToast(`Guardado exitoso de ${buffer.length} registros.`, "success");
      setBuffer([]);
    } catch (error) {
      showToast("Error al guardar: " + error.message, "error");
    } finally {
      setCargando(false);
    }
  };

  const selectClass = "h-8 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded text-[12px] px-2 outline-none dark:[color-scheme:dark]";

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden p-0 relative transition-colors">
      {cargando && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-gray-500/20 dark:bg-gray-900/40 backdrop-blur-[2px]">
          <Spinner size="md" color="#2383C2" />
        </div>
      )}

      <h2 className="text-[14px] font-bold text-gray-700 dark:text-gray-200 p-4 flex items-center gap-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <FileCheck size={16} className="text-[#2383C2] dark:text-[#369BCE]" /> PROCESAR FACTURAS
        {buffer.length > 0 && (
          <button onClick={handleGuardarMasivo} className="ml-auto bg-[#2383C2] hover:bg-[#1d6b9e] dark:bg-[#369BCE] dark:hover:bg-[#2882B0] text-white px-3 py-1 rounded text-[11px] font-bold flex items-center gap-1 transition-colors">
            <Save size={12} /> Guardar {buffer.length} registros
          </button>
        )}
      </h2>

      <div className="bg-gray-50 dark:bg-gray-900/40 p-3 flex flex-wrap gap-2 items-center border-b border-gray-200 dark:border-gray-700">
        <select value={filtroAnio} onChange={(e) => setFiltroAnio(e.target.value)} className={selectClass}>
          <option value="">Año</option>
          {anios.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={filtroMes} onChange={(e) => setFiltroMes(e.target.value)} className={`${selectClass} capitalize`}>
          <option value="">Mes</option>
          {meses.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <div className="relative flex-grow max-w-sm">
          <Search className="absolute left-2 top-2 text-gray-400 dark:text-gray-500" size={14} />
          <input value={folioBusqueda} onChange={e => setFolioBusqueda(e.target.value)} className="w-full h-8 pl-8 pr-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded text-[12px] placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:border-[#2383C2] dark:focus:border-[#369BCE]" placeholder="Buscar por Folio..." />
        </div>
        <button onClick={handleBuscarFolio} className="h-8 px-4 bg-[#2383C2] hover:bg-[#1d6b9e] dark:bg-[#369BCE] dark:hover:bg-[#2882B0] text-white rounded text-[12px] font-bold transition-colors">BUSCAR</button>
      </div>

      <div className="flex-grow overflow-auto bg-white dark:bg-gray-800">
        <table className="w-full text-left text-[12px] border-collapse">
          <thead className="bg-gray-100 dark:bg-gray-900 sticky top-0 z-10 text-gray-600 dark:text-gray-400 uppercase font-bold text-[11px]">
            <tr>
              <th className="p-3 border-b border-r border-gray-200 dark:border-gray-700">Folio</th>
              <th className="p-3 border-b border-r border-gray-200 dark:border-gray-700">Fecha Emisión</th>
              <th className="p-3 border-b border-r border-gray-200 dark:border-gray-700">Proveedor</th>
              <th className="p-3 border-b border-r border-gray-200 dark:border-gray-700">Ítems</th>
              <th className="p-3 border-b border-r border-gray-200 dark:border-gray-700">Total</th>
              <th className="p-3 border-b border-r border-gray-200 dark:border-gray-700">Estado</th>
              <th className="p-3 border-b border-gray-200 dark:border-gray-700 text-center">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
            {facturaEncontrada && (
              <tr className="border-l-4 border-l-blue-500 bg-blue-50/30 dark:bg-blue-500/10 border-b border-gray-200 dark:border-gray-700 transition-colors">
                <td className="p-3 border-r border-gray-200 dark:border-gray-700 font-bold text-gray-700 dark:text-gray-200">{facturaEncontrada.folio}</td>
                <td className="p-3 border-r border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300">{facturaEncontrada.fchEmis}</td>
                <td className="p-3 border-r border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300">{facturaEncontrada.rznSoc}</td>
                <td className="p-3 border-r border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300">{facturaEncontrada.detalles?.length || 0}</td>
                <td className="p-3 border-r border-gray-200 dark:border-gray-700 font-bold text-gray-700 dark:text-gray-200">${Number(facturaEncontrada.total || 0).toLocaleString()}</td>
                <td className="p-3 border-r border-gray-200 dark:border-gray-700 font-bold text-blue-600 dark:text-blue-400">
                  {facturaEncontrada.yaRegistrado ? "YA REGISTRADO" : "Pendiente Añadir"}
                </td>
                <td className="p-3 text-center">
                  <div className="flex justify-center gap-2">
                    <button onClick={() => setFacturaEncontrada(null)} className="text-red-500 dark:text-red-400 font-bold hover:underline">Eliminar</button>
                    {!facturaEncontrada.yaRegistrado && (
                      <button onClick={handleAnadirAlBuffer} className="text-[#2383C2] dark:text-[#369BCE] font-bold hover:underline">Añadir</button>
                    )}
                  </div>
                </td>
              </tr>
            )}
            {buffer.map((f, i) => (
              <tr key={i} className="border-l-4 border-transparent hover:border-[#2383C2] dark:hover:border-[#369BCE] hover:bg-gray-50 dark:hover:bg-gray-700/30 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 transition-colors">
                <td className="p-3 border-r border-gray-200 dark:border-gray-700 font-bold text-[#2383C2] dark:text-[#369BCE]">{f.folio}</td>
                <td className="p-3 border-r border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400">{f.fchEmis}</td>
                <td className="p-3 border-r border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300">{f.rznSoc}</td>
                <td className="p-3 border-r border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400">{f.detalles?.length || 0}</td>
                <td className="p-3 border-r border-gray-200 dark:border-gray-700 font-bold text-gray-800 dark:text-gray-200">${Number(f.total || 0).toLocaleString()}</td>
                <td className="p-3 border-r border-gray-200 dark:border-gray-700 text-orange-600 dark:text-orange-400 font-bold">{f.estado}</td>
                <td className="p-3 text-center">
                  <button onClick={() => setBuffer(buffer.filter((_, idx) => idx !== i))} className="text-red-400 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors"><Trash2 size={15} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BuscarFolio;