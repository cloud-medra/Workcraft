import React, { useState, useEffect, useMemo } from 'react';
import {
  collectionGroup,
  query,
  orderBy,
  onSnapshot,
  updateDoc,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../../../../../firebaseConfig'; 
import { PackageSearch } from 'lucide-react';
import { useToast } from '../../../../../context/ToastContext'; 
import { useModal } from '../../../../../context/ModalContext'; 
import Spinner from '../../../../ui/Spinner'; 
import { buscarReporteInfoPorAdmision } from '../registroConsignacion/utils/buscarReporteInfoPorAdmision'; 

import CargasConsignacionFiltros from './components/CargasConsignacionFiltros';
import CargasConsignacionTable from './components/CargasConsignacionTable';
import CargasConsignacionDetalleView from './components/CargasConsignacionDetalleView';

const NOMBRE_SUBCOL_DETALLES = 'detalles';
const ESTADO_POR_DEFECTO = 'INGRESADO';

const CargasConsignacion = () => {
  const [registros, setRegistros] = useState([]);
  const [cargando, setCargando] = useState(false);

  // Filtros
  const [busqueda, setBusqueda] = useState('');
  const [filtroAnio, setFiltroAnio] = useState('');
  const [filtroMes, setFiltroMes] = useState('');
  const [filtroDia, setFiltroDia] = useState('');
  const [filtroAtributo, setFiltroAtributo] = useState('');
  const [filtroEstado, setFiltroEstado] = useState(ESTADO_POR_DEFECTO);

  // Detalle (se abre con doble clic o botón "Ver")
  const [registroSeleccionado, setRegistroSeleccionado] = useState(null);

  const { showToast } = useToast();
  const { confirmAction } = useModal();

  useEffect(() => {
    const q = query(collectionGroup(db, NOMBRE_SUBCOL_DETALLES), orderBy('fechaRegistro', 'desc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setRegistros(snap.docs.map(d => ({ id: d.id, ref: d.ref, ...d.data() })));
      },
      (error) => {
        console.error('Error al escuchar consignacion_registros:', error);
        showToast('Error al cargar los registros', 'error');
      }
    );
    return () => unsub();
  }, []);

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

      await updateDoc(registro.ref, {
        prevision: datos['Isapre'] || '',
        convenio: datos['Convenio'] || '',
        descripcionPabellon: datos['Descripción'] || ''
      });

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

  const handleVolverDeDetalle = () => {
    setRegistroSeleccionado(null);
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

  const opcionesEstados = useMemo(() => {
    const estados = new Set([ESTADO_POR_DEFECTO]);
    registros.forEach(r => {
      if (r.estado) estados.add(r.estado.toUpperCase());
    });
    return [...estados].sort();
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
      if (filtroEstado && (r.estado || '').toUpperCase() !== filtroEstado.toUpperCase()) return false;

      return true;
    });
  }, [registros, busqueda, filtroAnio, filtroMes, filtroDia, filtroAtributo, filtroEstado]);

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
      </div>

      {registroSeleccionado ? (
        <CargasConsignacionDetalleView
          registro={registroSeleccionado}
          todosLosRegistros={registros}
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
            opcionesEstados={opcionesEstados}
            limpiarFiltros={limpiarFiltros}
          />

          <CargasConsignacionTable
            registros={registrosFiltrados}
            onAbrirDetalle={handleAbrirDetalle}
            onEliminar={handleEliminar}
            onActualizarVinculados={handleActualizarVinculados}
          />
        </>
      )}
    </div>
  );
};

export default CargasConsignacion;