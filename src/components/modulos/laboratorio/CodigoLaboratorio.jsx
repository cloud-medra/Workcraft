// src/components/laboratorio/CodigoLaboratorio.jsx
import React, { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy, 
  where, 
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import { 
  Package, 
  Plus, 
  Trash2, 
  Search, 
  Pencil, 
  Save, 
  X, 
  History, 
  Settings, 
  Download, 
  Upload, 
  FileSpreadsheet,
  FileDown
} from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { useToast } from '../../../context/ToastContext';
import { useModal } from '../../../context/ModalContext';
import { useUser } from '../../../context/UserContext';
import { useGranularPermission } from '../../../hooks/useGranularPermission';
import Spinner from '../../ui/Spinner';

const CodigoLaboratorio = () => {
  const [codigos, setCodigos] = useState([]);
  const [formData, setFormData] = useState({ referencia: '', codigo: '', precio: '', descripcion: '' });
  const [busqueda, setBusqueda] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [cargando, setCargando] = useState(false);

  // Estados para el Panel Lateral de Historial / Logs
  const [showLogDrawer, setShowLogDrawer] = useState(false);
  const [selectedCodigoForLog, setSelectedCodigoForLog] = useState(null);
  const [logsList, setLogsList] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Estados para el Panel Lateral de Configuración (Importar / Exportar)
  const [showConfigDrawer, setShowConfigDrawer] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);

  const { showToast } = useToast();
  const { confirmAction } = useModal();
  const { userData } = useUser();
  const { hasPermission } = useGranularPermission();

  const PATH_VISTA = "/laboratorio/codigoLaboratorio";
  const COL_CODIGOS = "laboratorio_codigos";
  const COL_LOGS = "laboratorio_codigos_logs";

  useEffect(() => {
    const q = query(collection(db, COL_CODIGOS), orderBy("referencia", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setCodigos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
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

  // Helper para auditoría de logs
  const registrarLog = async (codigoId, accion, detalles) => {
    try {
      await addDoc(collection(db, COL_LOGS), {
        codigoId,
        accion,
        detalles,
        usuario: userData?.nombreCompleto || 'Usuario Desconocido',
        usuarioEmail: userData?.email || '',
        fecha: new Date()
      });
    } catch (err) {
      console.error("Error al registrar log de auditoría:", err);
    }
  };

  const iniciarEdicion = (item) => {
    setEditingId(item.id);
    setFormData({
      referencia: item.referencia || '',
      codigo: item.codigo || '',
      precio: item.precio || '',
      descripcion: item.descripcion || ''
    });
  };

  const cancelarEdicion = () => {
    setEditingId(null);
    setFormData({ referencia: '', codigo: '', precio: '', descripcion: '' });
  };

  const handleGuardar = async (e) => {
    e.preventDefault();
    if (!formData.referencia || !formData.codigo || !formData.precio) {
      return showToast("Referencia, código y precio son obligatorios", "error");
    }

    setCargando(true);
    const refUpper = formData.referencia.toUpperCase();
    const descUpper = formData.descripcion.toUpperCase();
    const precioNum = Number(formData.precio);

    try {
      if (editingId) {
        const codigoExistente = codigos.find(c => c.id === editingId);

        const dataAEnviar = {
          referencia: refUpper,
          codigo: formData.codigo,
          descripcion: descUpper,
          precio: precioNum
        };

        const cambios = {};
        if (codigoExistente?.referencia !== refUpper) cambios.referencia = refUpper;
        if (codigoExistente?.codigo !== formData.codigo) cambios.codigo = formData.codigo;
        if (Number(codigoExistente?.precio) !== precioNum) cambios.precio = precioNum;
        if ((codigoExistente?.descripcion || '') !== descUpper) cambios.descripcion = descUpper;

        await updateDoc(doc(db, COL_CODIGOS, editingId), dataAEnviar);

        if (Object.keys(cambios).length > 0) {
          await registrarLog(editingId, 'EDICION', cambios);
        }

        showToast("Código actualizado correctamente", "success");
      } else {
        const dataAEnviar = {
          referencia: refUpper,
          codigo: formData.codigo,
          descripcion: descUpper,
          precio: precioNum,
          registradoPor: userData?.nombreCompleto || 'Usuario',
          fechaRegistro: new Date()
        };

        const docRef = await addDoc(collection(db, COL_CODIGOS), dataAEnviar);

        await registrarLog(docRef.id, 'CREACION', {
          referencia: refUpper,
          codigo: formData.codigo,
          precio: precioNum,
          descripcion: descUpper
        });

        showToast("Código registrado correctamente", "success");
      }
      cancelarEdicion();
    } catch (error) {
      showToast("Error al guardar: " + error.message, "error");
    } finally {
      setCargando(false);
    }
  };

  const handleDelete = (id) => {
    const codigoAEliminar = codigos.find(c => c.id === id);

    confirmAction(
      "Eliminar Código",
      "¿Estás seguro de eliminar este registro? Esta acción no se puede deshacer.",
      async () => {
        try {
          await deleteDoc(doc(db, COL_CODIGOS, id));

          await registrarLog(id, 'ELIMINACION', {
            referencia: codigoAEliminar?.referencia || '',
            codigo: codigoAEliminar?.codigo || '',
            precio: codigoAEliminar?.precio || 0
          });

          showToast("Código eliminado correctamente", "info");
        } catch (error) {
          showToast("Error al eliminar", "error");
        }
      }
    );
  };

  const abrirHistorialLogs = async (item) => {
    setSelectedCodigoForLog(item);
    setShowLogDrawer(true);
    setLoadingLogs(true);

    try {
      const q = query(
        collection(db, COL_LOGS),
        where("codigoId", "==", item.id),
        orderBy("fecha", "desc")
      );
      const snapshot = await getDocs(q);
      const logsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLogsList(logsData);
    } catch (error) {
      console.error("Error cargando logs:", error);
      showToast("Error al cargar el historial", "error");
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleAbrirConfiguracion = () => {
    setShowConfigDrawer(true);
  };

  // Exportar datos a CSV
  const handleExportarDatos = () => {
    if (codigos.length === 0) {
      return showToast("No hay datos para exportar", "error");
    }
    
    const dataExportar = codigos.map(c => ({
      REFERENCIA: c.referencia || '',
      CODIGO: c.codigo || '',
      PRECIO: c.precio || 0,
      DESCRIPCION: c.descripcion || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataExportar);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Codigos");
    XLSX.writeFile(workbook, `codigos_laboratorio_${new Date().toISOString().slice(0,10)}.xlsx`);

    showToast("Archivo exportado correctamente", "success");
  };

  // Descarga de Plantilla CSV
  const handleDescargarPlantilla = () => {
    const headers = ["REFERENCIA", "CODIGO", "PRECIO", "DESCRIPCION"];
    const ejemplo = ["REF001", "LAB-101", "15000", "DESCRIPCION DE EJEMPLO"];
    
    const csvContent = "\uFEFF" + [headers.join(";"), ejemplo.join(";")].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "plantilla_importacion_codigos.csv");
    document.body.appendChild(link);
    link.click();
    
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast("Plantilla descargada correctamente", "success");
  };

  // Lógica principal de importación masiva (CSV y XLSX)
  const handleEjecutarImportacion = async () => {
    if (!importFile) {
      return showToast("Por favor selecciona un archivo para importar", "error");
    }

    setImporting(true);
    const fileName = importFile.name.toLowerCase();

    try {
      let registros = [];

      if (fileName.endsWith('.csv')) {
        registros = await parsearCSV(importFile);
      } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        registros = await parsearExcel(importFile);
      } else {
        throw new Error("Formato de archivo no soportado. Usa .csv o .xlsx");
      }

      if (registros.length === 0) {
        throw new Error("El archivo no contiene registros válidos para importar");
      }

      await guardarRegistrosMasivos(registros);

      showToast(`Se importaron ${registros.length} registros con éxito`, "success");
      setImportFile(null);
      setShowConfigDrawer(false);
    } catch (error) {
      console.error("Error durante la importación:", error);
      showToast("Error al importar: " + error.message, "error");
    } finally {
      setImporting(false);
    }
  };

  // Parser para archivos CSV
  const parsearCSV = (file) => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: false,
        complete: (results) => {
          const procesados = normalizarYValidarDatos(results.data);
          resolve(procesados);
        },
        error: (err) => reject(err)
      });
    });
  };

  // Parser para archivos Excel (.xlsx / .xls)
  const parsearExcel = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.SheetNames[0];
          const rawData = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet]);
          const procesados = normalizarYValidarDatos(rawData);
          resolve(procesados);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = (err) => reject(err);
      reader.readAsArrayBuffer(file);
    });
  };

  // Normalización y limpieza de filas importadas
  const normalizarYValidarDatos = (rows) => {
    const mapeados = [];

    for (const row of rows) {
      // Normalizar nombres de columnas a mayúsculas omitiendo espacios
      const keys = Object.keys(row);
      const getVal = (colName) => {
        const keyMatch = keys.find(k => k.trim().toUpperCase() === colName);
        return keyMatch ? row[keyMatch] : null;
      };

      const referencia = String(getVal('REFERENCIA') || '').trim().toUpperCase();
      const codigo = String(getVal('CODIGO') || '').trim();
      const rawPrecio = getVal('PRECIO');
      const descripcion = String(getVal('DESCRIPCION') || '').trim().toUpperCase();

      const precio = Number(String(rawPrecio || '0').replace(/[^0-9.]/g, ''));

      if (referencia && codigo && !isNaN(precio) && precio >= 0) {
        mapeados.push({
          referencia,
          codigo,
          precio,
          descripcion
        });
      }
    }

    return mapeados;
  };

  // Escritura masiva en Firestore por Lotes (Batch Write - máximo 500 por lote)
  const guardarRegistrosMasivos = async (registros) => {
    const BATCH_SIZE = 250; // Guardamos docs + logs (2 operaciones por item)
    let index = 0;

    while (index < registros.length) {
      const chunk = registros.slice(index, index + BATCH_SIZE);
      const batch = writeBatch(db);

      for (const item of chunk) {
        const codigoRef = doc(collection(db, COL_CODIGOS));
        batch.set(codigoRef, {
          referencia: item.referencia,
          codigo: item.codigo,
          precio: item.precio,
          descripcion: item.descripcion,
          registradoPor: userData?.nombreCompleto || 'Importación Masiva',
          fechaRegistro: new Date()
        });

        const logRef = doc(collection(db, COL_LOGS));
        batch.set(logRef, {
          codigoId: codigoRef.id,
          accion: 'CREACION_MASIVA',
          detalles: {
            referencia: item.referencia,
            codigo: item.codigo,
            precio: item.precio,
            descripcion: item.descripcion
          },
          usuario: userData?.nombreCompleto || 'Importación Masiva',
          usuarioEmail: userData?.email || '',
          fecha: new Date()
        });
      }

      await batch.commit();
      index += BATCH_SIZE;
    }
  };

  const codigosFiltrados = codigos.filter(c =>
    c.referencia?.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.codigo?.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.descripcion?.toLowerCase().includes(busqueda.toLowerCase())
  );

  const inputClass = "w-full h-7 px-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 rounded text-[11px] outline-none focus:border-[#2383C2]";
  const labelClass = "block text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-0.5";

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden p-0 relative text-[11px]">
      {cargando && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-gray-500/20 dark:bg-black/40 backdrop-blur-[2px]">
          <div className="bg-white/90 dark:bg-gray-800/90 p-4 rounded-xl shadow-xl flex flex-col items-center gap-3">
            <Spinner size="md" color="#2383C2" />
            <h3 className="text-[#2383C2] font-bold text-[13px]">Procesando...</h3>
          </div>
        </div>
      )}

      {/* ENCABEZADO PRINCIPAL CON ICONO DE CONFIGURACIÓN A LA DERECHA */}
      <div className="px-3 py-2 flex items-center justify-between border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/80">
        <h2 className="text-[12px] font-bold text-gray-700 dark:text-gray-100 flex items-center gap-1.5">
          <Package size={14} className="text-[#2383C2]" /> 
          {editingId ? "EDITAR CÓDIGO" : "GESTIÓN DE CÓDIGOS"}
        </h2>

        {hasPermission(PATH_VISTA, "header", "btn_configuracion") && (
          <button
            onClick={handleAbrirConfiguracion}
            className="p-1 rounded-md text-gray-500 hover:text-[#2383C2] dark:text-gray-400 dark:hover:text-[#2383C2] hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            title="Configuración de Códigos (Importar/Exportar)"
          >
            <Settings size={15} />
          </button>
        )}
      </div>

      {/* FORMULARIO */}
      {hasPermission(PATH_VISTA, "formulario", "ver_seccion") && (
        <form onSubmit={handleGuardar} className="px-3 py-2 flex flex-wrap items-end gap-2.5 border-b border-gray-200 dark:border-gray-700 bg-gray-50/30 dark:bg-gray-800/20">
          {hasPermission(PATH_VISTA, "formulario", "input_referencia") && (
            <div className="w-[120px]">
              <label className={labelClass}>Referencia</label>
              <input required value={formData.referencia} onChange={e => setFormData({ ...formData, referencia: e.target.value.toUpperCase() })} className={`${inputClass} uppercase`} />
            </div>
          )}
          {hasPermission(PATH_VISTA, "formulario", "input_codigo") && (
            <div className="w-[120px]">
              <label className={labelClass}>Código</label>
              <input required value={formData.codigo} onChange={e => setFormData({ ...formData, codigo: e.target.value })} className={inputClass} />
            </div>
          )}
          {hasPermission(PATH_VISTA, "formulario", "input_precio") && (
            <div className="w-[110px]">
              <label className={labelClass}>Precio</label>
              <input type="number" required value={formData.precio} onChange={e => setFormData({ ...formData, precio: e.target.value })} className={inputClass} />
            </div>
          )}
          {hasPermission(PATH_VISTA, "formulario", "input_descripcion") && (
            <div className="flex-1 min-w-[160px]">
              <label className={labelClass}>Descripción</label>
              <input value={formData.descripcion} onChange={e => setFormData({ ...formData, descripcion: e.target.value.toUpperCase() })} className={`${inputClass} uppercase`} />
            </div>
          )}
          {hasPermission(PATH_VISTA, "formulario", "btn_registrar") && (
            <button type="submit" className={`h-7 px-3 rounded font-bold text-[11px] flex items-center gap-1.5 whitespace-nowrap shrink-0 ${editingId ? 'bg-amber-600 hover:bg-amber-700' : 'bg-[#2383C2] hover:bg-[#369BCE]'} text-white transition`}>
              {editingId ? <><Save size={13} /> Actualizar</> : <><Plus size={13} /> Registrar</>}
            </button>
          )}
          {editingId && hasPermission(PATH_VISTA, "formulario", "btn_cancelar") && (
            <button type="button" onClick={cancelarEdicion} className="h-7 px-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded font-bold text-[11px] text-gray-600 dark:text-gray-300 flex items-center gap-1.5 transition">
              <X size={13} /> Cancelar
            </button>
          )}
        </form>
      )}

      {/* BÚSQUEDA */}
      {hasPermission(PATH_VISTA, "busqueda", "barra_busqueda") && (
        <div className="bg-gray-50 dark:bg-gray-800/50 px-3 py-1.5 flex justify-between items-center border-b border-gray-200 dark:border-gray-700">
          {hasPermission(PATH_VISTA, "busqueda", "input_busqueda") && (
            <div className="relative w-60">
              <Search className="absolute left-2 top-1.5 text-gray-400 dark:text-gray-500" size={13} />
              <input
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                className={`${inputClass} pl-7`}
                placeholder="Buscar código o referencia..."
              />
            </div>
          )}
        </div>
      )}

      {/* TABLA PRINCIPAL */}
      {hasPermission(PATH_VISTA, "tabla", "ver_tabla") && (
        <div className="flex-grow overflow-auto">
          <table className="w-full text-left text-[11px] border-collapse table-fixed">
            <thead className="bg-gray-100 dark:bg-gray-900 sticky top-0 z-10 text-gray-600 dark:text-gray-400 uppercase font-bold text-[10px]">
              <tr>
                {hasPermission(PATH_VISTA, "tabla", "col_referencia") && <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700 w-[18%]">Referencia</th>}
                {hasPermission(PATH_VISTA, "tabla", "col_codigo") && <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700 w-[15%]">Código</th>}
                {hasPermission(PATH_VISTA, "tabla", "col_descripcion") && <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700 w-[42%]">Descripción</th>}
                {hasPermission(PATH_VISTA, "tabla", "col_precio") && <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700 w-[15%] text-right">Precio</th>}
                {hasPermission(PATH_VISTA, "tabla", "col_acciones") && <th className="py-1.5 px-2 border-b border-gray-200 dark:border-gray-700 w-[100px] text-center">Acciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {codigosFiltrados.map((c) => (
                <tr key={c.id} className="border-l-2 border-transparent hover:border-[#2383C2] hover:bg-gray-50/80 dark:hover:bg-gray-700/40 transition-colors">
                  {hasPermission(PATH_VISTA, "tabla", "col_referencia") && <td className="py-1 px-2 border-b border-r border-gray-200 dark:border-gray-700/70 font-bold text-gray-700 dark:text-gray-200 truncate">{c.referencia}</td>}
                  {hasPermission(PATH_VISTA, "tabla", "col_codigo") && <td className="py-1 px-2 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-600 dark:text-gray-400 truncate">{c.codigo}</td>}
                  {hasPermission(PATH_VISTA, "tabla", "col_descripcion") && <td className="py-1 px-2 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-600 dark:text-gray-300 truncate">{c.descripcion}</td>}
                  {hasPermission(PATH_VISTA, "tabla", "col_precio") && <td className="py-1 px-2 border-b border-r border-gray-200 dark:border-gray-700/70 font-bold text-[#2383C2] text-right whitespace-nowrap">$ {Number(c.precio).toLocaleString('es-CL')}</td>}
                  {hasPermission(PATH_VISTA, "tabla", "col_acciones") && (
                    <td className="py-1 px-2 border-b border-gray-200 dark:border-gray-700 text-center">
                      <div className="flex justify-center gap-2">
                        {hasPermission(PATH_VISTA, "tabla", "btn_log") && (
                          <button onClick={() => abrirHistorialLogs(c)} title="Ver Historial / Logs" className="text-gray-500 hover:text-[#2383C2] dark:hover:text-[#2383C2] transition">
                            <History size={13} />
                          </button>
                        )}
                        {hasPermission(PATH_VISTA, "tabla", "btn_editar") && (
                          <button onClick={() => iniciarEdicion(c)} title="Editar" className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition">
                            <Pencil size={13} />
                          </button>
                        )}
                        {hasPermission(PATH_VISTA, "tabla", "btn_eliminar") && (
                          <button onClick={() => handleDelete(c.id)} title="Eliminar" className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition">
                            <Trash2 size={13} />
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

      {/* BACKDROP GENERAL PARA PANELES LATERALES */}
      {(showLogDrawer || showConfigDrawer) && (
        <div 
          onClick={() => {
            setShowLogDrawer(false);
            setShowConfigDrawer(false);
          }} 
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px] transition-opacity duration-300" 
        />
      )}

      {/* DRAWER 1: PANEL LATERAL DE HISTORIAL / LOGS */}
      <div className={`fixed top-0 right-0 z-50 h-full w-full max-w-sm bg-white dark:bg-gray-800 shadow-2xl border-l border-gray-200 dark:border-gray-700 flex flex-col transform transition-transform duration-300 ease-in-out ${
        showLogDrawer ? 'translate-x-0' : 'translate-x-full'
      }`}>
        <div className="px-3 py-2.5 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900 shrink-0">
          <div className="flex items-center gap-2 truncate">
            <History size={15} className="text-[#2383C2] shrink-0" />
            <div className="truncate">
              <h3 className="text-[12px] font-bold text-gray-800 dark:text-gray-100 truncate">
                Historial de Cambios
              </h3>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                Ref: <span className="font-semibold text-gray-700 dark:text-gray-300">{selectedCodigoForLog?.referencia}</span> ({selectedCodigoForLog?.codigo})
              </p>
            </div>
          </div>
          <button 
            onClick={() => setShowLogDrawer(false)} 
            className="p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
          >
            <X size={15} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          {loadingLogs ? (
            <div className="flex flex-col items-center justify-center h-48 gap-2">
              <Spinner size="sm" color="#2383C2" />
              <p className="text-[10px] text-gray-500 dark:text-gray-400">Cargando historial...</p>
            </div>
          ) : logsList.length === 0 ? (
            <div className="text-center py-12 text-gray-400 dark:text-gray-500 text-[10px]">
              No hay registros de auditoría para este código.
            </div>
          ) : (
            logsList.map((log) => (
              <div key={log.id} className="p-2.5 border border-gray-200 dark:border-gray-700/80 rounded-md bg-gray-50/60 dark:bg-gray-900/40 text-[10px] space-y-1.5 shadow-sm">
                <div className="flex justify-between items-center">
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                    log.accion === 'CREACION' || log.accion === 'CREACION_MASIVA' ? 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400' :
                    log.accion === 'EDICION' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400' :
                    'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400'
                  }`}>
                    {log.accion}
                  </span>
                  <span className="text-gray-400 text-[9px]">{formatearFecha(log.fecha)}</span>
                </div>

                <p className="text-gray-700 dark:text-gray-300 font-medium">
                  Usuario: <span className="font-normal text-gray-600 dark:text-gray-400">{log.usuario}</span>
                </p>

                <div className="text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 p-2 rounded border border-gray-100 dark:border-gray-700/60 text-[10px]">
                  {(log.accion === 'CREACION' || log.accion === 'CREACION_MASIVA') && (
                    <div className="space-y-0.5">
                      <p><strong>Referencia:</strong> {log.detalles?.referencia}</p>
                      <p><strong>Código:</strong> {log.detalles?.codigo}</p>
                      <p><strong>Precio:</strong> $ {Number(log.detalles?.precio || 0).toLocaleString('es-CL')}</p>
                      <p><strong>Descripción:</strong> {log.detalles?.descripcion || 'N/A'}</p>
                    </div>
                  )}

                  {log.accion === 'EDICION' && (
                    <ul className="space-y-0.5">
                      {log.detalles?.referencia !== undefined && <li><strong>Referencia:</strong> {log.detalles.referencia}</li>}
                      {log.detalles?.codigo !== undefined && <li><strong>Código:</strong> {log.detalles.codigo}</li>}
                      {log.detalles?.precio !== undefined && <li><strong>Precio:</strong> $ {Number(log.detalles.precio).toLocaleString('es-CL')}</li>}
                      {log.detalles?.descripcion !== undefined && <li><strong>Descripción:</strong> {log.detalles.descripcion || 'Vacío'}</li>}
                    </ul>
                  )}

                  {log.accion === 'ELIMINACION' && (
                    <p className="text-red-500 font-medium">Registro eliminado ({log.detalles?.referencia} - {log.detalles?.codigo})</p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="px-3 py-2 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900 shrink-0 text-[10px] text-gray-500">
          <span>{logsList.length} registros</span>
          <button 
            onClick={() => setShowLogDrawer(false)} 
            className="px-3 py-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded font-bold transition"
          >
            Cerrar
          </button>
        </div>
      </div>

      {/* DRAWER 2: PANEL LATERAL DE CONFIGURACIÓN (IMPORTAR / EXPORTAR) */}
      <div className={`fixed top-0 right-0 z-50 h-full w-full max-w-sm bg-white dark:bg-gray-800 shadow-2xl border-l border-gray-200 dark:border-gray-700 flex flex-col transform transition-transform duration-300 ease-in-out ${
        showConfigDrawer ? 'translate-x-0' : 'translate-x-full'
      }`}>
        
        {/* Encabezado Panel Configuración */}
        <div className="px-3 py-2.5 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900 shrink-0">
          <div className="flex items-center gap-2">
            <Settings size={16} className="text-[#2383C2]" />
            <div>
              <h3 className="text-[12px] font-bold text-gray-800 dark:text-gray-100">
                Configuración de Códigos
              </h3>
              <p className="text-[10px] text-gray-500 dark:text-gray-400">
                Herramientas de importación y exportación
              </p>
            </div>
          </div>
          <button 
            onClick={() => setShowConfigDrawer(false)} 
            className="p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
          >
            <X size={15} />
          </button>
        </div>

        {/* Contenido / Secciones del Panel */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          
          {/* SECCIÓN EXPORTAR */}
          <div className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50/50 dark:bg-gray-900/30 space-y-2">
            <div className="flex items-center gap-2 text-gray-800 dark:text-gray-200 font-bold text-[11px]">
              <Download size={14} className="text-emerald-600 dark:text-emerald-400" />
              <span>Exportar Códigos</span>
            </div>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-relaxed">
              Descarga la lista actual de códigos registrados ({codigos.length} registros) en un archivo compatible con Excel (CSV/XLSX).
            </p>
            <button
              onClick={handleExportarDatos}
              className="w-full h-8 mt-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded text-[11px] flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer"
            >
              <FileSpreadsheet size={14} />
              <span>Exportar a Excel / CSV</span>
            </button>
          </div>

          {/* SECCIÓN IMPORTAR */}
          <div className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50/50 dark:bg-gray-900/30 space-y-2.5">
            <div className="flex items-center gap-2 text-gray-800 dark:text-gray-200 font-bold text-[11px]">
              <Upload size={14} className="text-[#2383C2]" />
              <span>Importación Masiva</span>
            </div>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-relaxed">
              Carga masivamente nuevos códigos seleccionando un archivo formateado en Excel o CSV.
            </p>

            {/* BOTÓN PARA DESCARGAR PLANTILLA */}
            <button
              onClick={handleDescargarPlantilla}
              type="button"
              className="w-full h-7 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-semibold rounded text-[10px] flex items-center justify-center gap-1.5 border border-gray-300 dark:border-gray-600 transition cursor-pointer"
            >
              <FileDown size={13} className="text-[#2383C2]" />
              <span>Descargar Plantilla CSV</span>
            </button>

            {/* Input de archivo */}
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-3 text-center bg-white dark:bg-gray-900 hover:border-[#2383C2] transition-colors cursor-pointer relative">
              <input 
                type="file" 
                accept=".csv, .xlsx, .xls"
                onChange={(e) => setImportFile(e.target.files[0] || null)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <FileSpreadsheet size={22} className="mx-auto text-gray-400 dark:text-gray-500 mb-1" />
              <span className="block text-[10px] font-semibold text-gray-600 dark:text-gray-300 truncate">
                {importFile ? importFile.name : "Haz clic para seleccionar archivo (.xlsx, .csv)"}
              </span>
            </div>

            {/* Estructura requerida */}
            <div className="p-2 bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 rounded text-[9px] text-blue-800 dark:text-blue-300">
              <strong>Formato de columnas requerido:</strong>
              <div className="font-mono mt-0.5 text-blue-600 dark:text-blue-400">
                REFERENCIA | CODIGO | PRECIO | DESCRIPCION
              </div>
            </div>

            {/* Botón Acción Importar */}
            <button
              onClick={handleEjecutarImportacion}
              disabled={!importFile || importing}
              className={`w-full h-8 font-bold rounded text-[11px] flex items-center justify-center gap-1.5 transition ${
                !importFile || importing 
                  ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed' 
                  : 'bg-[#2383C2] hover:bg-[#1d6fa5] text-white shadow-xs cursor-pointer'
              }`}
            >
              {importing ? <Spinner size="sm" color="#ffffff" /> : <Upload size={14} />}
              <span>{importing ? "Procesando..." : "Cargar Registro"}</span>
            </button>
          </div>

        </div>

        {/* Pie del Panel */}
        <div className="px-3 py-2 border-t border-gray-200 dark:border-gray-700 flex justify-end bg-gray-50 dark:bg-gray-900 shrink-0">
          <button 
            onClick={() => setShowConfigDrawer(false)} 
            className="px-3 py-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded font-bold transition text-[10px]"
          >
            Cerrar
          </button>
        </div>

      </div>

    </div>
  );
};

export default CodigoLaboratorio;