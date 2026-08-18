import React from 'react';
import { BookOpen, ChevronRight, CheckCircle, AlertCircle, RefreshCcw } from 'lucide-react';

const AyudaContextos = () => {
    const steps = [
        {
            title: "1. Ingreso de Folios",
            desc: "Gestión inicial de documentos. Busque el folio por periodo (año/mes) y regístrelo en el sistema. El documento se inicializará automáticamente bajo el estado: Control Iniciado.",
            icon: <BookOpen className="text-[#2383C2]" />
        },
        {
            title: "2. Procesar Códigos",
            desc: "Conciliación de ítems contra el maestro de productos.",
            items: [
                { label: "Códigos no registrados:", text: "Ítems faltantes que requieren creación o asociación manual en el maestro." },
                { label: "Procesar en Orden:", text: "Validación exitosa; el folio está habilitado para el cruce con órdenes de compra." }
            ],
            icon: <CheckCircle className="text-[#2383C2]" />
        },
        {
            title: "3. Procesar Orden",
            desc: "Cruce operativo entre facturación y órdenes de compra. El sistema detecta automáticamente discrepancias en montos o cantidades.",
            items: [
                { label: "Iniciar Solicitud:", text: "Discrepancia detectada; requiere gestión de corrección." },
                { label: "Listo para Ingresar:", text: "Conciliación conforme; documento apto para proceso final." }
            ],
            icon: <RefreshCcw className="text-[#2383C2]" />
        },
        {
            title: "4. Solicitud Excel",
            desc: "Gestión de incidencias. Centraliza los folios en estado 'Iniciar Solicitud' para su exportación a reporte. Tras la exportación, el estado cambia a 'Solicitud Enviada', permitiendo el seguimiento de las correcciones solicitadas.",
            icon: <AlertCircle className="text-[#2383C2]" />
        }
    ];

    return (
        <div className="p-8 bg-gray-50 dark:bg-gray-900 min-h-full transition-colors">
            <div className="max-w-4xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-2xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">Manual de Operaciones</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm">Guía de referencia rápida para el flujo de conciliación de facturas.</p>
                </div>

                <div className="space-y-4">
                    {steps.map((step, idx) => (
                        <div key={idx} className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-start gap-4">
                                <div className="mt-1 p-2 bg-[#2383C2]/10 dark:bg-[#2383C2]/20 rounded-lg">{step.icon}</div>
                                <div className="flex-1">
                                    <h3 className="text-[15px] font-bold text-gray-800 dark:text-gray-100">{step.title}</h3>
                                    <p className="text-[13px] text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">{step.desc}</p>
                                    
                                    {step.items && (
                                        <div className="mt-4 space-y-2">
                                            {step.items.map((item, i) => (
                                                <div key={i} className="flex gap-2 text-[13px]">
                                                    <ChevronRight size={16} className="text-[#2383C2] shrink-0" />
                                                    <p className="text-gray-600 dark:text-gray-400">
                                                        <span className="font-semibold text-gray-800 dark:text-gray-200">{item.label}</span> {item.text}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-8 p-6 bg-[#2383C2] rounded-xl text-white shadow-lg">
                    <h4 className="font-bold mb-2 uppercase tracking-widest text-[11px] opacity-80">Nota sobre el Flujo Iterativo</h4>
                    <p className="text-[13px] opacity-90 leading-relaxed">
                        El sistema permite procesos cíclicos. Una vez solicitada una corrección en <strong>Solicitud Excel</strong>, el flujo permite retornar a <strong>Procesar Orden</strong> para re-evaluar la consistencia de los datos tras la actualización.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AyudaContextos;