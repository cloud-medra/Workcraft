import React, { useState, useMemo } from 'react';
import {
  FileText,
  Trash2,
  Pencil,
  Check,
  X,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Package,
  PackagePlus,
  Lock
} from 'lucide-react';
import {
  formatearFechaTabla,
  calcularEmpresaNoCoincide,
  calcularCamposFinancieros,
  ESTADO_CARGA_OPTIONS,
  getEstadoCargaStyle,
  CODIGO_SIN_OC,
  VALOR_LOTE_VENCIMIENTO_PAD,
  tieneContenidoPad
} from './cargasHelpers';
import { useAutocompleteReferencia } from './useAutocompleteReferencia';
import { PadContenidoRow, crearFilaContenidoPadVacia, construirItemContenidoPadDesdeFila } from './PadContenidoRow';

const BORRADOR_VACIO = {
  referencia: '', codigo: '', precio: '', empresaVinculada: '', tipoVinculado: '', detalle: '', descriptorAuto: '', clase: '',
  cantidad: '', lote: '', vencimiento: ''
};

export const CotizacionCard = ({
  cotizacion,
  bloqueEmpresa,
  gestionId,
  bloqueFecha,
  recargosActivos,
  periodoAbierto,
  onAgregarItem,
  onEliminarItem,
  onEliminarCotizacion,
  onActualizarEstadoItem,
  onEditarItem,
  defaultOpen = false
}) => {
  const [abierto, setAbierto] = useState(defaultOpen);
  const [editandoId, setEditandoId] = useState(null);
  const [borrador, setBorrador] = useState(BORRADOR_VACIO);
  const [edicionEsPad, setEdicionEsPad] = useState(false);
  const [edicionEsContenidoPad, setEdicionEsContenidoPad] = useState(false);

  const [agregandoContenidoDePadId, setAgregandoContenidoDePadId] = useState(null);
  const [filasNuevoContenido, setFilasNuevoContenido] = useState([]);

  const {
    sugerencias, buscando, mostrarSug, setMostrarSug, containerRef, skipNext
  } = useAutocompleteReferencia(editandoId ? borrador.referencia : '');

  const items = cotizacion.items || [];

  const idMostrado = gestionId || 'P';
  const fechaMostrada = formatearFechaTabla(bloqueFecha);

  const itemsOrdenados = useMemo(() => {
    const principales = items.filter(it => !it.padPadreId);
    const contenidosPorPadre = {};
    items.forEach(it => {
      if (it.padPadreId) {
        (contenidosPorPadre[it.padPadreId] ||= []).push(it);
      }
    });
    const resultado = [];
    principales.forEach(p => {
      resultado.push(p);
      (contenidosPorPadre[p.id] || []).forEach(c => resultado.push(c));
    });
    Object.keys(contenidosPorPadre).forEach(padreId => {
      if (!principales.some(p => p.id === padreId)) {
        resultado.push(...contenidosPorPadre[padreId]);
      }
    });
    return resultado;
  }, [items]);

  const totalItems = items.reduce((acc, it) => acc + (Number(it.totalItem) || 0), 0);
  const tieneTotalIngresado = Number(cotizacion.totalCotizacion || 0) > 0;
  const diferencia = Number(cotizacion.totalCotizacion || 0) - totalItems;
  const totalCoincide = !tieneTotalIngresado || Math.abs(diferencia) < 1;
  const hayItemsSinCodigo = items.some(it => it.sinCodigo);
  const hayEmpresaNoCoincide = items.some(it => calcularEmpresaNoCoincide(it, bloqueEmpresa));
  const hayItemsSinRecargo = items.some(it => !it.sinCodigo && !it.padPadreId && !it.recargoEncontrado);

  const iniciarEdicion = (it) => {
    setEditandoId(it.id);
    setEdicionEsPad(!!it.esPad);
    setEdicionEsContenidoPad(!!it.padPadreId);
    setBorrador({
      referencia: it.referencia || '',
      codigo: it.codigo || '',
      precio: it.precio ?? '',
      empresaVinculada: it.empresaVinculada || '',
      tipoVinculado: it.tipoVinculado || '',
      detalle: it.detalle || '',
      descriptorAuto: it.descriptorAuto || '',
      clase: it.clase || '',
      cantidad: String(it.cantidad ?? ''),
      lote: (it.lote === 'P' || it.lote === 'Sin lote') ? '' : (it.lote || ''),
      vencimiento: it.vencimiento || ''
    });
  };
  const cancelarEdicion = () => {
    setEditandoId(null);
    setBorrador(BORRADOR_VACIO);
    setMostrarSug(false);
    setEdicionEsPad(false);
    setEdicionEsContenidoPad(false);
  };

  const handleReferenciaChange = (value) => {
    setBorrador(prev => ({
      ...prev,
      referencia: value,
      codigo: '',
      precio: '',
      empresaVinculada: '',
      tipoVinculado: '',
      detalle: '',
      descriptorAuto: '',
      clase: ''
    }));
  };

  const handleSeleccionarSugerencia = (sug) => {
    skipNext.current = true;
    setBorrador(prev => ({
      ...prev,
      referencia: sug.referencia || prev.referencia,
      codigo: edicionEsContenidoPad ? CODIGO_SIN_OC : (sug.codigo || ''),
      precio: edicionEsContenidoPad ? 0 : (sug.precioNeto ?? 0),
      empresaVinculada: sug.empresa || '',
      tipoVinculado: sug.tipo || '',
      detalle: sug.descriptorEmpresa || sug.descriptorAuto || '',
      descriptorAuto: sug.descriptorAuto || '',
      clase: sug.clase || ''
    }));
    setMostrarSug(false);
  };

  const guardarEdicion = () => {
    const cantidadNum = Number(borrador.cantidad);
    if (!borrador.referencia.trim() || !borrador.cantidad || isNaN(cantidadNum) || cantidadNum <= 0) return;

    if (edicionEsContenidoPad) {
      onEditarItem(editandoId, {
        referencia: borrador.referencia.trim(),
        codigo: CODIGO_SIN_OC,
        precio: 0,
        empresaVinculada: borrador.empresaVinculada || '',
        tipoVinculado: borrador.tipoVinculado || 'P',
        detalle: borrador.detalle || 'P',
        descriptorAuto: borrador.descriptorAuto || 'P',
        clase: borrador.clase || 'P',
        cantidad: cantidadNum,
        lote: borrador.lote.trim() || 'P',
        vencimiento: borrador.vencimiento || '',
        sinCodigo: false,
        vecesCosto: 1,
        recargoEncontrado: true,
        venta: 0,
        totalItem: 0,
        estadoCarga: 'PAD'
      });
      cancelarEdicion();
      return;
    }

    const { vecesCosto, recargoEncontrado, venta, totalItem } = calcularCamposFinancieros(
      borrador.precio, cantidadNum, recargosActivos
    );

    onEditarItem(editandoId, {
      referencia: borrador.referencia.trim(),
      codigo: borrador.codigo || '',
      precio: Number(borrador.precio) || 0,
      empresaVinculada: borrador.empresaVinculada || '',
      tipoVinculado: borrador.tipoVinculado || 'P',
      detalle: borrador.detalle || 'P',
      descriptorAuto: borrador.descriptorAuto || 'P',
      clase: borrador.clase || 'P',
      cantidad: cantidadNum,
      lote: edicionEsPad ? VALOR_LOTE_VENCIMIENTO_PAD : (borrador.lote.trim() || 'Sin lote'),
      vencimiento: edicionEsPad ? VALOR_LOTE_VENCIMIENTO_PAD : (borrador.vencimiento || 'Sin fecha'),
      sinCodigo: !borrador.codigo,
      vecesCosto,
      recargoEncontrado,
      venta,
      totalItem
    });
    cancelarEdicion();
  };

  const abrirFormularioContenido = (padPadreId) => {
    setAgregandoContenidoDePadId(padPadreId);
    setFilasNuevoContenido([crearFilaContenidoPadVacia()]);
  };

  const cerrarFormularioContenido = () => {
    setAgregandoContenidoDePadId(null);
    setFilasNuevoContenido([]);
  };

  const guardarNuevoContenido = (itPadre) => {
    if (!periodoAbierto) return;
    const filasValidas = filasNuevoContenido.filter(f => f.referencia.trim() && Number(f.cantidad) > 0);
    if (filasValidas.length === 0) return;

    filasValidas.forEach(fila => {
      onAgregarItem(construirItemContenidoPadDesdeFila(fila, itPadre.id, {
        numCotizacion: cotizacion.numCotizacion,
        totalCotizacion: cotizacion.totalCotizacion,
        periodoAnio: periodoAbierto.anio,
        periodoMes: periodoAbierto.mes
      }));
    });

    cerrarFormularioContenido();
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700/80 rounded-lg shadow-xs overflow-hidden">
      <div className="w-full px-3 py-2 flex items-center justify-between gap-2 bg-slate-50/80 dark:bg-gray-800/80">
        <button
          type="button"
          onClick={() => setAbierto(o => !o)}
          className="flex items-center gap-2 flex-grow text-left"
        >
          {abierto ? <ChevronUp size={13} className="text-slate-400" /> : <ChevronDown size={13} className="text-slate-400" />}
          <FileText size={13} className="text-[#2383C2]" />
          <span className="text-[11px] font-bold text-slate-700 dark:text-gray-200">{cotizacion.numCotizacion}</span>
          <span className="text-[10px] text-slate-400 dark:text-gray-500">({items.length} ítem{items.length !== 1 ? 's' : ''})</span>
        </button>

        <div className="flex items-center gap-2">
          {hayItemsSinCodigo && (
            <span className="flex items-center gap-1 text-[9px] font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 px-1.5 py-0.5 rounded">
              <AlertCircle size={10} /> Sin código
            </span>
          )}
          {hayEmpresaNoCoincide && (
            <span className="flex items-center gap-1 text-[9px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-1.5 py-0.5 rounded">
              <AlertTriangle size={10} /> Empresa no coincide
            </span>
          )}
          {hayItemsSinRecargo && (
            <span className="flex items-center gap-1 text-[9px] font-semibold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 px-1.5 py-0.5 rounded">
              <AlertTriangle size={10} /> Sin rango de recargo
            </span>
          )}
          {items.length > 0 && tieneTotalIngresado && !totalCoincide && (
            <span className="flex items-center gap-1 text-[9px] font-semibold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 px-1.5 py-0.5 rounded">
              <AlertCircle size={10} /> Total no coincide
            </span>
          )}
          <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
            {tieneTotalIngresado ? `$${Number(cotizacion.totalCotizacion).toLocaleString('es-CL')}` : 'Sin total'}
          </span>
          <button
            type="button"
            onClick={() => onEliminarCotizacion(cotizacion.id)}
            title="Eliminar cotización completa"
            className="text-red-500 hover:text-red-700 transition p-0.5 rounded hover:bg-red-50 dark:hover:bg-red-950/30"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {abierto && (
        <div className="p-3 space-y-2.5 border-t border-slate-100 dark:border-gray-700/60">
          {items.length > 0 && tieneTotalIngresado && !totalCoincide && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded text-[10px] text-orange-700 dark:text-orange-400">
              <AlertCircle size={12} className="shrink-0" />
              <span>
                La suma de los ítems (${totalItems.toLocaleString('es-CL')}) no coincide con el Total de la Cotización
                (${Number(cotizacion.totalCotizacion || 0).toLocaleString('es-CL')}). Diferencia: ${Math.abs(diferencia).toLocaleString('es-CL')}
              </span>
            </div>
          )}
          {items.length > 0 && tieneTotalIngresado && totalCoincide && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded text-[9px] text-emerald-700 dark:text-emerald-400 w-fit">
              <CheckCircle2 size={11} /> Total cuadrado
            </div>
          )}

          <div className="overflow-auto rounded border border-slate-200 dark:border-gray-700">
            <table className="w-full text-left text-[10px] border-collapse">
              <thead className="bg-slate-50 dark:bg-gray-900/60">
                <tr className="text-slate-500 dark:text-gray-400 uppercase font-bold text-[9px]">
                  <th className="px-2.5 py-1.5 border-b border-r border-slate-200 dark:border-gray-700">ID</th>
                  <th className="px-2.5 py-1.5 border-b border-r border-slate-200 dark:border-gray-700">Fecha</th>
                  <th className="px-2.5 py-1.5 border-b border-r border-slate-200 dark:border-gray-700">Código</th>
                  <th className="px-2.5 py-1.5 border-b border-r border-slate-200 dark:border-gray-700 text-center">Cant.</th>
                  <th className="px-2.5 py-1.5 border-b border-r border-slate-200 dark:border-gray-700">Venta</th>
                  <th className="px-2.5 py-1.5 border-b border-r border-slate-200 dark:border-gray-700">Referencia</th>
                  <th className="px-2.5 py-1.5 border-b border-r border-slate-200 dark:border-gray-700">Desc. Auto</th>
                  <th className="px-2.5 py-1.5 border-b border-r border-slate-200 dark:border-gray-700">Clase</th>
                  <th className="px-2.5 py-1.5 border-b border-r border-slate-200 dark:border-gray-700">Tipo</th>
                  <th className="px-2.5 py-1.5 border-b border-r border-slate-200 dark:border-gray-700">Precio</th>
                  <th className="px-2.5 py-1.5 border-b border-r border-slate-200 dark:border-gray-700 text-center">Veces Costo</th>
                  <th className="px-2.5 py-1.5 border-b border-r border-slate-200 dark:border-gray-700">Total Ítem</th>
                  <th className="px-2.5 py-1.5 border-b border-r border-slate-200 dark:border-gray-700">Lote</th>
                  <th className="px-2.5 py-1.5 border-b border-r border-slate-200 dark:border-gray-700">Vencimiento</th>
                  <th className="px-2.5 py-1.5 border-b border-r border-slate-200 dark:border-gray-700">Estado Carga</th>
                  <th className="px-2.5 py-1.5 border-b border-slate-200 dark:border-gray-700 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {itemsOrdenados.length === 0 ? (
                  <tr>
                    <td colSpan={16} className="px-3 py-4 text-center text-slate-400 dark:text-gray-500">
                      Sin ítems en esta cotización
                    </td>
                  </tr>
                ) : (
                  itemsOrdenados.map(it => {
                    const empresaNoCoincide = calcularEmpresaNoCoincide(it, bloqueEmpresa);
                    const estilo = getEstadoCargaStyle(it.estadoCarga);
                    const enEdicion = editandoId === it.id;
                    const esPrincipalPad = !!it.esPad;
                    const esContenidoPad = !!it.padPadreId;
                    const sinContenidoAun = esPrincipalPad && !tieneContenidoPad(items, it.id);
                    const mostrandoFormularioContenido = agregandoContenidoDePadId === it.id;

                    if (enEdicion) {
                      return (
                        <tr key={it.id} className={`bg-blue-50/60 dark:bg-blue-950/20 ${esContenidoPad ? 'border-l-2 border-fuchsia-400 dark:border-fuchsia-700' : ''}`}>
                          <td className="px-2 py-1.5 border-b border-r border-slate-100 dark:border-gray-700/60 font-mono text-[9px] text-slate-500 dark:text-gray-400">
                            {idMostrado}
                          </td>
                          <td className="px-2 py-1.5 border-b border-r border-slate-100 dark:border-gray-700/60 text-[9px] text-slate-500 dark:text-gray-400">
                            {fechaMostrada}
                          </td>
                          <td className="px-2 py-1.5 border-b border-r border-slate-100 dark:border-gray-700/60 font-mono text-[9px]">
                            {edicionEsContenidoPad ? (
                              <span className="text-fuchsia-600 dark:text-fuchsia-400 italic">{CODIGO_SIN_OC}</span>
                            ) : (
                              borrador.codigo || <span className="text-red-500 font-bold">S/C</span>
                            )}
                          </td>

                          <td className="px-2 py-1.5 border-b border-r border-slate-100 dark:border-gray-700/60 text-center">
                            <input
                              type="number"
                              value={borrador.cantidad}
                              onChange={e => setBorrador(prev => ({ ...prev, cantidad: e.target.value }))}
                              className="w-14 h-6.5 px-1 text-[10px] border border-blue-300 dark:border-blue-700 rounded bg-white dark:bg-gray-900 text-slate-800 dark:text-gray-100 outline-none text-center"
                            />
                          </td>

                          <td className="px-2 py-1.5 border-b border-r border-slate-100 dark:border-gray-700/60 text-center text-[9px] text-slate-400">—</td>

                          <td className="px-2 py-1.5 border-b border-r border-slate-100 dark:border-gray-700/60 relative" ref={containerRef}>
                            <div className="flex items-center gap-1">
                              {esContenidoPad && <span className="text-fuchsia-400 dark:text-fuchsia-600 text-[10px]">↳</span>}
                              <input
                                type="text"
                                value={borrador.referencia}
                                onChange={e => handleReferenciaChange(e.target.value)}
                                onFocus={() => sugerencias.length > 0 && setMostrarSug(true)}
                                autoComplete="off"
                                autoFocus
                                className="w-full h-6.5 px-1.5 text-[10px] border border-blue-300 dark:border-blue-700 rounded bg-white dark:bg-gray-900 text-slate-800 dark:text-gray-100 outline-none"
                              />
                            </div>
                            {mostrarSug && (
                              <div className="absolute top-full left-0 mt-1 w-56 max-h-48 overflow-y-auto bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded shadow-lg z-30">
                                {buscando ? (
                                  <div className="px-2.5 py-2 text-[10px] text-slate-400 flex items-center gap-1.5">
                                    <Loader2 size={11} className="animate-spin" /> Buscando...
                                  </div>
                                ) : sugerencias.length === 0 ? (
                                  <div className="px-2.5 py-2 text-[10px] text-slate-400">Sin coincidencias</div>
                                ) : (
                                  sugerencias.map(sug => (
                                    <button
                                      key={sug.id}
                                      type="button"
                                      onClick={() => handleSeleccionarSugerencia(sug)}
                                      className="w-full text-left px-2.5 py-1.5 hover:bg-slate-100 dark:hover:bg-gray-700/60 border-b border-slate-100 dark:border-gray-700/50 last:border-b-0"
                                    >
                                      <div className="text-[10px] font-semibold text-slate-700 dark:text-gray-200 truncate">{sug.referencia}</div>
                                      <div className="text-[9px] text-slate-400 dark:text-gray-500 flex items-center gap-1.5">
                                        <span className="font-mono text-emerald-600 dark:text-emerald-400">{sug.codigo || 'S/C'}</span>
                                        <span>·</span>
                                        <span className="truncate">{sug.empresa}</span>
                                      </div>
                                    </button>
                                  ))
                                )}
                              </div>
                            )}
                          </td>

                          <td className="px-2 py-1.5 border-b border-r border-slate-100 dark:border-gray-700/60 text-[9px] text-slate-500 dark:text-gray-400 truncate max-w-[120px]" title={borrador.descriptorAuto}>
                            {borrador.descriptorAuto || 'P'}
                          </td>
                          <td className="px-2 py-1.5 border-b border-r border-slate-100 dark:border-gray-700/60 text-[9px]">{borrador.clase || 'P'}</td>
                          <td className="px-2 py-1.5 border-b border-r border-slate-100 dark:border-gray-700/60 text-[9px]">{borrador.tipoVinculado || 'P'}</td>
                          <td className="px-2 py-1.5 border-b border-r border-slate-100 dark:border-gray-700/60 text-[9px]">
                            {edicionEsContenidoPad ? (
                              <span className="text-fuchsia-600 dark:text-fuchsia-400 italic">$0</span>
                            ) : (
                              borrador.precio !== '' ? `$${Number(borrador.precio).toLocaleString('es-CL')}` : 'P'
                            )}
                          </td>
                          <td className="px-2 py-1.5 border-b border-r border-slate-100 dark:border-gray-700/60 text-center text-[9px] text-slate-400">—</td>

                          <td className="px-2 py-1.5 border-b border-r border-slate-100 dark:border-gray-700/60 text-center text-[9px] text-slate-400">—</td>

                          <td className="px-2 py-1.5 border-b border-r border-slate-100 dark:border-gray-700/60">
                            {edicionEsPad ? (
                              <input
                                type="text"
                                value={VALOR_LOTE_VENCIMIENTO_PAD}
                                disabled
                                className="w-20 h-6.5 px-1 text-[10px] border border-slate-200 dark:border-gray-700 rounded bg-slate-100 dark:bg-gray-800 text-slate-500 dark:text-gray-400 outline-none"
                              />
                            ) : (
                              <input
                                type="text"
                                value={borrador.lote}
                                onChange={e => setBorrador(prev => ({ ...prev, lote: e.target.value }))}
                                className="w-20 h-6.5 px-1 text-[10px] border border-blue-300 dark:border-blue-700 rounded bg-white dark:bg-gray-900 text-slate-800 dark:text-gray-100 outline-none"
                              />
                            )}
                          </td>

                          <td className="px-2 py-1.5 border-b border-r border-slate-100 dark:border-gray-700/60">
                            {edicionEsPad ? (
                              <input
                                type="text"
                                value={VALOR_LOTE_VENCIMIENTO_PAD}
                                disabled
                                className="h-6.5 px-1 text-[10px] border border-slate-200 dark:border-gray-700 rounded bg-slate-100 dark:bg-gray-800 text-slate-500 dark:text-gray-400 outline-none"
                              />
                            ) : (
                              <input
                                type="date"
                                value={borrador.vencimiento}
                                onChange={e => setBorrador(prev => ({ ...prev, vencimiento: e.target.value }))}
                                className="h-6.5 px-1 text-[10px] border border-blue-300 dark:border-blue-700 rounded bg-white dark:bg-gray-900 text-slate-800 dark:text-gray-100 outline-none"
                              />
                            )}
                          </td>

                          <td className="px-2 py-1.5 border-b border-r border-slate-100 dark:border-gray-700/60 text-center text-[9px]">
                            {edicionEsContenidoPad ? (
                              <span className="font-bold text-fuchsia-600 dark:text-fuchsia-400">PAD</span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>

                          <td className="px-2 py-1.5 border-b border-slate-100 dark:border-gray-700/60 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={guardarEdicion}
                                title="Guardar cambios"
                                className="text-emerald-600 hover:text-emerald-800 transition p-0.5 rounded hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                              >
                                <Check size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={cancelarEdicion}
                                title="Cancelar edición"
                                className="text-slate-400 hover:text-slate-600 transition p-0.5 rounded hover:bg-slate-100 dark:hover:bg-gray-700"
                              >
                                <X size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <React.Fragment key={it.id}>
                        <tr
                          className={`transition ${it.sinCodigo
                            ? 'bg-red-50/70 dark:bg-red-950/20 hover:bg-red-50 dark:hover:bg-red-950/30'
                            : esContenidoPad
                              ? 'bg-fuchsia-50/30 dark:bg-fuchsia-950/10 hover:bg-fuchsia-50/60 dark:hover:bg-fuchsia-950/20'
                              : 'hover:bg-slate-50/60 dark:hover:bg-gray-700/30'
                            }`}
                        >
                          <td className="px-2.5 py-1.5 border-b border-r border-slate-100 dark:border-gray-700/60 font-mono text-slate-500 dark:text-gray-400">
                            {idMostrado}
                          </td>
                          <td className="px-2.5 py-1.5 border-b border-r border-slate-100 dark:border-gray-700/60 text-slate-600 dark:text-gray-300">
                            {fechaMostrada}
                          </td>
                          <td className={`px-2.5 py-1.5 border-b border-r border-slate-100 dark:border-gray-700/60 font-mono ${esContenidoPad
                            ? 'text-fuchsia-600 dark:text-fuchsia-400 italic'
                            : it.sinCodigo
                              ? 'text-red-600 dark:text-red-400 font-bold'
                              : 'text-emerald-600 dark:text-emerald-400'
                            }`}>
                            {it.codigo || 'S/C'}
                          </td>
                          <td className="px-2.5 py-1.5 border-b border-r border-slate-100 dark:border-gray-700/60 text-center text-slate-600 dark:text-gray-300">
                            {it.cantidad}
                          </td>
                          <td className="px-2.5 py-1.5 border-b border-r border-slate-100 dark:border-gray-700/60 text-slate-700 dark:text-gray-200 font-medium">
                            ${Number(it.venta || 0).toLocaleString('es-CL')}
                          </td>
                          <td className="px-2.5 py-1.5 border-b border-r border-slate-100 dark:border-gray-700/60 font-medium text-slate-700 dark:text-gray-200 truncate max-w-[140px]" title={it.referencia}>
                            <span className="flex items-center gap-1">
                              {esContenidoPad && <span className="text-fuchsia-400 dark:text-fuchsia-600 shrink-0">↳</span>}
                              <span className="truncate">{it.referencia}</span>
                              {esPrincipalPad && (
                                <span className="flex items-center gap-0.5 text-[8px] px-1 rounded bg-fuchsia-100 dark:bg-fuchsia-950/40 text-fuchsia-700 dark:text-fuchsia-400 font-bold shrink-0">
                                  <Package size={9} /> PAD
                                </span>
                              )}
                            </span>
                          </td>
                          <td className="px-2.5 py-1.5 border-b border-r border-slate-100 dark:border-gray-700/60 text-slate-500 dark:text-gray-400 truncate max-w-[140px]" title={it.descriptorAuto}>
                            {it.descriptorAuto || 'P'}
                          </td>
                          <td className="px-2.5 py-1.5 border-b border-r border-slate-100 dark:border-gray-700/60 text-slate-600 dark:text-gray-300">
                            {it.clase || 'P'}
                          </td>
                          <td className="px-2.5 py-1.5 border-b border-r border-slate-100 dark:border-gray-700/60 text-slate-600 dark:text-gray-300">
                            {it.tipoVinculado || 'P'}
                          </td>
                          <td className={`px-2.5 py-1.5 border-b border-r border-slate-100 dark:border-gray-700/60 ${esContenidoPad ? 'text-fuchsia-500 dark:text-fuchsia-400 italic' : 'text-slate-600 dark:text-gray-300'}`}>
                            ${Number(it.precio || 0).toLocaleString('es-CL')}
                          </td>
                          <td className="px-2.5 py-1.5 border-b border-r border-slate-100 dark:border-gray-700/60 text-center">
                            {esContenidoPad ? (
                              <span className="text-slate-400 dark:text-gray-500">—</span>
                            ) : it.recargoEncontrado ? (
                              <span className="font-semibold text-slate-700 dark:text-gray-200">{it.vecesCosto}</span>
                            ) : (
                              <span className="text-purple-600 dark:text-purple-400 font-semibold" title="No hay rango configurado para este precio">1*</span>
                            )}
                          </td>
                          <td className="px-2.5 py-1.5 border-b border-r border-slate-100 dark:border-gray-700/60 text-emerald-700 dark:text-emerald-400 font-semibold">
                            ${Number(it.totalItem || 0).toLocaleString('es-CL')}
                          </td>
                          <td className="px-2.5 py-1.5 border-b border-r border-slate-100 dark:border-gray-700/60 text-slate-600 dark:text-gray-300">
                            {it.lote}
                          </td>
                          <td className="px-2.5 py-1.5 border-b border-r border-slate-100 dark:border-gray-700/60 text-slate-600 dark:text-gray-300">
                            {esPrincipalPad || esContenidoPad ? (it.vencimiento || 'PAD') : formatearFechaTabla(it.vencimiento)}
                          </td>
                          <td className="px-2.5 py-1.5 border-b border-r border-slate-100 dark:border-gray-700/60">
                            {esContenidoPad ? (
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded border bg-fuchsia-50 dark:bg-fuchsia-950/30 border-fuchsia-300 dark:border-fuchsia-800 text-fuchsia-700 dark:text-fuchsia-400">
                                PAD
                              </span>
                            ) : it.sinCodigo ? (
                              <span className="flex items-center gap-1 text-[9px] font-semibold text-red-600 dark:text-red-400">
                                <AlertCircle size={10} /> Sin código
                              </span>
                            ) : (
                              <div className="flex flex-col gap-0.5">
                                <select
                                  value={it.estadoCarga || 'PENDIENTE'}
                                  onChange={(e) => onActualizarEstadoItem(it.id, e.target.value)}
                                  className={`h-6 px-1.5 text-[9px] font-bold rounded border outline-none cursor-pointer ${estilo.bg} ${estilo.border} ${estilo.text}`}
                                >
                                  {ESTADO_CARGA_OPTIONS.map(op => (
                                    <option key={op} value={op}>{op}</option>
                                  ))}
                                </select>
                                {empresaNoCoincide && (
                                  <span className="flex items-center gap-0.5 text-[8px] text-amber-600 dark:text-amber-400">
                                    <AlertTriangle size={8} /> Empresa distinta
                                  </span>
                                )}
                                {!it.recargoEncontrado && (
                                  <span className="flex items-center gap-0.5 text-[8px] text-purple-600 dark:text-purple-400">
                                    <AlertTriangle size={8} /> Sin recargo
                                  </span>
                                )}
                              </div>
                            )}
                            {sinContenidoAun && (
                              <span className="flex items-center gap-0.5 text-[8px] text-amber-600 dark:text-amber-400 mt-0.5">
                                <AlertTriangle size={8} /> Contenido pendiente
                              </span>
                            )}
                          </td>
                          <td className="px-2.5 py-1.5 border-b border-slate-100 dark:border-gray-700/60 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {esPrincipalPad && (
                                <button
                                  type="button"
                                  onClick={() => mostrandoFormularioContenido ? cerrarFormularioContenido() : abrirFormularioContenido(it.id)}
                                  title={sinContenidoAun ? "Agregar contenido del PAD" : "Agregar más contenido a este PAD"}
                                  className="text-fuchsia-600 hover:text-fuchsia-800 transition p-0.5 rounded hover:bg-fuchsia-50 dark:hover:bg-fuchsia-950/30"
                                >
                                  <PackagePlus size={13} />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => iniciarEdicion(it)}
                                title="Editar ítem"
                                className="text-blue-600 hover:text-blue-800 transition p-0.5 rounded hover:bg-blue-50 dark:hover:bg-blue-950/30"
                              >
                                <Pencil size={12} />
                              </button>
                              <button
                                type="button"
                                onClick={() => onEliminarItem(it.id)}
                                title="Eliminar ítem"
                                className="text-red-500 hover:text-red-700 transition p-0.5 rounded hover:bg-red-50 dark:hover:bg-red-950/30"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>

                        {mostrandoFormularioContenido && (
                          <tr className="bg-fuchsia-50/40 dark:bg-fuchsia-950/10">
                            <td colSpan={16} className="p-2.5 border-b border-fuchsia-200 dark:border-fuchsia-900">
                              {!periodoAbierto ? (
                                <div className="flex items-center gap-2 px-2.5 py-2 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded text-[10px] text-red-700 dark:text-red-400">
                                  <Lock size={12} className="shrink-0" />
                                  <span>No hay un período abierto para Implantes en Control Mensual. No se puede agregar contenido ahora.</span>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-fuchsia-700 dark:text-fuchsia-400 uppercase flex items-center gap-1">
                                      <Package size={12} /> Agregar contenido al PAD "{it.referencia}"
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => setFilasNuevoContenido(prev => [...prev, crearFilaContenidoPadVacia()])}
                                      className="text-[9px] font-semibold text-[#2383C2] hover:underline"
                                    >
                                      + Agregar línea
                                    </button>
                                  </div>

                                  {filasNuevoContenido.map((fila, idx) => (
                                    <PadContenidoRow
                                      key={fila.tempId}
                                      fila={fila}
                                      onChange={(nueva) => setFilasNuevoContenido(prev => prev.map((f, i) => i === idx ? nueva : f))}
                                      onRemove={() => setFilasNuevoContenido(prev => prev.filter((_, i) => i !== idx))}
                                      puedeEliminar={filasNuevoContenido.length > 1}
                                    />
                                  ))}

                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => guardarNuevoContenido(it)}
                                      className="h-7 px-3 bg-[#2383C2] hover:bg-[#1d6fa5] text-white rounded font-semibold text-[10px] transition"
                                    >
                                      Guardar contenido
                                    </button>
                                    <button
                                      type="button"
                                      onClick={cerrarFormularioContenido}
                                      className="h-7 px-3 text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-200 font-medium text-[10px] transition"
                                    >
                                      Cerrar
                                    </button>
                                  </div>
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
              {items.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-50 dark:bg-gray-900/60 font-bold">
                    <td colSpan={11} className="px-2.5 py-1.5 border-t border-r border-slate-200 dark:border-gray-700 text-slate-600 dark:text-gray-300 text-right">
                      Suma de ítems:
                    </td>
                    <td className={`px-2.5 py-1.5 border-t border-r border-slate-200 dark:border-gray-700 ${totalCoincide ? 'text-emerald-700 dark:text-emerald-400' : 'text-orange-600 dark:text-orange-400'}`}>
                      ${totalItems.toLocaleString('es-CL')}
                    </td>
                    <td colSpan={4} className="border-t border-slate-200 dark:border-gray-700"></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default CotizacionCard;