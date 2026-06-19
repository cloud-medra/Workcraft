import React, { useState } from 'react';
import { FileText, ClipboardList, BarChart3, Settings, FileSpreadsheet, HelpCircle } from 'lucide-react';
import ProcesarFacturas from './IngresoFacturas';
import ResumenFacturas from './ResumenFacturas';
import GestionEstados from './EnlazarCodigo';
import ProcesoOrden from './EnlazarOrden';
import SolicitudExcel from './SolicitudExcel';
import AyudaContextos from './AyudaContextos';

const ControlFacturas = () => {
    const [activeTab, setActiveTab] = useState('procesar');

    const tabs = [
        { id: 'procesar', label: 'INGRESO DE FOLIOS', icon: <FileText size={16} /> },
        { id: 'gestion', label: 'PROCESAR CÓDIGOS', icon: <ClipboardList size={16} /> },
        { id: 'ordenes', label: 'PROCESAR ORDEN', icon: <Settings size={16} /> },
        { id: 'excel', label: 'SOLICITUD EXCEL', icon: <FileSpreadsheet size={16} /> },
        { id: 'resumen', label: 'RESUMEN FACTURAS', icon: <BarChart3 size={16} /> },
        { id: 'ayuda', label: 'AYUDA Y CONTEXTOS', icon: <HelpCircle size={16} /> },
    ];

    return (
        <div className="w-full h-full flex flex-col bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
            <div className="flex border-b border-gray-200 bg-white">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`relative flex items-center gap-2 px-6 py-4 text-[11px] font-bold tracking-wider transition-all duration-300 ease-in-out
                            ${activeTab === tab.id
                                ? 'text-[#0E5B6D] bg-gray-50'
                                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50/50'
                            }`}
                    >
                        {activeTab === tab.id && (
                            <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#0E5B6D]" />
                        )}
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="flex-grow overflow-auto bg-gray-50/30 p-6">
                <div className="max-w-full h-full">
                    {activeTab === 'procesar' && <ProcesarFacturas />}
                    {activeTab === 'gestion' && <GestionEstados />}
                    {activeTab === 'ordenes' && <ProcesoOrden />}
                    {activeTab === 'excel' && <SolicitudExcel />}
                    {activeTab === 'resumen' && <ResumenFacturas />}
                    {activeTab === 'ayuda' && <AyudaContextos />}
                </div>
            </div>
        </div>
    );
};

export default ControlFacturas;