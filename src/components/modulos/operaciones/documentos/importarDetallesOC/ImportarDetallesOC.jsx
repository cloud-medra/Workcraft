import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  FileSpreadsheet, Upload, X, Loader2, AlertTriangle,
  PlusCircle, RefreshCw, MinusCircle, Search, CalendarSearch
} from 'lucide-react';
import { useToast } from '../../../../../context/ToastContext';
import { useGranularPermission } from '../../../../../hooks/useGranularPermission';
import Spinner from '../../../../ui/Spinner';
import PaginacionSimple from '../../../../ui/PaginacionSimple';
import { procesarImportacionDetallesOC } from './utils/procesarImportacionDetallesOC';
import { useDetallesOCData } from './hooks/useDetallesOCData';
import { useDetallesOCFiltros, CAMPOS_BUSQUEDA_OC } from './hooks/useDetallesOCFiltros';

const PATH_VISTA = '/documentos/importarDetallesOC';

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

const ImportarDetallesOC = () => {
  const { showToast } = useToast();
  const { hasPermission } = useGranularPermission();

  const [showModal, setShowModal] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [progreso, setProgreso] = useState(null);
  const [resumen, setResumen] = useState(null);

  const {
    anio, setAnio, anios, cargandoAnios,
    mes, setMes, meses, cargandoMeses,
    filas, cargandoFilas, huboTope,
    recargarFilas
  } = useDetallesOCData();

  const {
    busquedaAdmisionPaciente, setBusquedaAdmisionPaciente,
    campoBusquedaOC, setCampoBusquedaOC,
    textoBusquedaOC, setTextoBusquedaOC,
    filasPagina, totalFilas,
    pagina, setPagina, totalPaginas
  } = useDetallesOCFiltros(filas);

  const periodoSeleccionado = Boolean(anio && mes);
  const cargando = cargandoFilas;

  const onDrop = useCallback(async (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setProcesando(true);
    setResumen(null);
    setProgreso({ etapa: 'leyendo' });

    try {
      const resultado = await procesarImportacionDetallesOC(file, {
        onProgreso: setProgreso
      });
      setResumen(resultado);
      showToast(
        `Importación completa: ${resultado.nuevas} nueva(s), ${resultado.cambiadas} actualizada(s), ${resultado.sinCambios} sin cambios${resultado.errores.length ? `, ${resultado.errores.length} con error` : ''}`,
        resultado.errores.length ? 'info' : 'success'
      );
      recargarFilas();
    } catch (err) {
      console.error('Error al importar Detalles OC:', err);
      showToast('Error al importar: ' + err.message, 'error');
    } finally {
      setProcesando(false);
      setProgreso(null);
    }
  }, [showToast, recargarFilas]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    }
  });

  const textoProgreso = () => {
    if (!progreso) return '';
    if (progreso.etapa === 'leyendo') return 'Leyendo el archivo Excel...';
    if (progreso.etapa === 'hasheando') return `Calculando cambios... (${progreso.actual}/${progreso.total})`;
    if (progreso.etapa === 'escribiendo') return `Guardando en Firestore... (${progreso.actual}/${progreso.total})`;
    if (progreso.etapa === 'guardando_snapshot') return 'Guardando snapshot de comparación...';
    return 'Procesando...';
  };

  const porcentajeProgreso = () => {
    if (!progreso || !progreso.total) return null;
    return Math.round((progreso.actual / progreso.total) * 100);
  };

  return (
    <div className="w-full h-full flex flex-col bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-lg shadow-sm overflow-hidden p-0 relative font-sans text-[11px]">
      {procesando && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-slate-900/30 dark:bg-black/50 backdrop-blur-[2px]">
          <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-xl flex flex-col items-center gap-2 border border-slate-100 dark:border-gray-700 min-w-[260px]">
            <Spinner size="md" color="#2383C2" />
            <h3 className="text-[#2383C2] font-normal text-[12px] text-center">{textoProgreso()}</h3>
            {porcentajeProgreso() !== null && (
              <div className="w-full h-1.5 bg-slate-100 dark:bg-gray-700 rounded-full overflow-hidden mt-1">
                <div className="h-full bg-[#2383C2] rounded-full transition-all" style={{ width: `${porcentajeProgreso()}%` }} />
              </div>
            )}
          </div>
        </div>
      )}

      <header className="bg-white dark:bg-gray-800 border-b border-slate-200 dark:border-gray-700 px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileSpreadsheet size={16} className="text-[#2383C2]" />
          <span className="text-[12px] font-normal text-slate-800 dark:text-gray-100 tracking-wide uppercase">
            Importar Detalles OC
          </span>
        </div>

        {hasPermission(PATH_VISTA, 'cabecera_acciones', 'btn_importar') && (
          <button
            onClick={() => setShowModal(true)}
            className="bg-[#2383C2] hover:bg-[#1c6fa6] text-white px-2.5 py-1 rounded text-[10px] font-normal flex items-center gap-1.5 transition shadow-sm"
          >
            <Upload size={11} /> Importar Excel
          </button>
        )}
      </header>

      {resumen && (
        <div className="bg-white dark:bg-gray-800 border-b border-slate-200 dark:border-gray-700 px-3 py-2 flex flex-wrap items-center gap-3 text-[10.5px]">
          <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold">
            <PlusCircle size={12} /> {resumen.nuevas} nueva(s)
          </span>
          <span className="flex items-center gap-1 text-amber-700 dark:text-amber-400 font-semibold">
            <RefreshCw size={12} /> {resumen.cambiadas} actualizada(s)
          </span>
          <span className="flex items-center gap-1 text-slate-500 dark:text-gray-400">
            <MinusCircle size={12} /> {resumen.sinCambios} sin cambios
          </span>
          {resumen.errores.length > 0 && (
            <span className="flex items-center gap-1 text-red-600 dark:text-red-400 font-semibold" title={resumen.errores.map(e => `${e.id}: ${e.error}`).join('\n')}>
              <AlertTriangle size={12} /> {resumen.errores.length} con error
            </span>
          )}
          <span className="text-slate-400 dark:text-gray-500 ml-auto">
            Firestore: ~{resumen.lecturasFirestoreEstimadas} lectura(s) · ~{resumen.escriturasFirestoreEstimadas} escritura(s)
          </span>
        </div>
      )}

      {hasPermission(PATH_VISTA, 'barra_filtros') && (
        <div className="bg-gray-50 dark:bg-gray-800/50 px-3 py-1.5 flex flex-wrap items-center gap-2 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-1.5">
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
          </div>

          <div className="relative w-56">
            <Search className="absolute left-2 top-1.5 text-gray-400 dark:text-gray-500" size={13} />
            <input
              value={busquedaAdmisionPaciente}
              onChange={(e) => setBusquedaAdmisionPaciente(e.target.value)}
              disabled={!periodoSeleccionado}
              className="w-full h-7 pl-7 pr-2 border border-gray-300 dark:border-gray-600 rounded text-[11px] outline-none bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 focus:border-[#2383C2] disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="Buscar por admisión o paciente..."
            />
          </div>

          <div className="flex items-center h-7 border border-gray-300 dark:border-gray-600 rounded overflow-hidden">
            <select
              value={campoBusquedaOC}
              onChange={(e) => setCampoBusquedaOC(e.target.value)}
              disabled={!periodoSeleccionado}
              className="h-full px-2 border-r border-gray-300 dark:border-gray-600 text-[11px] bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-200 outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {Object.entries(CAMPOS_BUSQUEDA_OC).map(([clave, { label }]) => (
                <option key={clave} value={clave}>{label}</option>
              ))}
            </select>
            <input
              value={textoBusquedaOC}
              onChange={(e) => setTextoBusquedaOC(e.target.value)}
              disabled={!periodoSeleccionado}
              className="h-full w-36 px-2 text-[11px] outline-none bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="Buscar valor..."
            />
          </div>
        </div>
      )}

      {!periodoSeleccionado ? (
        <div className="flex-grow flex flex-col items-center justify-center gap-2 text-center text-slate-400 dark:text-gray-500 px-6">
          <CalendarSearch size={26} className="text-slate-300 dark:text-gray-600" />
          <span className="text-[11px] font-medium">Selecciona un año y mes para ver los registros</span>
        </div>
      ) : cargando ? (
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
                  <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700">Proveedor</th>
                  <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700">Código</th>
                  <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700">Descripción</th>
                  <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700 text-center">Cant.</th>
                  <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700">OC</th>
                  <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700">Estado</th>
                  <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700">N° Guía</th>
                  <th className="px-2 py-1.5 border-b border-slate-200 dark:border-gray-700">N° Factura</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/60 dark:divide-gray-700/50 bg-white dark:bg-gray-800">
                {filasPagina.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="px-4 py-6 text-center text-slate-400 dark:text-gray-500 text-xs">
                      No hay registros para los filtros seleccionados.
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
                      <td className="px-2 py-1 border-b border-r border-slate-200/60 dark:border-gray-700/70">{item.estado || '-'}</td>
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

      {showModal && (
        <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-sans">
          <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-xl shadow-2xl overflow-hidden border border-slate-200 dark:border-gray-700">
            <div className="px-4 py-3 border-b border-slate-100 dark:border-gray-700 flex justify-between items-center bg-slate-50/50 dark:bg-gray-900/40">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-[#2383C2]/10 rounded-lg">
                  <Upload size={16} className="text-[#2383C2]" />
                </div>
                <h3 className="font-normal text-xs text-slate-800 dark:text-gray-100">Importar Detalles OC</h3>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-gray-300 transition p-1">
                <X size={16} />
              </button>
            </div>
            <div className="p-6">
              <div {...getRootProps()} className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer flex flex-col items-center justify-center gap-3 transition ${isDragActive ? 'border-[#2383C2] bg-[#2383C2]/5' : 'border-slate-200 dark:border-gray-700 hover:border-[#2383C2]/50 hover:bg-slate-50 dark:hover:bg-gray-700/30'}`}>
                <input {...getInputProps()} />
                <div className="bg-slate-100 dark:bg-gray-900 p-3 rounded-full">
                  <FileSpreadsheet size={24} className="text-slate-400 dark:text-gray-500" />
                </div>
                <div>
                  <p className="text-xs font-normal text-slate-700 dark:text-gray-200">Arrastra tu archivo Excel aquí</p>
                  <p className="text-[10px] text-slate-400 dark:text-gray-400 mt-0.5">Hoja "planilla" — solo se escriben las filas nuevas o modificadas respecto a la importación anterior.</p>
                </div>
              </div>
            </div>
            <div className="px-4 py-3 bg-slate-50 dark:bg-gray-900/40 border-t border-slate-100 dark:border-gray-700 flex justify-end">
              <button onClick={() => setShowModal(false)} className="text-[11px] font-normal text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-gray-200 px-3 py-1 rounded-lg transition">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImportarDetallesOC;
