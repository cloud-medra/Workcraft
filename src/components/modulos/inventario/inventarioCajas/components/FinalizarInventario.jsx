import { useMemo, useState } from 'react';
import { ArrowLeft, AlertTriangle, Loader2, Flag, CheckCircle2, ChevronDown, ChevronRight } from 'lucide-react';
import { useModal } from '../../../../../context/ModalContext';
import { useToast } from '../../../../../context/ToastContext';
import { ESTADOS_CAJA, ESTADOS_AJUSTE, sumarTotales } from '../utils/inventarioFisico';
import { finalizarInventario } from '../services/inventarioFisicoService';
import ResumenComparacion, { TotalesCategorias } from './ResumenComparacion';

const ETIQUETA_AJUSTE = {
  [ESTADOS_AJUSTE.AJUSTADA]: 'Ajustada',
  [ESTADOS_AJUSTE.SIN_DIFERENCIAS]: 'Sin diferencias',
  [ESTADOS_AJUSTE.CON_MOVIMIENTOS]: 'No ajustada: tuvo movimientos (revisar)',
  [ESTADOS_AJUSTE.NO_EXISTE]: 'No ajustada: la caja ya no existe'
};

const CajaResumen = ({ doc, abierta, onToggle }) => (
  <div className="border border-gray-200 dark:border-gray-700 rounded">
    <button type="button" onClick={onToggle} className="w-full px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700/40">
      <span className="flex items-center gap-1.5 text-[12px] font-semibold text-gray-800 dark:text-gray-100">
        {abierta ? <ChevronDown size={13} /> : <ChevronRight size={13} />} {doc.nombreCaja}
        {doc.ubicacion && <span className="font-normal text-gray-500">· {doc.ubicacion}</span>}
      </span>
      <TotalesCategorias totales={doc.resultado?.totales} />
    </button>
    {abierta && <div className="p-2 border-t border-gray-200 dark:border-gray-700"><ResumenComparacion resultado={doc.resultado} soloDiferenciasInicial /></div>}
  </div>
);

// Resumen final y ajuste del stock (una transacción por caja).
const FinalizarInventario = ({ inventario, cajasStock, docsCajas, usuario, onVolver, onTerminado }) => {
  const { confirmAction } = useModal();
  const { showToast } = useToast();
  const [abiertas, setAbiertas] = useState(new Set());
  const [progreso, setProgreso] = useState(null);
  const [resultado, setResultado] = useState(null);

  const porId = useMemo(() => new Map(docsCajas.map((d) => [d.cajaId || d.id, d])), [docsCajas]);
  const finalizadas = docsCajas.filter((d) => d.estado === ESTADOS_CAJA.FINALIZADA);
  const sinFinalizar = cajasStock.filter((c) => porId.get(c.id)?.estado !== ESTADOS_CAJA.FINALIZADA);
  const totales = sumarTotales(finalizadas.map((d) => d.resultado?.totales));

  const toggle = (id) => setAbiertas((prev) => { const s = new Set(prev); if (s.has(id)) s.delete(id); else s.add(id); return s; });

  const ejecutar = async () => {
    setProgreso({ actual: 0, total: finalizadas.length, caja: '' });
    try {
      const res = await finalizarInventario({ inventarioId: inventario.id, cajasStock, usuario, onProgreso: setProgreso });
      setResultado(res);
      if (res.finalizado) {
        showToast('Inventario finalizado y stock ajustado', 'success');
      } else {
        showToast(`${res.errores.length} caja(s) no se pudieron ajustar. Puedes reintentar: las ya ajustadas no se repiten.`, 'error');
      }
    } catch (err) {
      console.error('Error al finalizar el inventario:', err);
      showToast('Error al finalizar el inventario: ' + err.message, 'error');
    } finally {
      setProgreso(null);
    }
  };

  const handleConfirmar = () => {
    if (finalizadas.length === 0) return showToast('No hay cajas finalizadas para ajustar.', 'error');
    confirmAction(
      'Finalizar inventario',
      `Se ajustará el stock de ${finalizadas.length} caja(s) a lo contado.${sinFinalizar.length > 0 ? ` ${sinFinalizar.length} caja(s) sin finalizar no se ajustan.` : ''} Las cajas que tuvieron movimientos durante el conteo no se ajustan. ¿Continuar?`,
      ejecutar,
      { confirmText: 'Finalizar y ajustar', type: 'warning' }
    );
  };

  if (resultado) {
    return (
      <div className="flex-grow min-h-0 overflow-auto p-3 flex flex-col gap-3">
        <span className="text-[13px] font-bold text-gray-800 dark:text-gray-100 flex items-center gap-1.5">
          {resultado.finalizado ? <CheckCircle2 size={16} className="text-emerald-600" /> : <AlertTriangle size={16} className="text-amber-600" />}
          {resultado.finalizado ? 'Inventario finalizado' : 'Inventario NO finalizado: hubo errores'}
        </span>
        <ul className="text-[12px] flex flex-col gap-1">
          {resultado.resultados.map((r) => (
            <li key={r.cajaId} className={r.estadoAjuste === ESTADOS_AJUSTE.CON_MOVIMIENTOS || r.estadoAjuste === ESTADOS_AJUSTE.NO_EXISTE ? 'text-amber-700 dark:text-amber-300 font-semibold' : 'text-gray-700 dark:text-gray-200'}>
              {r.nombreCaja}: {ETIQUETA_AJUSTE[r.estadoAjuste]}
            </li>
          ))}
          {resultado.errores.map((e) => <li key={e.cajaId} className="text-red-600 font-semibold">{e.nombreCaja}: error — {e.error}</li>)}
          {resultado.sinFinalizar.map((c) => <li key={c.cajaId} className="text-gray-500">{c.nombreCaja}: sin finalizar, no se ajustó</li>)}
        </ul>
        <div className="flex gap-2">
          {resultado.finalizado
            ? <button type="button" onClick={onTerminado} className="h-8 px-4 rounded font-bold text-[12px] text-white bg-[#2383C2]">Terminar</button>
            : <button type="button" onClick={() => setResultado(null)} className="h-8 px-4 rounded font-bold text-[12px] bg-gray-200 dark:bg-gray-700">Volver al resumen</button>}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-grow min-h-0 overflow-auto p-3 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <button type="button" onClick={onVolver} disabled={Boolean(progreso)} className="p-1 rounded border border-slate-200 dark:border-gray-700 text-slate-600 dark:text-gray-300"><ArrowLeft size={13} /></button>
        <span className="text-[12px] font-bold text-gray-800 dark:text-gray-100 uppercase">Resumen final — {inventario.nombre}</span>
      </div>

      {sinFinalizar.length > 0 && (
        <div className="p-3 rounded border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 text-[11.5px] text-amber-800 dark:text-amber-300">
          <div className="font-bold flex items-center gap-1"><AlertTriangle size={13} /> {sinFinalizar.length} caja(s) pendientes o en conteo: no se ajustan.</div>
          <div className="mt-1">{sinFinalizar.map((c) => `${c.nombreCaja}${porId.get(c.id) ? ' (en conteo)' : ' (pendiente)'}`).join(' · ')}</div>
        </div>
      )}

      <div className="p-3 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col gap-1">
        <span className="text-[11px] font-bold text-gray-600 dark:text-gray-300 uppercase">Total de {finalizadas.length} caja(s) finalizada(s)</span>
        <TotalesCategorias totales={totales} />
      </div>

      <div className="flex flex-col gap-2">
        {finalizadas.map((d) => <CajaResumen key={d.id} doc={d} abierta={abiertas.has(d.id)} onToggle={() => toggle(d.id)} />)}
      </div>

      <div className="flex items-center gap-2">
        <button type="button" onClick={handleConfirmar} disabled={Boolean(progreso) || finalizadas.length === 0} className="h-8 px-4 rounded font-bold text-[12px] flex items-center gap-1.5 text-white bg-red-600 hover:bg-red-700 disabled:opacity-40">
          {progreso ? <Loader2 size={13} className="animate-spin" /> : <Flag size={13} />} Finalizar inventario y ajustar stock
        </button>
        {progreso && <span className="text-[11px] text-gray-500">Ajustando {progreso.actual} de {progreso.total}{progreso.caja ? `: ${progreso.caja}` : ''}...</span>}
      </div>
    </div>
  );
};

export default FinalizarInventario;
