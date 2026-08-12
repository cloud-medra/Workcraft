// src/components/modulos/laboratorio/procesosFacturados/ArchivosControl.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Inbox, 
  FileText, 
  ClipboardList, 
  AlertTriangle, 
  CheckSquare,
  ShieldAlert,
  Layers,
  ChevronRight,
  Link2,
  CalendarCheck,
  FileSpreadsheet,
  CheckCircle2,
  Edit3,
  Calendar
} from 'lucide-react'; 
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../../../firebaseConfig'; // Ajusta la ruta de tu configuración de firebase si es necesario
import { useGranularPermission } from '../../../../hooks/useGranularPermission';
import DocumentosRecibidos from './documentosRecibidas/DocRecibidos';
import IniciarProceso from './iniciarProceso/IniciarProceso';
import VinculacionCodigos from './vinculacionCodigos/VinculacionCodigos';
import VinculacionOrden from './vinculacionOrden/VinculacionOrden';
import SolicitudDiferencias from './solicitudDiferencias/SolicitudDiferencias';
import DocumentosListasIngreso from './documentosListasIngreso/DocListasIngreso';
import DocImputados from './documentosImputados/DocImputados';
import CierreMes from './cierreMes/CierreMes';

// Lista de pestañas ordenada
const ALL_TABS = [
  { id: 'recibidas', label: 'Documentos Recibidos', Icon: Inbox, perm: 'tab_recibidas' },
  { id: 'procesar', label: 'Ingreso de Folios', Icon: FileText, perm: 'tab_procesar' },
  { id: 'gestion', label: 'Vinculación de Códigos', Icon: ClipboardList, perm: 'tab_gestion' },
  { id: 'ordenes', label: 'Vinculación de Órdenes', Icon: Link2, perm: 'tab_ordenes' },
  { id: 'excel', label: 'Solicitud Diferencias', Icon: AlertTriangle, perm: 'tab_excel' },
  { id: 'listas', label: 'Documentos Listos', Icon: CheckSquare, perm: 'tab_listas' },
  { id: 'doc_imputados', label: 'Documentos Imputados', Icon: CheckCircle2, perm: 'tab_doc_imputados' },
  { id: 'cierre_mes', label: 'Cierre de Mes', Icon: CalendarCheck, perm: 'tab_cierre_mes' },
  { id: 'edicion', label: 'Modificación y Edición', Icon: Edit3, perm: 'tab_edicion' },
];

const PATH_VISTA = "/laboratorio/controlFactura";

const ArchivosControl = () => {
  const { hasPermission } = useGranularPermission();
  const [periodoAbierto, setPeriodoAbierto] = useState(null);

  // Escuchar en tiempo real el período activo abierto
  useEffect(() => {
    const refPeriodo = doc(db, "configuracion_periodos", "periodo_activo");
    const unsubscribe = onSnapshot(refPeriodo, (docSnap) => {
      if (docSnap.exists()) {
        setPeriodoAbierto(docSnap.data());
      } else {
        setPeriodoAbierto(null);
      }
    }, (error) => {
      console.error("Error al escuchar período activo:", error);
    });

    return () => unsubscribe();
  }, []);

  // Filtramos las pestañas permitidas según permisos granulares
  const tabs = useMemo(() => 
    ALL_TABS.filter(t => hasPermission(PATH_VISTA, "navegacion", t.perm)), 
    [hasPermission]
  );

  // Estado local para la pestaña seleccionada
  const [activeTab, setActiveTab] = useState(() => tabs[0]?.id || '');

  // Determinamos la pestaña activa dinámicamente sin re-renders adicionales
  const currentTabObj = useMemo(() => {
    return tabs.find(t => t.id === activeTab) || tabs[0] || null;
  }, [tabs, activeTab]);

  if (tabs.length === 0 || !currentTabObj) {
    return (
      <div className="w-full h-80 flex flex-col items-center justify-center bg-white dark:bg-gray-800 rounded-xl border border-slate-200/80 dark:border-gray-700/80 p-6 text-center">
        <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3 border border-amber-200/60 dark:border-amber-800/40">
          <ShieldAlert size={24} />
        </div>
        <h3 className="text-sm font-bold text-slate-800 dark:text-gray-100 mb-1">
          Acceso Insuficiente
        </h3>
        <p className="text-xs text-slate-500 dark:text-gray-400 max-w-sm mb-3">
          Su perfil de usuario no cuenta con privilegios habilitados para navegar en las funciones de Control de Facturas.
        </p>
        <span className="text-[10px] font-mono text-slate-400 dark:text-gray-500 uppercase tracking-widest bg-slate-100 dark:bg-gray-900 px-2.5 py-0.5 rounded border border-slate-200/50 dark:border-gray-800">
          ERR_PERM_DENIED_PATH
        </span>
      </div>
    );
  }

  const ActiveIcon = currentTabObj.Icon;

  return (
    <div className="w-full h-full flex flex-col bg-slate-50/60 dark:bg-gray-900 rounded-xl border border-slate-200/80 dark:border-gray-700/80 shadow-xs overflow-hidden">
      
      {/* Header Compacto Corporativo */}
      <div className="bg-white dark:bg-gray-800 border-b border-slate-200/80 dark:border-gray-700 px-5 py-2.5">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-sm font-bold text-slate-900 dark:text-gray-100 tracking-tight">
              Control y Procesos de Documentos
            </h1>
            
            {/* Ruta de Navegación Dinámica */}
            <div className="hidden sm:flex items-center gap-1 text-[11px] font-medium text-slate-400 dark:text-gray-500">
              <span>•</span>
              <span>Laboratorio</span>
              <ChevronRight size={10} className="opacity-60" />
              <span>Documentos</span>
              <ChevronRight size={10} className="opacity-60" />
              <span>Control de Procesos</span>
              {currentTabObj && (
                <>
                  <ChevronRight size={10} className="opacity-60" />
                  <span className="text-[#2383C2] dark:text-[#369BCE] font-semibold">
                    {currentTabObj.label}
                  </span>
                </>
              )}
            </div>

            {/* Badge de Período Abierto en tiempo real */}
            {periodoAbierto && periodoAbierto.mes && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-[#2383C2] dark:text-[#369BCE] text-[10px] font-bold border border-blue-200/60 dark:border-blue-800/40 shadow-2xs">
                <Calendar size={11} />
                Período: {periodoAbierto.mes.toUpperCase()} {periodoAbierto.anio}
              </span>
            )}

            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-[10px] font-semibold border border-emerald-200/60 dark:border-emerald-800/40">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              En línea
            </span>

          </div>

          <p className="text-[11px] text-slate-500 dark:text-gray-400">
            Conciliación de operaciones, asignación de folios e integración de registros.
          </p>
        </div>
      </div>

      {/* Navegación por Pestañas */}
      <div className="bg-slate-100/60 dark:bg-gray-800/60 px-5 py-1.5 border-b border-slate-200/80 dark:border-gray-700 overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-1 min-w-max">
          {tabs.map((tab) => {
            const isActive = currentTabObj.id === tab.id;
            const TabIcon = tab.Icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                type="button"
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md select-none outline-none focus:outline-none focus:ring-0 focus-visible:ring-1 focus-visible:ring-blue-400/50 transition-colors duration-75
                  ${isActive
                    ? 'bg-white dark:bg-gray-900 text-[#2383C2] dark:text-[#369BCE] font-semibold shadow-xs border border-slate-200/80 dark:border-gray-700'
                    : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-gray-200 hover:bg-white/60 dark:hover:bg-gray-700/40 border border-transparent'
                  }`}
              >
                <TabIcon 
                  size={14} 
                  className={isActive ? 'text-[#2383C2] dark:text-[#369BCE]' : 'text-slate-400 dark:text-gray-500'} 
                />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Área Principal de Contenido */}
      <div className="flex-grow p-4 overflow-auto">
        {currentTabObj.id === 'recibidas' && <DocumentosRecibidos />}
        {currentTabObj.id === 'procesar' && <IniciarProceso />}
        {currentTabObj.id === 'gestion' && <VinculacionCodigos />}
        {currentTabObj.id === 'ordenes' && <VinculacionOrden />}
        {currentTabObj.id === 'excel' && <SolicitudDiferencias />}
        {currentTabObj.id === 'listas' && <DocumentosListasIngreso />}
        {currentTabObj.id === 'doc_imputados' && <DocImputados />}
        {currentTabObj.id === 'cierre_mes' && <CierreMes />}

        {!['recibidas', 'procesar', 'gestion', 'ordenes', 'excel', 'listas', 'doc_imputados', 'cierre_mes', 'edicion'].includes(currentTabObj.id) && (
          <div className="w-full h-full min-h-[300px] bg-white dark:bg-gray-800 border border-slate-200/80 dark:border-gray-700 rounded-lg p-6 flex flex-col items-center justify-center text-center shadow-xs">
            <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-[#2383C2] dark:text-[#369BCE] flex items-center justify-center mb-3 border border-blue-100 dark:border-blue-900/40">
              <ActiveIcon size={20} />
            </div>

            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-gray-700 text-slate-600 dark:text-gray-300 mb-2 border border-slate-200/60 dark:border-gray-600">
              <Layers size={11} className="text-slate-400" />
              <span>Módulo Operativo en Espera</span>
            </div>

            <h2 className="text-sm font-bold text-slate-800 dark:text-gray-100 mb-1">
              {currentTabObj.label}
            </h2>

            <p className="text-xs text-slate-500 dark:text-gray-400 max-w-sm leading-relaxed mb-4">
              La vista <span className="font-semibold text-slate-700 dark:text-gray-300">"{currentTabObj.label}"</span> ha validado sus políticas de navegación. Su subcomponente está listo para acoplar la lógica de negocio.
            </p>

            <div className="w-full max-w-xs grid grid-cols-2 gap-2 text-left bg-slate-50 dark:bg-gray-900/60 p-2.5 rounded-md border border-slate-200/60 dark:border-gray-700/60 text-[10px]">
              <div>
                <span className="block text-slate-400 dark:text-gray-500">RUTA ASIGNADA</span>
                <span className="font-mono text-slate-700 dark:text-gray-300 font-medium truncate block">{PATH_VISTA}</span>
              </div>
              <div>
                <span className="block text-slate-400 dark:text-gray-500">PERMISO REQUERIDO</span>
                <span className="font-mono text-slate-700 dark:text-gray-300 font-medium truncate block">{currentTabObj.perm}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ArchivosControl;