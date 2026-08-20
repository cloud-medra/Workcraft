import { useState } from 'react';
import { collection, addDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { db } from '../../../../../../firebaseConfig';

export const useImportExportConCodigo = ({ registros, userData, showToast, colBase }) => {
  const [showConfigDrawer, setShowConfigDrawer] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);

  const handleAbrirConfiguracion = () => {
    setShowConfigDrawer(true);
  };

  const handleExportarDatos = () => {
    if (!registros || registros.length === 0) {
      return showToast("No hay registros para exportar", "warning");
    }

    try {
      const headers = [
        "CODIGO",
        "REFERENCIA",
        "DESCRIPTOR_EMPRESA",
        "EMPRESA",
        "TIPO",
        "SEGMENTO",
        "CLASE",
        "DESCRIPTOR_AUTO",
        "PRECIO_NETO",
        "CX",
        "OBSERVACION",
        "REGISTRADO_POR"
      ];

      const rows = registros.map(item => [
        `"${item.codigo || ''}"`,
        `"${item.referencia || ''}"`,
        `"${item.descriptorEmpresa || ''}"`,
        `"${item.empresa || ''}"`,
        `"${item.tipo || ''}"`,
        `"${item.segmento || ''}"`,
        `"${item.clase || ''}"`,
        `"${item.descriptorAuto || ''}"`,
        item.precioNeto || 0,
        `"${item.cx || ''}"`,
        `"${item.observacion || ''}"`,
        `"${item.registradoPor || ''}"`
      ]);

      const csvContent = "data:text/csv;charset=utf-8," + 
        [headers.join(","), ...rows.map(e => e.join(","))].join("\n");

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `registros_con_codigo_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showToast("Exportación exitosa", "success");
    } catch (error) {
      console.error("Error al exportar:", error);
      showToast("Error al exportar los datos", "error");
    }
  };

  const handleDescargarPlantilla = () => {
    try {
      const headers = [
        "CODIGO",
        "REFERENCIA",
        "DESCRIPTOR_EMPRESA",
        "EMPRESA",
        "TIPO",
        "SEGMENTO",
        "CLASE",
        "DESCRIPTOR_AUTO",
        "PRECIO_NETO",
        "CX",
        "OBSERVACION"
      ];

      const ejemplo = [
        "COD001",
        "REF-EJEMPLO",
        "DESC EMPRESA",
        "EMPRESA EJEMPLO S.A.",
        "COTIZACION",
        "IMPLANTES",
        "IMPLANTE",
        "DESCRIPTOR MANUAL",
        "50000",
        "CX1",
        "NINGUNA"
      ];

      const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ejemplo.join(",")].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "plantilla_registros_con_codigo.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showToast("Plantilla descargada correctamente", "success");
    } catch (error) {
      console.error("Error al descargar plantilla:", error);
      showToast("Error al generar la plantilla", "error");
    }
  };

  const handleEjecutarImportacion = async () => {
    if (!importFile) {
      return showToast("Por favor selecciona un archivo primero", "warning");
    }

    setImporting(true);
    try {
      const text = await importFile.text();
      const lines = text.split("\n").filter(line => line.trim() !== "");
      
      if (lines.length < 2) {
        return showToast("El archivo está vacío o no tiene el formato correcto", "error");
      }

      const headers = lines[0].split(",").map(h => h.trim().replace(/"/g, ''));
      let count = 0;

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",").map(v => v.trim().replace(/^"|"$/g, ''));
        if (values.length < headers.length) continue;

        const rowData = {};
        headers.forEach((header, index) => {
          rowData[header.toLowerCase()] = values[index] || "";
        });

        const codigo = rowData["codigo"] || rowData["cod"];
        const referencia = rowData["referencia"] || rowData["ref"];
        const empresa = rowData["empresa"];

        if (!codigo || !referencia || !empresa) continue;

        const dataAEnviar = {
          codigo: codigo.toUpperCase(),
          referencia: referencia.toUpperCase(),
          descriptorEmpresa: (rowData["descriptor_empresa"] || rowData["descriptorempresa"] || "").toUpperCase(),
          empresa: empresa.toUpperCase(),
          tipo: (rowData["tipo"] || "").toUpperCase(),
          segmento: (rowData["segmento"] || "").toUpperCase(),
          clase: (rowData["clase"] || "").toUpperCase(),
          descriptorAuto: (rowData["descriptor_auto"] || rowData["descriptorauto"] || "").toUpperCase(),
          precioNeto: parseFloat(rowData["precio_neto"] || rowData["precioneto"] || 0) || 0,
          cx: (rowData["cx"] || "").toUpperCase(),
          observacion: (rowData["observacion"] || "").toUpperCase(),
          fechaRegistro: serverTimestamp(),
          registradoPor: userData?.nombreCompleto || 'Usuario Importación'
        };

        const docRef = await addDoc(collection(db, colBase), dataAEnviar);

        // Registrar Log de importación masiva
        await addDoc(collection(db, colBase, docRef.id, "logs"), {
          accion: 'CREACION_MASIVA',
          detalles: { ...dataAEnviar, metodoRegistro: 'IMPORTACION' },
          usuario: userData?.nombreCompleto || 'Usuario Desconocido',
          usuarioEmail: userData?.email || '',
          fecha: new Date(),
          timestamp: serverTimestamp()
        });

        count++;
      }

      showToast(`Se importaron ${count} registros exitosamente`, "success");
      setImportFile(null);
      setShowConfigDrawer(false);
    } catch (error) {
      console.error("Error en importación masiva:", error);
      showToast("Error al procesar el archivo: " + error.message, "error");
    } finally {
      setImporting(false);
    }
  };

  return {
    showConfigDrawer,
    setShowConfigDrawer,
    importFile,
    setImportFile,
    importing,
    handleAbrirConfiguracion,
    handleExportarDatos,
    handleDescargarPlantilla,
    handleEjecutarImportacion
  };
};