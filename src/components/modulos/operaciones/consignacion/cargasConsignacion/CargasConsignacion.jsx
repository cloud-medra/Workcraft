import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  collectionGroup,
  query,
  orderBy,
  where,
  limit,
  startAfter,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../../../../../firebaseConfig';
import { PackageSearch, RefreshCw, ChevronDown, Loader2 } from 'lucide-react';
import { useToast } from '../../../../../context/ToastContext';
import { useModal } from '../../../../../context/ModalContext';
import Spinner from '../../../../ui/Spinner';
import { buscarReporteInfoPorAdmision } from '../registroConsignacion/utils/buscarReporteInfoPorAdmision';

import CargasConsignacionFiltros from './components/CargasConsignacionFiltros';
import CargasConsignacionTable from './components/CargasConsignacionTable';
import CargasConsignacionDetalleView from './components/CargasConsignacionDetalleView';

const COL_BASE = 'consignacion_registros';
const NOMBRE_SUBCOL_DETALLES = 'detalles';
const ESTADO_POR_DEFECTO = 'INGRESADO';
const TAMANO_PAGINA = 150;

const ESTADOS_DISPONIBLES = [
  'AGENDADO', 'CARGADO', 'INCOMPLETO', 'INGRESADO', 'PENDIENTE', 'REVISAR', 'S/COTIZACION'
];

const CargasConsignacion = () => {
  const [registros, setRegistros] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [cargandoLista, setCargandoLista] = useState(false);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [ultimoDoc, setUltimoDoc] = useState(null);
  const [hayMas, setHayMas] = useState(false);

  const [busqueda, setBusqueda] = useState('');
  const [filtroAnio, setFiltroAnio] = useState('');
  const [filtroMes, setFiltroMes] = useState('');
  const [filtroDia, setFiltroDia] = useState('');
  const [filtroAtributo, setFiltroAtributo] = useState('');
  const [filtroEstado, setFiltroEstado] = useState(ESTADO_POR_DEFECTO);

  const [registroSeleccionado, setRegistroSeleccionado] = useState(null);

  const { showToast } = useToast();
  const { confirmAction } = useModal();

  const procesarSnap = (snap) =>
    snap.docs
      .filter((d) => d.ref.path.startsWith(`${COL_BASE}/`))
      .map((d) => ({ id: d.id, ref: d.ref, ...d.data() }));

  const cargarPrimeraPagina = useCallback(async () => {
    setCargandoLista(true);
    try {
      const restricciones = [];
      if (filtroEstado) restricciones.push(where('estado', '==', filtroEstado));
      restricciones.push(orderBy('fechaRegistro', 'desc'));
      restricciones.push(limit(TAMANO_PAGINA));

      const q = query(collectionGroup(db, NOMBRE_SUBCOL_DETALLES), ...restricciones);
      const snap = await getDocs(q);

      setRegistros(procesarSnap(snap));
      setUltimoDoc(snap.docs[snap.docs.length - 1] || null);
      setHayMas(snap.docs.length === TAMANO_PAGINA);
    } catch (error) {
      console.error('Error al cargar consignacion_registros:', error);
      showToast('Error al cargar los registros', 'error');
    } finally {
      setCargandoLista(false);
    }
  }, [filtroEstado]);

  const cargarMas = async () => {
    if (!ultimoDoc || cargandoMas) return;
    setCargandoMas(true);
    try {
      const restricciones = [];
      if (filtroEstado) restricciones.push(where('estado', '==', filtroEstado));
      restricciones.push(orderBy('fechaRegistro', 'desc'));
      restricciones.push(startAfter(ultimoDoc));
      restricciones.push(limit(TAMANO_PAGINA));

      const q = query(collectionGroup(db, NOMBRE_SUBCOL_DETALLES), ...restricciones);
      const snap = await getDocs(q);

      setRegistros((prev) => [...prev, ...procesarSnap(snap)]);
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

  const handleActualizarVinculados = async (registro) => {
    if (!registro.gestionId) {
      showToast('Este registro no tiene ID (Admisión) para buscar en Reportes', 'error');
      return;
    }

    try {
      const datos = await buscarReporteInfoPorAdmision(db, registro.gestionId);

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
          if (registroSeleccionado?.id === registro.id) setRegistroSeleccionado(null);
          showToast('Registro eliminado correctamente', 'info');
        } catch (error) {
          showToast('Error al eliminar', 'error');
        }
      }
    );
  };

  const handleAbrirDetalle = (registro) => {
    setRegistroSeleccionado(registro);
  };

  const handleVolverDeDetalle = async () => {
    const anterior = registroSeleccionado;
    setRegistroSeleccionado(null);

    if (!anterior?.ref) return;
    try {
      const snap = await getDoc(anterior.ref);
      if (snap.exists()) {
        const actualizado = { id: snap.id, ref: snap.ref, ...snap.data() };
        setRegistros((prev) => prev.map((r) => (r.id === actualizado.id ? actualizado : r)));
      }
    } catch (error) {
      console.error('Error al refrescar el registro tras volver del detalle:', error);
    }
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
    setFiltroAtributo('');
    setFiltroEstado(ESTADO_POR_DEFECTO);
  };

  const registrosFiltrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();

    return registros.filter(r => {
      if (termino) {
        const coincideTexto =
          (r.gestionId || '').toLowerCase().includes(termino) ||
          (r.nombre || '').toLowerCase().includes(termino) ||
          (r.medico || '').toLowerCase().includes(termino) ||
          (r.empresa || '').toLowerCase().includes(termino) ||
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

      if (filtroAtributo && (r.atributo || '').toUpperCase() !== filtroAtributo) return false;

      return true;
    });
  }, [registros, busqueda, filtroAnio, filtroMes, filtroDia, filtroAtributo]);

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
          <PackageSearch size={15} className="text-[#2383C2]" />
          CARGAS DE CONSIGNACIÓN
        </h2>
        {!registroSeleccionado && (
          <button
            type="button"
            onClick={cargarPrimeraPagina}
            disabled={cargandoLista}
            title="Actualizar lista"
            className="p-1 rounded-md text-gray-500 hover:text-[#2383C2] dark:text-gray-400 dark:hover:text-[#2383C2] hover:bg-gray-100 dark:hover:bg-gray-700 transition disabled:opacity-40"
          >
            <RefreshCw size={14} className={cargandoLista ? 'animate-spin' : ''} />
          </button>
        )}
      </div>

      {registroSeleccionado ? (
        <CargasConsignacionDetalleView
          registro={registroSeleccionado}
          onVolver={handleVolverDeDetalle}
          setCargando={setCargando}
        />
      ) : (
        <>
          <CargasConsignacionFiltros
            busqueda={busqueda}
            setBusqueda={setBusqueda}
            filtroAnio={filtroAnio}
            setFiltroAnio={setFiltroAnio}
            filtroMes={filtroMes}
            setFiltroMes={setFiltroMes}
            filtroDia={filtroDia}
            setFiltroDia={setFiltroDia}
            opcionesFechas={opcionesFechas}
            filtroAtributo={filtroAtributo}
            setFiltroAtributo={setFiltroAtributo}
            filtroEstado={filtroEstado}
            setFiltroEstado={setFiltroEstado}
            opcionesEstados={ESTADOS_DISPONIBLES}
            limpiarFiltros={limpiarFiltros}
          />

          {cargandoLista ? (
            <div className="flex-grow flex items-center justify-center gap-2 text-gray-400 dark:text-gray-500 text-[11px]">
              <Loader2 size={14} className="animate-spin" /> Cargando registros...
            </div>
          ) : (
            <>
              <CargasConsignacionTable
                registros={registrosFiltrados}
                onAbrirDetalle={handleAbrirDetalle}
                onEliminar={handleEliminar}
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
        </>
      )}
    </div>
  );
};

export default CargasConsignacion;