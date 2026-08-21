import React, { useState, useEffect } from 'react';
import {
  collection,
  onSnapshot,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  writeBatch,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../../../../firebaseConfig';
import { Package, Settings } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { useToast } from '../../../../context/ToastContext';
import { useModal } from '../../../../context/ModalContext';
import { useUser } from '../../../../context/UserContext';
import { useGranularPermission } from '../../../../hooks/useGranularPermission';
import Spinner from '../../../ui/Spinner';
import { DrawersOverlay, LogDrawer, ConfigDrawer } from './GeneralInventarioDrawers';
import InventarioForm from './InventarioForm';
import InventarioTable from './InventarioTable';
import ExistenciasInventario from '../existenciasInventario/ExistenciasInventario'; // 1. IMPORTACIÓN AQUÍ

const COL_BASE = "inventario_general";
const COL_MAESTRO_CODIGOS = "maestros_codigos";

const GeneralInventario = () => {
  const [cajas, setCajas] = useState([]);
  const [catalogoCodigos, setCatalogoCodigos] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [cargando, setCargando] = useState(false);

  const [filtros, setFiltros] = useState({
    nombreCaja: '',
    ubicacion: '',
    contenido: ''
  });

  const [formDataCaja, setFormDataCaja] = useState({
    nombreCaja: '',
    ubicacion: '',
    descripcion: ''
  });

  const [itemsCaja, setItemsCaja] = useState([
    { codigoId: '', codigo: '', referencia: '', tipo: '', precio: 0, cantidad: 1, lote: '', vencimiento: '' }
  ]);

  const [showLogDrawer, setShowLogDrawer] = useState(false);
  const [selectedCajaForLog, setSelectedCajaForLog] = useState(null);
  const [logsList, setLogsList] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const [showConfigDrawer, setShowConfigDrawer] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);

  const { showToast } = useToast();
  const { confirmAction } = useModal();
  const { userData } = useUser();
  const { hasPermission } = useGranularPermission();

  // Cargar cajas en tiempo real
  useEffect(() => {
    const q = query(collection(db, COL_BASE), orderBy("fechaRegistro", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setCajas(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  // Cargar catálogo de códigos
  useEffect(() => {
    const cargarCatalogo = async () => {
      try {
        const snap = await getDocs(query(collection(db, COL_MAESTRO_CODIGOS), orderBy("fechaRegistro", "desc")));
        setCatalogoCodigos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (error) {
        console.error("Error al cargar el catálogo de códigos:", error);
      }
    };
    cargarCatalogo();
  }, []);

  const formatearFecha = (fecha) => {
    if (!fecha) return 'N/A';
    const date = fecha.toDate ? fecha.toDate() : new Date(fecha);
    return date.toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const registrarLog = async (cajaId, accion, detalles) => {
    try {
      const logsSubcollectionRef = collection(db, COL_BASE, cajaId, "logs");
      await addDoc(logsSubcollectionRef, {
        accion,
        detalles,
        usuario: userData?.nombreCompleto || 'Usuario Desconocido',
        usuarioEmail: userData?.email || '',
        fecha: new Date(),
        timestamp: serverTimestamp()
      });
    } catch (err) {
      console.error("Error al registrar log de auditoría:", err);
    }
  };

  const agregarLineaItem = () => {
    setItemsCaja([...itemsCaja, { codigoId: '', codigo: '', referencia: '', tipo: '', precio: 0, cantidad: 1, lote: '', vencimiento: '' }]);
  };

  const eliminarLineaItem = (index) => {
    if (itemsCaja.length === 1) {
      return showToast("La caja debe tener al menos un ítem registrado", "error");
    }
    setItemsCaja(itemsCaja.filter((_, i) => i !== index));
  };

  const handleItemChange = (index, campo, valor) => {
    const nuevosItems = [...itemsCaja];
    nuevosItems[index][campo] = valor;
    setItemsCaja(nuevosItems);
  };

  const seleccionarCodigoCatalogo = (index, cat) => {
    const nuevosItems = [...itemsCaja];
    nuevosItems[index] = {
      ...nuevosItems[index],
      codigoId: cat.id,
      codigo: cat.codigo || '',
      referencia: cat.referencia || '',
      tipo: cat.descriptorAuto || cat.tipo || '',
      precio: Number(cat.precioNeto) || Number(cat.precio) || 0
    };
    setItemsCaja(nuevosItems);
  };

  const handleGuardarCaja = async (e) => {
    e.preventDefault();
    if (!formDataCaja.nombreCaja.trim()) {
      return showToast("El nombre de la caja es obligatorio", "error");
    }

    for (const item of itemsCaja) {
      if (!item.tipo.trim() || item.cantidad <= 0) {
        return showToast("Todos los ítems deben tener un tipo/descriptor válido y cantidad mayor a cero", "error");
      }
    }

    setCargando(true);
    try {
      const dataAEnviar = {
        ...formDataCaja,
        items: itemsCaja,
        registradoPor: userData?.nombreCompleto || userData?.nombre || 'Usuario',
        fechaRegistro: editingId ? undefined : serverTimestamp(),
        ultimaModificacion: serverTimestamp()
      };

      if (editingId) {
        const cajaExistente = cajas.find(c => c.id === editingId);
        await updateDoc(doc(db, COL_BASE, editingId), dataAEnviar);

        await registrarLog(editingId, 'EDICION', {
          nombreCajaAnterior: cajaExistente?.nombreCaja,
          nombreCajaNuevo: formDataCaja.nombreCaja,
          ubicacionAnterior: cajaExistente?.ubicacion || '',
          ubicacionNuevo: formDataCaja.ubicacion || '',
          cantidadItemsAnterior: cajaExistente?.items?.length || 0,
          cantidadItemsNuevo: itemsCaja.length
        });

        showToast("Caja actualizada correctamente", "success");
      } else {
        const docRef = await addDoc(collection(db, COL_BASE), dataAEnviar);
        await registrarLog(docRef.id, 'CREACION', {
          nombreCaja: formDataCaja.nombreCaja,
          ubicacion: formDataCaja.ubicacion || '',
          cantidadItems: itemsCaja.length
        });
        showToast("Caja registrada correctamente", "success");
      }

      limpiarFormulario();
    } catch (error) {
      showToast("Error al guardar la caja: " + error.message, "error");
    } finally {
      setCargando(false);
    }
  };

  const limpiarFormulario = () => {
    setFormDataCaja({ nombreCaja: '', ubicacion: '', descripcion: '' });
    setItemsCaja([{ codigoId: '', codigo: '', referencia: '', tipo: '', precio: 0, cantidad: 1, lote: '', vencimiento: '' }]);
    setEditingId(null);
  };

  const iniciarEdicion = (caja) => {
    setEditingId(caja.id);
    setFormDataCaja({
      nombreCaja: caja.nombreCaja || '',
      ubicacion: caja.ubicacion || '',
      descripcion: caja.descripcion || ''
    });
    setItemsCaja(
      caja.items && caja.items.length > 0
        ? caja.items
        : [{ codigoId: '', codigo: '', referencia: '', tipo: '', precio: 0, cantidad: 1, lote: '', vencimiento: '' }]
    );
  };

  const handleDelete = (id) => {
    const cajaAEliminar = cajas.find(c => c.id === id);

    confirmAction(
      "Eliminar Caja de Inventario",
      "¿Estás seguro de eliminar esta caja y todo su contenido? Esta acción no se puede deshacer.",
      async () => {
        try {
          await registrarLog(id, 'ELIMINACION', {
            nombreCaja: cajaAEliminar?.nombreCaja || ''
          });
          await deleteDoc(doc(db, COL_BASE, id));
          showToast("Caja eliminada correctamente", "info");
        } catch (error) {
          showToast("Error al eliminar", "error");
        }
      }
    );
  };

  const abrirHistorialLogs = async (caja) => {
    setSelectedCajaForLog(caja);
    setShowLogDrawer(true);
    setLoadingLogs(true);

    try {
      const q = query(collection(db, COL_BASE, caja.id, "logs"), orderBy("fecha", "desc"));
      const snapshot = await getDocs(q);
      setLogsList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error("Error cargando logs:", error);
      showToast("Error al cargar el historial", "error");
    } finally {
      setLoadingLogs(false);
    }
  };

  // ========== IMPORT / EXPORT ==========
  const handleExportarDatos = () => {
    if (cajas.length === 0) return showToast("No hay datos para exportar", "error");

    const dataExportar = [];
    cajas.forEach(c => {
      const items = c.items && c.items.length > 0 ? c.items : [{}];
      items.forEach(item => {
        dataExportar.push({
          CAJA: c.nombreCaja || '',
          UBICACION: c.ubicacion || '',
          DESCRIPCION: c.descripcion || '',
          CODIGO: item.codigo || '',
          REFERENCIA: item.referencia || '',
          TIPO: item.tipo || '',
          PRECIO: item.precio || 0,
          CANTIDAD: item.cantidad || 0,
          LOTE: item.lote || '',
          VENCIMIENTO: item.vencimiento || ''
        });
      });
    });

    const worksheet = XLSX.utils.json_to_sheet(dataExportar);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Inventario");
    XLSX.writeFile(workbook, `inventario_general_${new Date().toISOString().slice(0, 10)}.xlsx`);
    showToast("Archivo exportado correctamente", "success");
  };

  const handleDescargarPlantilla = () => {
    const headers = ["CAJA", "UBICACION", "DESCRIPCION", "CODIGO", "REFERENCIA", "TIPO", "PRECIO", "CANTIDAD", "LOTE", "VENCIMIENTO"];
    const ejemplo = ["Caja Instrumental #1", "Estante A-2", "Instrumental quirúrgico general", "COD001", "REF-100", "Pinza Kelly", "1500", "10", "L-2026", "2027-12-31"];

    const csvContent = "\uFEFF" + [headers.join(";"), ejemplo.join(";")].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "plantilla_importacion_inventario.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast("Plantilla descargada correctamente", "success");
  };

  const parsearCSV = (file) => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: false,
        complete: (results) => resolve(normalizarFilas(results.data)),
        error: (err) => reject(err)
      });
    });
  };

  const parsearExcel = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.SheetNames[0];
          const rawData = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet]);
          resolve(normalizarFilas(rawData));
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = (err) => reject(err);
      reader.readAsArrayBuffer(file);
    });
  };

  const normalizarFilas = (rows) => {
    const mapeadas = [];
    for (const row of rows) {
      const keys = Object.keys(row);
      const getVal = (colName) => {
        const keyMatch = keys.find(k => k.trim().toUpperCase() === colName);
        return keyMatch ? row[keyMatch] : null;
      };

      const nombreCaja = String(getVal('CAJA') || '').trim();
      const tipo = String(getVal('TIPO') || '').trim();
      const cantidad = parseInt(getVal('CANTIDAD')) || 0;

      if (nombreCaja && tipo && cantidad > 0) {
        mapeadas.push({
          nombreCaja,
          ubicacion: String(getVal('UBICACION') || '').trim(),
          descripcion: String(getVal('DESCRIPCION') || '').trim(),
          codigo: String(getVal('CODIGO') || '').trim(),
          referencia: String(getVal('REFERENCIA') || '').trim(),
          tipo,
          precio: Number(getVal('PRECIO')) || 0,
          cantidad,
          lote: String(getVal('LOTE') || '').trim(),
          vencimiento: String(getVal('VENCIMIENTO') || '').trim()
        });
      }
    }
    return mapeadas;
  };

  const agruparFilasEnCajas = (filas) => {
    const mapa = new Map();
    for (const fila of filas) {
      const clave = `${fila.nombreCaja.toLowerCase()}|${fila.ubicacion.toLowerCase()}`;
      if (!mapa.has(clave)) {
        mapa.set(clave, {
          nombreCaja: fila.nombreCaja,
          ubicacion: fila.ubicacion,
          descripcion: fila.descripcion,
          items: []
        });
      }
      mapa.get(clave).items.push({
        codigoId: '',
        codigo: fila.codigo,
        referencia: fila.referencia,
        tipo: fila.tipo,
        precio: fila.precio,
        cantidad: fila.cantidad,
        lote: fila.lote,
        vencimiento: fila.vencimiento
      });
    }
    return Array.from(mapa.values());
  };

  const filtrarDuplicados = (cajasNuevas) => {
    const nombresExistentes = new Set(cajas.map(c => c.nombreCaja.trim().toLowerCase()));
    const nombresVistos = new Set();
    const resultado = [];

    for (const caja of cajasNuevas) {
      const nombreKey = caja.nombreCaja.trim().toLowerCase();
      if (nombresExistentes.has(nombreKey) || nombresVistos.has(nombreKey)) continue;
      nombresVistos.add(nombreKey);
      resultado.push(caja);
    }
    return resultado;
  };

  const guardarRegistrosMasivos = async (cajasNuevas) => {
    const BATCH_SIZE = 200;
    let index = 0;

    while (index < cajasNuevas.length) {
      const chunk = cajasNuevas.slice(index, index + BATCH_SIZE);
      const batch = writeBatch(db);

      for (const caja of chunk) {
        const cajaRef = doc(collection(db, COL_BASE));
        batch.set(cajaRef, {
          nombreCaja: caja.nombreCaja,
          ubicacion: caja.ubicacion,
          descripcion: caja.descripcion,
          items: caja.items,
          registradoPor: userData?.nombreCompleto || 'Importación Masiva',
          fechaRegistro: new Date(),
          ultimaModificacion: new Date()
        });

        const logRef = doc(collection(db, COL_BASE, cajaRef.id, "logs"));
        batch.set(logRef, {
          accion: 'CREACION_MASIVA',
          detalles: {
            nombreCaja: caja.nombreCaja,
            ubicacion: caja.ubicacion,
            cantidadItems: caja.items.length
          },
          usuario: userData?.nombreCompleto || 'Importación Masiva',
          usuarioEmail: userData?.email || '',
          fecha: new Date(),
          timestamp: serverTimestamp()
        });
      }

      await batch.commit();
      index += BATCH_SIZE;
    }
  };

  const handleEjecutarImportacion = async () => {
    if (!importFile) return showToast("Por favor selecciona un archivo para importar", "error");

    setImporting(true);
    const fileName = importFile.name.toLowerCase();

    try {
      let filas = [];
      if (fileName.endsWith('.csv')) {
        filas = await parsearCSV(importFile);
      } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        filas = await parsearExcel(importFile);
      } else {
        throw new Error("Formato de archivo no soportado. Usa .csv o .xlsx");
      }

      if (filas.length === 0) throw new Error("El archivo no contiene registros válidos para importar");

      const cajasAgrupadas = agruparFilasEnCajas(filas);
      const cajasNuevas = filtrarDuplicados(cajasAgrupadas);

      if (cajasNuevas.length === 0) {
        throw new Error("Todas las cajas del archivo ya existen (Nombre duplicado)");
      }

      await guardarRegistrosMasivos(cajasNuevas);

      const omitidas = cajasAgrupadas.length - cajasNuevas.length;
      const mensaje = omitidas > 0
        ? `Se importaron ${cajasNuevas.length} cajas con éxito (${omitidas} omitidas por duplicado)`
        : `Se importaron ${cajasNuevas.length} cajas con éxito`;

      showToast(mensaje, "success");
      setImportFile(null);
      setShowConfigDrawer(false);
    } catch (error) {
      console.error("Error durante la importación:", error);
      showToast("Error al importar: " + error.message, "error");
    } finally {
      setImporting(false);
    }
  };

  // Filtrado
  const cajasFiltradas = cajas.filter(c => {
    const coincideNombre = c.nombreCaja.toLowerCase().includes(filtros.nombreCaja.toLowerCase());
    const coincideUbicacion = (c.ubicacion || '').toLowerCase().includes(filtros.ubicacion.toLowerCase());
    const coincideContenido = !filtros.contenido || c.items?.some(i =>
      i.tipo?.toLowerCase().includes(filtros.contenido.toLowerCase()) ||
      i.codigo?.toLowerCase().includes(filtros.contenido.toLowerCase()) ||
      i.referencia?.toLowerCase().includes(filtros.contenido.toLowerCase())
    );
    return coincideNombre && coincideUbicacion && coincideContenido;
  });

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden p-0 relative text-[11px]">
      {cargando && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-gray-500/20 dark:bg-black/40 backdrop-blur-[2px]">
          <div className="bg-white/90 dark:bg-gray-800/90 p-4 rounded-xl shadow-xl flex flex-col items-center gap-3">
            <Spinner size="md" color="#2383C2" />
            <h3 className="text-[#2383C2] font-bold text-[13px]">Procesando inventario...</h3>
          </div>
        </div>
      )}

      {/* Cabecera */}
      <div className="px-3 py-2 flex items-center justify-between border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/80">
        <h2 className="text-[12px] font-bold text-gray-700 dark:text-gray-100 flex items-center gap-1.5">
          <Package size={14} className="text-[#2383C2]" />
          {editingId ? "EDITAR CAJA / CONTENEDOR" : "INVENTARIO GENERAL POR CAJAS"}
        </h2>
        <button
          onClick={() => setShowConfigDrawer(true)}
          className="p-1 rounded-md text-gray-500 hover:text-[#2383C2] dark:text-gray-400 dark:hover:text-[#2383C2] hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          title="Configuración de Inventario (Importar/Exportar)"
        >
          <Settings size={15} />
        </button>
      </div>

      <InventarioForm
        formDataCaja={formDataCaja}
        setFormDataCaja={setFormDataCaja}
        itemsCaja={itemsCaja}
        catalogoCodigos={catalogoCodigos}
        editingId={editingId}
        onSubmit={handleGuardarCaja}
        onAgregarLinea={agregarLineaItem}
        onEliminarLinea={eliminarLineaItem}
        onItemChange={handleItemChange}
        onSeleccionarCodigo={seleccionarCodigoCatalogo}
        onCancelar={limpiarFormulario}
      />

      {/* 2. TABLA RESUMEN DE EXISTENCIAS CONSOLIDADAS */}
      <div className="px-3">
        <ExistenciasInventario cajas={cajas} />
      </div>

      <InventarioTable
        cajasFiltradas={cajasFiltradas}
        filtros={filtros}
        setFiltros={setFiltros}
        onEditar={iniciarEdicion}
        onEliminar={handleDelete}
        onVerHistorial={abrirHistorialLogs}
      />

      <DrawersOverlay
        show={showLogDrawer || showConfigDrawer}
        onClick={() => {
          setShowLogDrawer(false);
          setShowConfigDrawer(false);
        }}
      />

      <LogDrawer
        show={showLogDrawer}
        onClose={() => setShowLogDrawer(false)}
        selectedCaja={selectedCajaForLog}
        logsList={logsList}
        loadingLogs={loadingLogs}
        formatearFecha={formatearFecha}
      />

      <ConfigDrawer
        show={showConfigDrawer}
        onClose={() => setShowConfigDrawer(false)}
        totalCajas={cajas.length}
        onExportar={handleExportarDatos}
        onDescargarPlantilla={handleDescargarPlantilla}
        importFile={importFile}
        onSelectFile={setImportFile}
        importing={importing}
        onEjecutarImportacion={handleEjecutarImportacion}
      />
    </div>
  );
};

export default GeneralInventario;