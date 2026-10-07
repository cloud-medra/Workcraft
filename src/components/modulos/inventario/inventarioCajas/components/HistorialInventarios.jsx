import { useEffect, useState } from 'react';
import { ArrowLeft, Loader2, ChevronDown, ChevronRight } from 'lucide-react';
import { leerHistorialInventarios, leerCajasInventario } from '../services/inventarioFisicoService';
import { ESTADOS_INVENTARIO } from '../utils/inventarioFisico';
import ResumenComparacion, { TotalesCategorias } from './ResumenComparacion';

const fechaHora = (ts) => {
  const d = ts?.toDate ? ts.toDate() : null;
  return d ? d.toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' }) : '-';
};

// Historial de inventarios: fecha, quién, cajas contadas y diferencias. El
// detalle por caja se lee al abrir cada inventario.
const HistorialInventarios = ({ onVolver }) => {
  const [lista, setLista] = useState(null);
  const [error, setError] = useState('');
  const [abierto, setAbierto] = useState(null); // { id, cajas | null }

  useEffect(() => {
    leerHistorialInventarios()
      .then(setLista)
      .catch((err) => { console.error(err); setError('No se pudo leer el historial.'); setLista([]); });
  }, []);

  const abrir = async (id) => {
    if (abierto?.id === id) { setAbierto(null); return; }
    setAbierto({ id, cajas: null });
    try {
      const cajas = await leerCajasInventario(id);
      setAbierto({ id, cajas });
    } catch (err) {
      console.error(err);
      setAbierto({ id, cajas: [] });
    }
  };

  return (
    <div className="flex-grow min-h-0 overflow-auto p-3 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <button type="button" onClick={onVolver} className="p-1 rounded border border-slate-200 dark:border-gray-700 text-slate-600 dark:text-gray-300"><ArrowLeft size={13} /></button>
        <span className="text-[12px] font-bold text-gray-800 dark:text-gray-100 uppercase">Historial de inventarios</span>
      </div>
      {error && <div className="text-red-600 text-[11px]">{error}</div>}
      {lista === null ? (
        <div className="flex items-center gap-2 text-gray-400 text-[11px]"><Loader2 size={13} className="animate-spin" /> Cargando...</div>
      ) : lista.length === 0 ? (
        <div className="text-gray-400 italic text-[11px]">Aún no hay inventarios.</div>
      ) : lista.map((inv) => (
        <div key={inv.id} className="border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800">
          <button type="button" onClick={() => abrir(inv.id)} className="w-full px-3 py-2 text-left flex flex-col gap-1 hover:bg-gray-50 dark:hover:bg-gray-700/40">
            <span className="flex flex-wrap items-center gap-2 text-[12px] text-gray-800 dark:text-gray-100">
              {abierto?.id === inv.id ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
              <b>{inv.nombre}</b>
              <span className="text-gray-500">{inv.fecha}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${inv.estado === ESTADOS_INVENTARIO.FINALIZADO ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'}`}>
                {inv.estado === ESTADOS_INVENTARIO.FINALIZADO ? 'Finalizado' : 'En curso'}
              </span>
            </span>
            <span className="text-[10.5px] text-gray-500">
              Iniciado por {inv.iniciadoPor?.nombre || '-'} ({fechaHora(inv.fechaInicio)})
              {inv.finalizadoPor && ` · Finalizado por ${inv.finalizadoPor.nombre} (${fechaHora(inv.fechaFin)})`}
              {inv.resumenFinal && ` · ${inv.resumenFinal.cajasContadas} caja(s) contadas, ${inv.resumenFinal.cajasAjustadas} ajustadas`}
              {inv.resumenFinal?.cajasConMovimientos?.length > 0 && ` · Revisar: ${inv.resumenFinal.cajasConMovimientos.join(', ')}`}
            </span>
            {inv.resumenFinal && <TotalesCategorias totales={inv.resumenFinal.totales} />}
          </button>
          {abierto?.id === inv.id && (
            <div className="p-2 border-t border-gray-200 dark:border-gray-700 flex flex-col gap-2">
              {abierto.cajas === null ? (
                <div className="flex items-center gap-2 text-gray-400 text-[11px]"><Loader2 size={13} className="animate-spin" /> Cargando cajas...</div>
              ) : abierto.cajas.filter((c) => c.resultado).map((c) => (
                <div key={c.id} className="flex flex-col gap-1">
                  <span className="text-[11.5px] font-semibold text-gray-700 dark:text-gray-200">
                    {c.nombreCaja}{c.ajuste?.estado && <span className="ml-1 font-normal text-gray-500">· {c.ajuste.estado}</span>}
                  </span>
                  <ResumenComparacion resultado={c.resultado} soloDiferenciasInicial />
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default HistorialInventarios;
