import React, { useState, useEffect, useCallback } from 'react';
import { collection, onSnapshot, deleteDoc, doc, query, orderBy, addDoc, getDocs, setDoc, updateDoc, where } from 'firebase/firestore';
import { useDropzone } from 'react-dropzone';
import { db } from '../../../firebaseConfig';
import { Package, Trash2, Search, Upload, X, FileText, Copy, Eye } from 'lucide-react';
import { useToast } from '../../../context/ToastContext';
import { useModal } from '../../../context/ModalContext';
import { useUser } from '../../../context/UserContext';
import { useGranularPermission } from '../../../hooks/useGranularPermission';
import Spinner from '../../ui/Spinner';
import DetalleGuiaModal from './DetalleGuiaModal';

const Guias = () => {
  const [guias, setGuias] = useState([]);
  const [aniosDisponibles, setAniosDisponibles] = useState([]);
  const [mesesDisponibles, setMesesDisponibles] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [guiaSeleccionada, setGuiaSeleccionada] = useState(null);
  const [filtroAnio, setFiltroAnio] = useState("");
  const [filtroMes, setFiltroMes] = useState("");
  const [cargando, setCargando] = useState(false);

  const { showToast } = useToast();
  const { confirmAction } = useModal();
  const { userData } = useUser();
  const { hasPermission } = useGranularPermission();

  const PATH_VISTA = "/consignacion/guias";

  useEffect(() => {
    const cargarAnios = async () => {
      const snap = await getDocs(collection(db, "consignacion_guias"));
      const anios = snap.docs.map(d => d.id).sort((a, b) => b - a);
      setAniosDisponibles(anios);
    };
    cargarAnios();
  }, []);

  useEffect(() => {
    if (!filtroAnio) {
      setMesesDisponibles([]);
      return;
    }
    const cargarMeses = async () => {
      const snap = await getDocs(collection(db, "consignacion_guias", filtroAnio, "meses"));
      const meses = snap.docs.map(d => d.id);
      setMesesDisponibles(meses);
    };
    cargarMeses();
  }, [filtroAnio]);

  useEffect(() => {
    if (!filtroAnio || !filtroMes) {
      setGuias([]);
      return;
    }
    const path = `consignacion_guias/${filtroAnio}/meses/${filtroMes}/guias`;
    const q = query(collection(db, path), orderBy("fchEmis", "asc"));
    return onSnapshot(q, (snapshot) => setGuias(snapshot.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, [filtroAnio, filtroMes]);

  const handleCopy = async (guia) => {
    const omitirCodigos = ["KIT-MANGACRL", "KITBYPASSTCRL2", "KITBYPASSTCRL"];
    const rows = guia.detalles
      .filter(item => !omitirCodigos.includes(item.codigo))
      .map(item => {
        const cantidadLimpia = item.cantidad ? item.cantidad.split('.')[0] : "";
        const codigoLimpio = item.codigo ? item.codigo.split(' ')[0] : "";
        return `${guia.folio}\t${codigoLimpio}\t${cantidadLimpia}\t${item.dscItem || ""}\t${item.fchVenc || ""}`;
      })
      .join("\n");

    if (!rows) {
      showToast("No hay datos para copiar tras aplicar filtros", "warning");
      return;
    }

    try {
      await navigator.clipboard.writeText(rows);
      if (guia.estadoRegistro !== "Ingresado") {
        const guiaRef = doc(db, "consignacion_guias", filtroAnio, "meses", filtroMes, "guias", guia.id);
        await updateDoc(guiaRef, { estadoRegistro: "Ingresado" });
      }
      showToast("Detalle copiado y marcado como ingresado", "success");
    } catch (err) {
      showToast("Error al copiar o actualizar estado", "error");
    }
  };

  const onDrop = useCallback(async (acceptedFiles) => {
    setCargando(true);
    let omitidos = 0;
    try {
      for (const file of acceptedFiles) {
        const text = await file.text();
        const xmlDoc = new DOMParser().parseFromString(text, "text/xml");

        const folio = xmlDoc.getElementsByTagName("Folio")[0]?.textContent;
        const fchEmis = xmlDoc.getElementsByTagName("FchEmis")[0]?.textContent;
        const rznSoc = xmlDoc.getElementsByTagName("RznSoc")[0]?.textContent;
        const folioRef = xmlDoc.getElementsByTagName("FolioRef")[0]?.textContent || "N/A";

        if (!fchEmis || !folio) continue;

        const [anio, mesNum] = fchEmis.split('-');
        const meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
        const nombreMes = meses[parseInt(mesNum) - 1];

        const colRef = collection(db, "consignacion_guias", anio, "meses", nombreMes, "guias");
        const q = query(colRef, where("folio", "==", folio));
        const existe = await getDocs(q);

        if (!existe.empty) {
          omitidos++;
          continue;
        }

        const detalles = Array.from(xmlDoc.getElementsByTagName("Detalle")).map(d => ({
          nroLin: d.getElementsByTagName("NroLinDet")[0]?.textContent,
          codigo: d.getElementsByTagName("VlrCodigo")[0]?.textContent,
          nombre: d.getElementsByTagName("NmbItem")[0]?.textContent,
          dscItem: d.getElementsByTagName("DscItem")[0]?.textContent || "",
          cantidad: d.getElementsByTagName("QtyItem")[0]?.textContent,
          fchVenc: d.getElementsByTagName("FchVencim")[0]?.textContent || null
        }));

        await setDoc(doc(db, "consignacion_guias", anio), { active: "true" }, { merge: true });
        await setDoc(doc(db, "consignacion_guias", anio, "meses", nombreMes), { active: "true" }, { merge: true });

        await addDoc(colRef, {
          folio, fchEmis, rznSoc, folioRef, detalles,
          estadoRegistro: "Pendiente",
          registradoPor: userData?.nombreCompleto || 'Usuario',
          fechaRegistro: new Date()
        });
      }

      if (omitidos > 0) showToast(`Importación finalizada. ${omitidos} archivos omitidos (duplicados).`, "warning");
      else showToast("Importación masiva completada", "success");

      setShowModal(false);
    } catch (error) {
      console.error(error);
      showToast("Error al importar archivos", "error");
    } finally {
      setCargando(false);
    }
  }, [userData, showToast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'application/xml': ['.xml'] } });

  const handleDelete = (id) => {
    confirmAction("Eliminar Guía", "¿Estás seguro de eliminar este registro?", async () => {
      await deleteDoc(doc(db, "consignacion_guias", filtroAnio, "meses", filtroMes, "guias", id));
      showToast("Guía eliminada", "info");
    });
  };

  const guiasFiltradas = guias.filter(g => (g.folio?.includes(busqueda)) || (g.folioRef?.includes(busqueda)));

  return (
    <div className="w-full h-full flex flex-col bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden p-0 relative">
      {cargando && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-gray-500/20 backdrop-blur-[2px] transition-all duration-500">
          <div className="bg-white/90 backdrop-blur-md p-8 rounded-3xl shadow-2xl border border-white/50 flex flex-col items-center gap-5 min-w-[280px]">
            <Spinner size="md" color="#0E5B6D" />
            <div className="text-center">
              <h3 className="text-[#0E5B6D] font-bold text-[15px] tracking-tight">Procesando archivos</h3>
              <p className="text-gray-500 text-[11px] font-medium mt-1 uppercase tracking-widest">No cierre esta ventana</p>
            </div>
          </div>
        </div>
      )}

      <h2 className="text-[14px] font-bold text-gray-700 p-4 flex items-center gap-2 border-b border-gray-200">
        <Package size={16} className="text-[#0E5B6D]" /> GESTIÓN DE GUÍAS
        {hasPermission(PATH_VISTA, "cabecera_acciones", "btn_importar_xml") && (
          <button onClick={() => setShowModal(true)} className="ml-auto bg-[#0E5B6D] text-white px-3 py-1 rounded text-[11px] font-bold flex items-center gap-1 hover:bg-[#0a4856]">
            <Upload size={12} /> Importar XML
          </button>
        )}
      </h2>

      {hasPermission(PATH_VISTA, "filtros_busqueda") && (
        <div className="bg-gray-50 p-3 flex flex-wrap gap-2 items-center border-b border-gray-200">
          {hasPermission(PATH_VISTA, "filtros_busqueda", "select_anio") && (
            <select value={filtroAnio} onChange={(e) => { setFiltroAnio(e.target.value); setFiltroMes(""); }} className="h-8 border border-gray-300 rounded text-[12px] px-2 outline-none">
              <option value="">Seleccionar año</option>
              {aniosDisponibles.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          )}
          {hasPermission(PATH_VISTA, "filtros_busqueda", "select_mes") && (
            <select value={filtroMes} onChange={(e) => setFiltroMes(e.target.value)} className="h-8 border border-gray-300 rounded text-[12px] px-2 outline-none capitalize">
              <option value="">Seleccionar mes</option>
              {mesesDisponibles.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          )}
          {hasPermission(PATH_VISTA, "filtros_busqueda", "input_buscar") && (
            <div className="relative flex-grow max-w-sm">
              <Search className="absolute left-2 top-2 text-gray-400" size={14} />
              <input value={busqueda} onChange={e => setBusqueda(e.target.value)} className="w-full h-8 pl-8 pr-2 border border-gray-300 rounded text-[12px] outline-none" placeholder="Buscar por Folio o Ref..." />
            </div>
          )}
        </div>
      )}

      {hasPermission(PATH_VISTA, "tabla_guias") && (
        <div className="flex-grow overflow-auto">
          <table className="w-full text-left text-[12px] border-collapse">
            <thead className="bg-gray-100 sticky top-0">
              <tr className="text-gray-600 uppercase font-bold text-[11px]">
                <th className="p-3 border-b border-r border-gray-200">Folio</th>
                <th className="p-3 border-b border-r border-gray-200">Fch Emisión</th>
                <th className="p-3 border-b border-r border-gray-200">Folio Ref</th>
                <th className="p-3 border-b border-r border-gray-200">Razón Social</th>
                <th className="p-3 border-b border-r border-gray-200">Registro</th>
                <th className="p-3 border-b border-gray-200 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {guiasFiltradas.map((g) => (
                <tr key={g.id} className="border-l-4 border-transparent hover:border-[#0E5B6D] hover:bg-gray-50 transition-colors duration-150">
                  <td className="p-3 border-b border-r border-gray-200 font-bold text-gray-700">{g.folio}</td>
                  <td className="p-3 border-b border-r border-gray-200 text-gray-600">{g.fchEmis}</td>
                  <td className="p-3 border-b border-r border-gray-200 text-gray-600">{g.folioRef}</td>
                  <td className="p-3 border-b border-r border-gray-200 text-gray-600 truncate max-w-[200px]">{g.rznSoc}</td>
                  <td className={`p-3 border-b border-r border-gray-200 font-bold ${g.estadoRegistro === 'Ingresado' ? 'text-green-600' : 'text-gray-400'}`}>
                    {g.estadoRegistro || 'Pendiente'}
                  </td>
                  <td className="p-3 border-b border-gray-200 text-center">
                    <div className="flex justify-center gap-3">
                      {hasPermission(PATH_VISTA, "tabla_guias", "action_copiar") && (
                        <button onClick={() => handleCopy(g)} className="text-blue-500 hover:text-blue-700 transition-colors"><Copy size={15} /></button>
                      )}
                      {hasPermission(PATH_VISTA, "tabla_guias", "action_ver_detalle") && (
                        <button onClick={() => setGuiaSeleccionada(g)} className="text-green-600 hover:text-green-800 transition-colors"><Eye size={15} /></button>
                      )}
                      {hasPermission(PATH_VISTA, "tabla_guias", "action_eliminar") && (
                        <button onClick={() => handleDelete(g.id)} className="text-red-500 hover:text-red-700 transition-colors"><Trash2 size={15} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {guiaSeleccionada && (
        <DetalleGuiaModal
          guia={guiaSeleccionada}
          onClose={() => setGuiaSeleccionada(null)}
        />
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-gray-700">Importar Documentos XML</h3>
              <button onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            <div {...getRootProps()} className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition ${isDragActive ? 'border-[#0E5B6D] bg-blue-50' : 'border-gray-300'}`}>
              <input {...getInputProps()} />
              <FileText size={40} className="mx-auto text-gray-400 mb-4" />
              <p className="text-[13px] text-gray-500">Arrastra archivos aquí o haz clic para seleccionar</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Guias;