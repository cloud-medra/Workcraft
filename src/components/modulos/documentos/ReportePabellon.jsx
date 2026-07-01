import React, { useState, useEffect, useCallback } from 'react';
import {
  collection,
  doc,
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import { db } from '../../../firebaseConfig';
import { FileSpreadsheet, Search, Upload, X } from 'lucide-react';
import { useToast } from '../../../context/ToastContext';
import { useGranularPermission } from '../../../hooks/useGranularPermission';
import Spinner from '../../ui/Spinner';

const ReportePabellon = () => {
  const [filasPlanas, setFilasPlanas] = useState([]);
  const [aniosDisponibles, setAniosDisponibles] = useState([]);
  const [mesesDisponibles, setMesesDisponibles] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [filtroAnio, setFiltroAnio] = useState("");
  const [filtroMes, setFiltroMes] = useState("");
  const [cargando, setCargando] = useState(false);
  const [progresoTexto, setProgresoTexto] = useState("Procesando...");

  const { showToast } = useToast();
  const { hasPermission } = useGranularPermission();

  const PATH_VISTA = "/documentos/reportePabellon";
  const COL_BASE = "documentos_reporte_pabellon";

  const getMesNombre = (index) => ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"][index];

  // 1. Cargar años disponibles
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

  // 2. Cargar meses según año
  useEffect(() => {
    if (!filtroAnio) { setMesesDisponibles([]); return; }
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

  // 3. Cargar listado plano directo (Sin subcolecciones, lectura directa y veloz)
  useEffect(() => {
    if (!filtroAnio || !filtroMes) {
      setFilasPlanas([]);
      return;
    }

    const cargarDatosPlanos = async () => {
      setCargando(true);
      setProgresoTexto("Cargando registros detallados...");
      try {
        // Ahora los registros están todos juntos a nivel de "registros_planos"
        const pathRegistros = `${COL_BASE}/${filtroAnio}/meses/${filtroMes}/registros_planos`;
        const snap = await getDocs(collection(db, pathRegistros));
        
        const lista = snap.docs.map(d => ({
          idUnico: d.id,
          ...d.data()
        }));
        
        setFilasPlanas(lista);
      } catch (err) {
        console.error("ERROR AL CARGAR FILAS PLANAS:", err);
        showToast("Error al cargar el listado de pabellón", "error");
      } finally {
        setCargando(false);
      }
    };

    cargarDatosPlanos();
  }, [filtroAnio, filtroMes, showToast]);

  // 4. NUEVA LÓGICA DE IMPORTACIÓN COMPLETAMENTE PLANA (Guarda todas las columnas por fila)
  const onDrop = useCallback(async (acceptedFiles) => {
    setCargando(true);
    setProgresoTexto("Leyendo archivo...");
    try {
      let ultAnioProcesado = "";
      let ultMesProcesado = "";
      let totalNuevosAgregados = 0;

      for (const file of acceptedFiles) {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

        setProgresoTexto("Estructurando filas del archivo...");
        
        // Agrupamos en memoria temporalmente solo para saber a qué Año/Mes enviar los batches corporativos
        const lotesPorMes = {};

        jsonData.forEach((row) => {
          const admision = String(row["Admisión"] || "").trim();
          const codArticulo = String(row["Cod.Artículo"] || "").trim();
          let rawFecha = row["Fecha"];

          if (!admision || admision === "undefined" || !codArticulo || !rawFecha) return;

          // Sanitizar Fecha
          let fechaString = "";
          if (rawFecha instanceof Date) {
            const yyyy = rawFecha.getFullYear();
            const mm = String(rawFecha.getMonth() + 1).padStart(2, '0');
            const dd = String(rawFecha.getDate()).padStart(2, '0');
            fechaString = `${yyyy}-${mm}-${dd}`;
          } else {
            fechaString = String(rawFecha).trim();
          }

          const partesFecha = fechaString.split('-');
          if (partesFecha.length < 2) return;

          const y = partesFecha[0];
          const mesIndex = parseInt(partesFecha[1], 10) - 1;
          if (isNaN(mesIndex) || mesIndex < 0 || mesIndex > 11) return;
          const nombreMes = getMesNombre(mesIndex);

          const llaveBloque = `${y}_${nombreMes}`;
          if (!lotesPorMes[llaveBloque]) {
            lotesPorMes[llaveBloque] = { anio: y, mes: nombreMes, filas: [] };
          }

          // ID único compuesto para evitar duplicar la misma fila si se vuelve a subir
          const idDocUnico = `${admision}_${codArticulo}`;

          lotesPorMes[llaveBloque].filas.push({
            idDocUnico,
            datos: {
              "Admisión": admision,
              "Fecha": fechaString,
              "Edad": row["Edad"] || "",
              "1° Cirujano": row["1° Cirujano"] || "",
              "Previsión": row["Previsión"] || "",
              "Isapre": row["Isapre"] || "",
              "Convenio": row["Convenio"] || "",
              "Cod.Artículo": codArticulo,
              "Descripción": row["Descripción"] || "",
              "Cant.Art.": row["Cant.Art."] || 1,
              "Arancel": row["Arancel"] || "",
              "Cód.Arancel": row["Cód.Arancel"] || "",
              "Día": row["Día"] || "",
              "Mes": row["Mes"] || "",
              "fechaImportacion": new Date()
            }
          });
        });

        // Guardar en Firestore usando batches por cada Año/Mes detectado
        for (const llave in lotesPorMes) {
          const { anio, mes, filas } = lotesPorMes[llave];
          setProgresoTexto(`Guardando filas detalladas en ${mes} ${anio}...`);

          // Marcamos carpetas estructurales como activas
          const batchEstructura = writeBatch(db);
          batchEstructura.set(doc(db, COL_BASE, anio), { active: "true" }, { merge: true });
          batchEstructura.set(doc(db, COL_BASE, anio, "meses", mes), { active: "true" }, { merge: true });
          await batchEstructura.commit();

          // Guardar filas de 500 en 500 (límite de Firestore Batches)
          let batch = writeBatch(db);
          let count = 0;

          for (const fila of filas) {
            const docRef = doc(db, COL_BASE, anio, "meses", mes, "registros_planos", fila.idDocUnico);
            
            // Usamos set con merge: true para que si ya existe, se actualice con los campos completos actuales
            batch.set(docRef, fila.datos, { merge: true });
            count++;
            totalNuevosAgregados++;

            if (count === 490) {
              await batch.commit();
              batch = writeBatch(db);
              count = 0;
            }
          }

          if (count > 0) {
            await batch.commit();
          }

          ultAnioProcesado = anio;
          ultMesProcesado = mes;
        }
      }

      if (ultAnioProcesado) setFiltroAnio(ultAnioProcesado);
      if (ultMesProcesado) setFiltroMes(ultMesProcesado);

      if (totalNuevosAgregados > 0) {
        showToast(`Importación exitosa. Se procesaron ${totalNuevosAgregados} filas con todos sus campos de manera plana.`, "success");
      } else {
        showToast("No se encontraron filas válidas para procesar.", "info");
      }
      
      setShowModal(false);
    } catch (e) {
      console.error(e);
      showToast("Error al importar los datos planos: " + e.message, "error");
    } finally {
      setCargando(false);
    }
  }, [showToast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop, 
    accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'], 'text/csv': ['.csv'] } 
  });

  // Filtrado multizona inteligente en memoria
  const filasFiltradas = filasPlanas.filter(o =>
    o["Admisión"]?.includes(busqueda) ||
    o["1° Cirujano"]?.toLowerCase().includes(busqueda.toLowerCase()) ||
    o["Cod.Artículo"]?.includes(busqueda) ||
    o["Descripción"]?.toLowerCase().includes(busqueda.toLowerCase()) ||
    o["Arancel"]?.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden p-0 relative">
      {cargando && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-gray-500/20 dark:bg-black/40 backdrop-blur-[2px]">
          <div className="bg-white/90 dark:bg-gray-800/90 p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-5 max-w-xs text-center">
            <Spinner size="md" color="#2383C2" />
            <h3 className="text-[#2383C2] font-bold text-[15px]">{progresoTexto}</h3>
          </div>
        </div>
      )}

      {/* CABECERA */}
      <h2 className="text-[14px] font-bold text-gray-700 dark:text-gray-100 p-4 flex items-center gap-4 border-b border-gray-200 dark:border-gray-700">
        <FileSpreadsheet size={16} className="text-[#2383C2]" />
        REPORTE DETALLADO DE PABELLÓN (VISTA PLANA COMPLETA)
        {hasPermission(PATH_VISTA, "cabecera_acciones", "btn_importar") && (
          <button onClick={() => setShowModal(true)} className="ml-auto bg-[#2383C2] hover:bg-[#369BCE] text-white px-3 py-1 rounded text-[11px] font-bold flex items-center gap-1 transition">
            <Upload size={12} /> Cargar / Actualizar Excel
          </button>
        )}
      </h2>

      {/* FILTROS */}
      <div className="bg-gray-50 dark:bg-gray-800/50 p-3 flex flex-wrap gap-2 items-center border-b border-gray-200 dark:border-gray-700">
        <select value={filtroAnio} onChange={(e) => setFiltroAnio(e.target.value)} className="h-8 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 rounded text-[12px] px-2 outline-none">
          <option value="">Año</option>
          {aniosDisponibles.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={filtroMes} onChange={(e) => setFiltroMes(e.target.value)} className="h-8 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 rounded text-[12px] px-2 outline-none capitalize">
          <option value="">Mes</option>
          {mesesDisponibles.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <div className="relative flex-grow max-w-sm">
          <Search className="absolute left-2 top-2 text-gray-400 dark:text-gray-500" size={14} />
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)} className="w-full h-8 pl-8 pr-2 border border-gray-300 dark:border-gray-600 rounded text-[12px] outline-none bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 focus:border-[#2383C2]" placeholder="Buscar por Admisión, Cirujano, Artículo, Arancel..." />
        </div>
        <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 ml-auto">
          Total registros: {filasFiltradas.length}
        </span>
      </div>

      {/* TABLA GLOBAL - MUESTRA TODOS LOS CAMPOS DIRECTAMENTE */}
      <div className="flex-grow overflow-auto h-[550px]">
        <table className="w-full text-left text-[12px] border-collapse table-fixed">
          <thead className="bg-gray-100 dark:bg-gray-900 sticky top-0 z-10">
            <tr className="text-gray-600 dark:text-gray-400 uppercase font-bold text-[11px]">
              <th className="p-3 border-b border-r border-gray-200 dark:border-gray-700 w-[95px]">Admisión</th>
              <th className="p-3 border-b border-r border-gray-200 dark:border-gray-700 w-[95px]">Fecha</th>
              <th className="p-3 border-b border-r border-gray-200 dark:border-gray-700 w-[55px] text-center">Edad</th>
              <th className="p-3 border-b border-r border-gray-200 dark:border-gray-700 w-[160px]">1° Cirujano</th>
              <th className="p-3 border-b border-r border-gray-200 dark:border-gray-700 w-[100px]">Previsión</th>
              <th className="p-3 border-b border-r border-gray-200 dark:border-gray-700 w-[110px]">Isapre</th>
              <th className="p-3 border-b border-r border-gray-200 dark:border-gray-700 w-[100px]">Convenio</th>
              <th className="p-3 border-b border-r border-gray-200 dark:border-gray-700 w-[100px]">Cod. Artículo</th>
              <th className="p-3 border-b border-r border-gray-200 dark:border-gray-700 w-[220px]">Descripción Item / Proc.</th>
              <th className="p-3 border-b border-r border-gray-200 dark:border-gray-700 w-[60px] text-center">Cant.</th>
              <th className="p-3 border-b border-gray-200 dark:border-gray-700 w-[160px]">Arancel / Grupo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
            {filasFiltradas.length > 0 ? (
              filasFiltradas.map((f) => (
                <tr key={f.idUnico} className="hover:bg-gray-50/80 dark:hover:bg-gray-700/40 transition-colors">
                  <td className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70 font-bold text-gray-800 dark:text-gray-200">{f["Admisión"]}</td>
                  <td className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-600 dark:text-gray-400 whitespace-nowrap">{f["Fecha"]}</td>
                  <td className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-600 dark:text-gray-400 text-center">{f["Edad"]}</td>
                  <td className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-700 dark:text-gray-300 truncate font-medium" title={f["1° Cirujano"]}>{f["1° Cirujano"]}</td>
                  <td className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-600 dark:text-gray-400 truncate" title={f["Previsión"]}>{f["Previsión"]}</td>
                  <td className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-600 dark:text-gray-400 truncate" title={f["Isapre"]}>{f["Isapre"]}</td>
                  <td className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-600 dark:text-gray-400 truncate" title={f["Convenio"]}>{f["Convenio"]}</td>
                  <td className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70 font-mono text-gray-700 dark:text-gray-300">{f["Cod.Artículo"]}</td>
                  <td className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-600 dark:text-gray-300 truncate" title={f["Descripción"]}>{f["Descripción"]}</td>
                  <td className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-600 dark:text-gray-400 font-semibold text-center">{f["Cant.Art."]}</td>
                  <td className="p-3 border-b border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 truncate font-medium" title={f["Arancel"]}>{f["Arancel"]}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="11" className="p-8 text-center text-gray-400 dark:text-gray-500 font-medium">
                  {filtroAnio && filtroMes ? "No se encontraron registros." : "Selecciona Año y Mes para desplegar el listado maestro plano."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL DE IMPORTACIÓN */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-transparent dark:border-gray-700">
            <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/40">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-[#2383C2]/10 rounded-lg">
                  <Upload size={18} className="text-[#2383C2]" />
                </div>
                <h3 className="font-bold text-gray-800 dark:text-gray-100">Cargar Reporte Desglosado Fila por Fila</h3>
              </div>
              <button onClick={() => setShowModal(false)} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition p-1">
                <X size={20} />
              </button>
            </div>
            <div className="p-8">
              <div {...getRootProps()} className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer flex flex-col items-center justify-center gap-4 transition ${isDragActive ? "border-[#2383C2] bg-[#2383C2]/5" : "border-gray-200 dark:border-gray-700 hover:border-[#2383C2]/50 hover:bg-gray-50 dark:hover:bg-gray-700/30"}`}>
                <input {...getInputProps()} />
                <div className="bg-gray-100 dark:bg-gray-900 p-4 rounded-full">
                  <FileSpreadsheet size={32} className="text-gray-400 dark:text-gray-500" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-700 dark:text-gray-200">Sube o arrastra tu reporte histórico aquí</p>
                  <p className="text-xs text-gray-400 dark:text-gray-400 mt-2">
                    Las filas se almacenarán individualmente con todas sus columnas (Admisión, Previsión, Cirujano, Artículo, etc.) evitando resúmenes restrictivos.
                  </p>
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

export default ReportePabellon;