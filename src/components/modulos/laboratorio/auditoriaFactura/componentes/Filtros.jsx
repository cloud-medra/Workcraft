import { Search } from 'lucide-react';
import { NOMBRES_MESES } from '../utils/constantes';

export const Filtros = ({ filtroAnio, setFiltroAnio, filtroMes, setFiltroMes, anios = [], meses = [], busqueda, setBusqueda }) => (
  <div className="bg-gray-50 p-3 flex flex-wrap gap-2 items-center border-b border-gray-200">
    <select
      value={filtroAnio}
      onChange={(e) => setFiltroAnio(e.target.value)}
      className="h-8 border border-gray-300 rounded text-[12px] px-2 outline-none"
    >
      <option value="">Seleccione Año</option>
      {anios.map(y => <option key={y} value={y}>{y}</option>)}
    </select>

    <select
      value={filtroMes}
      onChange={(e) => setFiltroMes(e.target.value)}
      disabled={!filtroAnio}
      className="h-8 border border-gray-300 rounded text-[12px] px-2 outline-none capitalize"
    >
      <option value="">Seleccione Mes</option>
      {meses.map(m => <option key={m} value={m}>{NOMBRES_MESES[m] || m}</option>)}
    </select>

    <div className="relative flex-grow max-w-sm">
      <Search className="absolute left-2 top-2 text-gray-400" size={14} />
      <input
        value={busqueda}
        onChange={e => setBusqueda(e.target.value)}
        className="w-full h-8 pl-8 pr-2 border border-gray-300 rounded text-[12px] outline-none"
        placeholder="Buscar..."
      />
    </div>
  </div>
);