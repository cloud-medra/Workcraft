import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import { db } from '../../../../../firebaseConfig';
import { COL_CODIGOS, COL_EMPRESAS, COL_IMPORTACIONES, normalizarTexto } from '../utils/formatoPrecios';
import { analizarImportacionPrecios } from '../utils/analizarImportacionPrecios';
import { leerArchivoExcelPrecios } from '../utils/leerExcelPrecios';
import { descargarFormatoPrecios } from '../utils/generarFormatoPrecios';
import { guardarImportacionPrecios, ConflictoPreciosError } from '../utils/guardarImportacionPrecios';

const LIMITE_HISTORIAL = 15;

// Se lee maestros_codigos completo y se filtra en memoria por empresa
// normalizada: el campo `empresa` es texto libre y un where("empresa", "==")
// exacto dejaría fuera códigos con otras mayúsculas o espacios.
const cargarTodosLosCodigos = async () => {
  const snap = await getDocs(collection(db, COL_CODIGOS));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

const codigosDeEmpresa = (codigos, empresa) => {
  const nombre = normalizarTexto(empresa?.nombre);
  return codigos.filter(c => normalizarTexto(c.empresa) === nombre);
};

export const useActualizacionPrecios = ({ userData, showToast }) => {
  const [empresas, setEmpresas] = useState([]);
  const [cargandoEmpresas, setCargandoEmpresas] = useState(true);
  const [empresa, setEmpresa] = useState(null);

  const [codigosEmpresa, setCodigosEmpresa] = useState([]);
  const [cargandoCodigos, setCargandoCodigos] = useState(false);
  const [historial, setHistorial] = useState([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);

  const [descargando, setDescargando] = useState(false);
  const [analizando, setAnalizando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  // { archivo, rechazo, actualizar, omitidos, errores }
  const [analisis, setAnalisis] = useState(null);
  // { archivo, actualizados, omitidos, errores, importacionId }
  const [resumen, setResumen] = useState(null);
  // Mensaje + detalle si el guardado se abortó (conflicto o error).
  const [errorGuardado, setErrorGuardado] = useState(null);

  const usuario = {
    nombre: userData?.nombre || userData?.email || 'Sistema',
    email: userData?.email || ''
  };

  useEffect(() => {
    let cancelado = false;
    getDocs(query(collection(db, COL_EMPRESAS), orderBy('nombre', 'asc')))
      .then(snap => {
        if (!cancelado) setEmpresas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      })
      .catch(error => {
        console.error('Error al cargar maestros_empresas:', error);
        showToast('Error al cargar el listado de empresas', 'error');
      })
      .finally(() => { if (!cancelado) setCargandoEmpresas(false); });
    return () => { cancelado = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cargarCodigosEmpresa = useCallback(async (empresaObj) => {
    setCargandoCodigos(true);
    try {
      const todos = await cargarTodosLosCodigos();
      setCodigosEmpresa(codigosDeEmpresa(todos, empresaObj));
    } catch (error) {
      console.error('Error al cargar maestros_codigos:', error);
      showToast('Error al cargar los códigos de la empresa', 'error');
      setCodigosEmpresa([]);
    } finally {
      setCargandoCodigos(false);
    }
  }, [showToast]);

  // Sin orderBy en la consulta para no requerir un índice compuesto
  // (empresaId + fecha): se ordena en memoria por fechaIso.
  const cargarHistorial = useCallback(async (empresaObj) => {
    setCargandoHistorial(true);
    try {
      const snap = await getDocs(query(collection(db, COL_IMPORTACIONES), where('empresaId', '==', empresaObj.id)));
      const registros = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => String(b.fechaIso || '').localeCompare(String(a.fechaIso || '')))
        .slice(0, LIMITE_HISTORIAL);
      setHistorial(registros);
    } catch (error) {
      console.error('Error al cargar historial de importaciones:', error);
      setHistorial([]);
    } finally {
      setCargandoHistorial(false);
    }
  }, []);

  const seleccionarEmpresa = (empresaObj) => {
    setEmpresa(empresaObj);
    setAnalisis(null);
    setResumen(null);
    setErrorGuardado(null);
    setCodigosEmpresa([]);
    setHistorial([]);
    if (empresaObj) {
      cargarCodigosEmpresa(empresaObj);
      cargarHistorial(empresaObj);
    }
  };

  const descargarFormato = async () => {
    if (!empresa) return;
    setDescargando(true);
    try {
      await descargarFormatoPrecios({ empresa, codigos: codigosEmpresa });
    } catch (error) {
      console.error('Error al generar el formato de precios:', error);
      showToast('No se pudo generar el formato Excel', 'error');
    } finally {
      setDescargando(false);
    }
  };

  const analizarArchivo = async (archivo) => {
    if (!empresa || !archivo) return;
    setResumen(null);
    setErrorGuardado(null);

    if (!/\.xlsx$/i.test(archivo.name)) {
      setAnalisis({ archivo: archivo.name, rechazo: 'Solo se aceptan archivos .xlsx. Use el formato descargado desde esta pantalla.', actualizar: [], omitidos: [], errores: [] });
      return;
    }

    setAnalizando(true);
    try {
      const [filas, todos] = await Promise.all([leerArchivoExcelPrecios(archivo), cargarTodosLosCodigos()]);
      const codigosActuales = codigosDeEmpresa(todos, empresa);
      setCodigosEmpresa(codigosActuales);
      // Se pasan todos los códigos para distinguir "no existe" de "es de otra empresa".
      setAnalisis({ archivo: archivo.name, ...analizarImportacionPrecios({ filas, empresa, codigos: todos }) });
    } catch (error) {
      console.error('Error al leer el archivo de precios:', error);
      setAnalisis({ archivo: archivo.name, rechazo: 'No se pudo leer el archivo. Verifique que sea un Excel (.xlsx) válido.', actualizar: [], omitidos: [], errores: [] });
    } finally {
      setAnalizando(false);
    }
  };

  const cancelarAnalisis = () => {
    setAnalisis(null);
    setErrorGuardado(null);
  };

  const confirmarImportacion = async () => {
    if (!analisis || analisis.rechazo || analisis.actualizar.length === 0 || guardando) return;
    setGuardando(true);
    setErrorGuardado(null);
    try {
      const { importacionId } = await guardarImportacionPrecios({ db, empresa, archivo: analisis.archivo, analisis, usuario });
      setResumen({
        importacionId,
        archivo: analisis.archivo,
        actualizados: analisis.actualizar,
        omitidos: analisis.omitidos,
        errores: analisis.errores
      });
      setAnalisis(null);
      showToast(`Se actualizaron ${analisis.actualizar.length} precios de ${empresa.nombre}`, 'success');
      cargarCodigosEmpresa(empresa);
      cargarHistorial(empresa);
    } catch (error) {
      console.error('Error al guardar la importación de precios:', error);
      if (error instanceof ConflictoPreciosError) {
        setErrorGuardado({ mensaje: error.message, detalle: error.conflictos });
      } else if (error?.code === 'permission-denied') {
        setErrorGuardado({ mensaje: 'No tiene permisos para modificar los códigos de Maestros. No se actualizó ningún precio.', detalle: [] });
      } else {
        setErrorGuardado({ mensaje: 'No se pudo guardar la importación. No se actualizó ningún precio; revise su conexión e intente nuevamente.', detalle: [] });
      }
    } finally {
      setGuardando(false);
    }
  };

  return {
    empresas,
    cargandoEmpresas,
    empresa,
    seleccionarEmpresa,
    codigosEmpresa,
    cargandoCodigos,
    historial,
    cargandoHistorial,
    descargando,
    descargarFormato,
    analizando,
    analisis,
    analizarArchivo,
    cancelarAnalisis,
    guardando,
    confirmarImportacion,
    errorGuardado,
    resumen,
    cerrarResumen: () => setResumen(null)
  };
};
