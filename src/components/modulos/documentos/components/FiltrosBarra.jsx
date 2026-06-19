import React from 'react';
import { Search } from 'lucide-react';

const FiltrosBarra = ({ filtros, setFiltros, listasFiltros, totalFilas, totalPendientesOC, hasPermission }) => {
  const RUTA = '/documentos/carga';

  return (
    <div className="bg-gray-50 p-3 flex flex-wrap gap-2 items-center border-b border-gray-200">

      {hasPermission(RUTA, 'filtros_barra', 'cargaDatos_filtros_anio') && (
        <select
          value={filtros.anio}
          onChange={(e) => setFiltros(prev => ({ ...prev, anio: e.target.value, mes: '', dia: '' }))}
          className="h-8 border border-gray-300 rounded text-[12px] px-2 outline-none"
        >
          <option value="">Año</option>
          {listasFiltros.aniosDisponibles.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      )}

      {hasPermission(RUTA, 'filtros_barra', 'cargaDatos_filtros_mes') && (
        <select
          value={filtros.mes}
          onChange={(e) => setFiltros(prev => ({ ...prev, mes: e.target.value, dia: '' }))}
          disabled={!filtros.anio}
          className="h-8 border border-gray-300 rounded text-[12px] px-2 outline-none capitalize disabled:opacity-50"
        >
          <option value="">Mes</option>
          {listasFiltros.mesesDisponibles.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      )}

      {hasPermission(RUTA, 'filtros_barra', 'cargaDatos_filtros_dia') && (
        <input
          value={filtros.dia}
          onChange={(e) => setFiltros(prev => ({ ...prev, dia: e.target.value }))}
          disabled={!filtros.mes}
          className="h-8 w-16 border border-gray-300 rounded text-[12px] px-2 outline-none disabled:opacity-50"
          placeholder="Día"
        />
      )}

      {hasPermission(RUTA, 'filtros_barra', 'cargaDatos_filtros_estadoOC') && (
        <select
          value={filtros.estadoOC || 'todos'}
          onChange={(e) => setFiltros(prev => ({ ...prev, estadoOC: e.target.value }))}
          className={`h-8 border rounded text-[12px] px-2 outline-none font-medium transition-colors ${filtros.estadoOC === 'sin_oc'
              ? 'border-red-300 bg-red-50 text-red-700 font-bold'
              : filtros.estadoOC === 'parcial'
                ? 'border-yellow-300 bg-yellow-50 text-yellow-700 font-bold'
                : filtros.estadoOC === 'con_oc'
                  ? 'border-green-300 bg-green-50 text-green-700 font-bold'
                  : 'border-gray-300 bg-white text-gray-700'
            }`}
        >
          <option value="todos">Todos los Estados OC</option>
          <option value="con_oc">🟢 Con OC Completa</option>
          <option value="parcial">🟡 Carga Parcial</option>
          <option value="sin_oc">🔴 Sin OC Cargada</option>
        </select>
      )}

      {hasPermission(RUTA, 'filtros_barra', 'cargaDatos_filtros_busqueda') && (
        <div className="relative flex-grow max-w-sm">
          <Search className="absolute left-2 top-2 text-gray-400" size={14} />
          <input
            value={filtros.busqueda}
            onChange={e => setFiltros(prev => ({ ...prev, busqueda: e.target.value }))}
            className="w-full h-8 pl-8 pr-2 border border-gray-300 rounded text-[12px] outline-none"
            placeholder="Buscar admisión o paciente..."
          />
        </div>
      )}

      <div className="ml-auto flex items-center gap-2 text-[11px]">
        {totalPendientesOC > 0 && (
          <span className="bg-red-100 text-red-700 font-black px-2 py-0.5 rounded animate-pulse">
            ⚠️ Incompletas/Faltan: {totalPendientesOC}
          </span>
        )}
        <span className="text-gray-400">{totalFilas} fila(s)</span>
      </div>
    </div>
  );
};

export default FiltrosBarra;