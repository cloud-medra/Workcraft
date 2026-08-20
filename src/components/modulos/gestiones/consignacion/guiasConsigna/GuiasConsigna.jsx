import React, { useState, useEffect, useCallback } from 'react';
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  query,
  onSnapshot,
  deleteDoc
} from 'firebase/firestore';
import { useDropzone } from 'react-dropzone';
import { db } from '../../../../../firebaseConfig';
import { Trash2, Upload, ScanLine, Eye, ChevronDown, ChevronUp } from 'lucide-react';
import { useToast } from '../../../../../context/ToastContext';
import { useModal } from '../../../../../context/ModalContext';
import { useUser } from '../../../../../context/UserContext';
import Spinner from '../../../../ui/Spinner';
import Tesseract from 'tesseract.js';

const OcrGuiasLaboratorio = () => {
  const [documentos, setDocumentos] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [progreso, setProgreso] = useState('');
  const [expandidoId, setExpandidoId] = useState(null); // Para ver el detalle de los ítems de cada guía

  const { showToast } = useToast();
  const { confirmAction } = useModal();
  const { userData } = useUser();

  const COL_BASE = "consignacion_guias_ocr";

  useEffect(() => {
    const q = query(collection(db, COL_BASE));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docsData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setDocumentos(docsData);
    }, (error) => {
      console.error("Error al escuchar Firestore:", error);
      showToast("Error de permisos o conexión con la base de datos", "error");
    });

    return () => unsubscribe();
  }, [showToast]);

  // Función para parsear el texto estilo "Packing List" en múltiples ítems
  const parsearPackingList = (text) => {
    const lineas = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const itemsDetectados = [];

    // Ejemplo de lógica para recorrer y agrupar filas de tablas escaneadas
    // Buscamos patrones comunes en tu documento (códigos de lote, fechas UBD como DD.MM.YYYY)
    lineas.forEach((linea, index) => {
      // Detectar fechas de vencimiento (ej: 31.05.2031 o 31/05/2031)
      const fechaUbdMatch = linea.match(/(\d{2}[-./]\d{2}[-./]\d{4})/);
      
      if (fechaUbdMatch) {
        // Si encontramos una línea con fecha, intentamos rescatar contexto de las líneas cercanas
        const fechaVencimiento = fechaUbdMatch[1];
        
        // Buscamos hacia arriba o en la misma línea un posible lote (ej: códigos alfanuméricos largos como J6F3487Y)
        // O tomamos información de la línea previa como descripción
        const descripcionPrev = lineas[index - 1] || "Producto escaneado";
        
        itemsDetectados.push({
          id: Math.random().toString(36).substring(2, 9),
          item: `Item ${itemsDetectados.length + 1}`,
          descripcion: descripcionPrev,
          lote: "Detectado en línea", 
          vencimiento: fechaVencimiento
        });
      }
    });

    // Si el OCR no detectó filas por fecha exacta, guardamos al menos el texto completo desglosado
    if (itemsDetectados.length === 0) {
      itemsDetectados.push({
        id: "1",
        item: "General",
        descripcion: "Texto general extraído (revisar texto completo)",
        lote: "No especificado",
        vencimiento: "No especificado"
      });
    }

    return itemsDetectados;
  };

  const onDrop = useCallback(async (acceptedFiles) => {
    setCargando(true);
    setProgreso("Iniciando escaneo con IA...");

    try {
      for (const file of acceptedFiles) {
        if (file.type === 'application/pdf') {
          showToast(`El archivo ${file.name} es un PDF. Por ahora solo se admiten imágenes de la cámara.`, "error");
          continue;
        }

        setProgreso(`Analizando imagen: ${file.name}`);

        // 1. OCR con Tesseract (optimizado para español)
        const { data: { text } } = await Tesseract.recognize(file, 'spa');

        // 2. Desglosar los ítems del Packing List
        const itemsList = parsearPackingList(text);

        const nuevaGuia = {
          nombreArchivo: file.name,
          items: itemsList, // Guardamos la lista de productos desglosados
          textoCompleto: text,
          registeredPor: userData?.nombreCompleto || 'Usuario',
          fechaRegistro: serverTimestamp()
        };

        // 3. Guardar en Firestore
        await addDoc(collection(db, COL_BASE), nuevaGuia);
      }

      showToast("Documento escaneado y desglosado con éxito", "success");
      setShowModal(false);
    } catch (error) {
      console.error("Error en OCR:", error);
      showToast("Error al procesar el documento", "error");
    } finally {
      setCargando(false);
      setProgreso('');
    }
  }, [userData, showToast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.heic'] }
  });

  const handleDelete = (id) => {
    confirmAction("Eliminar Registro", "¿Seguro que deseas eliminar este escaneo?", async () => {
      try {
        await deleteDoc(doc(db, COL_BASE, id));
        showToast("Eliminado correctamente", "info");
      } catch (err) {
        console.error("Error al eliminar:", err);
        showToast("No se pudo eliminar el registro", "error");
      }
    });
  };

  const toggleExpand = (id) => {
    setExpandidoId(expandidoId === id ? null : id);
  };

  return (
    <div className="w-full h-full flex flex-col bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-lg shadow-sm overflow-hidden p-0 font-sans text-[11px] relative">
      {cargando && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-[2px]">
          <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-xl flex flex-col items-center gap-2">
            <Spinner size="md" color="#2383C2" />
            <h3 className="text-[#2383C2] font-semibold text-[12px]">{progreso}</h3>
          </div>
        </div>
      )}

      <header className="bg-white dark:bg-gray-800 border-b border-slate-200 dark:border-gray-700 px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ScanLine size={16} className="text-[#2383C2]" />
          <span className="text-[12px] font-bold text-slate-800 dark:text-white uppercase tracking-wide">
            Escaneo de Packing List / Guías (Cámara)
          </span>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-[#2383C2] hover:bg-[#1c6fa6] text-white px-3 py-1.5 rounded text-[10px] font-bold flex items-center gap-1.5 shadow-sm"
        >
          <Upload size={12} /> Tomar Foto / Subir Hoja
        </button>
      </header>

      {/* Tabla Principal de Documentos Escaneados */}
      <div className="flex-grow overflow-auto p-2">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-100 dark:bg-gray-800 text-slate-700 dark:text-slate-200">
            <tr>
              <th className="p-2 border border-slate-200 dark:border-gray-700">Archivo / Documento</th>
              <th className="p-2 border border-slate-200 dark:border-gray-700">Ítems Detectados</th>
              <th className="p-2 border border-slate-200 dark:border-gray-700">Registrado Por</th>
              <th className="p-2 border border-slate-200 dark:border-gray-700 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {documentos.length === 0 ? (
              <tr>
                <td colSpan="4" className="p-6 text-center text-slate-500 dark:text-slate-400">
                  No hay hojas escaneadas todavía. Usa el botón superior para escanear una foto con tu cámara o archivo.
                </td>
              </tr>
            ) : (
              documentos.map(docItem => (
                <React.Fragment key={docItem.id}>
                  <tr className="hover:bg-slate-100/50 dark:hover:bg-gray-800/50 text-slate-800 dark:text-slate-200 font-medium">
                    <td className="p-2 border border-slate-200 dark:border-gray-700 flex items-center gap-2">
                      <button 
                        onClick={() => toggleExpand(docItem.id)} 
                        className="text-[#2383C2] hover:bg-slate-200 dark:hover:bg-gray-700 p-1 rounded flex items-center gap-1 font-bold"
                      >
                        {expandidoId === docItem.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        {docItem.nombreArchivo || "Documento Escaneado"}
                      </button>
                    </td>
                    <td className="p-2 border border-slate-200 dark:border-gray-700">
                      <span className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-2 py-0.5 rounded-full font-bold text-[10px]">
                        {docItem.items?.length || 0} productos desglosados
                      </span>
                    </td>
                    <td className="p-2 border border-slate-200 dark:border-gray-700">{docItem.registeredPor}</td>
                    <td className="p-2 border border-slate-200 dark:border-gray-700 text-center flex justify-center gap-2">
                      <button 
                        onClick={() => toggleExpand(docItem.id)} 
                        title="Ver detalle desglosado" 
                        className="text-[#2383C2] hover:text-[#1c6fa6]"
                      >
                        <Eye size={14} />
                      </button>
                      <button onClick={() => handleDelete(docItem.id)} title="Eliminar" className="text-red-500 hover:text-red-700">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>

                  {/* Subtabla desplegable con el desglose exacto de los ítems de la hoja */}
                  {expandidoId === docItem.id && (
                    <tr>
                      <td colSpan="4" className="bg-slate-100/80 dark:bg-gray-800/80 p-3 border border-slate-200 dark:border-gray-700">
                        <div className="font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase text-[10px]">
                          Desglose de productos encontrados en el documento:
                        </div>
                        <table className="w-full bg-white dark:bg-gray-900 rounded border border-slate-200 dark:border-gray-700 text-[10px]">
                          <thead>
                            <tr className="bg-slate-200 dark:bg-gray-700 text-slate-700 dark:text-slate-200">
                              <th className="p-1.5 border">Ítem</th>
                              <th className="p-1.5 border">Descripción / Material</th>
                              <th className="p-1.5 border">Lote / Batch</th>
                              <th className="p-1.5 border">Vencimiento (UBD)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {docItem.items?.map((prod, idx) => (
                              <tr key={idx} className="border-b dark:border-gray-800">
                                <td className="p-1.5 border">{prod.item}</td>
                                <td className="p-1.5 border font-semibold">{prod.descripcion}</td>
                                <td className="p-1.5 border">{prod.lote}</td>
                                <td className="p-1.5 border text-blue-600 dark:text-blue-400 font-bold">{prod.vencimiento}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-xl p-4 shadow-xl">
            <h3 className="font-bold mb-2 text-slate-800 dark:text-white">Escanear Packing List</h3>
            <p className="text-slate-500 dark:text-slate-400 mb-4 text-[10px]">
              Sube una foto clara tomada con el celular o selecciona la imagen del documento para desglosar sus datos automáticamente.
            </p>
            <div {...getRootProps()} className="border-2 border-dashed border-slate-300 dark:border-gray-600 p-8 text-center cursor-pointer rounded-lg hover:border-[#2383C2] transition-colors">
              <input {...getInputProps()} />
              <p className="text-slate-600 dark:text-slate-300 font-medium">
                {isDragActive ? "Suelta la foto aquí..." : "📱 Haz clic para usar la cámara o arrastra la foto aquí"}
              </p>
            </div>
            <button 
              onClick={() => setShowModal(false)} 
              className="mt-4 w-full text-center py-2 bg-slate-200 dark:bg-gray-700 text-slate-800 dark:text-white rounded font-medium"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OcrGuiasLaboratorio;