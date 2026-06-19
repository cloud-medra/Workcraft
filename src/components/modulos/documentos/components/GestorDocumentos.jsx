import React, { useState } from 'react';
import { storage, db } from "../../../../firebaseConfig";
import { ref, uploadBytesResumable, getDownloadURL, deleteObject, getBlob } from 'firebase/storage';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { FileText, UploadCloud, Trash2, Eye, Loader2, ShoppingBag, ClipboardList } from 'lucide-react';
import { useToast } from "../../../../context/ToastContext";
import { useUser } from "../../../../context/UserContext";

const RUTA = '/documentos/carga';

const GestorDocumentos = ({ firestorePath, storagePath, documentosExistentes = [], hasPermission }) => {
  const [archivosCargando, setArchivosCargando] = useState({});
  const [isDragging, setIsDragging] = useState(false);
  const [descargandoId, setDescargandoId] = useState(null);
  const { showToast } = useToast();
  const { userData } = useUser();

  const docsOC = hasPermission(RUTA, 'gestor_documentos', 'cargaDatos_gestor_verOC')
    ? documentosExistentes.filter(d => d.nombre.toUpperCase().startsWith('OC_'))
    : [];

  const docsClinicos = hasPermission(RUTA, 'gestor_documentos', 'cargaDatos_gestor_verClinicos')
    ? documentosExistentes.filter(d => !d.nombre.toUpperCase().startsWith('OC_'))
    : [];

  const procesarArchivos = (files) => {
    if (!hasPermission(RUTA, 'gestor_documentos', 'cargaDatos_gestor_upload')) {
      showToast("No dispones de permisos de escritura para añadir archivos", "error");
      return;
    }
    if (files.length === 0) return;

    const validos = files.every(file => file.type === "application/pdf" || file.name.toLowerCase().endsWith('.pdf'));
    if (!validos) {
      showToast("Solo se permiten archivos en formato PDF", "error");
      return;
    }

    files.forEach((file) => {
      const nombreFinal = file.name;
      if (documentosExistentes.some(d => d.nombre.toLowerCase() === nombreFinal.toLowerCase())) {
        showToast(`El archivo "${nombreFinal}" ya está en el expediente`, "error");
        return;
      }

      const idUnico = `${Date.now()}_${nombreFinal.replace(/\s+/g, '_')}`;
      const storageRef = ref(storage, `${storagePath}/${idUnico}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      setArchivosCargando(prev => ({ ...prev, [idUnico]: { nombre: nombreFinal, progreso: 0 } }));

      uploadTask.on('state_changed',
        (snapshot) => {
          const porcentaje = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          setArchivosCargando(prev => ({ ...prev, [idUnico]: { ...prev[idUnico], progreso: porcentaje } }));
        },
        () => {
          showToast(`Error al subir ${nombreFinal}`, "error");
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          const nuevoDocMetadata = {
            idStorage: idUnico,
            nombre: nombreFinal,
            url: downloadURL,
            subidoPor: userData?.nombreCompleto || 'Usuario',
            fechaSubida: new Date().toISOString()
          };

          try {
            await updateDoc(doc(db, firestorePath), { documentos: arrayUnion(nuevoDocMetadata) });
            showToast(`"${nombreFinal}" integrado`, "success");
            setTimeout(() => {
              setArchivosCargando(prev => { const copia = { ...prev }; delete copia[idUnico]; return copia; });
            }, 1000);
          } catch {
            showToast("Error en base de datos", "error");
          }
        }
      );
    });
  };

  const handleVerDocumentoSeguro = async (docObj) => {
    setDescargandoId(docObj.idStorage);
    try {
      const blob = await getBlob(ref(storage, `${storagePath}/${docObj.idStorage}`));
      const urlVirtual = URL.createObjectURL(blob);
      window.open(urlVirtual, '_blank');
    } catch {
      showToast("No se pudo previsualizar el archivo de forma segura", "error");
    } finally {
      setDescargandoId(null);
    }
  };

  const handleEliminarDocumento = async (docObj) => {
    if (!hasPermission(RUTA, 'gestor_documentos', 'cargaDatos_gestor_eliminar')) {
      showToast("Privilegios insuficientes para eliminar documentación", "error");
      return;
    }
    if (!window.confirm(`¿Eliminar "${docObj.nombre}"?`)) return;
    try {
      await deleteObject(ref(storage, `${storagePath}/${docObj.idStorage}`));
      await updateDoc(doc(db, firestorePath), { documentos: arrayRemove(docObj) });
      showToast("Documento removido", "success");
    } catch {
      showToast("Error al eliminar", "error");
    }
  };

  const renderLista = (lista, titulo, Icono, colorSg) => (
    <div className="flex-1 bg-slate-50/50 border border-slate-100 rounded-2xl p-4">
      <h4 className="text-[12px] font-bold text-slate-600 flex items-center gap-1.5 mb-3 border-b border-slate-200/60 pb-1.5">
        <Icono size={14} className={colorSg} /> {titulo} ({lista.length})
      </h4>
      <div className="space-y-1.5 max-h-[250px] overflow-auto pr-1">
        {lista.length === 0 ? (
          <p className="text-[11px] text-slate-400 italic py-2 text-center">No hay archivos o no posees permisos de lectura.</p>
        ) : (
          lista.map((docObj, idx) => (
            <div key={idx} className="flex items-center justify-between p-2 rounded-xl border border-slate-100 bg-white hover:bg-slate-50 transition-all group/item">
              <div className="flex items-center gap-2 overflow-hidden w-[82%]">
                <div className="p-1.5 rounded-lg bg-red-50 text-red-500 flex-shrink-0"><FileText size={13} /></div>
                <div className="flex flex-col overflow-hidden">
                  <span className="text-[11px] font-medium text-slate-700 truncate" title={docObj.nombre}>{docObj.nombre}</span>
                  <span className="text-[9px] text-slate-400">Por {docObj.subidoPor}</span>
                </div>
              </div>
              <div className="flex items-center gap-0.5 opacity-0 group-hover/item:opacity-100 transition-opacity">
                <button
                  onClick={() => handleVerDocumentoSeguro(docObj)}
                  disabled={descargandoId !== null}
                  className="p-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-md shadow-xs"
                >
                  {descargandoId === docObj.idStorage ? <Loader2 size={12} className="animate-spin text-[#0E5B6D]" /> : <Eye size={12} />}
                </button>
                {hasPermission(RUTA, 'gestor_documentos', 'cargaDatos_gestor_eliminar') && (
                  <button onClick={() => handleEliminarDocumento(docObj)} className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-md">
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  return (
    <div className="w-full space-y-5">
      {hasPermission(RUTA, 'gestor_documentos', 'cargaDatos_gestor_upload') && (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => { e.preventDefault(); setIsDragging(false); procesarArchivos(Array.from(e.dataTransfer.files)); }}
          className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all ${isDragging ? 'border-[#0E5B6D] bg-[#0E5B6D]/5 scale-[0.99]' : 'border-slate-200 bg-slate-50/50 hover:border-[#0E5B6D]'
            }`}
        >
          <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer text-center">
            <UploadCloud size={36} className={`mb-1 ${isDragging ? 'text-[#0E5B6D]' : 'text-slate-400'}`} />
            <span className="text-[13px] font-bold text-slate-700">Arrastra todos los archivos PDF juntos aquí</span>
            <span className="text-[11px] text-slate-400 mt-0.5">Soporta informes y Órdenes de Compra en masa</span>
            <input type="file" multiple accept="application/pdf" className="hidden" onChange={(e) => procesarArchivos(Array.from(e.target.files))} />
          </label>
        </div>
      )}

      {Object.keys(archivosCargando).length > 0 && (
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
          {Object.values(archivosCargando).map((item, idx) => (
            <div key={idx} className="flex items-center justify-between text-[11px] bg-white p-2 rounded-lg border border-slate-100">
              <div className="flex items-center gap-2 overflow-hidden w-3/4">
                <Loader2 size={12} className="animate-spin text-[#0E5B6D] flex-shrink-0" />
                <span className="truncate text-slate-600 font-medium">{item.nombre}</span>
              </div>
              <span className="font-bold text-[#0E5B6D] text-[10px]">{item.progreso}%</span>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {renderLista(docsClinicos, "Expediente / Informes Clínicos", ClipboardList, "text-[#0E5B6D]")}
        {renderLista(docsOC, "Órdenes de Compra (OC)", ShoppingBag, "text-amber-500")}
      </div>
    </div>
  );
};

export default GestorDocumentos;