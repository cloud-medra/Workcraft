import React, { useState, useEffect, useCallback } from 'react';
import {
  collection,
  onSnapshot,
  doc,
  query,
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import { db } from '../../../firebaseConfig';
import { FileSpreadsheet, Search, Upload, X, Eye, ArrowLeft } from 'lucide-react';
import { useToast } from '../../../context/ToastContext';
import { useGranularPermission } from '../../../hooks/useGranularPermission';
import Spinner from '../../ui/Spinner';

const ImportarOrden = () => {
  const [ordenes, setOrdenes] = useState([]);
  const [detalle, setDetalle] = useState([]);
  const [aniosDisponibles, setAniosDisponibles] = useState([]);
  const [mesesDisponibles, setMesesDisponibles] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [ordenSeleccionada, setOrdenSeleccionada] = useState(null);
  const [filtroAnio, setFiltroAnio] = useState("");
  const [filtroMes, setFiltroMes] = useState("");
  const [cargando, setCargando] = useState(false);

  const { showToast } = useToast();
  const { hasPermission } = useGranularPermission();

  const PATH_VISTA = "/laboratorio/importarOrden";
  const COL_BASE = "laboratorio_ordenes";

  const getMesNombre = (index) => ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"][index];

  // 1. Cargar años
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

  // 2. Cargar meses según año
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

  // 3. Cargar órdenes según año y mes
  useEffect(() => {
    if (!filtroAnio || !filtroMes) {
      setOrdenes([]);
      return;
    }
    const path = `${COL_BASE}/${filtroAnio}/meses/${filtroMes}/ordenes`;
    const q = query(collection(db, path));

    return onSnapshot(q, (snapshot) => {
      setOrdenes(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => {
      console.error("ERROR EN SNAPSHOT ORDENES:", err);
    });
  }, [filtroAnio, filtroMes]);

  // 4. Cargar detalle de orden
  useEffect(() => {
    if (!ordenSeleccionada || !filtroAnio || !filtroMes) { setDetalle([]); return; }
    const path = `${COL_BASE}/${filtroAnio}/meses/${filtroMes}/ordenes/${ordenSeleccionada.id}/documentos`;
    return onSnapshot(collection(db, path), (snap) => {
      setDetalle(snap.docs.map(d => d.data()));
    });
  }, [ordenSeleccionada, filtroAnio, filtroMes]);

  // 5. Lógica de Importación
  const onDrop = useCallback(async (acceptedFiles) => {
    setCargando(true);
    try {
      const batch = writeBatch(db);
      let fechaResult = { y: "", m: "" };

      for (const file of acceptedFiles) {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, { type: 'array' });
        const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

        const grupos = jsonData.reduce((acc, row) => {
          const nro = String(row["Nro.Orden"]);
          if (!acc[nro]) acc[nro] = { cabecera: row, items: [] };
          acc[nro].items.push(row);
          return acc;
        }, {});

        for (const nro in grupos) {
          const { cabecera, items } = grupos[nro];
          const [d, m, y] = cabecera["F.Orden"].split('/');
          const nombreMes = getMesNombre(parseInt(m) - 1);
          fechaResult = { y, m: nombreMes };

          const totalItems = items.length;
          const totalOrden = items.reduce((acc, item) => acc + ((parseFloat(item["Cant."]) || 0) * (parseFloat(item["P.Unitario"]) || 0)), 0);

          const ordenRef = doc(db, COL_BASE, y, "meses", nombreMes, "ordenes", nro);
          
          batch.set(doc(db, COL_BASE, y), { active: "true" }, { merge: true });
          batch.set(doc(db, COL_BASE, y, "meses", nombreMes), { active: "true" }, { merge: true });
          batch.set(ordenRef, {
            "Nro.Orden": nro,
            "F.Orden": cabecera["F.Orden"],
            "Proveedor": cabecera["Proveedor"],
            "Rut proveedor": cabecera["Rut proveedor"],
            totalItems,
            totalOrden,
            fechaActualizacion: new Date()
          }, { merge: true });

          for (const item of items) {
            if (item["Cod.Artículo"]) {
              batch.set(doc(ordenRef, "documentos", String(item["Cod.Artículo"])), item, { merge: true });
            }
          }
        }
      }
      await batch.commit();
      
      if (fechaResult.y) setFiltroAnio(fechaResult.y);
      if (fechaResult.m) setFiltroMes(fechaResult.m);

      showToast("Importación exitosa", "success");
      setShowModal(false);
    } catch (e) {
      console.error(e);
      showToast("Error: " + e.message, "error");
    } finally {
      setCargando(false);
    }
  }, [showToast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop, 
    accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] } 
  });

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden p-0 relative">
      {cargando && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-gray-500/20 dark:bg-black/40 backdrop-blur-[2px]">
          <div className="bg-white/90 dark:bg-gray-800/90 p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-5">
            <Spinner size="md" color="#2383C2" />
            <h3 className="text-[#2383C2] font-bold text-[15px]">Procesando...</h3>
          </div>
        </div>
      )}

      {/* CABECERA */}
      <h2 className="text-[14px] font-bold text-gray-700 dark:text-gray-100 p-4 flex items-center gap-4 border-b border-gray-200 dark:border-gray-700">
        {ordenSeleccionada ? (
          <>
            <button onClick={() => setOrdenSeleccionada(null)} className="hover:text-[#2383C2] text-gray-600 dark:text-gray-400 transition">
              <ArrowLeft size={16} />
            </button>
            <div className="flex flex-col">
              <span className="text-[#2383C2]">ORDEN N° {ordenSeleccionada.id}</span>
              <div className="flex gap-4 text-[11px] font-normal text-gray-500 dark:text-gray-400 mt-0.5">
                <span>📅 {ordenSeleccionada["F.Orden"]}</span>
                <span>🏢 {ordenSeleccionada["Proveedor"]}</span>
                <span>🆔 {ordenSeleccionada["Rut proveedor"]}</span>
              </div>
            </div>
          </>
        ) : (
          <>
            <FileSpreadsheet size={16} className="text-[#2383C2]" />
            GESTIÓN DE ÓRDENES
            {hasPermission(PATH_VISTA, "cabecera_acciones", "btn_importar") && (
              <button onClick={() => setShowModal(true)} className="ml-auto bg-[#2383C2] hover:bg-[#369BCE] text-white px-3 py-1 rounded text-[11px] font-bold flex items-center gap-1 transition">
                <Upload size={12} /> Importar Excel
              </button>
            )}
          </>
        )}
      </h2>

      {/* FILTROS */}
      {!ordenSeleccionada && (
        <div className="bg-gray-50 dark:bg-gray-800/50 p-3 flex flex-wrap gap-2 items-center border-b border-gray-200 dark:border-gray-700">
          <select value={filtroAnio} onChange={(e) => setFiltroAnio(e.target.value)} className="h-8 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 rounded text-[12px] px-2 outline-none">
            <option value="">Año</option>
            {aniosDisponibles.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <select value={filtroMes} onChange={(e) => setFiltroMes(e.target.value)} className="h-8 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 rounded text-[12px] px-2 outline-none capitalize">
            <option value="">Mes</option>
            {mesesDisponibles.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <div className="relative flex-grow max-w-sm">
            <Search className="absolute left-2 top-2 text-gray-400 dark:text-gray-500" size={14} />
            <input value={busqueda} onChange={e => setBusqueda(e.target.value)} className="w-full h-8 pl-8 pr-2 border border-gray-300 dark:border-gray-600 rounded text-[12px] outline-none bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 focus:border-[#2383C2]" placeholder="Buscar..." />
          </div>
        </div>
      )}

      {/* TABLA */}
      <div className="flex-grow overflow-auto h-[500px]">
        <table className="w-full text-left text-[12px] border-collapse table-fixed">
          <thead className="bg-gray-100 dark:bg-gray-900 sticky top-0 z-10">
            <tr className="text-gray-600 dark:text-gray-400 uppercase font-bold text-[11px]">
              {ordenSeleccionada ? (
                <>
                  <th className="p-3 border-b border-r border-gray-200 dark:border-gray-700">Artículo</th>
                  <th className="p-3 border-b border-r border-gray-200 dark:border-gray-700">Cantidad</th>
                  <th className="p-3 border-b border-gray-200 dark:border-gray-700">Precio</th>
                </>
              ) : (
                <>
                  <th className="p-3 border-b border-r border-gray-200 dark:border-gray-700 w-[120px]">Nro.Orden</th>
                  <th className="p-3 border-b border-r border-gray-200 dark:border-gray-700 w-[110px]">F.Orden</th>
                  <th className="p-3 border-b border-r border-gray-200 dark:border-gray-700 w-[130px]">Rut Proveedor</th>
                  <th className="p-3 border-b border-r border-gray-200 dark:border-gray-700">Proveedor</th>
                  <th className="p-3 border-b border-r border-gray-200 dark:border-gray-700 w-[80px]">Items</th>
                  <th className="p-3 border-b border-r border-gray-200 dark:border-gray-700 w-[120px]">Total</th>
                  <th className="p-3 border-b border-gray-200 dark:border-gray-700 w-[80px] text-center">Acciones</th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
            {!ordenSeleccionada ? (
              ordenes.filter(o =>
                o["Nro.Orden"]?.includes(busqueda) ||
                o["Proveedor"]?.toLowerCase().includes(busqueda.toLowerCase()) ||
                o["Rut proveedor"]?.toLowerCase().includes(busqueda.toLowerCase())
              ).map((o) => (
                <tr key={o.id} onDoubleClick={() => setOrdenSeleccionada(o)} className="border-l-4 border-transparent hover:border-[#2383C2] hover:bg-gray-50/80 dark:hover:bg-gray-700/40 transition-colors cursor-pointer">
                  <td className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70 font-bold text-gray-700 dark:text-gray-200">{o["Nro.Orden"]}</td>
                  <td className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-600 dark:text-gray-400 whitespace-nowrap">{o["F.Orden"]}</td>
                  <td className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-600 dark:text-gray-400 whitespace-nowrap">{o["Rut proveedor"]}</td>
                  <td className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-600 dark:text-gray-300 truncate">{o["Proveedor"]}</td>
                  <td className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-600 dark:text-gray-400">{o.totalItems}</td>
                  <td className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-600 dark:text-gray-200 whitespace-nowrap">${o.totalOrden?.toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
                  <td className="p-3 border-b border-gray-200 dark:border-gray-700 text-center">
                    <button onClick={() => setOrdenSeleccionada(o)} className="text-gray-400 hover:text-[#2383C2] transition inline-flex items-center justify-center p-1">
                      <Eye size={15} />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              detalle.map((item, i) => (
                <tr key={i} className="hover:bg-gray-50/80 dark:hover:bg-gray-700/40 transition-colors">
                  <td className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-700 dark:text-gray-300">{item["Artículo"]}</td>
                  <td className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-600 dark:text-gray-400">{item["Cant."]}</td>
                  <td className="p-3 border-b border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-200">${item["P.Unitario"]}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-transparent dark:border-gray-700">
            <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/40">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-[#2383C2]/10 rounded-lg">
                  <Upload size={18} className="text-[#2383C2]" />
                </div>
                <h3 className="font-bold text-gray-800 dark:text-gray-100">Importar Orden Excel</h3>
              </div>
              <button onClick={() => setShowModal(false)} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition p-1">
                <X size={20} />
              </button>
            </div>
            <div className="p-8">
              <div {...getRootProps()} className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer flex flex-col items-center justify-center gap-4 transition ${isDragActive ? "border-[#2383C2] bg-[#2383C2]/5" : "border-gray-200 dark:border-gray-700 hover:border-[#2383C2]/50 hover:bg-gray-50 dark:hover:bg-gray-700/30"}`}>
                <input {...getInputProps()} />
                <div className="bg-gray-100 dark:bg-gray-900 p-4 rounded-full">
                  <FileSpreadsheet size={32} className="text-gray-400 dark:text-gray-500" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-700 dark:text-gray-200">Arrastra tu archivo Excel aquí</p>
                  <p className="text-xs text-gray-400 dark:text-gray-400 mt-1">o haz clic para seleccionar desde tu carpeta</p>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/40 border-t border-gray-100 dark:border-gray-700 flex justify-end">
              <button onClick={() => setShowModal(false)} className="text-xs font-bold text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 px-4 py-2 rounded-lg transition">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImportarOrden;