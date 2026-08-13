import React from 'react';
import { History, X } from 'lucide-react';

const HistorialDocumentos = ({
  showLogModal,
  onClose,
  selectedFacturaForLog,
  logsList,
  loadingLogs
}) => {
  const getAccionBadgeClass = (accion) => {
    switch (accion) {
      case 'MODIFICACION_FACTURA':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400';
      case 'INICIO_PROCESO':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400';
      case 'VINCULACION_CODIGOS':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300';
      case 'VINCULACION_OC':
        return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300';
      case 'SOLICITUD_DIFERENCIAS_EXPORTADA':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-400';
      case 'ACTA INGRESADA':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400';
      case 'CREACION':
        return 'bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400';
      case 'EDICION':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const formatearFechaLog = (log) => {
    if (log.fechaHora) return log.fechaHora;
    if (log.timestamp?.toDate) return log.timestamp.toDate().toLocaleString('es-CL');
    return 'N/A';
  };

  const renderResumenLog = (resumen) => {
    if (!resumen) return null;

    if ('sinDiferencias' in resumen) {
      return (
        <div className="text-[9px] text-slate-500 dark:text-gray-400 pt-1 flex gap-2 flex-wrap">
          <span>✅ Sin diferencias: {resumen.sinDiferencias ?? 0}</span>
          <span>⚠️ Con diferencias: {resumen.conDiferencias ?? 0}</span>
          <span>❌ Sin vincular: {resumen.sinVincular ?? 0}</span>
        </div>
      );
    }

    if ('numeroOrden' in resumen || 'numeroActa' in resumen || 'numeroSalida' in resumen) {
      return (
        <div className="text-[9px] text-slate-500 dark:text-gray-400 pt-1 grid grid-cols-2 gap-x-3 gap-y-0.5">
          <span>Orden: <strong className="text-slate-700 dark:text-gray-300">{resumen.numeroOrden || '-'}</strong></span>
          <span>Acta: <strong className="text-slate-700 dark:text-gray-300">{resumen.numeroActa || '-'}</strong></span>
          <span>Salida: <strong className="text-slate-700 dark:text-gray-300">{resumen.numeroSalida || '-'}</strong></span>
          <span>F. Acta: <strong className="text-slate-700 dark:text-gray-300">{resumen.fechaActa || '-'}</strong></span>
          <span>F. Salida: <strong className="text-slate-700 dark:text-gray-300">{resumen.fechaSalida || '-'}</strong></span>
        </div>
      );
    }

    return (
      <div className="text-[9px] text-slate-500 dark:text-gray-400 pt-1 flex gap-2 flex-wrap">
        {Object.entries(resumen).map(([key, value]) => (
          <span key={key}>{key}: <strong className="text-slate-700 dark:text-gray-300">{String(value)}</strong></span>
        ))}
      </div>
    );
  };

  const formatValorLog = (val) => {
    if (val === null || val === undefined || val === '') return '-';
    if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
      return String(val);
    }
    if (Array.isArray(val)) {
      if (val.length === 0) return '-';
      return val.map((item) => formatValorLog(item)).join(', ');
    }
    if (typeof val === 'object') {
      if (val.nombre) return val.nombre;
      if (val.codigo) return val.codigo;
      return Object.entries(val)
        .map(([k, v]) => `${k}: ${typeof v === 'object' && v !== null ? formatValorLog(v) : v}`)
        .join(', ');
    }
    return String(val);
  };

  const renderCambiosLog = (cambios) => {
    if (!cambios) return null;

    if (Array.isArray(cambios)) {
      if (cambios.length === 0) return null;
      return (
        <ul className="text-[9px] text-slate-600 dark:text-gray-400 pt-1 space-y-0.5 list-disc list-inside">
          {cambios.map((c, idx) => (
            <li key={idx}>
              {typeof c === 'string'
                ? c
                : `${c.campo || c.label || 'Campo'}: ${formatValorLog(c.anterior ?? c.valorAnterior)} ➔ ${formatValorLog(c.nuevo ?? c.valorNuevo)}`}
            </li>
          ))}
        </ul>
      );
    }

    return (
      <ul className="text-[9px] text-slate-600 dark:text-gray-400 pt-1 space-y-0.5 list-disc list-inside">
        {Object.entries(cambios).map(([campo, val]) => (
          <li key={campo}>
            {campo}: {formatValorLog(val?.anterior)} ➔ {formatValorLog(val?.nuevo ?? val)}
          </li>
        ))}
      </ul>
    );
  };

  return (
    <>
      <div
        className={`fixed inset-0 z-50 bg-black/30 backdrop-blur-[1px] transition-opacity duration-300 ${
          showLogModal ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      <aside
        className={`fixed top-0 right-0 z-50 h-full w-full max-w-md bg-white dark:bg-gray-800 shadow-2xl border-l border-gray-200 dark:border-gray-700 flex flex-col transition-transform duration-300 ease-in-out text-[11px] ${
          showLogModal ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50/80 dark:bg-gray-900/80 shrink-0">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="p-1.5 rounded-md bg-[#2383C2]/10 dark:bg-[#2383C2]/20 text-[#2383C2]">
              <History size={16} />
            </div>
            <div className="truncate">
              <h3 className="text-[12px] font-bold text-gray-800 dark:text-gray-100 truncate">
                Historial de Cambios
              </h3>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                Folio: {selectedFacturaForLog?.folio} - {selectedFacturaForLog?.rznSoc}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full font-semibold">
              {logsList.length} logs
            </span>
            <button
              onClick={onClose}
              className="p-1 rounded-md text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loadingLogs ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-500 dark:text-gray-400">
              <div className="w-6 h-6 border-2 border-[#2383C2] border-t-transparent rounded-full animate-spin mb-2" />
              <p className="text-[10px]">Cargando historial...</p>
            </div>
          ) : logsList.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400 dark:text-gray-500 text-center px-4">
              <History size={32} className="mb-2 opacity-30" />
              <p className="text-[11px] font-medium">Sin registros</p>
              <p className="text-[10px]">No hay registros de actividad para este documento.</p>
            </div>
          ) : (
            logsList.map((log) => (
              <div key={log.id} className="p-3 border border-gray-200 dark:border-gray-700/80 rounded-lg bg-gray-50/50 dark:bg-gray-900/30 text-[10px] space-y-2">
                <div className="flex justify-between items-center">
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${getAccionBadgeClass(log.accion)}`}>
                    {log.accion}
                  </span>
                  <span className="text-gray-400 dark:text-gray-500 text-[9px] font-mono">
                    {formatearFechaLog(log)}
                  </span>
                </div>

                <p className="text-gray-700 dark:text-gray-300 font-semibold">
                  Usuario: <span className="font-normal text-gray-600 dark:text-gray-400">{log.usuario?.nombre || log.usuario?.email || "Usuario"}</span>
                </p>

                <div className="text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 p-2 rounded border border-gray-200/80 dark:border-gray-700 text-[10px] space-y-1">
                  {log.detalle && <p>{log.detalle}</p>}

                  {log.estadoAnterior && log.nuevoEstado && (
                    <div className="font-medium text-slate-700 dark:text-slate-200 pt-1 border-t border-slate-100 dark:border-gray-700">
                      Estado: <span className="text-amber-600 dark:text-amber-400">{log.estadoAnterior}</span> ➔ <span className="text-emerald-600 dark:text-emerald-400">{log.nuevoEstado}</span>
                    </div>
                  )}

                  {log.resumen && renderResumenLog(log.resumen)}

                  {log.cambios && renderCambiosLog(log.cambios)}

                  {(log.ocVinculadaId || log.estadoResultante) && (
                    <div className="text-[9px] text-slate-500 dark:text-gray-400 pt-1 flex gap-3 flex-wrap">
                      {log.ocVinculadaId && <span>OC vinculada: <strong className="text-slate-700 dark:text-gray-300 font-mono">{log.ocVinculadaId}</strong></span>}
                      {log.estadoResultante && <span>Resultado: <strong className="text-slate-700 dark:text-gray-300">{log.estadoResultante}</strong></span>}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="px-4 py-2.5 border-t border-gray-200 dark:border-gray-700 flex justify-end bg-gray-50 dark:bg-gray-900/80 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded text-[10px] font-bold transition"
          >
            Cerrar
          </button>
        </div>
      </aside>
    </>
  );
};

export default HistorialDocumentos;