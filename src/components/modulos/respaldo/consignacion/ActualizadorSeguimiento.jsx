import React, { useState, useEffect } from 'react';
import { 
  collection, 
  getDocs, 
  writeBatch, 
  doc, 
  query, 
  where,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import { RefreshCw, CalendarRange, FolderOpen, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { useToast } from '../../../context/ToastContext';

const MESES_LABEL = {
  '01': 'Enero', '02': 'Febrero', '03': 'Marzo', '04': 'Abril',
  '05': 'Mayo', '06': 'Junio', '07': 'Julio', '08': 'Agosto',
  '09': 'Septiembre', '10': 'Octubre', '11': 'Noviembre', '12': 'Diciembre'
};

const ActualizadorSeguimiento = () => {
  const { showToast } = useToast();
  
  // Selectores de periodo
  const [anios, setAnios] = useState([]);
  const [anioSeleccionado, setAnioSeleccionado] = useState('');
  const [meses, setMeses] = useState([]);
  const [mesSeleccionado, setMesSeleccionado] = useState('');
  
  // Estados de carga y progreso
  const [cargandoPeriodos, setCargandoPeriodos] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [progreso, setProgreso] = useState({ actual: 0, total: 0 });
  const [resultado, setResultado] = useState(null);

  // ---------------------------------------------------------
  // Configuración de las colecciones (Ajusta estos nombres según tu BD)
  // ---------------------------------------------------------
  const COLECCION_ORIGEN = "registros_clinicos"; // Colección donde buscaremos los datos correctos
  const CAMPO_LLAVE_ORIGEN = "llaveAdmisionCodigo"; // Campo en la col. origen que guarda "admision+codigo"
  
  // 1. Cargar años al montar
  useEffect(() => {
    setCargandoPeriodos(true);
    const unsubscribe = onSnapshot(
      collection(db, "consignacion_historial"),
      (snap) => {
        const lista = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => b.id.localeCompare(a.id));
        setAnios(lista);
        setCargandoPeriodos(false);
      },
      (error) => {
        console.error(error);
        showToast("Error al cargar años de la base de datos.", "error");
        setCargandoPeriodos(false);
      }
    );
    return () => unsubscribe();
  }, [showToast]);

  // 2. Cargar meses al seleccionar año
  useEffect(() => {
    setMeses([]);
    setMesSeleccionado('');
    setResultado(null);
    if (!anioSeleccionado) return;

    const unsubscribe = onSnapshot(
      collection(db, "consignacion_historial", anioSeleccionado, "meses"),
      (snap) => {
        const lista = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => a.id.localeCompare(b.id));
        setMeses(lista);
      },
      (error) => {
        console.error(error);
        showToast("Error al cargar meses.", "error");
      }
    );
    return () => unsubscribe();
  }, [anioSeleccionado, showToast]);

  // Función principal de actualización masiva
  const ejecutarActualizacion = async () => {
    if (!anioSeleccionado || !mesSeleccionado) {
      showToast("Por favor selecciona año y mes antes de continuar.", "warning");
      return;
    }

    setProcesando(true);
    setResultado(null);
    setProgreso({ actual: 0, total: 0 });

    try {
      // 1. Obtener todos los registros destino (historial) del mes seleccionado
      const subcoleccionDatosRef = collection(
        db, 
        "consignacion_historial", 
        anioSeleccionado, 
        "meses", 
        mesSeleccionado, 
        "datos"
      );
      const snapshotHistorial = await getDocs(subcoleccionDatosRef);
      const itemsHistorial = snapshotHistorial.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      if (itemsHistorial.length === 0) {
        showToast("No se encontraron registros en el mes seleccionado.", "warning");
        setProcesando(false);
        return;
      }

      setProgreso({ actual: 0, total: itemsHistorial.length });

      let actualizadosContador = 0;
      let noEncontradosContador = 0;
      
      // Procesaremos las actualizaciones usando Firebase Batches (lotes de 500 operaciones máx.)
      let batch = writeBatch(db);
      let batchSize = 0;

      // Iterar por cada documento del historial
      for (let i = 0; i < itemsHistorial.length; i++) {
        const registroHistorial = itemsHistorial[i];
        
        // Limpiamos los valores de admisión y código para evitar desajustes por espacios o mayúsculas
        const admision = (registroHistorial.admision || '').toString().trim();
        const codigo = (registroHistorial.codigo || '').toString().trim();
        
        // Creamos la llave de búsqueda. Ej: "ADM123456COD987" (puedes cambiar el separador si usas uno)
        const llaveBuscada = `${admision}${codigo}`;

        if (!admision || !codigo) {
          noEncontradosContador++;
          setProgreso(prev => ({ ...prev, actual: i + 1 }));
          continue;
        }

        // 2. Buscar en la colección origen la llave correspondiente
        const qOrigen = query(
          collection(db, COLECCION_ORIGEN), 
          where(CAMPO_LLAVE_ORIGEN, "==", llaveBuscada)
        );
        const querySnapshot = await getDocs(qOrigen);

        if (!querySnapshot.empty) {
          // Tomamos la primera coincidencia encontrada
          const datosOrigen = querySnapshot.docs[0].data();
          
          // Extraemos los 3 datos requeridos
          const nuevosDatos = {
            orden: datosOrigen.orden || '',
            guia: datosOrigen.guia || datosOrigen.guiaDespacho || '',
            factura: datosOrigen.factura || ''
          };

          // 3. Agregar la actualización al lote actual
          const docHistorialRef = doc(db, "consignacion_historial", anioSeleccionado, "meses", mesSeleccionado, "datos", registroHistorial.id);
          batch.update(docHistorialRef, nuevosDatos);
          
          actualizadosContador++;
          batchSize++;

          // Si el batch llega al límite de Firestore (500 operaciones), lo ejecutamos y creamos uno nuevo
          if (batchSize === 450) { 
            await batch.commit();
            batch = writeBatch(db);
            batchSize = 0;
          }
        } else {
          noEncontradosContador++;
        }

        // Actualizar UI del progreso
        setProgreso(prev => ({ ...prev, actual: i + 1 }));
      }

      // 4. Enviar cualquier actualización remanente en el último batch
      if (batchSize > 0) {
        await batch.commit();
      }

      setResultado({
        total: itemsHistorial.length,
        actualizados: actualizadosContador,
        noEncontrados: noEncontradosContador
      });

      showToast("Actualización finalizada con éxito.", "success");

    } catch (error) {
      console.error("Error durante la actualización en lote:", error);
      showToast("Ocurrió un error al procesar la actualización.", "error");
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden p-5 transition-colors">
      <div className="flex items-center gap-2.5 pb-4 border-b border-gray-200 dark:border-gray-700 mb-4">
        <RefreshCw size={18} className="text-rose-500 animate-spin-slow" />
        <h3 className="text-[14px] font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
          Enriquecer Datos de Historial
        </h3>
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 leading-relaxed">
        Este proceso buscará registros en el periodo seleccionado. Usará la combinación 
        <strong> Admisión + Código</strong> para buscar en la colección maestra y traer de vuelta 
        los campos <span className="font-semibold text-rose-500 dark:text-rose-400">Orden, Guía y Factura</span> faltantes.
      </p>

      {/* Selectores */}
      <div className="space-y-3">
        <div>
          <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 block mb-1 uppercase">Año de Historial</label>
          <div className="flex items-center gap-2">
            <CalendarRange size={14} className="text-gray-400" />
            <select
              value={anioSeleccionado}
              onChange={(e) => setAnioSeleccionado(e.target.value)}
              disabled={procesando || anios.length === 0}
              className="w-full text-[12px] bg-gray-50 dark:bg-gray-950 border border-gray-300 dark:border-gray-600 rounded p-2 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-rose-400 disabled:opacity-50"
            >
              <option value="">{cargandoPeriodos ? 'Cargando años...' : 'Selecciona el año...'}</option>
              {anios.map(a => (
                <option key={a.id} value={a.id}>{a.anio || a.id}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 block mb-1 uppercase">Mes de Historial</label>
          <div className="flex items-center gap-2">
            <FolderOpen size={14} className="text-gray-400" />
            <select
              value={mesSeleccionado}
              onChange={(e) => setMesSeleccionado(e.target.value)}
              disabled={procesando || !anioSeleccionado || meses.length === 0}
              className="w-full text-[12px] bg-gray-50 dark:bg-gray-950 border border-gray-300 dark:border-gray-600 rounded p-2 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-rose-400 disabled:opacity-50"
            >
              <option value="">{!anioSeleccionado ? 'Selecciona un año primero...' : 'Selecciona el mes...'}</option>
              {meses.map(m => (
                <option key={m.id} value={m.id}>{MESES_LABEL[m.id] || m.id}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Barra de progreso */}
      {procesando && (
        <div className="mt-5 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-md">
          <div className="flex items-center justify-between text-[11px] font-bold text-amber-700 dark:text-amber-400 mb-1">
            <span className="flex items-center gap-1.5">
              <Loader2 size={12} className="animate-spin" />
              Procesando base de datos...
            </span>
            <span>
              {progreso.actual} de {progreso.total}
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
            <div 
              className="bg-amber-500 h-1.5 rounded-full transition-all duration-300" 
              style={{ width: `${(progreso.actual / progreso.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Resultados */}
      {resultado && (
        <div className="mt-5 p-3.5 bg-green-50 dark:bg-green-950/10 border border-green-200 dark:border-green-900/40 rounded-md space-y-1.5">
          <div className="flex items-center gap-1.5 text-[12px] font-bold text-green-700 dark:text-green-400">
            <CheckCircle size={14} />
            <span>Actualización Terminada</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-[11px] pt-1">
            <div className="bg-white dark:bg-gray-900 p-1.5 rounded border border-green-100 dark:border-green-900/30">
              <span className="block text-gray-400 font-semibold text-[9px]">TOTAL</span>
              <strong className="text-gray-700 dark:text-gray-200 text-xs">{resultado.total}</strong>
            </div>
            <div className="bg-white dark:bg-gray-900 p-1.5 rounded border border-green-100 dark:border-green-900/30">
              <span className="block text-green-500 font-semibold text-[9px]">ENCONTRADOS</span>
              <strong className="text-green-600 dark:text-green-400 text-xs">{resultado.actualizados}</strong>
            </div>
            <div className="bg-white dark:bg-gray-900 p-1.5 rounded border border-green-100 dark:border-green-900/30">
              <span className="block text-amber-500 font-semibold text-[9px]">NO ENCONTRADOS</span>
              <strong className="text-amber-600 dark:text-amber-400 text-xs">{resultado.noEncontrados}</strong>
            </div>
          </div>
        </div>
      )}

      {/* Botón de acción */}
      <button
        onClick={ejecutarActualizacion}
        disabled={procesando || !anioSeleccionado || !mesSeleccionado}
        className="w-full mt-5 bg-rose-500 hover:bg-rose-600 active:bg-rose-700 text-white font-bold py-2 px-4 rounded text-[12px] flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
      >
        {procesando ? (
          <>
            <Loader2 size={14} className="animate-spin" />
            Buscando y actualizando...
          </>
        ) : (
          <>
            <RefreshCw size={14} />
            Actualizar Periodo
          </>
        )}
      </button>
    </div>
  );
};

export default ActualizadorSeguimiento;