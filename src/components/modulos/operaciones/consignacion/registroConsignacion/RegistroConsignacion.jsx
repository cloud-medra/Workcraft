import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  collection,
  collectionGroup,
  query,
  orderBy,
  where,
  limit,
  startAfter,
  getDocs,
  doc,
  writeBatch,
  updateDoc,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../../../../../firebaseConfig';
import { ClipboardList, RefreshCw, ChevronDown, Loader2 } from 'lucide-react';
import { useToast } from '../../../../../context/ToastContext';
import { useModal } from '../../../../../context/ModalContext';
import { useUser } from '../../../../../context/UserContext';
import Spinner from '../../../../ui/Spinner';
import { buscarReporteInfoPorAdmisionCacheado, invalidarReporteAdmision } from './utils/cacheMaestros';

import RegistroConsignacionForm from './components/RegistroConsignacionForm';
import ConsignacionFiltros from './components/ConsignacionFiltros';
import ConsignacionTable from './components/ConsignacionTable';

const COL_BASE = 'consignacion_registros';
const NOMBRE_SUBCOL_DETALLES = 'detalles';
const CENTRO_FIJO = 'PABELLON';
const TAMANO_PAGINA = 150;

const NOMBRES_MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
];

const descomponerFecha = (fechaStr) => {
  if (!fechaStr || !fechaStr.includes('-')) return null;
  const [yyyy, mm, dd] = fechaStr.split('-');
  if (!yyyy || !mm || !dd) return null;

  const mesIndex = parseInt(mm, 10) - 1;
  const nombreMes = NOMBRES_MESES[mesIndex];
  if (!nombreMes) return null;

  return { anio: yyyy, nombreMes, dia: dd };
};

const RegistroConsignacion = () => {
  const [registros, setRegistros] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [cargandoLista, setCargandoLista] = useState(false);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [ultimoDoc, setUltimoDoc] = useState(null);
  const [hayMas, setHayMas] = useState(false);
  const [registroEditando, setRegistroEditando] = useState(null);

  const [busqueda, setBusqueda] = useState('');
  const [filtroAnio, setFiltroAnio] = useState('');
  const [filtroMes, setFiltroMes] = useState('');
  const [filtroDia, setFiltroDia] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroDespachado, setFiltroDespachado] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');

  const { showToast } = useToast();
  const { confirmAction } = useModal();
  const { userData } = useUser();

  // Antes esto escuchaba TODO el collectionGroup "detalles" de la base de
  // datos (incluye, por ejemplo, las gestiones de Implantes, que usa una
  // subcolección con el mismo nombre) y el filtro where('centro','==',...)
  // no servía para distinguir el origen porque Implantes también usa
  // centro='PABELLON'. Ahora se filtra en el cliente por el prefijo real
  // de la ruta ('consignacion_registros/').
  //
  // OJO: no se puede acotar con un rango de documentId() como en Implantes
  // porque esta pantalla pagina con orderBy('fechaRegistro','desc') +
  // limit/startAfter, y Firestore exige que el PRIMER orderBy coincida con
  // el campo que tiene el filtro de rango (documentId() en ese caso) — eso
  // rompería el orden cronológico real de la paginación.
  const filtrarSoloConsignacion = (docs) =>
    docs.filter((d) => d.ref.path.startsWith(`${COL_BASE}/`));

  const cargarPrimeraPagina = useCallback(async () => {
    setCargandoLista(true);
    try {
      const q = query(
        collectionGroup(db, NOMBRE_SUBCOL_DETALLES),
        where('centro', '==', CENTRO_FIJO),
        orderBy('fechaRegistro', 'desc'),
        limit(TAMANO_PAGINA)
      );
      const snap = await getDocs(q);

      const docsConsignacion = filtrarSoloConsignacion(snap.docs);

      setRegistros(docsConsignacion.map((d) => ({ id: d.id, ref: d.ref, ...d.data() })));
      setUltimoDoc(snap.docs[snap.docs.length - 1] || null);
      setHayMas(snap.docs.length === TAMANO_PAGINA);
    } catch (error) {
      console.error('Error al cargar consignacion_registros:', error);
      showToast('Error al cargar los registros', 'error');
    } finally {
      setCargandoLista(false);
    }
  }, []);

  const cargarMas = async () => {
    if (!ultimoDoc || cargandoMas) return;
    setCargandoMas(true);
    try {
      const q = query(
        collectionGroup(db, NOMBRE_SUBCOL_DETALLES),
        where('centro', '==', CENTRO_FIJO),
        orderBy('fechaRegistro', 'desc'),
        startAfter(ultimoDoc),
        limit(TAMANO_PAGINA)
      );
      const snap = await getDocs(q);

      const docsConsignacion = filtrarSoloConsignacion(snap.docs);

      setRegistros((prev) => [...prev, ...docsConsignacion.map((d) => ({ id: d.id, ref: d.ref, ...d.data() }))]);
      setUltimoDoc(snap.docs[snap.docs.length - 1] || null);
      setHayMas(snap.docs.length === TAMANO_PAGINA);
    } catch (error) {
      console.error('Error al cargar más registros:', error);
      showToast('Error al cargar más registros', 'error');
    } finally {
      setCargandoMas(false);
    }
  };

  useEffect(() => {
    cargarPrimeraPagina();
  }, [cargarPrimeraPagina]);

  const handleRegistrar = async (payload) => {
    const clavesNuevas = descomponerFecha(payload.fecha);
    if (!clavesNuevas) {
      showToast('La fecha ingresada no es válida', 'error');
      return;
    }

    if (registroEditando && (registroEditando.estado || '').toUpperCase() === 'CARGADO') {
      showToast('Este registro ya fue cargado y no se puede modificar', 'error');
      setRegistroEditando(null);
      return;
    }

    const datosDoc = {
      gestionId: payload.gestionId || '',
      nombre: payload.nombre || '',
      medico: payload.medico || '',
      fecha: payload.fecha || '',
      codigo: payload.codigo || '',
      referencia: payload.referencia || '',
      cantidad: Number(payload.cantidad) || 0,
      delivery: payload.delivery || '',
      empresa: payload.empresa || '',

      centro: payload.centro || CENTRO_FIJO,
      atributo: payload.atributo || payload.tipo || 'CONSIGNACION',
      estado: payload.estado || 'INGRESADO',
      costo: payload.costo !== '' ? Number(payload.costo) : 0,
      convenio: payload.convenio || '',
      prevision: payload.prevision || '',
      descripcion: payload.descripcion || '',
      descripcionPabellon: payload.descripcionPabellon || '',
      tipo: payload.tipo || 'CONSIGNACION'
    };

    setCargando(true);
    try {
      if (registroEditando) {
        const clavesAnteriores = descomponerFecha(registroEditando.fecha);
        const seMovioDeCarpeta =
          !clavesAnteriores ||
          clavesAnteriores.anio !== clavesNuevas.anio ||
          clavesAnteriores.nombreMes !== clavesNuevas.nombreMes ||
          clavesAnteriores.dia !== clavesNuevas.dia;

        if (!seMovioDeCarpeta) {
          await updateDoc(registroEditando.ref, datosDoc);
          setRegistros((prev) =>
            prev.map((r) => (r.id === registroEditando.id ? { ...r, ...datosDoc } : r))
          );
        } else {
          const { anio, nombreMes, dia } = clavesNuevas;
          const batch = writeBatch(db);

          batch.set(doc(db, COL_BASE, anio), { active: 'true' }, { merge: true });
          batch.set(doc(db, COL_BASE, anio, 'mes', nombreMes), { active: 'true' }, { merge: true });
          batch.set(doc(db, COL_BASE, anio, 'mes', nombreMes, 'dia', dia), { active: 'true' }, { merge: true });

          const nuevoRef = doc(collection(db, COL_BASE, anio, 'mes', nombreMes, 'dia', dia, NOMBRE_SUBCOL_DETALLES));
          const nuevoDoc = {
            ...datosDoc,
            guias: registroEditando.guias || '',
            orden: registroEditando.orden || '',
            despachado: registroEditando.despachado || 'PENDIENTE',
            fechaRegistro: registroEditando.fechaRegistro || new Date(),
            registradoPor: registroEditando.registradoPor || userData?.nombreCompleto || 'Usuario'
          };
          batch.set(nuevoRef, nuevoDoc);
          batch.delete(registroEditando.ref);

          await batch.commit();

          setRegistros((prev) => [
            { id: nuevoRef.id, ref: nuevoRef, ...nuevoDoc },
            ...prev.filter((r) => r.id !== registroEditando.id)
          ]);
        }

        showToast('Registro actualizado correctamente', 'success');
        setRegistroEditando(null);
      } else {
        const { anio, nombreMes, dia } = clavesNuevas;
        const batch = writeBatch(db);

        batch.set(doc(db, COL_BASE, anio), { active: 'true' }, { merge: true });
        batch.set(doc(db, COL_BASE, anio, 'mes', nombreMes), { active: 'true' }, { merge: true });
        batch.set(doc(db, COL_BASE, anio, 'mes', nombreMes, 'dia', dia), { active: 'true' }, { merge: true });

        const detalleRef = doc(collection(db, COL_BASE, anio, 'mes', nombreMes, 'dia', dia, NOMBRE_SUBCOL_DETALLES));
        const fechaRegistro = new Date();
        const nuevoDoc = {
          ...datosDoc,
          guias: '',
          orden: '',
          despachado: 'PENDIENTE',
          fechaRegistro,
          registradoPor: userData?.nombreCompleto || 'Usuario'
        };
        batch.set(detalleRef, nuevoDoc);

        await batch.commit();

        setRegistros((prev) => [{ id: detalleRef.id, ref: detalleRef, ...nuevoDoc }, ...prev]);

        showToast('Ítem registrado correctamente', 'success');
      }
    } catch (error) {
      console.error('Error al guardar:', error);
      showToast('Error al guardar: ' + error.message, 'error');
    } finally {
      setCargando(false);
    }
  };

  const handleIniciarEdicion = (registro) => {
    const estadoActual = (registro.estado || '').toUpperCase();
    if (estadoActual === 'CARGADO') {
      showToast('Este registro ya fue cargado y no se puede modificar', 'error');
      return;
    }
    setRegistroEditando(registro);
  };

  const handleCancelarEdicion = () => {
    setRegistroEditando(null);
  };

  const handleActualizarCampo = async (registro, campo, valor) => {
    try {
      await updateDoc(registro.ref, { [campo]: valor });
      setRegistros((prev) =>
        prev.map((r) => (r.id === registro.id ? { ...r, [campo]: valor } : r))
      );
    } catch (error) {
      console.error('Error al actualizar campo:', error);
      showToast('Error al actualizar', 'error');
    }
  };

  const handleActualizarVinculados = async (registro) => {
    if (!registro.gestionId) {
      showToast('Este registro no tiene ID (Admisión) para buscar en Reportes', 'error');
      return;
    }

    try {
      const datos = await buscarReporteInfoPorAdmisionCacheado(db, registro.gestionId, true);
      invalidarReporteAdmision(registro.gestionId);

      if (!datos) {
        showToast('Aún no hay información en Reportes para este ID', 'info');
        return;
      }

      const cambios = {
        prevision: datos['Isapre'] || '',
        convenio: datos['Convenio'] || '',
        descripcionPabellon: datos['Descripción'] || ''
      };

      await updateDoc(registro.ref, cambios);
      setRegistros((prev) =>
        prev.map((r) => (r.id === registro.id ? { ...r, ...cambios } : r))
      );

      showToast('Datos vinculados actualizados correctamente', 'success');
    } catch (error) {
      console.error('Error al actualizar vinculados:', error);
      showToast('Error al actualizar los datos vinculados', 'error');
    }
  };

  const handleEliminar = (registro) => {
    confirmAction(
      'Eliminar Registro',
      '¿Estás seguro de eliminar este registro de consignación? Esta acción no se puede deshacer.',
      async () => {
        try {
          await deleteDoc(registro.ref);
          setRegistros((prev) => prev.filter((r) => r.id !== registro.id));
          if (registroEditando?.id === registro.id) setRegistroEditando(null);
          showToast('Registro eliminado correctamente', 'info');
        } catch (error) {
          showToast('Error al eliminar', 'error');
        }
      }
    );
  };

  const opcionesFechas = useMemo(() => {
    const anios = new Set();
    const meses = new Set();
    const dias = new Set();

    registros.forEach(r => {
      if (r.fecha && r.fecha.includes('-')) {
        const [yyyy, mm, dd] = r.fecha.split('-');
        if (yyyy) anios.add(yyyy);
        if (mm) meses.add(mm);
        if (dd) dias.add(dd);
      }
    });

    return {
      anios: [...anios].sort((a, b) => b.localeCompare(a)),
      meses: [...meses].sort((a, b) => a.localeCompare(b)),
      dias: [...dias].sort((a, b) => a.localeCompare(b))
    };
  }, [registros]);

  const limpiarFiltros = () => {
    setFiltroAnio('');
    setFiltroMes('');
    setFiltroDia('');
    setFiltroTipo('');
    setFiltroDespachado('');
    setFiltroEstado('');
  };

  const registrosFiltrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();

    return registros.filter(r => {
      if (termino) {
        const coincideTexto =
          (r.gestionId || '').toLowerCase().includes(termino) ||
          (r.nombre || '').toLowerCase().includes(termino) ||
          (r.medico || '').toLowerCase().includes(termino) ||
          (r.referencia || '').toLowerCase().includes(termino) ||
          (r.descripcion || '').toLowerCase().includes(termino);
        if (!coincideTexto) return false;
      }

      if (r.fecha && r.fecha.includes('-')) {
        const [yyyy, mm, dd] = r.fecha.split('-');
        if (filtroAnio && yyyy !== filtroAnio) return false;
        if (filtroMes && mm !== filtroMes) return false;
        if (filtroDia && dd !== filtroDia) return false;
      } else if (filtroAnio || filtroMes || filtroDia) {
        return false;
      }

      if (filtroTipo && (r.atributo || '').toUpperCase() !== filtroTipo) return false;
      if (filtroDespachado && (r.despachado || 'PENDIENTE').toUpperCase() !== filtroDespachado) return false;
      if (filtroEstado && (r.estado || 'INGRESADO').toUpperCase() !== filtroEstado) return false;

      return true;
    });
  }, [registros, busqueda, filtroAnio, filtroMes, filtroDia, filtroTipo, filtroDespachado, filtroEstado]);

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

      <div className="px-3 py-2 flex items-center justify-between border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/80">
        <h2 className="text-[12px] font-bold text-gray-700 dark:text-gray-100 flex items-center gap-1.5">
          <ClipboardList size={15} className="text-[#2383C2]" />
          {registroEditando ? 'EDITAR REGISTRO DE CONSIGNACIÓN' : 'REGISTRO DE CONSIGNACIÓN'}
        </h2>
        <button
          type="button"
          onClick={cargarPrimeraPagina}
          disabled={cargandoLista}
          title="Actualizar lista"
          className="p-1 rounded-md text-gray-500 hover:text-[#2383C2] dark:text-gray-400 dark:hover:text-[#2383C2] hover:bg-gray-100 dark:hover:bg-gray-700 transition disabled:opacity-40"
        >
          <RefreshCw size={14} className={cargandoLista ? 'animate-spin' : ''} />
        </button>
      </div>

      <RegistroConsignacionForm
        onRegistrar={handleRegistrar}
        valoresIniciales={registroEditando}
        onCancelar={handleCancelarEdicion}
      />

      <ConsignacionFiltros
        busqueda={busqueda}
        setBusqueda={setBusqueda}
        filtroAnio={filtroAnio}
        setFiltroAnio={setFiltroAnio}
        filtroMes={filtroMes}
        setFiltroMes={setFiltroMes}
        filtroDia={filtroDia}
        setFiltroDia={setFiltroDia}
        opcionesFechas={opcionesFechas}
        filtroTipo={filtroTipo}
        setFiltroTipo={setFiltroTipo}
        filtroDespachado={filtroDespachado}
        setFiltroDespachado={setFiltroDespachado}
        filtroEstado={filtroEstado}
        setFiltroEstado={setFiltroEstado}
        limpiarFiltros={limpiarFiltros}
      />

      {cargandoLista ? (
        <div className="flex-grow flex items-center justify-center gap-2 text-gray-400 dark:text-gray-500 text-[11px]">
          <Loader2 size={14} className="animate-spin" /> Cargando registros...
        </div>
      ) : (
        <>
          <ConsignacionTable
            registros={registrosFiltrados}
            onEliminar={handleEliminar}
            onEditar={handleIniciarEdicion}
            onActualizarCampo={handleActualizarCampo}
            onActualizarVinculados={handleActualizarVinculados}
          />

          {hayMas && (
            <div className="flex justify-center py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50/40 dark:bg-gray-800/40">
              <button
                type="button"
                onClick={cargarMas}
                disabled={cargandoMas}
                className="flex items-center gap-1.5 text-[10.5px] font-bold text-[#2383C2] hover:underline disabled:opacity-50"
              >
                {cargandoMas ? <Loader2 size={12} className="animate-spin" /> : <ChevronDown size={12} />}
                Cargar más registros
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default RegistroConsignacion;