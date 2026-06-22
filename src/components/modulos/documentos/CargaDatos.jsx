import React, { useState } from 'react';
import { Folder, Upload, FolderOpen } from 'lucide-react';
import Spinner from '../../ui/Spinner';

import { useCargaDatos } from './hooks/useCargaDatos';
import { useUser } from "../../../context/UserContext";
import { useGranularPermission } from '../../../hooks/useGranularPermission';

import FiltrosBarra from './components/FiltrosBarra';
import TablaAdmisiones from './components/TablaAdmisiones';
import ModalImportar from './components/ModalImportar';
import ResumenFinanciero from './ResumenFinanciero';
import TablaDetallePaciente from './TablaDetallePaciente';
import GestorDocumentos from './components/GestorDocumentos';

const RUTA = '/documentos/carga';

const CargaDatos = () => {
  const [vista, setVista] = useState('tabla');
  const [filaSeleccionada, setFilaSeleccionada] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showModalExpediente, setShowModalExpediente] = useState(false);

  const { userData } = useUser();
  const { hasPermission } = useGranularPermission();

  const {
    cargando,
    cargandoDetalle,
    datosFiltrados,
    registrosDetalle,
    estadisticasDetalle,
    filtros,
    setFiltros,
    listasFiltros,
    cargarDetallesAdmision,
    onDropExcel,
    totalPendientesOC
  } = useCargaDatos();

  const manejarClickFila = (fila) => {
    setFilaSeleccionada(fila);
    cargarDetallesAdmision(fila);
    setVista('detalle');
  };

  const filaActiva = datosFiltrados.find(d => d.id === filaSeleccionada?.id) || filaSeleccionada;
  const totalDocumentos = filaActiva?.documentos?.length || 0;

  if (!userData) {
    return <div className="p-10 text-center text-gray-400 text-[12px]">Cargando sesión...</div>;
  }

  const tieneAccesoAlModulo =
    userData.rol === 'admin' ||
    userData.rol === 'dev' ||
    !!userData?.permisosGranulares?.[RUTA];

  if (!tieneAccesoAlModulo) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-50 p-6">
        <div className="text-center bg-white p-8 rounded-2xl border border-gray-200 shadow-sm max-w-sm">
          <p className="text-red-500 font-bold text-[14px] mb-2">⚠️ Acceso Restringido</p>
          <p className="text-gray-500 text-[12px]">No tienes permisos asignados para visualizar este módulo.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden p-0 relative">
      {cargando && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-gray-500/20 backdrop-blur-[2px]">
          <div className="bg-white/90 p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-5">
            <Spinner size="md" color="#2383C2" />
            <h3 className="text-[#2383C2] font-bold">Procesando...</h3>
          </div>
        </div>
      )}

      {vista === 'tabla' ? (
        <>
          <h2 className="text-[14px] font-bold text-gray-700 p-4 flex items-center gap-2 border-b border-gray-200">
            <Folder size={16} className="text-[#2383C2]" /> GESTIÓN DE DATOS (EXCEL)
            {hasPermission(RUTA, 'acciones_principales', 'cargaDatos_btnImportar') && (
              <button
                onClick={() => setShowModal(true)}
                className="ml-auto bg-[#2383C2] text-white px-3 py-1 rounded text-[11px] font-bold flex items-center gap-1 hover:bg-[#369BCE]"
              >
                <Upload size={12} /> Importar Excel
              </button>
            )}
          </h2>

          <FiltrosBarra
            filtros={filtros}
            setFiltros={setFiltros}
            listasFiltros={listasFiltros}
            totalFilas={datosFiltrados.length}
            totalPendientesOC={totalPendientesOC}
            hasPermission={hasPermission}
          />

          <TablaAdmisiones
            datos={datosFiltrados}
            onSeleccionarFila={manejarClickFila}
            hasPermission={hasPermission}
          />
        </>
      ) : (
        <div className="p-6 h-full overflow-auto bg-[#F8FAFC]">
          <button onClick={() => setVista('tabla')} className="text-[#2383C2] font-bold mb-4 flex items-center gap-1 text-[12px] hover:underline">
            &larr; Volver a la tabla
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6 items-start">
            <div className="bg-white p-5 h-[140px] rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-[11px] font-bold text-[#2383C2] uppercase mb-3 border-b border-gray-100 pb-1 tracking-wider">Detalle de Admisión</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div><p className="text-[10px] text-gray-400 uppercase font-bold">Admisión</p><h2 className="text-[14px] font-black text-gray-800">{filaActiva?.ADMISION}</h2></div>
                  <div><p className="text-[10px] text-gray-400 uppercase font-bold">Paciente</p><p className="text-[12px] text-gray-700 truncate font-semibold" title={filaActiva?.PACIENTE}>{filaActiva?.PACIENTE}</p></div>
                  <div><p className="text-[10px] text-gray-400 uppercase font-bold">Fecha CX</p><p className="text-[12px] text-gray-700 font-medium">{filaActiva?.FECHA_CX}</p></div>
                  <div><p className="text-[10px] text-gray-400 uppercase font-bold">Médico</p><p className="text-[12px] text-gray-700 truncate font-medium" title={filaActiva?.MEDICO}>{filaActiva?.MEDICO}</p></div>
                </div>
              </div>
            </div>

            {hasPermission(RUTA, 'resumen_financiero') ? (
              <ResumenFinanciero estadisticasDetalle={estadisticasDetalle} hasPermission={hasPermission} />
            ) : (
              <div className="bg-gray-100/50 p-5 h-[140px] rounded-2xl border border-dashed border-gray-200 flex items-center justify-center text-center">
                <p className="text-[11px] text-gray-400 italic">No tienes permisos para ver analíticas financieras.</p>
              </div>
            )}

            <div onClick={() => setShowModalExpediente(true)} className="bg-white p-5 h-[140px] rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4 cursor-pointer hover:border-[#2383C2] hover:shadow-md transition-all group">
              <div className="p-4 rounded-2xl bg-amber-50 text-amber-500 group-hover:bg-[#2383C2] group-hover:text-white transition-all shadow-inner"><FolderOpen size={36} /></div>
              <div className="flex flex-col justify-center">
                <h3 className="text-[13px] font-bold text-gray-700 group-hover:text-[#2383C2] transition-colors">Expediente Digital</h3>
                <p className="text-[11px] text-gray-400 font-medium mt-0.5">Informes, Cotizaciones y OCs</p>
                <span className="mt-2 bg-slate-100 text-slate-600 font-bold text-[10px] px-2 py-0.5 rounded-md w-fit">{totalDocumentos} archivos</span>
              </div>
            </div>
          </div>

          <TablaDetallePaciente
            registrosDetalle={registrosDetalle}
            cargandoDetalle={cargandoDetalle}
            hasPermission={hasPermission}
          />
        </div>
      )}

      {showModalExpediente && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border border-slate-100">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#2383C2] bg-[#2383C2]/10 px-2.5 py-1 rounded-md">Expediente Centralizado</span>
                <h2 className="text-[15px] font-black text-slate-800 mt-1">{filaActiva?.ADMISION} — {filaActiva?.PACIENTE}</h2>
              </div>
              <button onClick={() => setShowModalExpediente(false)} className="bg-slate-200/60 hover:bg-red-50 hover:text-red-600 text-slate-500 rounded-full w-7 h-7 flex items-center justify-center">✕</button>
            </div>

            <div className="p-6 overflow-auto bg-white flex-1">
              {hasPermission(RUTA, 'gestor_documentos') ? (
                <GestorDocumentos
                  firestorePath={`documentos_cargaDatos/${filtros.anio}/meses/${filtros.mes}/dias/${filaActiva?._dia}/admisiones/${filaActiva?._admision}`}
                  storagePath={`documentos_cargaDatos/${filtros.anio}/${filtros.mes}/${filaActiva?._dia}/${filaActiva?._admision}/expediente`}
                  documentosExistentes={filaActiva?.documentos || []}
                  hasPermission={hasPermission}
                />
              ) : (
                <p className="text-center text-slate-400 text-[12px] py-12 italic">No tienes permisos para ver la documentación.</p>
              )}
            </div>
          </div>
        </div>
      )}

      <ModalImportar isOpen={showModal} onClose={() => setShowModal(false)} onDrop={onDropExcel} />
    </div>
  );
};

export default CargaDatos;