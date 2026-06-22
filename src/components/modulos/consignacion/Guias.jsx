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
    const q = collection(db, "consignacion_guias");
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const anios = snapshot.docs.map(d => d.id).sort((a, b) => b - a);
      setAniosDisponibles(anios);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!filtroAnio) {
      setMesesDisponibles([]);
      return;
    }
    const q = collection(db, "consignacion_guias", filtroAnio, "meses");
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const meses = snapshot.docs.map(d => d.id);
      setMesesDisponibles(meses);
    });
    return () => unsubscribe();
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
        const cantidadLimpia = item.cantidad || "";
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
    let ultimoAnioCargado = "";
    let ultimoMesCargado = "";

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

        const detalles = Array.from(xmlDoc.getElementsByTagName("Detalle")).map(d => {
          const rawCantidad = d.getElementsByTagName("QtyItem")[0]?.textContent || "";
          const cantidadLimpia = rawCantidad.includes('.') ? rawCantidad.split('.')[0] : rawCantidad;

          return {
            nroLin: d.getElementsByTagName("NroLinDet")[0]?.textContent,
            codigo: d.getElementsByTagName("VlrCodigo")[0]?.textContent,
            nombre: d.getElementsByTagName("NmbItem")[0]?.textContent,
            dscItem: d.getElementsByTagName("DscItem")[0]?.textContent || "",
            cantidad: cantidadLimpia,
            fchVenc: d.getElementsByTagName("FchVencim")[0]?.textContent || null
          };
        });

        await setDoc(doc(db, "consignacion_guias", anio), { active: "true" }, { merge: true });
        await setDoc(doc(db, "consignacion_guias", anio, "meses", nombreMes), { active: "true" }, { merge: true });

        await addDoc(colRef, {
          folio, fchEmis, rznSoc, folioRef, detalles,
          estadoRegistro: "Pendiente",
          registradoPor: userData?.nombreCompleto || 'Usuario',
          fechaRegistro: new Date()
        });

        ultimoAnioCargado = anio;
        ultimoMesCargado = nombreMes;
      }

      if (omitidos === acceptedFiles.length) {
        showToast("Todos los archivos ya existían en la base de datos.", "warning");
      } else {
        if (omitidos > 0) {
          showToast(`Importación finalizada. ${omitidos} archivos omitidos por duplicado.`, "warning");
        } else {
          showToast("Importación masiva completada con éxito", "success");
        }

        if (ultimoAnioCargado && ultimoMesCargado) {
          setFiltroAnio(ultimoAnioCargado);
          setFiltroMes(ultimoMesCargado);
        }
      }

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
            <Spinner size="md" color="#2383C2" />
            <div className="text-center">
              <h3 className="text-[#2383C2] font-bold text-[15px] tracking-tight">Procesando archivos</h3>
              <p className="text-gray-500 text-[11px] font-medium mt-1 uppercase tracking-widest">No cierre esta ventana</p>
            </div>
          </div>
        </div>
      )}

      <h2 className="text-[14px] font-bold text-gray-700 p-4 flex items-center gap-2 border-b border-gray-200">
        <Package size={16} className="text-[#2383C2]" /> GESTIÓN DE GUÍAS
        {hasPermission(PATH_VISTA, "cabecera_acciones", "btn_importar_xml") && (
          <button onClick={() => setShowModal(true)} className="ml-auto bg-[#2383C2] text-white px-3 py-1 rounded text-[11px] font-bold flex items-center gap-1 hover:bg-[#369BCE]">
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
              <Search className="absolute left-2.5 top-2.5 text-gray-400" size={13} />
              <input 
                value={busqueda} 
                onChange={e => setBusqueda(e.target.value)} 
                className="w-full h-8 pl-8 pr-2 bg-white border border-gray-300 rounded text-[12px] outline-none transition-all duration-200 focus:border-[#2383C2] focus:ring-2 focus:ring-[#2383C2]/20 focus:shadow-[0_0_8px_rgba(35,131,194,0.2)]" 
                placeholder="Buscar por Folio o Ref..." 
              />
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
              {guiasFiltradas.length > 0 ? (
                guiasFiltradas.map((g) => (
                  <tr key={g.id} className="border-l-4 border-transparent hover:border-[#2383C2] hover:bg-gray-50 transition-colors duration-150">
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
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-gray-400 font-medium">
                    {!filtroAnio || !filtroMes ? "Selecciona un año y un mes para visualizar las guías." : "No se encontraron guías para este periodo."}
                  </td>
                </tr>
              )}
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
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-50 flex items-center justify-center p-4 transition-all duration-300">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] overflow-hidden border border-slate-100">

            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/60">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-50 text-[#2383C2] rounded-lg">
                  <Upload size={18} className="stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-[15px]">Importar Documentos XML</h3>
                  <p className="text-[11px] text-slate-400 font-medium">Carga masiva a base de datos de consignación</p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={18} className="stroke-[2.5]" />
              </button>
            </div>

            <div className="p-6">
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-200 outline-none flex flex-col items-center justify-center min-h-[220px] ${isDragActive
                    ? 'border-[#2383C2] bg-blue-50/50 scale-[0.99]'
                    : 'border-slate-200 bg-slate-50/30 hover:bg-slate-50 hover:border-slate-300'
                  }`}
              >
                <input {...getInputProps()} />
                <div className={`p-4 rounded-full mb-4 transition-transform duration-200 ${isDragActive ? 'bg-blue-100 text-[#2383C2] scale-110' : 'bg-white text-slate-400 border border-slate-100 shadow-sm'
                  }`}>
                  <FileText size={32} className="stroke-[1.8]" />
                </div>
                <h4 className="text-[14px] font-bold text-slate-700 mb-1">
                  {isDragActive ? "¡Suelta los archivos aquí!" : "Arrastra tus archivos XML"}
                </h4>
                <p className="text-[12px] text-slate-400 max-w-[280px] leading-relaxed">
                  O haz clic para <span className="text-[#2383C2] font-semibold underline">explorar tu equipo</span>. Solo se admiten extensiones .xml
                </p>
              </div>
            </div>

            <div className="px-6 py-3.5 bg-slate-50/80 border-t border-slate-100 flex justify-between items-center text-[11px] text-slate-400 font-medium">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Verificación de duplicados activa
              </span>
              <span>Procesamiento inmediato</span>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default Guias;