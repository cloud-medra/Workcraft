import React from 'react';
import { X, Calendar, CheckSquare, Square, ShieldCheck } from 'lucide-react';
import { MESES, MODULOS } from './constants';

const PanelAperturaPeriodo = ({
    isOpen,
    onClose,
    anioApertura,
    setAnioApertura,
    mesApertura,
    setMesApertura,
    modulosSeleccionados,
    setModulosSeleccionados,
    onConfirm,
    estadosModulos // Recibe los estados globales cargados desde Firebase
}) => {
    if (!isOpen) return null;

    const anioActual = new Date().getFullYear();
    const listaAnios = [anioActual, anioActual + 1];

    // Validación: Verifica si hay al menos un módulo con estado ABIERTO o REABIERTO en el año seleccionado
    const hayMesAbiertoEnAnio = Object.values(estadosModulos || {}).some(modulosObj => {
        return Object.values(modulosObj || {}).some(datosMes => {
            const anioEfectivo = datosMes.anio || anioApertura;
            const esDelAnio = String(anioEfectivo) === String(anioApertura);
            const estaAbierto = datosMes.estado === 'ABIERTO' || datosMes.estado === 'REABIERTO';
            return esDelAnio && estaAbierto;
        });
    });

    // Filtrado de meses: Oculta el mes si CUALQUIER módulo ya tiene un estado registrado para el año seleccionado.
    const mesesDisponibles = MESES.filter(mes => {
        const yaTieneEstadoEnAlgunModulo = MODULOS.some(mod => {
            const datosModuloMes = estadosModulos?.[mod.id]?.[mes.id];
            const estado = datosModuloMes?.estado;
            const anioDelDato = datosModuloMes?.anio;

            const tieneEstadoValido = estado && estado !== 'SIN_INICIAR';
            // Si el registro no tiene año guardado explícitamente, asumimos el año actual o el de apertura
            const anioEfectivo = anioDelDato || anioApertura;
            const esDelAnioSeleccionado = String(anioEfectivo) === String(anioApertura);

            return tieneEstadoValido && esDelAnioSeleccionado;
        });

        return !yaTieneEstadoEnAlgunModulo;
    });

    const toggleModulo = (modId) => {
        if (modulosSeleccionados.includes(modId)) {
            setModulosSeleccionados(modulosSeleccionados.filter(id => id !== modId));
        } else {
            setModulosSeleccionados([...modulosSeleccionados, modId]);
        }
    };

    const seleccionarTodosModulos = () => {
        if (modulosSeleccionados.length === MODULOS.length) {
            setModulosSeleccionados([]);
        } else {
            setModulosSeleccionados(MODULOS.map(m => m.id));
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[1px] flex justify-end">
            <div className="w-full max-w-sm bg-white dark:bg-gray-800 h-full shadow-2xl border-l border-slate-200 dark:border-gray-700 flex flex-col font-sans animate-in slide-in-from-right duration-200">

                {/* Header del Panel */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-900">
                    <div className="flex items-center gap-2 text-[#2383C2]">
                        <Calendar size={18} />
                        <h3 className="text-[13px] font-bold uppercase tracking-wide">Apertura de Período</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-gray-200 cursor-pointer p-1"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Cuerpo del Panel */}
                <div className="p-4 flex-1 overflow-y-auto space-y-4 text-[11px]">

                    {/* Alerta si ya existe un mes abierto en el año */}
                    {hayMesAbiertoEnAnio && (
                        <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded text-rose-800 dark:text-rose-300 text-[10px]">
                            ⚠️ No es posible abrir un nuevo período porque ya existe un mes abierto o reabierto en el año {anioApertura}. Debes cerrar los períodos activos primero.
                        </div>
                    )}

                    {/* Selección de Año */}
                    <div className="space-y-1.5">
                        <label className="font-bold text-slate-700 dark:text-gray-300 block">Año del Período</label>
                        <select
                            value={anioApertura}
                            onChange={(e) => setAnioApertura(e.target.value)}
                            className="w-full h-8 border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-slate-800 dark:text-gray-100 rounded px-2 font-bold outline-none focus:border-[#2383C2]"
                        >
                            {listaAnios.map(a => (
                                <option key={a} value={a}>{a}</option>
                            ))}
                        </select>
                    </div>

                    {/* Selección de Mes */}
                    <div className="space-y-1.5">
                        <label className="font-bold text-slate-700 dark:text-gray-300 block">Mes a Abrir</label>
                        {mesesDisponibles.length === 0 ? (
                            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded text-amber-800 dark:text-amber-300 text-[10px]">
                                Todos los meses del año {anioApertura} ya se encuentran abiertos o inicializados.
                            </div>
                        ) : (
                            <select
                                value={mesApertura}
                                onChange={(e) => setMesApertura(e.target.value)}
                                className="w-full h-8 border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-slate-800 dark:text-gray-100 rounded px-2 font-bold outline-none focus:border-[#2383C2] uppercase"
                            >
                                {mesesDisponibles.map(m => (
                                    <option key={m.id} value={m.id}>{m.nombre} ({m.id})</option>
                                ))}
                            </select>
                        )}
                        <p className="text-[9px] text-slate-400">Nota: Los meses ya abiertos para este año se ocultan automáticamente.</p>
                    </div>

                    {/* Selección de Módulos */}
                    <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                            <label className="font-bold text-slate-700 dark:text-gray-300">Módulos Afectados</label>
                            <button
                                onClick={seleccionarTodosModulos}
                                className="text-[#2383C2] hover:underline font-bold text-[10px] cursor-pointer"
                            >
                                {modulosSeleccionados.length === MODULOS.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
                            </button>
                        </div>

                        <div className="space-y-1.5">
                            {MODULOS.map(mod => {
                                const seleccionado = modulosSeleccionados.includes(mod.id);
                                return (
                                    <div
                                        key={mod.id}
                                        onClick={() => toggleModulo(mod.id)}
                                        className={`flex items-center justify-between p-2 rounded border cursor-pointer transition-colors ${seleccionado
                                            ? 'border-[#2383C2] bg-blue-50/50 dark:bg-blue-950/20 text-slate-800 dark:text-gray-100 font-bold'
                                            : 'border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-slate-500 dark:text-gray-400'
                                        }`}
                                    >
                                        <span>{mod.nombre}</span>
                                        {seleccionado ? (
                                            <CheckSquare size={15} className="text-[#2383C2]" />
                                        ) : (
                                            <Square size={15} className="text-slate-300 dark:text-gray-600" />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                </div>

                {/* Footer con Acciones */}
                <div className="p-3 border-t border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-900 flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="px-3 py-1.5 bg-slate-200 dark:bg-gray-700 text-slate-700 dark:text-gray-300 rounded text-[11px] font-bold hover:bg-slate-300 transition cursor-pointer"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={mesesDisponibles.length === 0 || modulosSeleccionados.length === 0 || hayMesAbiertoEnAnio}
                        className="px-3 py-1.5 bg-[#2383C2] hover:bg-[#1d6fa5] text-white rounded text-[11px] font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <ShieldCheck size={14} />
                        Confirmar Apertura
                    </button>
                </div>

            </div>
        </div>
    );
};

export default PanelAperturaPeriodo;