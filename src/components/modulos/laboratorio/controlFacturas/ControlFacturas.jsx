import React, { useState } from 'react';
import { FileText, ClipboardList, BarChart3, Settings, FileSpreadsheet, HelpCircle, CheckSquare } from 'lucide-react'; 
import BuscarFolio from './BuscarFolio';
import EnlazarCodigo from './EnlazarCodigo';
import EnlazarOrden from './EnlazarOrden';
import SolicitudExcel from './SolicitudExcel';
import FacturasListas from './FacturasListas';
import ResumenFacturas from './ResumenFacturas';
import AyudaContextos from './AyudaContextos';

const ControlFacturas = () => {
    const [activeTab, setActiveTab] = useState('procesar');

    const tabs = [
        { id: 'procesar', label: 'INGRESO DE FOLIOS', icon: <FileText size={16} /> },
        { id: 'gestion', label: 'ENLAZAR CÓDIGOS', icon: <ClipboardList size={16} /> },
        { id: 'ordenes', label: 'ENLAZAR ORDENES', icon: <Settings size={16} /> },
        { id: 'excel', label: 'SOLICITUD EXCEL', icon: <FileSpreadsheet size={16} /> },
        { id: 'listas', label: 'FACTURAS LISTAS', icon: <CheckSquare size={16} /> }, // 3. Nueva pestaña
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
                                ? 'text-[#2383C2] bg-gray-50'
                                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50/50'
                            }`}
                    >
                        {activeTab === tab.id && (
                            <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#2383C2]" />
                        )}
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="flex-grow overflow-auto bg-gray-50/30 p-6">
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