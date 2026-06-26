import React, { useState, useEffect, useCallback } from 'react';
import { collection, onSnapshot, deleteDoc, doc, query, orderBy, addDoc, getDocs, setDoc, where } from 'firebase/firestore';
import { useDropzone } from 'react-dropzone';
import { db } from '../../../firebaseConfig';
import { FileText, Trash2, Search, Upload, X, Eye } from 'lucide-react';
import { useToast } from '../../../context/ToastContext';
import { useModal } from '../../../context/ModalContext';
import { useUser } from '../../../context/UserContext';
import { useGranularPermission } from '../../../hooks/useGranularPermission';
import Spinner from '../../ui/Spinner';
import DetalleFacturaModal from './DetalleFacturaModal';

const Facturas = () => {
  const [facturas, setFacturas] = useState([]);
  const [aniosDisponibles, setAniosDisponibles] = useState([]);
  const [mesesDisponibles, setMesesDisponibles] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [facturaSeleccionada, setFacturaSeleccionada] = useState(null);
  const [filtroAnio, setFiltroAnio] = useState("");
  const [filtroMes, setFiltroMes] = useState("");
  const [cargando, setCargando] = useState(false);

  const { showToast } = useToast();
  const { confirmAction } = useModal();
  const { userData } = useUser();
  const { hasPermission } = useGranularPermission();

  const PATH_VISTA = "/laboratorio/facturas";
  const COL_BASE = "laboratorio_facturasXml";

  useEffect(() => {
    const cargarAnios = async () => {
      const snap = await getDocs(collection(db, COL_BASE));
      const anios = snap.docs.map(d => d.id).sort((a, b) => b - a);
      setAniosDisponibles(anios);
    };
    cargarAnios();
  }, []);

  useEffect(() => {
    if (!filtroAnio) { setMesesDisponibles([]); return; }
    const cargarMeses = async () => {
      const snap = await getDocs(collection(db, COL_BASE, filtroAnio, "meses"));
      const meses = snap.docs.map(d => d.id);
      setMesesDisponibles(meses);
    };
    cargarMeses();
  }, [filtroAnio]);

  useEffect(() => {
    if (!filtroAnio || !filtroMes) { setFacturas([]); return; }
    const path = `${COL_BASE}/${filtroAnio}/meses/${filtroMes}/documentos`;
    const q = query(collection(db, path), orderBy("fchEmis", "desc"));
    return onSnapshot(q, (snapshot) => setFacturas(snapshot.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, [filtroAnio, filtroMes]);

  const onDrop = useCallback(async (acceptedFiles) => {
    setCargando(true);
    let omitidos = 0;
    try {
      for (const file of acceptedFiles) {
        const text = await file.text();
        const xmlDoc = new DOMParser().parseFromString(text, "text/xml");

        const folio = xmlDoc.getElementsByTagName("Folio")[0]?.textContent;
        const fchEmis = xmlDoc.getElementsByTagName("FchEmis")[0]?.textContent;
        const folioRef = xmlDoc.getElementsByTagName("FolioRef")[0]?.textContent || "N/A";

        if (!fchEmis || !folio) continue;

        const [anio, mesNum] = fchEmis.split('-');
        const meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
        const nombreMes = meses[parseInt(mesNum) - 1];

        const colRef = collection(db, COL_BASE, anio, "meses", nombreMes, "documentos");
        const q = query(colRef, where("folio", "==", folio));
        const existe = await getDocs(q);

        if (!existe.empty) { omitidos++; continue; }

        const detalles = Array.from(xmlDoc.getElementsByTagName("Detalle")).map(d => ({
          nroLin: d.getElementsByTagName("NroLinDet")[0]?.textContent ?? "",
          codigo: d.getElementsByTagName("VlrCodigo")[0]?.textContent ?? "N/A",
          nombre: d.getElementsByTagName("NmbItem")[0]?.textContent ?? "",
          cantidad: String(parseFloat(d.getElementsByTagName("QtyItem")[0]?.textContent ?? "0")),
          unidad: d.getElementsByTagName("UnmdItem")[0]?.textContent ?? "Un",
          precio: d.getElementsByTagName("PrcItem")[0]?.textContent ?? "0",
          monto: d.getElementsByTagName("MontoItem")[0]?.textContent ?? "0"
        }));

        await setDoc(doc(db, COL_BASE, anio), { active: "true" }, { merge: true });
        await setDoc(doc(db, COL_BASE, anio, "meses", nombreMes), { active: "true" }, { merge: true });

        setAniosDisponibles(prev => {
          const nuevoSet = new Set([...prev, anio]);
          return Array.from(nuevoSet).sort((a, b) => b - a);
        });

        setMesesDisponibles(prev => {
          const nuevoSet = new Set([...prev, nombreMes]);
          return Array.from(nuevoSet);
        });

        await addDoc(colRef, {
          folio: folio ?? "",
          folioRef: folioRef ?? "N/A",
          fchEmis: fchEmis ?? "",
          rznSoc: xmlDoc.getElementsByTagName("RznSoc")[0]?.textContent || "Sin Razón Social",
          total: xmlDoc.getElementsByTagName("MntNeto")[0]?.textContent ?? "0",
          xmlOriginal: text,
          detalles,
          estado: "Pendiente",
          fechaIngreso: null,
          ocIngresada: null,
          registeredPor: userData?.nombreCompleto || 'Usuario',
          fechaRegistro: new Date()
        });
      }

      const mensaje = omitidos > 0
        ? `Importación finalizada. ${omitidos} archivo(s) omitido(s) por duplicidad.`
        : "Importación completada con éxito.";
      showToast(mensaje, omitidos > 0 ? "warning" : "success");
      setShowModal(false);
    } catch (error) {
      console.error(error);
      showToast("Error al importar", "error");
    } finally {
      setCargando(false);
    }
  }, [userData, showToast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'application/xml': ['.xml'] } });

  const handleDelete = (id) => {
    confirmAction("Eliminar Factura", "¿Estás seguro de eliminar este registro?", async () => {
      await deleteDoc(doc(db, COL_BASE, filtroAnio, "meses", filtroMes, "documentos", id));
      showToast("Factura eliminada", "info");
    });
  };

  const facturasFiltradas = facturas.filter(f => f.folio?.includes(busqueda) || f.rznSoc?.toLowerCase().includes(busqueda.toLowerCase()) || f.folioRef?.includes(busqueda));

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden p-0 relative">
      {cargando && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-gray-500/20 dark:bg-black/40 backdrop-blur-[2px]">
          <div className="bg-white/90 dark:bg-gray-800/90 p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-5">
            <Spinner size="md" color="#2383C2" />
            <h3 className="text-[#2383C2] font-bold text-[15px]">Procesando XML...</h3>
          </div>
        </div>
      )}

      <h2 className="text-[14px] font-bold text-gray-700 dark:text-gray-100 p-4 flex items-center gap-2 border-b border-gray-200 dark:border-gray-700">
        <FileText size={16} className="text-[#2383C2]" /> GESTIÓN DE FACTURAS
        {hasPermission(PATH_VISTA, "cabecera_acciones", "btn_importar_xml") && (
          <button onClick={() => setShowModal(true)} className="ml-auto bg-[#2383C2] hover:bg-[#369BCE] text-white px-3 py-1 rounded text-[11px] font-bold flex items-center gap-1 transition">
            <Upload size={12} /> Importar XML
          </button>
        )}
      </h2>

      <div className="bg-gray-50 dark:bg-gray-800/50 p-3 flex flex-wrap gap-2 items-center border-b border-gray-200 dark:border-gray-700">
        {hasPermission(PATH_VISTA, "filtros_busqueda", "select_anio") && (
          <select
            value={filtroAnio}
            onChange={(e) => { setFiltroAnio(e.target.value); setFiltroMes(""); }}
            className="h-8 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 rounded text-[12px] px-2 outline-none"
          >
            <option value="">Año</option>
            {aniosDisponibles.map((a, idx) => <option key={`anio-${a}-${idx}`} value={a}>{a}</option>)}
          </select>
        )}

        {hasPermission(PATH_VISTA, "filtros_busqueda", "select_mes") && (
          <select
            value={filtroMes}
            onChange={(e) => setFiltroMes(e.target.value)}
            className="h-8 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 rounded text-[12px] px-2 outline-none capitalize"
          >
            <option value="">Mes</option>
            {mesesDisponibles.map((m, idx) => <option key={`mes-${m}-${idx}`} value={m}>{m}</option>)}
          </select>
        )}

        {hasPermission(PATH_VISTA, "filtros_busqueda", "input_busqueda") && (
          <div className="relative flex-grow max-w-sm">
            <Search className="absolute left-2 top-2 text-gray-400 dark:text-gray-500" size={14} />
            <input
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              className="w-full h-8 pl-8 pr-2 border border-gray-300 dark:border-gray-600 rounded text-[12px] outline-none bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 focus:border-[#2383C2] dark:focus:border-[#2383C2]"
              placeholder="Buscar por Folio, Ref o Razón Social..."
            />
          </div>
        )}
      </div>

      {hasPermission(PATH_VISTA, "tabla_facturas") && (
        <div className="flex-grow overflow-auto">
          <table className="w-full text-left text-[12px] border-collapse">
            <thead className="bg-gray-100 dark:bg-gray-900 sticky top-0 z-10">
              <tr className="text-gray-600 dark:text-gray-400 uppercase font-bold text-[11px]">
                {hasPermission(PATH_VISTA, "tabla_facturas", "col_folio") && <th className="p-3 border-b border-r border-gray-200 dark:border-gray-700">Folio</th>}
                {hasPermission(PATH_VISTA, "tabla_facturas", "col_emision") && <th className="p-3 border-b border-r border-gray-200 dark:border-gray-700">Emisión</th>}
                {hasPermission(PATH_VISTA, "tabla_facturas", "col_ref") && <th className="p-3 border-b border-r border-gray-200 dark:border-gray-700">Ref.</th>}
                {hasPermission(PATH_VISTA, "tabla_facturas", "col_razon") && <th className="p-3 border-b border-r border-gray-200 dark:border-gray-700">Razón Social</th>}
                {hasPermission(PATH_VISTA, "tabla_facturas", "col_total") && <th className="p-3 border-b border-r border-gray-200 dark:border-gray-700">Total (Neto)</th>}
                {hasPermission(PATH_VISTA, "tabla_facturas", "col_estado") && <th className="p-3 border-b border-r border-gray-200 dark:border-gray-700">Estado</th>}
                {hasPermission(PATH_VISTA, "tabla_facturas", "col_f_ingreso") && <th className="p-3 border-b border-r border-gray-200 dark:border-gray-700">F. Ingreso</th>}
                {hasPermission(PATH_VISTA, "tabla_facturas", "col_oc_ingresada") && <th className="p-3 border-b border-r border-gray-200 dark:border-gray-700">OC Ingresada</th>}
                {hasPermission(PATH_VISTA, "tabla_facturas", "col_acciones") && <th className="p-3 border-b border-gray-200 dark:border-gray-700 text-center">Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {facturasFiltradas.map((f) => (
                <tr key={f.id} className="border-l-4 border-transparent hover:border-[#2383C2] hover:bg-gray-50/80 dark:hover:bg-gray-700/40 transition-colors">
                  {hasPermission(PATH_VISTA, "tabla_facturas", "col_folio") && <td className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70 font-bold text-gray-700 dark:text-gray-200">{f.folio}</td>}
                  {hasPermission(PATH_VISTA, "tabla_facturas", "col_emision") && <td className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-600 dark:text-gray-400">{f.fchEmis}</td>}
                  {hasPermission(PATH_VISTA, "tabla_facturas", "col_ref") && <td className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70 font-medium text-gray-500 dark:text-gray-400">{f.folioRef}</td>}
                  {hasPermission(PATH_VISTA, "tabla_facturas", "col_razon") && <td className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-600 dark:text-gray-300">{f.rznSoc}</td>}
                  {hasPermission(PATH_VISTA, "tabla_facturas", "col_total") && <td className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-600 dark:text-gray-300">${parseInt(f.total || 0).toLocaleString()}</td>}
                  {hasPermission(PATH_VISTA, "tabla_facturas", "col_estado") && (
                    <td className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${f.estado === 'Ingresada' ? 'bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-400' : 'bg-yellow-100 dark:bg-yellow-950/40 text-yellow-700 dark:text-yellow-400'}`}>
                        {f.estado || 'Pendiente'}
                      </span>
                    </td>
                  )}
                  {hasPermission(PATH_VISTA, "tabla_facturas", "col_f_ingreso") && <td className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-600 dark:text-gray-400 text-[11px]">{f.fechaIngreso || '-'}</td>}
                  {hasPermission(PATH_VISTA, "tabla_facturas", "col_oc_ingresada") && <td className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70 font-bold text-[#2383C2]">{f.ocIngresada || '-'}</td>}
                  {hasPermission(PATH_VISTA, "tabla_facturas", "col_acciones") && (
                    <td className="p-3 border-b border-gray-200 dark:border-gray-700 text-center">
                      <div className="flex justify-center gap-3">
                        {hasPermission(PATH_VISTA, "tabla_facturas", "btn_ver") && (
                          <button onClick={() => setFacturaSeleccionada(f)} className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 transition">
                            <Eye size={15} />
                          </button>
                        )}
                        {hasPermission(PATH_VISTA, "tabla_facturas", "btn_eliminar") && (
                          <button onClick={() => handleDelete(f.id)} className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition">
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {facturaSeleccionada && <DetalleFacturaModal factura={facturaSeleccionada} onClose={() => setFacturaSeleccionada(null)} />}

      {showModal && (
        <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-transparent dark:border-gray-700">
            <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/40">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-[#2383C2]/10 rounded-lg">
                  <Upload size={18} className="text-[#2383C2]" />
                </div>
                <h3 className="font-bold text-gray-800 dark:text-gray-100">Importar Documentos XML</h3>
              </div>
              <button onClick={() => setShowModal(false)} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition p-1">
                <X size={20} />
              </button>
            </div>
            <div className="p-8">
              <div {...getRootProps()} className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer flex flex-col items-center justify-center gap-4 transition ${isDragActive ? "border-[#2383C2] bg-[#2383C2]/5" : "border-gray-200 dark:border-gray-700 hover:border-[#2383C2]/50 hover:bg-gray-50 dark:hover:bg-gray-700/30"}`}>
                <input {...getInputProps()} />
                <div className="bg-gray-100 dark:bg-gray-900 p-4 rounded-full">
                  <FileText size={32} className="text-gray-400 dark:text-gray-500" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-700 dark:text-gray-200">Arrastra tus archivos XML aquí</p>
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

export default Facturas;