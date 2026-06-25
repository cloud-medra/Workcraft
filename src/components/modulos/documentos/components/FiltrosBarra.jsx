import React from 'react';
import { Search } from 'lucide-react';

const FiltrosBarra = ({ filtros, setFiltros, listasFiltros, totalFilas, totalPendientesOC, hasPermission }) => {
  const RUTA = '/documentos/carga';

  return (
    <div className="bg-gray-50 dark:bg-gray-900/60 p-3 flex flex-wrap gap-2 items-center border-b border-gray-200 dark:border-gray-700">

      {hasPermission(RUTA, 'filtros_barra', 'cargaDatos_filtros_anio') && (
        <select
          value={filtros.anio}
          onChange={(e) => setFiltros(prev => ({ ...prev, anio: e.target.value, mes: '', dia: '' }))}
          className="h-8 border border-gray-300 dark:border-gray-600 rounded text-[12px] px-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 outline-none dark:[color-scheme:dark]"
        >
          <option value="" className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200">Año</option>
          {listasFiltros.aniosDisponibles.map(a => (
            <option key={a} value={a} className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200">{a}</option>
          ))}
        </select>
      )}

      {hasPermission(RUTA, 'filtros_barra', 'cargaDatos_filtros_mes') && (
        <select
          value={filtros.mes}
          onChange={(e) => setFiltros(prev => ({ ...prev, mes: e.target.value, dia: '' }))}
          disabled={!filtros.anio}
          className="h-8 border border-gray-300 dark:border-gray-600 rounded text-[12px] px-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 outline-none capitalize disabled:opacity-50 dark:[color-scheme:dark]"
        >
          <option value="" className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200">Mes</option>
          {listasFiltros.mesesDisponibles.map(m => (
            <option key={m} value={m} className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200">{m}</option>
          ))}
        </select>
      )}

      {hasPermission(RUTA, 'filtros_barra', 'cargaDatos_filtros_dia') && (
        <input
          value={filtros.dia}
          onChange={(e) => setFiltros(prev => ({ ...prev, dia: e.target.value }))}
          disabled={!filtros.mes}
          className="h-8 w-16 border border-gray-300 dark:border-gray-600 rounded text-[12px] px-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 outline-none disabled:opacity-50 placeholder-gray-400 dark:placeholder-gray-500"
          placeholder="Día"
        />
      )}

      {hasPermission(RUTA, 'filtros_barra', 'cargaDatos_filtros_estadoOC') && (
        <select
          value={filtros.estadoOC || 'todos'}
          onChange={(e) => setFiltros(prev => ({ ...prev, estadoOC: e.target.value }))}
          className={`h-8 border rounded text-[12px] px-2 outline-none font-medium transition-colors dark:[color-scheme:dark] ${
            filtros.estadoOC === 'sin_oc'
              ? 'border-red-300 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 font-bold'
              : filtros.estadoOC === 'parcial'
                ? 'border-yellow-300 dark:border-yellow-900/50 bg-yellow-50 dark:bg-yellow-950/20 text-yellow-700 dark:text-yellow-400 font-bold'
                : filtros.estadoOC === 'con_oc'
                  ? 'border-green-300 dark:border-green-900/50 bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 font-bold'
                  : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200'
          }`}
        >
          <option value="todos" className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200">Todos los Estados OC</option>
          <option value="con_oc" className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200">🟢 Con OC Completa</option>
          <option value="parcial" className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200">🟡 Carga Parcial</option>
          <option value="sin_oc" className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200">🔴 Sin OC Cargada</option>
        </select>
      )}

      {hasPermission(RUTA, 'filtros_barra', 'cargaDatos_filtros_busqueda') && (
        <div className="relative flex-grow max-w-sm">
          <Search className="absolute left-2 top-2 text-gray-400 dark:text-gray-500" size={14} />
          <input
            value={filtros.busqueda}
            onChange={e => setFiltros(prev => ({ ...prev, busqueda: e.target.value }))}
            className="w-full h-8 pl-8 pr-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded text-[12px] text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 outline-none"
            placeholder="Buscar admisión o paciente..."
          />
        </div>
      )}

      <div className="ml-auto flex items-center gap-2 text-[11px]">
        {totalPendientesOC > 0 && (
          <span className="bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400 font-black px-2 py-0.5 rounded animate-pulse">
            ⚠️ Incompletas/Faltan: {totalPendientesOC}
          </span>
        )}
        <span className="text-gray-400 dark:text-gray-500">{totalFilas} fila(s)</span>
      </div>
    </div>
  );
};

export default FiltrosBarra;