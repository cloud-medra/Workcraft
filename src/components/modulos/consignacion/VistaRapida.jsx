import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { FileText, Upload, X, Package } from 'lucide-react';
import { useToast } from '../../../context/ToastContext';
import { useGranularPermission } from '../../../hooks/useGranularPermission';

const VisualizadorTemporal = () => {
  const [guias, setGuias] = useState([]);
  const [cargando, setCargando] = useState(false);
  const { showToast } = useToast();
  const { hasPermission } = useGranularPermission();

  const PATH_VISTA = "/consignacion/guias";

  const onDrop = useCallback(async (acceptedFiles) => {
    setCargando(true);
    const nuevasGuias = [];

    try {
      for (const file of acceptedFiles) {
        const text = await file.text();
        const xmlDoc = new DOMParser().parseFromString(text, "text/xml");

        const folio = xmlDoc.getElementsByTagName("Folio")[0]?.textContent;
        const fchEmis = xmlDoc.getElementsByTagName("FchEmis")[0]?.textContent;
        const folioRef = xmlDoc.getElementsByTagName("FolioRef")[0]?.textContent || "N/A";

        const detalles = Array.from(xmlDoc.getElementsByTagName("Detalle"));
        const primerItem = detalles.length > 0
          ? detalles[0].getElementsByTagName("NmbItem")[0]?.textContent
          : "Sin ítems";

        nuevasGuias.push({
          id: folio + Math.random(),
          folio,
          fchEmis,
          folioRef,
          primerItem
        });
      }
      setGuias((prev) => [...prev, ...nuevasGuias]);
      showToast("Archivos procesados temporalmente", "success");
    } catch (error) {
      console.error(error);
      showToast("Error al procesar archivos", "error");
    } finally {
      setCargando(false);
    }
  }, [showToast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/xml': ['.xml'] }
  });

  if (!hasPermission(PATH_VISTA, "visualizador_temporal")) {
    return null;
  }

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden">
      <h2 className="text-[14px] font-bold text-gray-700 dark:text-gray-200 p-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
        <Package size={16} className="text-[#2383C2]" /> VISUALIZADOR TEMPORAL (NO GUARDADO)
      </h2>

      {hasPermission(PATH_VISTA, "visualizador_temporal", "zona_dropzone") && (
        <div 
          {...getRootProps()} 
          className={`m-4 border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all duration-200 outline-none ${
            isDragActive 
              ? 'border-[#2383C2] bg-blue-50/50 dark:bg-blue-950/20' 
              : 'border-gray-300 dark:border-gray-600 bg-gray-50/30 dark:bg-gray-900/10 hover:bg-gray-50 dark:hover:bg-gray-900/30'
          }`}
        >
          <input {...getInputProps()} />
          <Upload className="mx-auto text-gray-400 dark:text-gray-500 mb-2" size={24} />
          <p className="text-[13px] text-gray-500 dark:text-gray-400">
            Arrastra archivos XML aquí para ver su contenido u <span className="text-[#2383C2] font-semibold underline">explora el equipo</span>
          </p>
        </div>
      )}

      <div className="flex-grow overflow-auto">
        <table className="w-full text-left text-[12px] border-collapse">
          <thead className="bg-gray-100 dark:bg-gray-900 sticky top-0 text-gray-600 dark:text-gray-300 uppercase font-bold text-[11px] z-10">
            <tr>
              <th className="p-3 border-b border-r border-gray-200 dark:border-gray-700">Folio</th>
              <th className="p-3 border-b border-r border-gray-200 dark:border-gray-700">Fch. Emisión</th>
              <th className="p-3 border-b border-r border-gray-200 dark:border-gray-700">Folio Ref</th>
              <th className="p-3 border-b border-gray-200 dark:border-gray-700">Primer Ítem</th>
            </tr>
          </thead>
          <tbody className="text-gray-700 dark:text-gray-300">
            {guias.map((g) => (
              <tr key={g.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 border-b border-gray-200 dark:border-gray-700/80 transition-colors duration-150">
                <td className="p-3 font-bold text-gray-800 dark:text-gray-100 border-r border-gray-200 dark:border-gray-700">{g.folio}</td>
                <td className="p-3 text-gray-600 dark:text-gray-400 border-r border-gray-200 dark:border-gray-700">{g.fchEmis}</td>
                <td className="p-3 text-gray-600 dark:text-gray-400 border-r border-gray-200 dark:border-gray-700">{g.folioRef}</td>
                <td className="p-3 text-gray-600 dark:text-gray-400 italic max-w-xs truncate" title={g.primerItem}>{g.primerItem}</td>
              </tr>
            ))}
            {guias.length === 0 && (
              <tr>
                <td colSpan="4" className="p-10 text-center text-gray-400 dark:text-gray-500 font-medium italic">
                  No hay archivos cargados en el buffer temporal.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {guias.length > 0 && hasPermission(PATH_VISTA, "visualizador_temporal", "btn_limpiar") && (
        <button
          onClick={() => setGuias([])}
          className="m-4 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 py-2 rounded text-[12px] font-bold hover:bg-red-100 dark:hover:bg-red-950/40 border border-red-100 dark:border-red-900/30 transition-colors"
        >
          Limpiar Tabla
        </button>
      )}
    </div>
  );
};

export default VisualizadorTemporal;