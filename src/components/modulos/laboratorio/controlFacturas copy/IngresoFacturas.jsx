import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from "../../../../firebaseConfig";
import { FileCheck, Search, Save, Trash2 } from 'lucide-react';
import { useToast } from '../../../../context/ToastContext';
import Spinner from '../../../ui/Spinner';

const ProcesarFacturas = () => {
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
            if (!item.codigo) continue; // ✅ Ignorar items sin código
            await setDoc(
              doc(db, "laboratorio_conciliaciones_items", `${f.folio}_${item.codigo}`),
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

  return (
    <div className="w-full h-full flex flex-col bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden p-0 relative">
      {cargando && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-gray-500/20 backdrop-blur-[2px]">
          <Spinner size="md" color="#0E5B6D" />
        </div>
      )}

      <h2 className="text-[14px] font-bold text-gray-700 p-4 flex items-center gap-2 border-b border-gray-200">
        <FileCheck size={16} className="text-[#0E5B6D]" /> PROCESAR FACTURAS
        {buffer.length > 0 && (
          <button onClick={handleGuardarMasivo} className="ml-auto bg-[#0E5B6D] text-white px-3 py-1 rounded text-[11px] font-bold flex items-center gap-1 hover:bg-[#0a4856]">
            <Save size={12} /> Guardar {buffer.length} registros
          </button>
        )}
      </h2>

      <div className="bg-gray-50 p-3 flex flex-wrap gap-2 items-center border-b border-gray-200">
        <select value={filtroAnio} onChange={(e) => setFiltroAnio(e.target.value)} className="h-8 border border-gray-300 rounded text-[12px] px-2 outline-none">
          <option value="">Año</option>
          {anios.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={filtroMes} onChange={(e) => setFiltroMes(e.target.value)} className="h-8 border border-gray-300 rounded text-[12px] px-2 outline-none capitalize">
          <option value="">Mes</option>
          {meses.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <div className="relative flex-grow max-w-sm">
          <Search className="absolute left-2 top-2 text-gray-400" size={14} />
          <input value={folioBusqueda} onChange={e => setFolioBusqueda(e.target.value)} className="w-full h-8 pl-8 pr-2 border border-gray-300 rounded text-[12px] outline-none" placeholder="Buscar por Folio..." />
        </div>
        <button onClick={handleBuscarFolio} className="h-8 px-4 bg-[#0E5B6D] text-white rounded text-[12px] font-bold hover:bg-[#0a4856]">BUSCAR</button>
      </div>

      <div className="flex-grow overflow-auto">
        <table className="w-full text-left text-[12px] border-collapse">
          <thead className="bg-gray-100 sticky top-0">
            <tr className="text-gray-600 uppercase font-bold text-[11px]">
              <th className="p-3 border-b border-r border-gray-200">Folio</th>
              <th className="p-3 border-b border-r border-gray-200">Fecha Emisión</th>
              <th className="p-3 border-b border-r border-gray-200">Proveedor</th>
              <th className="p-3 border-b border-r border-gray-200">Ítems</th>
              <th className="p-3 border-b border-r border-gray-200">Total</th>
              <th className="p-3 border-b border-r border-gray-200">Estado</th>
              <th className="p-3 border-b border-gray-200 text-center">Acción</th>
            </tr>
          </thead>
          <tbody>
            {facturaEncontrada && (
              <tr className={`border-l-4 border-l-blue-500 bg-blue-50/30`}>
                <td className="p-3 border-b border-r border-gray-200 font-bold">{facturaEncontrada.folio}</td>
                <td className="p-3 border-b border-r border-gray-200">{facturaEncontrada.fchEmis}</td>
                <td className="p-3 border-b border-r border-gray-200">{facturaEncontrada.rznSoc}</td>
                <td className="p-3 border-b border-r border-gray-200">{facturaEncontrada.detalles?.length || 0}</td>
                <td className="p-3 border-b border-r border-gray-200">${Number(facturaEncontrada.total || 0).toLocaleString()}</td>
                <td className="p-3 border-b border-r border-gray-200 font-bold text-blue-600">
                  {facturaEncontrada.yaRegistrado ? "YA REGISTRADO" : "Pendiente Añadir"}
                </td>
                <td className="p-3 border-b border-gray-200 text-center">
                  <div className="flex justify-center gap-2">
                    <button onClick={() => setFacturaEncontrada(null)} className="text-red-500 font-bold hover:underline">Eliminar</button>
                    {!facturaEncontrada.yaRegistrado && (
                      <button onClick={handleAnadirAlBuffer} className="text-[#0E5B6D] font-bold hover:underline">Añadir</button>
                    )}
                  </div>
                </td>
              </tr>
            )}
            {buffer.map((f, i) => (
              <tr key={i} className="border-l-4 border-transparent hover:border-[#0E5B6D] hover:bg-gray-50 transition-colors">
                <td className="p-3 border-b border-r border-gray-200 font-bold text-[#0E5B6D]">{f.folio}</td>
                <td className="p-3 border-b border-r border-gray-200 text-gray-600">{f.fchEmis}</td>
                <td className="p-3 border-b border-r border-gray-200 text-gray-600">{f.rznSoc}</td>
                <td className="p-3 border-b border-r border-gray-200 text-gray-600">{f.detalles?.length || 0}</td>
                <td className="p-3 border-b border-r border-gray-200 font-bold text-gray-800">${Number(f.total || 0).toLocaleString()}</td>
                <td className="p-3 border-b border-r border-gray-200 text-orange-600 font-bold">{f.estado}</td>
                <td className="p-3 border-b border-gray-200 text-center">
                  <button onClick={() => setBuffer(buffer.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-600"><Trash2 size={15} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProcesarFacturas;