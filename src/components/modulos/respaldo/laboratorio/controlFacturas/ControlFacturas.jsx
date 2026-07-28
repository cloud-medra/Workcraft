import React, { useState, useMemo, useEffect } from 'react';
import { FileText, ClipboardList, BarChart3, Settings, FileSpreadsheet, HelpCircle, CheckSquare } from 'lucide-react'; 
import { useGranularPermission } from '../../../../hooks/useGranularPermission';
import BuscarFolio from './BuscarFolio';
import EnlazarCodigo from './EnlazarCodigo';
import EnlazarOrden from './EnlazarOrden';
import SolicitudExcel from './SolicitudExcel';
import FacturasListas from './FacturasListas';
import ResumenFacturas from './ResumenFacturas';
import AyudaContextos from './AyudaContextos';

const ControlFacturas = () => {
    const { hasPermission } = useGranularPermission();
    const PATH_VISTA = "/laboratorio/controlFactura";

    const allTabs = [
        { id: 'procesar', label: 'INGRESO DE FOLIOS', icon: <FileText size={16} />, perm: 'tab_procesar' },
        { id: 'gestion', label: 'ENLAZAR CÓDIGOS', icon: <ClipboardList size={16} />, perm: 'tab_gestion' },
        { id: 'ordenes', label: 'ENLAZAR ORDENES', icon: <Settings size={16} />, perm: 'tab_ordenes' },
        { id: 'excel', label: 'SOLICITUD EXCEL', icon: <FileSpreadsheet size={16} />, perm: 'tab_excel' },
        { id: 'listas', label: 'FACTURAS LISTAS', icon: <CheckSquare size={16} />, perm: 'tab_listas' },
        { id: 'resumen', label: 'RESUMEN FACTURAS', icon: <BarChart3 size={16} />, perm: 'tab_resumen' },
        { id: 'ayuda', label: 'AYUDA Y CONTEXTOS', icon: <HelpCircle size={16} />, perm: 'tab_ayuda' },
    ];

    // Filtramos las pestañas según los permisos
    const tabs = useMemo(() => 
        allTabs.filter(t => hasPermission(PATH_VISTA, "navegacion", t.perm)), 
        [hasPermission]
    );

    const [activeTab, setActiveTab] = useState(tabs[0]?.id || '');

    // Si la pestaña activa no está disponible, redirigir a la primera permitida
    useEffect(() => {
        if (tabs.length > 0 && !tabs.find(t => t.id === activeTab)) {
            setActiveTab(tabs[0].id);
        }
    }, [tabs, activeTab]);

    if (tabs.length === 0) return <div className="p-4 text-center text-gray-500">No tienes permisos para acceder a esta sección.</div>;

    return (
        <div className="w-full h-full flex flex-col bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden transition-colors">
            {/* Contenedor de Pestañas */}
            <div className="flex flex-wrap lg:flex-nowrap border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`relative flex items-center gap-2 px-6 py-4 text-[11px] font-bold tracking-wider transition-all duration-300 ease-in-out flex-1 lg:flex-none justify-center lg:justify-start
                            ${activeTab === tab.id
                                ? 'text-[#2383C2] dark:text-[#369BCE] bg-gray-50 dark:bg-gray-900/40'
                                : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50/50 dark:hover:bg-gray-700/20'
                            }`}
                    >
                        {activeTab === tab.id && (
                            <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#2383C2] dark:bg-[#369BCE]" />
                        )}
                        {tab.icon}
                        <span className="whitespace-nowrap">{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* Panel de Contenido */}
            <div className="flex-grow overflow-auto bg-gray-50/30 dark:bg-gray-900/10 p-6">
                <div className="max-w-full h-full">
                    {activeTab === 'procesar' && <BuscarFolio />}
                    {activeTab === 'gestion' && <EnlazarCodigo />}
                    {activeTab === 'ordenes' && <EnlazarOrden />}
                    {activeTab === 'excel' && <SolicitudExcel />}
                    {activeTab === 'listas' && <FacturasListas />}
                    {activeTab === 'resumen' && <ResumenFacturas />}
                    {activeTab === 'ayuda' && <AyudaContextos />}
                </div>
            </div>
        </div>
    );
};

export default ControlFacturas;