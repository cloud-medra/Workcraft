import React, { useState } from 'react';
import { Lock, Unlock, RefreshCw, Layers, ChevronRight, ChevronDown, History } from 'lucide-react';

export const BadgeEstado = ({ estado }) => {
  const estilos = {
    ABIERTO: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800',
    CERRADO: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    REABIERTO: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800',
    MIXTO: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-800',
    DEFAULT: 'bg-gray-50 text-gray-500 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700',
  };

  const iconos = {
    ABIERTO: <Unlock size={10} />,
    CERRADO: <Lock size={10} />,
    REABIERTO: <RefreshCw size={10} />,
    MIXTO: <Layers size={10} />,
  };

  const estiloActual = estilos[estado] || estilos.DEFAULT;
  const iconoActual = iconos[estado] || null;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide border uppercase ${estiloActual}`}>
      {iconoActual}
      {estado || 'SIN INICIAR'}
    </span>
  );
};

const MonthRow = ({
  mes,
  anioSeleccionado,
  moduloFiltro,
  estadoConsolidado,
  metricasConsolidadas,
  modulosObjetivo,
  estadosModulos,
  resumenImputaciones,
  onAbrir,
  onCerrar,
  onSolicitarReapertura,
  onVerHistorial
}) => {
  const [desplegado, setDesplegado] = useState(false);

  return (
    <>
      <tr className="border-b border-slate-200 dark:border-gray-800 hover:bg-slate-50/80 dark:hover:bg-gray-800/50 transition-colors text-xs text-slate-700 dark:text-gray-200">
        <td className="py-3 px-4 font-semibold flex items-center gap-2">
          {moduloFiltro === 'TODOS' && (
            <button
              onClick={() => setDesplegado(!desplegado)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded transition"
            >
              {desplegado ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          )}
          <span className="uppercase tracking-wider text-[11px] font-bold text-slate-900 dark:text-gray-100">
            {mes.nombre}
          </span>
          <span className="text-[10px] text-slate-400 font-mono">/{anioSeleccionado}</span>
        </td>

        <td className="py-3 px-4">
          <BadgeEstado estado={estadoConsolidado} />
        </td>

        <td className="py-3 px-4 font-mono text-[11px] text-right font-medium text-slate-600 dark:text-gray-300">
          {metricasConsolidadas.cantidad.toLocaleString('es-CL')} docs
        </td>

        <td className="py-3 px-4 font-mono text-xs text-right font-bold text-slate-800 dark:text-gray-100">
          ${Math.round(metricasConsolidadas.montoTotal).toLocaleString('es-CL')}
        </td>

        <td className="py-3 px-4 text-right">
          <div className="flex items-center justify-end gap-1.5">
            {estadoConsolidado === 'CERRADO' ? (
              <button
                onClick={() => onSolicitarReapertura(mes.id)}
                className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-300 dark:bg-amber-950/30 dark:hover:bg-amber-900/50 dark:text-amber-300 dark:border-amber-800 rounded text-[10px] font-semibold transition inline-flex items-center gap-1"
              >
                <RefreshCw size={10} /> Reabrir
              </button>
            ) : (
              <>
                <button
                  onClick={() => onAbrir(mes.id)}
                  className="px-2.5 py-1 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-300 dark:bg-sky-950/30 dark:hover:bg-sky-900/50 dark:text-sky-300 dark:border-sky-800 rounded text-[10px] font-semibold transition inline-flex items-center gap-1"
                >
                  <Unlock size={10} /> Abrir
                </button>
                <button
                  onClick={() => onCerrar(mes.id)}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 dark:border-slate-600 rounded text-[10px] font-semibold transition inline-flex items-center gap-1"
                >
                  <Lock size={10} /> Cerrar
                </button>
              </>
            )}
          </div>
        </td>
      </tr>

      {desplegado && moduloFiltro === 'TODOS' && (
        <tr className="bg-slate-50/50 dark:bg-gray-900/60 border-b border-slate-200 dark:border-gray-800">
          <td colSpan={5} className="py-2 px-8">
            <div className="bg-white dark:bg-gray-800 rounded border border-slate-200 dark:border-gray-700 overflow-hidden my-1">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100/70 dark:bg-gray-700/50 text-[9px] uppercase tracking-wider text-slate-500 dark:text-gray-400 border-b border-slate-200 dark:border-gray-700">
                    <th className="py-1.5 px-3 font-semibold">Módulo</th>
                    <th className="py-1.5 px-3 font-semibold">Estado</th>
                    <th className="py-1.5 px-3 font-semibold text-right">Documentos</th>
                    <th className="py-1.5 px-3 font-semibold text-right">Monto Total</th>
                    <th className="py-1.5 px-3 font-semibold text-right">Acciones Modulares</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-gray-700/50 text-[10px]">
                  {modulosObjetivo.map((mod) => {
                    const estMod = estadosModulos[mod.id]?.[mes.id]?.estado || 'SIN_INICIAR';
                    const resMod = resumenImputaciones[mod.id]?.[mes.id] || { cantidad: 0, montoTotal: 0 };
                    const infoMod = estadosModulos[mod.id]?.[mes.id] || {};

                    return (
                      <tr key={mod.id} className="hover:bg-slate-50 dark:hover:bg-gray-700/30">
                        <td className="py-1.5 px-3 font-medium text-slate-700 dark:text-gray-300">
                          {mod.nombre}
                        </td>
                        <td className="py-1.5 px-3">
                          <BadgeEstado estado={estMod} />
                        </td>
                        <td className="py-1.5 px-3 font-mono text-right text-slate-600 dark:text-gray-400">
                          {resMod.cantidad} docs
                        </td>
                        <td className="py-1.5 px-3 font-mono text-right text-slate-700 dark:text-gray-300 font-semibold">
                          ${Math.round(resMod.montoTotal).toLocaleString('es-CL')}
                        </td>
                        <td className="py-1.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {estMod === 'CERRADO' ? (
                              <button
                                onClick={() => onSolicitarReapertura(mes.id, mod.id)}
                                className="p-1 hover:bg-amber-100 text-amber-700 dark:hover:bg-amber-900/40 dark:text-amber-400 rounded transition"
                                title="Reabrir módulo"
                              >
                                <RefreshCw size={11} />
                              </button>
                            ) : estMod === 'ABIERTO' || estMod === 'REABIERTO' ? (
                              <button
                                onClick={() => onCerrar(mes.id, mod.id)}
                                className="p-1 hover:bg-rose-100 text-rose-700 dark:hover:bg-rose-900/40 dark:text-rose-400 rounded transition"
                                title="Cerrar módulo"
                              >
                                <Lock size={11} />
                              </button>
                            ) : (
                              <button
                                onClick={() => onAbrir(mes.id, mod.id)}
                                className="p-1 hover:bg-sky-100 text-sky-700 dark:hover:bg-sky-900/40 dark:text-sky-400 rounded transition"
                                title="Abrir módulo"
                              >
                                <Unlock size={11} />
                              </button>
                            )}

                            {infoMod.historialReaperturas?.length > 0 && (
                              <button
                                onClick={() => onVerHistorial({ ...infoMod, moduloNombre: mod.nombre })}
                                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                                title="Historial de reaperturas"
                              >
                                <History size={11} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

export default MonthRow;