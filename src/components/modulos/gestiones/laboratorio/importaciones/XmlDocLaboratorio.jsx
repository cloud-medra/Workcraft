import React, { useState, useEffect, useCallback } from 'react';
import {
  collection,
  onSnapshot,
  deleteDoc,
  doc,
  query,
  orderBy,
  addDoc,
  getDocs,
  setDoc,
  where,
  serverTimestamp
} from 'firebase/firestore';
import { useDropzone } from 'react-dropzone';
import { db } from '../../../../../firebaseConfig';
import { FileText, Trash2, Search, Upload, X, Eye } from 'lucide-react';
import { useToast } from '../../../../../context/ToastContext';
import { useModal } from '../../../../../context/ModalContext';
import { useUser } from '../../../../../context/UserContext';
import { useGranularPermission } from '../../../../../hooks/useGranularPermission';
import Spinner from '../../../../ui/Spinner';
import DetalleFacturaModal from '../vizualizador/XmlDetallesDoc';

const XmlFacturasLaboratorio = () => {
  const [documentos, setDocumentos] = useState([]);
  const [aniosDisponibles, setAniosDisponibles] = useState([]);
  const [mesesDisponibles, setMesesDisponibles] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [documentoSeleccionado, setDocumentoSeleccionado] = useState(null);
  const [filtroAnio, setFiltroAnio] = useState("");
  const [filtroMes, setFiltroMes] = useState("");
  const [cargando, setCargando] = useState(false);

  const { showToast } = useToast();
  const { confirmAction } = useModal();
  const { userData } = useUser();
  const { hasPermission } = useGranularPermission();

  const PATH_VISTA = "/laboratorio/XmlDocLaboratorio";
  const COL_BASE = "laboratorio_documentos";

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

  useEffect(() => {
    if (!filtroAnio) {
      setMesesDisponibles([]);
      return;
    }
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

  useEffect(() => {
    if (!filtroAnio || !filtroMes) {
      setDocumentos([]);
      return;
    }
    const path = `${COL_BASE}/${filtroAnio}/meses/${filtroMes}/documentos`;
    const q = query(collection(db, path), orderBy("fchEmis", "desc"));

    return onSnapshot(q, (snapshot) => {
      setDocumentos(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => {
      console.error("Error al escuchar documentos:", error);
    });
  }, [filtroAnio, filtroMes]);

  const onDrop = useCallback(async (acceptedFiles) => {
    setCargando(true);
    let omitidos = 0;
    let nuevosAnios = [];
    let nuevosMeses = [];

    try {
      for (const file of acceptedFiles) {
        const text = await file.text();
        const xmlDoc = new DOMParser().parseFromString(text, "text/xml");

        const folio = xmlDoc.getElementsByTagName("Folio")[0]?.textContent;
        const fchEmis = xmlDoc.getElementsByTagName("FchEmis")[0]?.textContent;

        if (!fchEmis || !folio) continue;

        const referencias = Array.from(xmlDoc.getElementsByTagName("Referencia"));
        const refOrdenCompra = referencias.find(ref => {
          const tpoDoc = ref.getElementsByTagName("TpoDocRef")[0]?.textContent;
          return tpoDoc === "801";
        });

        let folioRef = "N/A";
        if (refOrdenCompra) {
          folioRef = refOrdenCompra.getElementsByTagName("FolioRef")[0]?.textContent || "N/A";
        } else if (referencias.length > 0) {
          folioRef = referencias[0].getElementsByTagName("FolioRef")[0]?.textContent || "N/A";
        }

        const [anio, mesNum] = fchEmis.split('-');
        const meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
        const nombreMes = meses[parseInt(mesNum, 10) - 1];

        if (!anio || !nombreMes) continue;

        const colRef = collection(db, COL_BASE, anio, "meses", nombreMes, "documentos");
        const q = query(colRef, where("folio", "==", folio));
        const existe = await getDocs(q);

        if (!existe.empty) {
          omitidos++;
          continue;
        }

        const detalles = Array.from(xmlDoc.getElementsByTagName("Detalle")).map(d => ({
          nroLin: d.getElementsByTagName("NroLinDet")[0]?.textContent ?? "",
          codigo: d.getElementsByTagName("VlrCodigo")[0]?.textContent ?? "N/A",
          nombre: d.getElementsByTagName("NmbItem")[0]?.textContent ?? "",
          cantidad: String(parseFloat(d.getElementsByTagName("QtyItem")[0]?.textContent ?? "0")),
          unidad: d.getElementsByTagName("UnmdItem")[0]?.textContent ?? "Un",
          precio: String(parseFloat(d.getElementsByTagName("PrcItem")[0]?.textContent ?? "0")),
          monto: d.getElementsByTagName("MontoItem")[0]?.textContent ?? "0"
        }));

        await setDoc(doc(db, COL_BASE, anio), { active: "true" }, { merge: true });
        await setDoc(doc(db, COL_BASE, anio, "meses", nombreMes), { active: "true" }, { merge: true });

        nuevosAnios.push(anio);
        if (filtroAnio === anio) {
          nuevosMeses.push(nombreMes);
        }

        const usuarioActualNombre = userData?.nombreCompleto || userData?.nombre || 'Usuario Desconocido';
        const usuarioActualEmail = userData?.email || '';
        const fechaActual = new Date();

        const docRefDocumento = await addDoc(colRef, {
          folio: folio ?? "",
          folioRef: folioRef ?? "N/A",
          fchEmis: fchEmis ?? "",
          anio,
          mes: nombreMes,
          rznSoc: xmlDoc.getElementsByTagName("RznSoc")[0]?.textContent || "Sin Razón Social",
          total: xmlDoc.getElementsByTagName("MntNeto")[0]?.textContent ?? "0",
          estado: "Iniciar Ingreso",
          xmlOriginal: text,
          detalles,
          registeredPor: usuarioActualNombre,
          fechaRegistro: fechaActual
        });

        const logsSubcollectionRef = collection(db, COL_BASE, anio, "meses", nombreMes, "documentos", docRefDocumento.id, "logs");

        await addDoc(logsSubcollectionRef, {
          accion: "CREACION",
          detalle: "Documento cargado e importado mediante archivo XML",
          usuario: {
            nombre: usuarioActualNombre,
            email: usuarioActualEmail
          },
          fechaHora: fechaActual.toLocaleString('es-CL'),
          timestamp: serverTimestamp()
        });
      }

      if (nuevosAnios.length > 0) {
        setAniosDisponibles(prev => Array.from(new Set([...prev, ...nuevosAnios])).sort((a, b) => b - a));
      }
      if (nuevosMeses.length > 0) {
        setMesesDisponibles(prev => Array.from(new Set([...prev, ...nuevosMeses])));
      }

      const mensaje = omitidos > 0
        ? `Importación finalizada. ${omitidos} archivo(s) omitido(s) por duplicidad.`
        : "Importación completada con éxito.";
      showToast(mensaje, omitidos > 0 ? "warning" : "success");
      setShowModal(false);
    } catch (error) {
      console.error("Error al importar XML:", error);
      showToast("Error al importar el archivo XML", "error");
    } finally {
      setCargando(false);
    }
  }, [userData, showToast, filtroAnio]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/xml': ['.xml'], 'text/xml': ['.xml'] }
  });

  const handleDelete = (id) => {
    confirmAction("Eliminar Documento", "¿Estás seguro de eliminar este registro?", async () => {
      try {
        await deleteDoc(doc(db, COL_BASE, filtroAnio, "meses", filtroMes, "documentos", id));
        showToast("Documento eliminado", "info");
      } catch (error) {
        console.error("Error al eliminar documento:", error);
        showToast("Error al eliminar el documento", "error");
      }
    });
  };

  const documentosFiltrados = documentos.filter(docItem =>
    docItem.folio?.toLowerCase().includes(busqueda.toLowerCase()) ||
    docItem.rznSoc?.toLowerCase().includes(busqueda.toLowerCase()) ||
    docItem.folioRef?.toLowerCase().includes(busqueda.toLowerCase()) ||
    docItem.estado?.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="w-full h-full flex flex-col bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-lg shadow-sm overflow-hidden p-0 relative font-sans text-[11px]">
      {cargando && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-slate-900/30 dark:bg-black/50 backdrop-blur-[2px]">
          <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-xl flex flex-col items-center gap-2 border border-slate-100 dark:border-gray-700">
            <Spinner size="md" color="#2383C2" />
            <h3 className="text-[#2383C2] font-normal text-[12px]">Procesando XML...</h3>
          </div>
        </div>
      )}

      <header className="bg-white dark:bg-gray-800 border-b border-slate-200 dark:border-gray-700 px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-[#2383C2]" />
          <span className="text-[12px] font-bold text-slate-800 dark:text-gray-100 tracking-wide uppercase">
            Gestión de Documentos XML
          </span>
        </div>

        {hasPermission(PATH_VISTA, "cabecera_acciones", "btn_importar_xml") && (
          <button
            onClick={() => setShowModal(true)}
            className="bg-[#2383C2] hover:bg-[#1c6fa6] text-white px-2.5 py-1 rounded text-[10px] font-bold flex items-center gap-1.5 transition shadow-sm"
          >
            <Upload size={11} /> Importar XML
          </button>
        )}
      </header>

      <div className="bg-slate-100/70 dark:bg-gray-800/40 p-1.5 flex flex-wrap gap-1.5 items-center border-b border-slate-200 dark:border-gray-700">
        {hasPermission(PATH_VISTA, "filtros_busqueda", "select_anio") && (
          <select
            value={filtroAnio}
            onChange={(e) => {
              setFiltroAnio(e.target.value);
              setFiltroMes("");
            }}
            className="h-6 border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-slate-800 dark:text-gray-100 rounded text-[11px] px-1.5 outline-none focus:border-[#2383C2]"
          >
            <option value="">Año</option>
            {aniosDisponibles.map((a, idx) => (
              <option key={`anio-${a}-${idx}`} value={a}>{a}</option>
            ))}
          </select>
        )}

        {hasPermission(PATH_VISTA, "filtros_busqueda", "select_mes") && (
          <select
            value={filtroMes}
            onChange={(e) => setFiltroMes(e.target.value)}
            className="h-6 border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-slate-800 dark:text-gray-100 rounded text-[11px] px-1.5 outline-none capitalize focus:border-[#2383C2]"
          >
            <option value="">Mes</option>
            {mesesDisponibles.map((m, idx) => (
              <option key={`mes-${m}-${idx}`} value={m}>{m}</option>
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
              placeholder="Buscar por Folio, Ref, Razón Social o Estado..."
            />
          </div>
        )}
      </div>

      {hasPermission(PATH_VISTA, "tabla_documentos") && (
        <div className="flex-grow overflow-auto">
          <table className="w-full text-left text-[11px] border-collapse table-fixed">
            <thead className="bg-slate-100 dark:bg-gray-900/80 sticky top-0 z-10">
              <tr className="text-slate-600 dark:text-gray-400 uppercase font-bold text-[10px]">
                <th className="py-1.5 px-2 border-b border-r border-slate-200 dark:border-gray-700 w-8 text-center">#</th>
                <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700 w-[12%]">Folio</th>
                <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700 w-[11%]">Emisión</th>
                <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700 w-[11%]">Ref.</th>
                <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700 w-[30%]">Razón Social</th>
                <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700 w-[12%] text-right">Total (Neto)</th>
                <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700 w-[14%] text-center">Estado</th>
                <th className="px-2 py-1.5 border-b border-slate-200 dark:border-gray-700 w-[10%] text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60 dark:divide-gray-700/50 bg-white dark:bg-gray-800">
              {documentosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-6 text-slate-400 dark:text-gray-500">
                    {!filtroAnio || !filtroMes
                      ? "Selecciona un año y un mes para visualizar los documentos."
                      : "No se encontraron documentos registrados para este periodo."}
                  </td>
                </tr>
              ) : (
                documentosFiltrados.map((docItem, index) => (
                  <tr
                    key={docItem.id}
                    className="border-l-2 border-transparent hover:border-[#2383C2] hover:bg-gray-50/80 dark:hover:bg-gray-700/40 transition-colors"
                  >
                    <td className="py-1 px-2 border-b border-r border-slate-200/60 dark:border-gray-700/70 text-gray-500 dark:text-gray-400 font-bold text-center">
                      {index + 1}
                    </td>
                    <td className="px-2 py-1 border-b border-r border-slate-200/60 dark:border-gray-700/70 font-medium text-slate-800 dark:text-gray-100 truncate">
                      {docItem.folio}
                    </td>
                    <td className="px-2 py-1 border-b border-r border-slate-200/60 dark:border-gray-700/70 text-slate-600 dark:text-gray-400 whitespace-nowrap">
                      {docItem.fchEmis}
                    </td>
                    <td className="px-2 py-1 border-b border-r border-slate-200/60 dark:border-gray-700/70 text-slate-600 dark:text-gray-400 truncate">
                      {docItem.folioRef}
                    </td>
                    <td className="px-2 py-1 border-b border-r border-slate-200/60 dark:border-gray-700/70 text-slate-700 dark:text-gray-300 truncate" title={docItem.rznSoc}>
                      {docItem.rznSoc}
                    </td>
                    <td className="px-2 py-1 border-b border-r border-slate-200/60 dark:border-gray-700/70 text-slate-800 dark:text-gray-100 font-medium text-right whitespace-nowrap">
                      ${parseInt(docItem.total || 0, 10).toLocaleString('es-CL')}
                    </td>
                    <td className="px-2 py-1 border-b border-r border-slate-200/60 dark:border-gray-700/70 text-center whitespace-nowrap">
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50">
                        {docItem.estado || "Iniciar Ingreso"}
                      </span>
                    </td>
                    <td className="px-2 py-1 border-b border-slate-200/60 dark:border-gray-700 text-center">
                      <div className="flex justify-center gap-2">
                        {hasPermission(PATH_VISTA, "tabla_documentos", "btn_ver") && (
                          <button
                            onClick={() => setDocumentoSeleccionado({ ...docItem, anio: filtroAnio, mes: filtroMes })}
                            className="text-gray-500 hover:text-[#2383C2] dark:hover:text-[#2383C2] transition"
                            title="Ver Detalle"
                          >
                            <Eye size={13} />
                          </button>
                        )}
                        {hasPermission(PATH_VISTA, "tabla_documentos", "btn_eliminar") && (
                          <button
                            onClick={() => handleDelete(docItem.id)}
                            className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition"
                            title="Eliminar"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {documentoSeleccionado && (
        <DetalleFacturaModal
          documento={documentoSeleccionado}
          onClose={() => setDocumentoSeleccionado(null)}
        />
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-sans">
          <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-xl shadow-2xl overflow-hidden border border-slate-200 dark:border-gray-700">
            <div className="px-4 py-3 border-b border-slate-100 dark:border-gray-700 flex justify-between items-center bg-slate-50/50 dark:bg-gray-900/40">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-[#2383C2]/10 rounded-lg">
                  <Upload size={16} className="text-[#2383C2]" />
                </div>
                <h3 className="font-bold text-xs text-slate-800 dark:text-gray-100">Importar Documentos XML</h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-gray-300 transition p-1"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-6">
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer flex flex-col items-center justify-center gap-3 transition ${isDragActive
                  ? "border-[#2383C2] bg-[#2383C2]/5"
                  : "border-slate-200 dark:border-gray-700 hover:border-[#2383C2]/50 hover:bg-slate-50 dark:hover:bg-gray-700/30"
                  }`}
              >
                <input {...getInputProps()} />
                <div className="bg-slate-100 dark:bg-gray-900 p-3 rounded-full">
                  <FileText size={24} className="text-slate-400 dark:text-gray-500" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-700 dark:text-gray-200">Arrastra tus archivos XML aquí</p>
                  <p className="text-[10px] text-slate-400 dark:text-gray-400 mt-0.5">o haz clic para seleccionar desde tu carpeta</p>
                </div>
              </div>
            </div>
            <div className="px-4 py-3 bg-slate-50 dark:bg-gray-900/40 border-t border-slate-100 dark:border-gray-700 flex justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="text-[11px] font-bold text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-gray-200 px-3 py-1 rounded-lg transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default XmlFacturasLaboratorio;