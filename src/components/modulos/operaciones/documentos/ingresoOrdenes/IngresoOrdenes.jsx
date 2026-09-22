import { useState } from 'react';
import { FileUp, Loader2, AlertTriangle, CalendarSearch, ArrowLeft } from 'lucide-react';
import { useGranularPermission } from '../../../../../hooks/useGranularPermission';
import PaginacionSimple from '../../../../ui/PaginacionSimple';
import { useDocumentosSistemaPeriodo } from '../hooks/useDocumentosSistemaPeriodo';
import { useIngresoOrdenesFiltros } from './hooks/useIngresoOrdenesFiltros';
import IngresoOrdenesDetalleView from './components/IngresoOrdenesDetalleView';

const PATH_VISTA = '/documentos/ingresoOrdenes';

const NOMBRES_MESES = {
  '01': 'Enero', '02': 'Febrero', '03': 'Marzo', '04': 'Abril',
  '05': 'Mayo', '06': 'Junio', '07': 'Julio', '08': 'Agosto',
  '09': 'Septiembre', '10': 'Octubre', '11': 'Noviembre', '12': 'Diciembre'
};

const formatearFechaCelda = (valor) => {
  if (!valor) return '-';
  const fecha = valor.toDate ? valor.toDate() : new Date(valor);
  if (isNaN(fecha.getTime())) return '-';
  const dd = String(fecha.getDate()).padStart(2, '0');
  const mm = String(fecha.getMonth() + 1).padStart(2, '0');
  return `${dd}-${mm}-${fecha.getFullYear()}`;
};

const IngresoOrdenes = () => {
  const { hasPermission } = useGranularPermission();
  const [grupoSeleccionado, setGrupoSeleccionado] = useState(null);

  const {
    anio, setAnio, anios, cargandoAnios,
    mes, setMes, meses, cargandoMeses,
    filas, cargandoFilas, huboTope
  } = useDocumentosSistemaPeriodo();

  const {
    empresa, setEmpresa, opcionesEmpresas,
    gruposPagina, totalFilas,
    pagina, setPagina, totalPaginas
  } = useIngresoOrdenesFiltros(filas);

  return (
    <div className="w-full h-full flex flex-col bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-lg shadow-sm overflow-hidden font-sans text-[11px]">
      <header className="bg-white dark:bg-gray-800 border-b border-slate-200 dark:border-gray-700 px-3 py-2 flex items-center gap-2">
        {grupoSeleccionado && (
          <button
            onClick={() => setGrupoSeleccionado(null)}
            className="p-1 rounded-md border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-slate-600 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-700/50 transition"
            title="Volver"
          >
            <ArrowLeft size={13} />
          </button>
        )}
        <FileUp size={16} className="text-[#2383C2]" />
        <span className="text-[12px] font-normal text-slate-800 dark:text-gray-100 tracking-wide uppercase">
          {grupoSeleccionado ? 'Detalle de Orden' : 'Ingreso de Órdenes'}
        </span>
      </header>

      {grupoSeleccionado ? (
        <IngresoOrdenesDetalleView grupo={grupoSeleccionado} />
      ) : (
        <>
          {hasPermission(PATH_VISTA, 'barra_filtros') && (
            <div className="bg-gray-50 dark:bg-gray-800/50 px-3 py-1.5 flex flex-wrap items-center gap-2 border-b border-gray-200 dark:border-gray-700">
              <select
                value={anio}
                onChange={(e) => setAnio(e.target.value)}
                disabled={cargandoAnios}
                className="h-7 px-2 border border-gray-300 dark:border-gray-600 rounded text-[11px] bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 outline-none focus:border-[#2383C2] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">{cargandoAnios ? 'Cargando años...' : 'Año'}</option>
                {anios.map((yyyy) => (
                  <option key={yyyy} value={yyyy}>{yyyy}</option>
                ))}
              </select>

              <select
                value={mes}
                onChange={(e) => setMes(e.target.value)}
                disabled={!anio || cargandoMeses}
                className="h-7 px-2 border border-gray-300 dark:border-gray-600 rounded text-[11px] bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 outline-none focus:border-[#2383C2] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">{cargandoMeses ? 'Cargando meses...' : 'Mes'}</option>
                {meses.map((mm) => (
                  <option key={mm} value={mm}>{NOMBRES_MESES[mm] || mm}</option>
                ))}
              </select>

              <select
                value={empresa}
                onChange={(e) => setEmpresa(e.target.value)}
                disabled={!anio}
                className="h-7 px-2 border border-gray-300 dark:border-gray-600 rounded text-[11px] bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 outline-none focus:border-[#2383C2] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">Empresa</option>
                {opcionesEmpresas.map((nombre) => (
                  <option key={nombre} value={nombre}>{nombre}</option>
                ))}
              </select>
            </div>
          )}

          {!anio ? (
            <div className="flex-grow flex flex-col items-center justify-center gap-2 text-center text-slate-400 dark:text-gray-500 px-6">
              <CalendarSearch size={26} className="text-slate-300 dark:text-gray-600" />
              <span className="text-[11px] font-medium">Selecciona un año para ver los registros</span>
            </div>
          ) : cargandoFilas ? (
            <div className="flex-grow flex items-center justify-center gap-2 text-slate-400 dark:text-gray-500 text-[11px]">
              <Loader2 size={14} className="animate-spin" /> Cargando registros...
            </div>
          ) : (
            <>
              {huboTope && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 px-3 py-1 text-[10.5px] text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                  <AlertTriangle size={11} /> Este período tiene muchos registros — puede que no se estén mostrando todos.
                </div>
              )}
              <div className="flex-grow overflow-auto">
                <table className="w-full text-left text-[11px] border-collapse">
                  <thead className="bg-slate-100 dark:bg-gray-900/80 sticky top-0 z-10">
                    <tr className="text-slate-600 dark:text-gray-400 uppercase font-normal text-[10px] tracking-wider">
                      <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700">Admisión</th>
                      <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700">Paciente</th>
                      <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700">Médico</th>
                      <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700">Empresa</th>
                      <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700">Fecha Cx</th>
                      <th className="px-2 py-1.5 border-b border-slate-200 dark:border-gray-700 text-center">N° Ítems</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/60 dark:divide-gray-700/50 bg-white dark:bg-gray-800">
                    {gruposPagina.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-6 text-center text-slate-400 dark:text-gray-500 text-xs">
                          No hay registros para los filtros seleccionados.
                        </td>
                      </tr>
                    ) : (
                      gruposPagina.map((grupo) => (
                        <tr
                          key={grupo.groupId}
                          onDoubleClick={() => setGrupoSeleccionado(grupo)}
                          className="hover:bg-slate-50 dark:hover:bg-gray-700/40 transition-all duration-150 cursor-pointer"
                          title="Doble clic para ver el detalle"
                        >
                          <td className="px-2 py-1 border-b border-r border-slate-200/60 dark:border-gray-700/70 font-semibold text-[#2383C2]">{grupo.admision || '-'}</td>
                          <td className="px-2 py-1 border-b border-r border-slate-200/60 dark:border-gray-700/70 truncate max-w-[180px]" title={grupo.paciente}>{grupo.paciente || '-'}</td>
                          <td className="px-2 py-1 border-b border-r border-slate-200/60 dark:border-gray-700/70 truncate max-w-[160px]" title={grupo.medico}>{grupo.medico || '-'}</td>
                          <td className="px-2 py-1 border-b border-r border-slate-200/60 dark:border-gray-700/70 truncate max-w-[180px]" title={grupo.proveedor}>{grupo.proveedor || '-'}</td>
                          <td className="px-2 py-1 border-b border-r border-slate-200/60 dark:border-gray-700/70 whitespace-nowrap">{formatearFechaCelda(grupo.fecha_cx)}</td>
                          <td className="px-2 py-1 border-b border-slate-200/60 dark:border-gray-700/70 text-center font-semibold">{grupo.totalItems}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <PaginacionSimple pagina={pagina} totalPaginas={totalPaginas} totalFilas={totalFilas} setPagina={setPagina} />
            </>
          )}
        </>
      )}
    </div>
  );
};

export default IngresoOrdenes;
