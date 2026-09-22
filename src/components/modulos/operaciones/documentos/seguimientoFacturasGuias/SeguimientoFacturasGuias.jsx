import { useState } from 'react';
import { Receipt, Truck, Loader2, AlertTriangle, CalendarSearch, ArrowLeft } from 'lucide-react';
import { useGranularPermission } from '../../../../../hooks/useGranularPermission';
import PaginacionSimple from '../../../../ui/PaginacionSimple';
import { useDocumentosSistemaPeriodo } from '../hooks/useDocumentosSistemaPeriodo';
import { useSeguimientoFiltros } from './hooks/useSeguimientoFiltros';

const PATH_VISTA = '/documentos/seguimientoFacturasGuias';

// Objetos estables a nivel de módulo (no se recrean en cada render) — se
// pasan tal cual a useDocumentosSistemaPeriodo(filtroServidor). NUMERO_GUIA
// se guarda siempre como texto recortado (nunca number) — ver CAMPOS_TEXTO
// en parsearFilaDetalleOC.js — así que 'in' cubre tanto vacío como el caso
// de una guía cargada literalmente como "0".
const CRITERIOS = {
  facturas: {
    id: 'facturas',
    label: 'Seguimiento de Facturas',
    Icon: Receipt,
    filtro: { campo: 'estado', operador: '==', valor: 'Pendiente factura' },
    mensajeVacio: 'No hay registros pendientes de factura para los filtros seleccionados.'
  },
  guias: {
    id: 'guias',
    label: 'Seguimiento de Guías',
    Icon: Truck,
    filtro: { campo: 'numero_guia', operador: 'in', valor: ['', '0'] },
    mensajeVacio: 'No hay registros con despacho pendiente para los filtros seleccionados.'
  }
};

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

const SelectorTipoSeguimiento = ({ onElegir }) => (
  <div className="flex-grow flex flex-col items-center justify-center gap-4 p-6">
    <span className="text-[11px] font-medium text-slate-500 dark:text-gray-400 uppercase tracking-wide">
      ¿Qué querés revisar?
    </span>
    <div className="flex flex-wrap items-center justify-center gap-3">
      {Object.values(CRITERIOS).map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => onElegir(id)}
          className="w-52 flex flex-col items-center gap-2 px-5 py-6 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg shadow-sm hover:border-[#2383C2] hover:shadow-md transition"
        >
          <Icon size={24} className="text-[#2383C2]" />
          <span className="text-[12px] font-semibold text-slate-700 dark:text-gray-100">{label}</span>
        </button>
      ))}
    </div>
  </div>
);

const SeguimientoFacturasGuias = () => {
  const { hasPermission } = useGranularPermission();
  const [tipoId, setTipoId] = useState(null);
  const criterio = tipoId ? CRITERIOS[tipoId] : null;

  const {
    anio, setAnio, anios, cargandoAnios,
    mes, setMes, meses, cargandoMeses,
    filas, cargandoFilas, huboTope
  } = useDocumentosSistemaPeriodo(criterio?.filtro);

  const {
    empresa, setEmpresa, opcionesEmpresas,
    filasPagina, totalFilas,
    pagina, setPagina, totalPaginas
  } = useSeguimientoFiltros(filas);

  return (
    <div className="w-full h-full flex flex-col bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-lg shadow-sm overflow-hidden font-sans text-[11px]">
      <header className="bg-white dark:bg-gray-800 border-b border-slate-200 dark:border-gray-700 px-3 py-2 flex items-center gap-2">
        {criterio && (
          <button
            onClick={() => setTipoId(null)}
            className="p-1 rounded-md border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-slate-600 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-700/50 transition"
            title="Volver"
          >
            <ArrowLeft size={13} />
          </button>
        )}
        {criterio ? <criterio.Icon size={16} className="text-[#2383C2]" /> : <Receipt size={16} className="text-[#2383C2]" />}
        <span className="text-[12px] font-normal text-slate-800 dark:text-gray-100 tracking-wide uppercase">
          {criterio ? criterio.label : 'Seguimiento de Facturas y Guías'}
        </span>
      </header>

      {!criterio ? (
        <SelectorTipoSeguimiento onElegir={setTipoId} />
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
                <table className="w-full text-left text-[11px] border-collapse min-w-[1200px]">
                  <thead className="bg-slate-100 dark:bg-gray-900/80 sticky top-0 z-10">
                    <tr className="text-slate-600 dark:text-gray-400 uppercase font-normal text-[10px] tracking-wider">
                      <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700">ID</th>
                      <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700">Admisión</th>
                      <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700">Paciente</th>
                      <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700">Médico</th>
                      <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700">Fecha Cx</th>
                      <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700">Empresa</th>
                      <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700">Código</th>
                      <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700">Descripción</th>
                      <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700 text-center">Cant.</th>
                      <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700">OC</th>
                      <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700">N° Guía</th>
                      <th className="px-2 py-1.5 border-b border-slate-200 dark:border-gray-700">N° Factura</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/60 dark:divide-gray-700/50 bg-white dark:bg-gray-800">
                    {filasPagina.length === 0 ? (
                      <tr>
                        <td colSpan={12} className="px-4 py-6 text-center text-slate-400 dark:text-gray-500 text-xs">
                          {criterio.mensajeVacio}
                        </td>
                      </tr>
                    ) : (
                      filasPagina.map((item) => (
                        <tr key={item.refPath} className="hover:bg-slate-50 dark:hover:bg-gray-700/40 transition-all duration-150">
                          <td className="px-2 py-1 border-b border-r border-slate-200/60 dark:border-gray-700/70 font-mono text-slate-600 dark:text-gray-400">{item.id}</td>
                          <td className="px-2 py-1 border-b border-r border-slate-200/60 dark:border-gray-700/70 font-semibold text-[#2383C2]">{item.admision}</td>
                          <td className="px-2 py-1 border-b border-r border-slate-200/60 dark:border-gray-700/70 truncate max-w-[160px]" title={item.paciente}>{item.paciente || '-'}</td>
                          <td className="px-2 py-1 border-b border-r border-slate-200/60 dark:border-gray-700/70 truncate max-w-[140px]" title={item.medico}>{item.medico || '-'}</td>
                          <td className="px-2 py-1 border-b border-r border-slate-200/60 dark:border-gray-700/70 whitespace-nowrap">{formatearFechaCelda(item.fecha_cx)}</td>
                          <td className="px-2 py-1 border-b border-r border-slate-200/60 dark:border-gray-700/70 truncate max-w-[160px]" title={item.proveedor}>{item.proveedor || '-'}</td>
                          <td className="px-2 py-1 border-b border-r border-slate-200/60 dark:border-gray-700/70 font-mono text-emerald-600 dark:text-emerald-400">{item.codigo || '-'}</td>
                          <td className="px-2 py-1 border-b border-r border-slate-200/60 dark:border-gray-700/70 truncate max-w-[200px]" title={item.descripcion}>{item.descripcion || '-'}</td>
                          <td className="px-2 py-1 border-b border-r border-slate-200/60 dark:border-gray-700/70 text-center">{item.cantidad ?? '-'}</td>
                          <td className="px-2 py-1 border-b border-r border-slate-200/60 dark:border-gray-700/70">{item.oc || '-'}</td>
                          <td className="px-2 py-1 border-b border-r border-slate-200/60 dark:border-gray-700/70">{item.numero_guia || '-'}</td>
                          <td className="px-2 py-1 border-b border-slate-200/60 dark:border-gray-700/70">{item.numero_factura || '-'}</td>
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

export default SeguimientoFacturasGuias;
