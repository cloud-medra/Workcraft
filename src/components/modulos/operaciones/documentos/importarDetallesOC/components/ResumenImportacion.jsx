import { PlusCircle, RefreshCw, MinusCircle, AlertTriangle, Hash, Database, ShieldAlert, ArrowRightLeft, CalendarClock, HelpCircle, EyeOff, X } from 'lucide-react';

const NOMBRES_CAMPO = {
  paciente: 'Paciente', medico: 'Médico', codigo: 'Código', descripcion: 'Descripción', cantidad: 'Cantidad',
  precio_u: 'Precio unitario', atributo: 'Atributo', oc: 'OC', oc_monto: 'Monto OC', estado: 'Estado',
  fecha_recepcion: 'Fecha recepción', fecha_cargo: 'Fecha cargo', numero_guia: 'N° guía', numero_factura: 'N° factura',
  fecha_emision: 'Fecha emisión', fecha_ingreso: 'Fecha ingreso', lote: 'Lote', fecha_vencimiento: 'Fecha vencimiento'
};
const nombreCampo = (c) => NOMBRES_CAMPO[c] || c;

const fechaCorta = (iso) => {
  const [y, m, d] = String(iso || '').split('-');
  return y && m && d ? `${d}-${m}-${y}` : iso || '-';
};

// Lista desplegable de un caso del resumen (cerrada si no hay nada que revisar).
const Seccion = ({ titulo, items, Icono, tono = 'aviso', ayuda, render }) => {
  if (!items?.length) return null;
  const tonos = {
    aviso: 'text-amber-700 dark:text-amber-400',
    error: 'text-red-600 dark:text-red-400',
    info: 'text-[#2383C2] dark:text-blue-400'
  };
  return (
    <details className={`w-full ${tonos[tono]}`}>
      <summary className="cursor-pointer font-semibold inline-flex items-center gap-1" title={ayuda}>
        <Icono size={12} /> {titulo} ({items.length})
      </summary>
      {ayuda && <p className="mt-0.5 text-[10px] text-slate-500 dark:text-gray-400">{ayuda}</p>}
      <ul className="mt-1 max-h-40 overflow-auto font-mono text-[10px] space-y-0.5 text-slate-700 dark:text-gray-300 select-text">
        {items.slice(0, 200).map((it, i) => <li key={i}>{render(it)}</li>)}
        {items.length > 200 && <li>… y {items.length - 200} más</li>}
      </ul>
    </details>
  );
};

const fila = (it) => `${it.filaExcel ? `Fila ${it.filaExcel}` : 'Sin fila'}${it.id ? ` (ID ${it.id})` : ''}`;

export const ResumenImportacion = ({ resumen, onCerrar, onReintentar, reintentando }) => {
  const camposActualizados = Object.entries(resumen.camposActualizados || {})
    .sort((a, b) => b[1] - a[1])
    .map(([c, n]) => `${nombreCampo(c)}: ${n}`).join(' · ');
  const gestiones = resumen.gestionesOC;

  return (
    <div className="bg-white dark:bg-gray-800 border-b border-slate-200 dark:border-gray-700 px-3 py-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[10.5px] max-h-[45%] overflow-y-auto shrink-0">
      <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold">
        <PlusCircle size={12} /> {resumen.nuevas} nueva(s)
      </span>
      <span className="flex items-center gap-1 text-amber-700 dark:text-amber-400 font-semibold" title={camposActualizados || undefined}>
        <RefreshCw size={12} /> {resumen.actualizadas} actualizada(s)
      </span>
      <span className="flex items-center gap-1 text-slate-500 dark:text-gray-400">
        <MinusCircle size={12} /> {resumen.sinCambios} sin cambios
      </span>
      <span className={`flex items-center gap-1 ${resumen.errores.length ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-slate-500 dark:text-gray-400'}`}>
        <AlertTriangle size={12} /> {resumen.errores.length} con error
      </span>
      <span
        className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-gray-700/60 text-slate-600 dark:text-gray-300"
        title={`Snapshot ${resumen.snapshotDesdeCache ? 'desde la caché local' : 'descargado de Storage'}${resumen.meses?.length ? ` · meses del archivo: ${resumen.meses.join(', ')}` : ''}`}
      >
        <Database size={11} /> Firestore: {resumen.lecturasFirestore} lectura(s) · {resumen.escriturasFirestore} escritura(s)
      </span>
      {resumen.indiceOC?.ok ? (
        <span className="flex items-center gap-1 text-[#2383C2]" title={`Filas con OC: ${resumen.indiceOC.conOC} · sin OC: ${resumen.indiceOC.sinOC} · incompletas: ${resumen.indiceOC.incompletas}`}>
          <Hash size={12} /> Índice OC: {resumen.indiceOC.totalEntradas}{resumen.indiceOC.publicado ? ' · actualizado' : ' · sin cambios'}
        </span>
      ) : resumen.indiceOC && (
        <span className="flex items-center gap-1 text-red-600 dark:text-red-400"><AlertTriangle size={12} /> {resumen.indiceOC.error}</span>
      )}
      {onCerrar && (
        <button type="button" onClick={onCerrar} title="Cerrar resumen" className="ml-auto p-0.5 rounded text-slate-400 hover:text-slate-600 dark:hover:text-gray-200"><X size={12} /></button>
      )}

      {camposActualizados && <p className="w-full text-[10px] text-slate-500 dark:text-gray-400">Campos actualizados — {camposActualizados}</p>}

      {resumen.pendientes > 0 && (
        <div className="w-full flex items-center gap-2 px-2 py-1 rounded bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400">
          <AlertTriangle size={12} /> {resumen.pendientes} fila(s) no se guardaron por un error de conexión o permiso. Lo ya guardado se mantiene.
          {onReintentar && (
            <button type="button" onClick={onReintentar} disabled={reintentando} className="ml-auto px-2 py-0.5 rounded border border-red-300 dark:border-red-700 hover:bg-red-100 dark:hover:bg-red-900/40 disabled:opacity-50">
              Reintentar pendientes
            </button>
          )}
        </div>
      )}

      <Seccion
        titulo="Valores no sobrescritos" items={resumen.noSobrescritos} Icono={ShieldAlert}
        ayuda="El archivo trae vacío un campo que ya tenía valor: se mantuvo el valor guardado."
        render={it => `${fila(it)} · ${nombreCampo(it.campo)}: se mantiene "${it.valorGuardado}"`}
      />
      <Seccion
        titulo="OC cambiadas" items={resumen.ocCambiadas} Icono={ArrowRightLeft} tono="info"
        ayuda={gestiones?.error
          ? gestiones.error
          : `Se quitó la OC antigua de ${gestiones?.itemsLiberados || 0} ítem(s) en ${gestiones?.gestionesActualizadas || 0} gestión(es) de Implantes y quedaron con OC pendiente: "Sincronizar OC" les asigna la nueva.`}
        render={it => `Adm. ${it.admision} · ${fechaCorta(it.fecha)} · ${it.codigo}: ${it.ocAntes} → ${it.ocDespues}`}
      />
      <Seccion
        titulo="Fecha de cirugía cambiada (fila movida de mes)" items={resumen.fechasCambiadas} Icono={CalendarClock} tono="info"
        render={it => `${fila({ filaExcel: it.filaExcel })} · ${fechaCorta(it.fechaAntes)} → ${fechaCorta(it.fechaDespues)}`}
      />
      <Seccion
        titulo="Posible cambio de fecha, para revisar" items={resumen.fechasAmbiguas} Icono={HelpCircle}
        ayuda="Coincide con más de una fila guardada con otra fecha: se guardó como nueva, sin mover ninguna. Revisa si alguna de las anteriores sobra."
        render={it => `${fila(it)} · ${fechaCorta(it.fecha)} · posibles: ${it.candidatos.map(c => `${fechaCorta(c.fecha)} (${c.id})`).join(', ')}`}
      />
      <Seccion
        titulo="Registradas que ya no vienen en el archivo" items={resumen.yaNoVienen} Icono={EyeOff}
        ayuda="Filas guardadas de los meses que cubre este archivo que no vinieron. No se borraron."
        render={it => `Adm. ${it.admision} · ${fechaCorta(it.fecha)} · ${it.proveedor} · ${it.codigo}${it.enGrupoPresente ? ' · (repetida de una fila que sí vino: sale del índice de OC)' : ''}`}
      />
      <Seccion
        titulo="Con error (no se guardaron)" items={resumen.errores} Icono={AlertTriangle} tono="error"
        render={it => `${fila(it)}: ${it.error}`}
      />
    </div>
  );
};

export default ResumenImportacion;
