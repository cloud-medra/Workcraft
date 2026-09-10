import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import {
  UploadCloud,
  Building2,
  Calendar as CalendarIcon,
  Plus,
  AlertCircle,
  Loader2,
  Lock,
  Package,
  Check,
  Trash2
} from 'lucide-react';
import { formatearFechaTabla, calcularCamposFinancieros, esClasePad, VALOR_LOTE_VENCIMIENTO_PAD } from './cargasHelpers';
import { useRecargosActivos } from './useRecargosActivos';
import { useAutocompleteReferencia } from './useAutocompleteReferencia';
import { usePeriodoAbiertoModulo } from './usePeriodoAbiertoModulo';
import { CotizacionCard } from './CotizacionCard';
import { construirItemContenidoPadDesdeFila } from './PadContenidoRow';

const INITIAL_ITEM = {
  numCotizacion: '',
  totalCotizacion: '',
  referencia: '',
  cantidad: '',
  lote: '',
  vencimiento: '',
  codigo: '',
  precio: '',
  empresaVinculada: '',
  tipoVinculado: '',
  detalle: '',
  descriptorAuto: '',
  clase: ''
};

const DRAFT_CONTENIDO_VACIO = {
  referencia: '',
  codigo: '',
  descriptorAuto: '',
  detalle: '',
  clase: '',
  tipoVinculado: '',
  empresaVinculada: '',
  cantidad: '',
  lote: '',
  vencimiento: ''
};

export const CargasTab = forwardRef(({ formData, bloqueActivoIndex, onAgregarItem, onEliminarItem, onEliminarCotizacion, onActualizarEstadoItem, onEditarItem }, ref) => {
  const bloqueActivo = formData?.bloques?.[bloqueActivoIndex];
  const cotizaciones = bloqueActivo?.cotizaciones || [];

  const [nuevoItem, setNuevoItem] = useState(INITIAL_ITEM);
  const [errores, setErrores] = useState({});
  const [esPad, setEsPad] = useState(false);
  const [contenidoPad, setContenidoPad] = useState([]);

  const [numCotizacionPad, setNumCotizacionPad] = useState('');

  const [draftContenido, setDraftContenido] = useState(DRAFT_CONTENIDO_VACIO);
  const [errorDraftContenido, setErrorDraftContenido] = useState({});

  const { recargosActivos, cargandoRecargos } = useRecargosActivos();
  const { periodoAbierto, cargandoPeriodo } = usePeriodoAbiertoModulo('implantes');
  const {
    sugerencias, buscando, mostrarSug, setMostrarSug, containerRef, skipNext
  } = useAutocompleteReferencia(nuevoItem.referencia);

  const {
    sugerencias: sugerenciasContenido,
    buscando: buscandoContenido,
    mostrarSug: mostrarSugContenido,
    setMostrarSug: setMostrarSugContenido,
    containerRef: containerRefContenido,
    skipNext: skipNextContenido
  } = useAutocompleteReferencia(draftContenido.referencia);

  const rangoActual = buscarRangoRecargoLocal(nuevoItem.precio, recargosActivos);
  const vecesCostoActual = rangoActual ? Number(rangoActual.vecesCosto) : 1;
  const cantidadActual = Number(nuevoItem.cantidad) || 1;
  const ventaActual = calcularVentaUnitariaLocal(nuevoItem.precio, vecesCostoActual) * cantidadActual;

  const resetContenidoPad = () => {
    setContenidoPad([]);
    setNumCotizacionPad('');
    setDraftContenido(DRAFT_CONTENIDO_VACIO);
    setErrorDraftContenido({});
  };

  useEffect(() => {
    const cotExistente = cotizaciones[0];
    if (cotExistente) {
      setNuevoItem(prev => ({
        ...prev,
        numCotizacion: cotExistente.numCotizacion || '',
        totalCotizacion: cotExistente.totalCotizacion ? String(cotExistente.totalCotizacion) : ''
      }));
    } else {
      setNuevoItem(prev => ({ ...prev, numCotizacion: '', totalCotizacion: '' }));
    }
    setEsPad(false);
    resetContenidoPad();
    setErrores({});
  }, [bloqueActivoIndex]);

  const formatearMiles = (valor) => {
    if (valor === null || valor === undefined || valor === '') return '';
    const num = valor.toString().replace(/\D/g, '');
    if (num === '') return '';
    return new Intl.NumberFormat('es-CL').format(num);
  };

  const handleSeleccionarSugerencia = (item) => {
    skipNext.current = true;
    const esPadItem = esClasePad(item.clase);
    setEsPad(esPadItem);
    if (!esPadItem) resetContenidoPad();

    setNuevoItem(prev => ({
      ...prev,
      referencia: item.referencia || prev.referencia,
      codigo: item.codigo || '',
      precio: item.precioNeto ?? 0,
      empresaVinculada: item.empresa || '',
      tipoVinculado: item.tipo || '',
      detalle: item.descriptorEmpresa || item.descriptorAuto || '',
      descriptorAuto: item.descriptorAuto || '',
      clase: item.clase || '',
      lote: esPadItem ? VALOR_LOTE_VENCIMIENTO_PAD : prev.lote,
      vencimiento: esPadItem ? VALOR_LOTE_VENCIMIENTO_PAD : prev.vencimiento
    }));
    setMostrarSug(false);
  };

  const handleChange = (field, value) => {
    if (field === 'referencia') {
      setNuevoItem(prev => ({
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
      setEsPad(false);
      resetContenidoPad();
      return;
    }
    setNuevoItem(prev => ({ ...prev, [field]: value }));
    if (errores[field]) setErrores(prev => ({ ...prev, [field]: false }));
  };

  const handleDraftReferenciaChange = (value) => {
    setDraftContenido(prev => ({
      ...prev,
      referencia: value,
      codigo: '',
      descriptorAuto: '',
      detalle: '',
      clase: '',
      tipoVinculado: '',
      empresaVinculada: ''
    }));
    if (errorDraftContenido.referencia) setErrorDraftContenido(prev => ({ ...prev, referencia: false }));
  };

  const handleDraftSeleccionarSugerencia = (item) => {
    skipNextContenido.current = true;
    setDraftContenido(prev => ({
      ...prev,
      referencia: item.referencia || prev.referencia,
      codigo: item.codigo || '',
      descriptorAuto: item.descriptorAuto || '',
      detalle: item.descriptorEmpresa || item.descriptorAuto || '',
      clase: item.clase || '',
      tipoVinculado: item.tipo || '',
      empresaVinculada: item.empresa || ''
    }));
    setMostrarSugContenido(false);
  };

  const handleDraftChange = (field, value) => {
    setDraftContenido(prev => ({ ...prev, [field]: value }));
    if (errorDraftContenido[field]) setErrorDraftContenido(prev => ({ ...prev, [field]: false }));
  };

  const handleRegistrarContenido = () => {
    const err = {};
    if (!draftContenido.referencia.trim()) err.referencia = true;
    if (!draftContenido.cantidad || Number(draftContenido.cantidad) <= 0) err.cantidad = true;

    if (Object.keys(err).length > 0) {
      setErrorDraftContenido(err);
      return;
    }

    const filaRegistrada = {
      ...draftContenido,
      tempId: crypto.randomUUID(),
      referencia: draftContenido.referencia.trim(),
      cantidad: Number(draftContenido.cantidad),
      lote: draftContenido.lote.trim() || 'Sin lote',
      vencimiento: draftContenido.vencimiento || 'Sin fecha'
    };

    setContenidoPad(prev => [...prev, filaRegistrada]);
    setDraftContenido(DRAFT_CONTENIDO_VACIO);
    setErrorDraftContenido({});
  };

  const handleEliminarContenidoRegistrado = (tempId) => {
    setContenidoPad(prev => prev.filter(f => f.tempId !== tempId));
  };

  // Construye el ítem principal (y el contenido del PAD, si aplica) a partir
  // de lo que hay cargado en el formulario "Agregar ítem". No toca el estado:
  // solo arma los objetos, tal como los espera onAgregarItem.
  const construirItemsDesdeFormulario = () => {
    const sinCodigo = !nuevoItem.codigo;
    const { vecesCosto, recargoEncontrado, venta, totalItem } = calcularCamposFinancieros(
      nuevoItem.precio, nuevoItem.cantidad, recargosActivos
    );

    const idPadPrincipal = esPad ? crypto.randomUUID() : undefined;

    const itemPrincipal = {
      ...(idPadPrincipal ? { id: idPadPrincipal } : {}),
      esPad,
      numCotizacion: nuevoItem.numCotizacion.trim(),
      totalCotizacion: nuevoItem.totalCotizacion ? Number(nuevoItem.totalCotizacion) : 0,
      referencia: nuevoItem.referencia.trim(),
      cantidad: Number(nuevoItem.cantidad) || 0,
      lote: esPad ? VALOR_LOTE_VENCIMIENTO_PAD : (nuevoItem.lote.trim() || 'Sin lote'),
      vencimiento: esPad ? VALOR_LOTE_VENCIMIENTO_PAD : (nuevoItem.vencimiento || 'Sin fecha'),
      codigo: nuevoItem.codigo || '',
      precio: Number(nuevoItem.precio) || 0,
      vecesCosto,
      recargoEncontrado,
      venta,
      totalItem,
      empresaVinculada: nuevoItem.empresaVinculada || '',
      tipoVinculado: nuevoItem.tipoVinculado || 'P',
      detalle: nuevoItem.detalle || 'P',
      descriptorAuto: nuevoItem.descriptorAuto || 'P',
      clase: nuevoItem.clase || 'P',
      sinCodigo,
      estadoCarga: 'PENDIENTE',
      periodoAnio: periodoAbierto.anio,
      periodoMes: periodoAbierto.mes
    };

    const itemsContenido = [];
    if (esPad && contenidoPad.length > 0) {
      const numCotContenido = numCotizacionPad.trim() || nuevoItem.numCotizacion.trim();
      contenidoPad.forEach(fila => {
        itemsContenido.push(construirItemContenidoPadDesdeFila(fila, idPadPrincipal, {
          numCotizacion: numCotContenido,
          totalCotizacion: 0,
          periodoAnio: periodoAbierto.anio,
          periodoMes: periodoAbierto.mes
        }));
      });
    }

    return [itemPrincipal, ...itemsContenido];
  };

  const limpiarFormularioNuevoItem = () => {
    setNuevoItem(prev => ({
      ...INITIAL_ITEM,
      numCotizacion: prev.numCotizacion,
      totalCotizacion: prev.totalCotizacion
    }));
    setEsPad(false);
    resetContenidoPad();
    setErrores({});
  };

  const handleAgregar = () => {
    if (!periodoAbierto) return;

    const err = {};
    if (!nuevoItem.numCotizacion.trim()) err.numCotizacion = true;
    if (!nuevoItem.referencia.trim()) err.referencia = true;
    if (!nuevoItem.cantidad || Number(nuevoItem.cantidad) <= 0) err.cantidad = true;

    if (Object.keys(err).length > 0) {
      setErrores(err);
      return;
    }

    construirItemsDesdeFormulario().forEach(item => onAgregarItem(bloqueActivoIndex, item));
    limpiarFormularioNuevoItem();
  };

  useImperativeHandle(ref, () => ({
    confirmarItemPendiente: () => {
      const hayItemCargado = !!(
        nuevoItem.referencia.trim() ||
        nuevoItem.cantidad ||
        contenidoPad.length > 0
      );

      if (!hayItemCargado) {
        const totalIngresado = nuevoItem.totalCotizacion !== '' ? Number(nuevoItem.totalCotizacion) : null;
        const totalActual = cotizaciones[0]?.totalCotizacion ?? 0;

        if (cotizaciones.length > 0 && totalIngresado !== null && totalIngresado !== totalActual) {
          return {
            status: 'solo-total',
            totalCotizacion: totalIngresado,
            numCotizacion: nuevoItem.numCotizacion.trim() || undefined
          };
        }

        return { status: 'vacio' };
      }

      if (!periodoAbierto) return { status: 'incompleto' };

      const err = {};
      if (!nuevoItem.numCotizacion.trim()) err.numCotizacion = true;
      if (!nuevoItem.referencia.trim()) err.referencia = true;
      if (!nuevoItem.cantidad || Number(nuevoItem.cantidad) <= 0) err.cantidad = true;

      if (Object.keys(err).length > 0) {
        setErrores(err);
        return { status: 'incompleto' };
      }

      const items = construirItemsDesdeFormulario();
      limpiarFormularioNuevoItem();
      return { status: 'ok', items };
    }
  }));

  if (!bloqueActivo) {
    return (
      <div className="p-4 max-w-7xl mx-auto w-full">
        <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700/80 rounded-lg shadow-xs p-6 text-[10px] text-slate-500 dark:text-gray-400">
          Selecciona una empresa/fecha en el panel lateral para gestionar sus cargas.
        </div>
      </div>
    );
  }

  const sinPeriodoAbierto = !cargandoPeriodo && !periodoAbierto;

  return (
    <div className="p-4 max-w-7xl mx-auto w-full space-y-3">

      <div className="flex items-center justify-between gap-1.5 px-1">
        <div className="flex items-center gap-1.5">
          <UploadCloud size={13} className="text-[#2383C2]" />
          <h3 className="text-[11px] font-bold text-slate-700 dark:text-gray-200 uppercase tracking-wide">
            Cotizaciones — Admisión #{formData?.gestionId || 'N/A'}
          </h3>
        </div>

        <div className="flex items-center gap-2 text-[9px] text-slate-500 dark:text-gray-400">
          <span className="flex items-center gap-1">
            <Building2 size={11} className="text-[#2383C2]" />
            {bloqueActivo.empresa || 'SIN EMPRESA'}
          </span>
          <span className="text-slate-300 dark:text-gray-600">/</span>
          <span className="flex items-center gap-1">
            <CalendarIcon size={11} className="text-[#2383C2]" />
            {formatearFechaTabla(bloqueActivo.fecha)}
          </span>
          {periodoAbierto && (
            <>
              <span className="text-slate-300 dark:text-gray-600">/</span>
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                Período: {periodoAbierto.mes.toUpperCase()} {periodoAbierto.anio}
              </span>
            </>
          )}
        </div>
      </div>

      {sinPeriodoAbierto && (
        <div className="flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg text-[11px] text-red-700 dark:text-red-400">
          <Lock size={14} className="shrink-0" />
          <span>
            No hay un período abierto para <strong>Implantes</strong> en Control Mensual. No se pueden registrar ítems nuevos hasta que se abra un período.
          </span>
        </div>
      )}

      <fieldset disabled={sinPeriodoAbierto} className={sinPeriodoAbierto ? 'opacity-60' : ''}>
        <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700/80 rounded-lg shadow-xs p-3 space-y-2.5">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 items-end">

            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-bold text-slate-500 dark:text-gray-400 uppercase flex justify-between">
                <span>N° Cotización</span>
                <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={nuevoItem.numCotizacion}
                onChange={e => handleChange('numCotizacion', e.target.value)}
                className={`h-7 px-2 text-[10px] border rounded bg-white dark:bg-gray-900 text-slate-800 dark:text-gray-100 outline-none ${errores.numCotizacion ? 'border-red-500 ring-1 ring-red-500/30' : 'border-slate-300 dark:border-gray-600 focus:ring-1 focus:ring-[#2383C2]'
                  }`}
                placeholder="Ej: COT-001"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-bold text-slate-500 dark:text-gray-400 uppercase">
                Total Cot. <span className="text-slate-400 normal-case font-normal">(= Costo del bloque)</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={formatearMiles(nuevoItem.totalCotizacion)}
                onChange={e => {
                  const soloNumeros = e.target.value.replace(/\D/g, '');
                  handleChange('totalCotizacion', soloNumeros);
                }}
                className="h-7 px-2 text-[10px] border border-slate-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-slate-800 dark:text-gray-100 outline-none focus:ring-1 focus:ring-[#2383C2]"
                placeholder="0"
              />
            </div>

            <div className="flex flex-col gap-1 relative lg:col-span-2" ref={containerRef}>
              <label className="text-[9px] font-bold text-slate-500 dark:text-gray-400 uppercase flex justify-between">
                <span>Referencia</span>
                <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={nuevoItem.referencia}
                onChange={e => handleChange('referencia', e.target.value)}
                onFocus={() => sugerencias.length > 0 && setMostrarSug(true)}
                autoComplete="off"
                className={`h-7 px-2 text-[10px] border rounded bg-white dark:bg-gray-900 text-slate-800 dark:text-gray-100 outline-none ${errores.referencia ? 'border-red-500 ring-1 ring-red-500/30' : 'border-slate-300 dark:border-gray-600 focus:ring-1 focus:ring-[#2383C2]'
                  }`}
                placeholder="Buscar referencia..."
              />

              {mostrarSug && (
                <div className="absolute top-full left-0 mt-1 w-64 max-h-48 overflow-y-auto bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded shadow-lg z-30">
                  {buscando ? (
                    <div className="px-2.5 py-2 text-[10px] text-slate-400 flex items-center gap-1.5">
                      <Loader2 size={11} className="animate-spin" /> Buscando...
                    </div>
                  ) : sugerencias.length === 0 ? (
                    <div className="px-2.5 py-2 text-[10px] text-slate-400">Sin coincidencias</div>
                  ) : (
                    sugerencias.map(item => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSeleccionarSugerencia(item)}
                        className="w-full text-left px-2.5 py-1.5 hover:bg-slate-100 dark:hover:bg-gray-700/60 border-b border-slate-100 dark:border-gray-700/50 last:border-b-0"
                      >
                        <div className="text-[10px] font-semibold text-slate-700 dark:text-gray-200 truncate flex items-center gap-1">
                          {item.referencia}
                          {esClasePad(item.clase) && (
                            <span className="text-[8px] px-1 rounded bg-fuchsia-100 dark:bg-fuchsia-950/40 text-fuchsia-700 dark:text-fuchsia-400 font-bold">PAD</span>
                          )}
                        </div>
                        <div className="text-[9px] text-slate-400 dark:text-gray-500 flex items-center gap-1.5">
                          <span className="font-mono text-emerald-600 dark:text-emerald-400">{item.codigo || 'S/C'}</span>
                          <span>·</span>
                          <span className="truncate">{item.empresa}</span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-bold text-slate-500 dark:text-gray-400 uppercase flex justify-between">
                <span>Cant.</span>
                <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={nuevoItem.cantidad}
                onChange={e => handleChange('cantidad', e.target.value)}
                className={`h-7 px-2 text-[10px] border rounded bg-white dark:bg-gray-900 text-slate-800 dark:text-gray-100 outline-none ${errores.cantidad ? 'border-red-500 ring-1 ring-red-500/30' : 'border-slate-300 dark:border-gray-600 focus:ring-1 focus:ring-[#2383C2]'
                  }`}
                placeholder="1"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-bold text-slate-500 dark:text-gray-400 uppercase">Lote</label>
              <input
                type="text"
                value={esPad ? VALOR_LOTE_VENCIMIENTO_PAD : nuevoItem.lote}
                disabled={esPad}
                onChange={e => handleChange('lote', e.target.value)}
                className={`h-7 px-2 text-[10px] border rounded outline-none ${esPad
                  ? 'bg-slate-100 dark:bg-gray-800 border-slate-200 dark:border-gray-700 text-slate-500 dark:text-gray-400'
                  : 'bg-white dark:bg-gray-900 border-slate-300 dark:border-gray-600 text-slate-800 dark:text-gray-100 focus:ring-1 focus:ring-[#2383C2]'
                  }`}
                placeholder="Ej: L-4521"
              />
            </div>

            <div className="flex items-end gap-1.5">
              <div className="flex flex-col gap-1 flex-grow">
                <label className="text-[9px] font-bold text-slate-500 dark:text-gray-400 uppercase">Vencimiento</label>
                {esPad ? (
                  <input
                    type="text"
                    value={VALOR_LOTE_VENCIMIENTO_PAD}
                    disabled
                    className="h-7 px-2 text-[10px] border border-slate-200 dark:border-gray-700 rounded bg-slate-100 dark:bg-gray-800 text-slate-500 dark:text-gray-400 outline-none"
                  />
                ) : (
                  <input
                    type="date"
                    value={nuevoItem.vencimiento}
                    onChange={e => handleChange('vencimiento', e.target.value)}
                    className="h-7 px-2 text-[10px] border border-slate-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-slate-800 dark:text-gray-100 outline-none focus:ring-1 focus:ring-[#2383C2]"
                  />
                )}
              </div>
              <button
                type="button"
                onClick={handleAgregar}
                disabled={sinPeriodoAbierto}
                className="h-7 px-2.5 bg-[#2383C2] hover:bg-[#1d6fa5] text-white rounded font-semibold flex items-center justify-center gap-1 transition text-[10px] shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                title={sinPeriodoAbierto ? "No hay período abierto para Implantes" : "Agregar ítem"}
              >
                <Plus size={13} />
              </button>
            </div>
          </div>

          {(errores.numCotizacion || errores.referencia || errores.cantidad) && (
            <div className="text-[9px] text-red-500 font-medium flex items-center gap-1">
              <AlertCircle size={10} /> N° Cotización, Referencia y Cantidad son obligatorios
            </div>
          )}

          {esPad && (
            <div className="border border-fuchsia-200 dark:border-fuchsia-900 bg-fuchsia-50/40 dark:bg-fuchsia-950/10 rounded-lg p-2.5 space-y-2.5">
              <span className="text-[10px] font-bold text-fuchsia-700 dark:text-fuchsia-400 uppercase flex items-center gap-1">
                <Package size={12} /> Contenido del PAD <span className="text-[9px] font-normal normal-case text-fuchsia-500 dark:text-fuchsia-500">(opcional, puedes completarlo ahora o más adelante)</span>
              </span>

              <div className="bg-white/60 dark:bg-gray-900/40 rounded border border-fuchsia-200/70 dark:border-fuchsia-900/50 p-2 space-y-1">
                <label className="text-[9px] font-bold text-fuchsia-700 dark:text-fuchsia-400 uppercase">
                  N° Cotización del contenido
                </label>
                <input
                  type="text"
                  value={numCotizacionPad}
                  onChange={e => setNumCotizacionPad(e.target.value)}
                  className="w-full h-7 px-2 text-[10px] border border-fuchsia-300 dark:border-fuchsia-800 rounded bg-white dark:bg-gray-900 text-slate-800 dark:text-gray-100 outline-none focus:ring-1 focus:ring-fuchsia-500"
                  placeholder={nuevoItem.numCotizacion ? `Vacío = ${nuevoItem.numCotizacion}` : 'Ej: COT-002'}
                />
                <p className="text-[9px] text-fuchsia-500 dark:text-fuchsia-500 italic">
                  Déjalo en blanco si el contenido se cotizó junto con la referencia principal (usará "{nuevoItem.numCotizacion || 'la misma cotización'}"). El contenido siempre se guarda con precio $0.
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 items-end bg-white dark:bg-gray-900/60 rounded border border-fuchsia-200 dark:border-fuchsia-900/60 p-2">
                <div className="flex flex-col gap-1 relative md:col-span-2" ref={containerRefContenido}>
                  <label className="text-[9px] font-bold text-slate-500 dark:text-gray-400 uppercase">Referencia contenido</label>
                  <input
                    type="text"
                    value={draftContenido.referencia}
                    onChange={e => handleDraftReferenciaChange(e.target.value)}
                    onFocus={() => sugerenciasContenido.length > 0 && setMostrarSugContenido(true)}
                    autoComplete="off"
                    className={`h-7 px-2 text-[10px] border rounded bg-white dark:bg-gray-900 text-slate-800 dark:text-gray-100 outline-none ${errorDraftContenido.referencia ? 'border-red-500 ring-1 ring-red-500/30' : 'border-slate-300 dark:border-gray-600 focus:ring-1 focus:ring-[#2383C2]'}`}
                    placeholder="Buscar referencia..."
                  />
                  {mostrarSugContenido && (
                    <div className="absolute top-full left-0 mt-1 w-56 max-h-40 overflow-y-auto bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded shadow-lg z-30">
                      {buscandoContenido ? (
                        <div className="px-2.5 py-2 text-[10px] text-slate-400 flex items-center gap-1.5">
                          <Loader2 size={11} className="animate-spin" /> Buscando...
                        </div>
                      ) : sugerenciasContenido.length === 0 ? (
                        <div className="px-2.5 py-2 text-[10px] text-slate-400">Sin coincidencias</div>
                      ) : (
                        sugerenciasContenido.map(item => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => handleDraftSeleccionarSugerencia(item)}
                            className="w-full text-left px-2.5 py-1.5 hover:bg-slate-100 dark:hover:bg-gray-700/60 border-b border-slate-100 dark:border-gray-700/50 last:border-b-0"
                          >
                            <div className="text-[10px] font-semibold text-slate-700 dark:text-gray-200 truncate">{item.referencia}</div>
                            <div className="text-[9px] text-slate-400 dark:text-gray-500 flex items-center gap-1.5">
                              <span className="font-mono text-emerald-600 dark:text-emerald-400">{item.codigo || 'S/C'}</span>
                              <span>·</span>
                              <span className="truncate">{item.descriptorAuto || item.empresa}</span>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold text-slate-500 dark:text-gray-400 uppercase">Cant.</label>
                  <input
                    type="number"
                    value={draftContenido.cantidad}
                    onChange={e => handleDraftChange('cantidad', e.target.value)}
                    className={`h-7 px-2 text-[10px] border rounded bg-white dark:bg-gray-900 text-slate-800 dark:text-gray-100 outline-none ${errorDraftContenido.cantidad ? 'border-red-500 ring-1 ring-red-500/30' : 'border-slate-300 dark:border-gray-600'}`}
                    placeholder="1"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold text-slate-500 dark:text-gray-400 uppercase">Lote</label>
                  <input
                    type="text"
                    value={draftContenido.lote}
                    onChange={e => handleDraftChange('lote', e.target.value)}
                    className="h-7 px-2 text-[10px] border border-slate-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-slate-800 dark:text-gray-100 outline-none"
                    placeholder="Vacío = Sin lote"
                  />
                </div>

                <div className="flex items-end gap-1.5">
                  <div className="flex flex-col gap-1 flex-grow">
                    <label className="text-[9px] font-bold text-slate-500 dark:text-gray-400 uppercase">Vencimiento</label>
                    <input
                      type="date"
                      value={draftContenido.vencimiento}
                      onChange={e => handleDraftChange('vencimiento', e.target.value)}
                      className="h-7 px-2 text-[10px] border border-slate-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-slate-800 dark:text-gray-100 outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleRegistrarContenido}
                    className="h-7 px-2.5 bg-fuchsia-600 hover:bg-fuchsia-700 text-white rounded font-semibold flex items-center justify-center gap-1 transition text-[10px] shrink-0"
                    title="Registrar esta línea de contenido"
                  >
                    <Check size={13} />
                  </button>
                </div>

                {(errorDraftContenido.referencia || errorDraftContenido.cantidad) && (
                  <div className="md:col-span-5 text-[9px] text-red-500 font-medium flex items-center gap-1">
                    <AlertCircle size={10} /> Referencia y Cantidad son obligatorias para registrar
                  </div>
                )}

                <div className="md:col-span-5 text-[9px] text-slate-400 dark:text-gray-500 truncate">
                  {draftContenido.descriptorAuto || (draftContenido.referencia.trim() ? 'Sin descripción encontrada' : 'Vacío = Sin lote / Sin fecha al registrar')}
                </div>
              </div>

              {contenidoPad.length > 0 && (
                <div className="overflow-hidden rounded border border-fuchsia-200 dark:border-fuchsia-900/60">
                  <table className="w-full text-left text-[10px] border-collapse">
                    <thead className="bg-fuchsia-100/60 dark:bg-fuchsia-950/30">
                      <tr className="text-fuchsia-700 dark:text-fuchsia-400 uppercase font-bold text-[9px]">
                        <th className="px-2 py-1 border-b border-fuchsia-200 dark:border-fuchsia-900/60">Referencia</th>
                        <th className="px-2 py-1 border-b border-fuchsia-200 dark:border-fuchsia-900/60 text-center">Cant.</th>
                        <th className="px-2 py-1 border-b border-fuchsia-200 dark:border-fuchsia-900/60">Lote</th>
                        <th className="px-2 py-1 border-b border-fuchsia-200 dark:border-fuchsia-900/60">Vencimiento</th>
                        <th className="px-2 py-1 border-b border-fuchsia-200 dark:border-fuchsia-900/60 text-center">Quitar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contenidoPad.map(fila => (
                        <tr key={fila.tempId} className="bg-white dark:bg-gray-900/40 hover:bg-fuchsia-50/40 dark:hover:bg-fuchsia-950/10">
                          <td className="px-2 py-1 border-b border-fuchsia-100 dark:border-fuchsia-900/40 font-semibold text-slate-700 dark:text-gray-200 truncate max-w-[160px]" title={fila.referencia}>
                            {fila.referencia}
                          </td>
                          <td className="px-2 py-1 border-b border-fuchsia-100 dark:border-fuchsia-900/40 text-center text-slate-600 dark:text-gray-300">
                            {fila.cantidad}
                          </td>
                          <td className="px-2 py-1 border-b border-fuchsia-100 dark:border-fuchsia-900/40 text-slate-600 dark:text-gray-300">
                            {fila.lote === 'Sin lote'
                              ? <span className="italic text-slate-400 dark:text-gray-500">Sin lote</span>
                              : fila.lote}
                          </td>
                          <td className="px-2 py-1 border-b border-fuchsia-100 dark:border-fuchsia-900/40 text-slate-600 dark:text-gray-300">
                            {fila.vencimiento === 'Sin fecha'
                              ? <span className="italic text-slate-400 dark:text-gray-500">Sin fecha</span>
                              : formatearFechaTabla(fila.vencimiento)}
                          </td>
                          <td className="px-2 py-1 border-b border-fuchsia-100 dark:border-fuchsia-900/40 text-center">
                            <button
                              type="button"
                              onClick={() => handleEliminarContenidoRegistrado(fila.tempId)}
                              className="text-red-500 hover:text-red-700 p-0.5 rounded hover:bg-red-50 dark:hover:bg-red-950/30"
                              title="Quitar esta línea"
                            >
                              <Trash2 size={12} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <p className="text-[9px] text-fuchsia-600 dark:text-fuchsia-400 italic">
                Si no registras contenido aquí, el PAD se guardará solo y quedará marcado como "Contenido pendiente" en la tabla
                hasta que se lo agregues (ahí mismo, cuando quieras). El ítem principal (el código que buscaste) queda con Lote y
                Vencimiento = "PAD".
              </p>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-4 px-2.5 py-1.5 bg-gray-100/60 dark:bg-gray-900/40 rounded border border-dashed border-slate-200 dark:border-gray-700/60 text-[10px]">
            <span className="text-[9px] font-bold uppercase text-gray-400 dark:text-gray-500">Vinculado:</span>
            <span className="flex items-center gap-1">
              <span className="font-bold text-gray-500 dark:text-gray-400 text-[9px] uppercase">Código:</span>
              {buscando ? <Loader2 size={10} className="animate-spin text-[#2383C2]" /> : (
                <span className={`font-mono font-semibold ${nuevoItem.codigo ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-500'}`}>
                  {nuevoItem.codigo || (nuevoItem.referencia.trim() ? 'NO ENCONTRADO' : 'P')}
                </span>
              )}
            </span>
            <span className="flex items-center gap-1">
              <span className="font-bold text-gray-500 dark:text-gray-400 text-[9px] uppercase">Clase:</span>
              <span className={`font-medium ${esPad ? 'text-fuchsia-600 dark:text-fuchsia-400 font-bold' : 'text-gray-700 dark:text-gray-200'}`}>
                {nuevoItem.clase || 'P'}
              </span>
            </span>
            <span className="flex items-center gap-1">
              <span className="font-bold text-gray-500 dark:text-gray-400 text-[9px] uppercase">Tipo:</span>
              <span className="font-medium text-gray-700 dark:text-gray-200">{nuevoItem.tipoVinculado || 'P'}</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="font-bold text-gray-500 dark:text-gray-400 text-[9px] uppercase">Precio:</span>
              <span className="font-semibold text-gray-700 dark:text-gray-200">
                {nuevoItem.precio !== '' ? `$${Number(nuevoItem.precio).toLocaleString('es-CL')}` : 'P'}
              </span>
            </span>
            <span className="flex items-center gap-1">
              <span className="font-bold text-gray-500 dark:text-gray-400 text-[9px] uppercase">Recargo:</span>
              {cargandoRecargos ? (
                <Loader2 size={10} className="animate-spin text-[#2383C2]" />
              ) : nuevoItem.precio === '' ? (
                <span className="text-gray-700 dark:text-gray-200">P</span>
              ) : rangoActual ? (
                <span className="font-semibold text-gray-700 dark:text-gray-200">
                  {vecesCostoActual} <span className="text-[8px] text-gray-400 font-normal">(${Number(rangoActual.desde).toLocaleString('es-CL')} - ${Number(rangoActual.hasta).toLocaleString('es-CL')})</span>
                </span>
              ) : (
                <span className="font-semibold text-purple-600 dark:text-purple-400" title="No hay rango configurado en Recargos Maestros para este precio">
                  1 (sin rango)
                </span>
              )}
            </span>
            <span className="flex items-center gap-1">
              <span className="font-bold text-gray-500 dark:text-gray-400 text-[9px] uppercase">Venta:</span>
              <span className="font-semibold text-gray-700 dark:text-gray-200">
                ${ventaActual.toLocaleString('es-CL')}
              </span>
            </span>
            <span className="flex items-center gap-1">
              <span className="font-bold text-gray-500 dark:text-gray-400 text-[9px] uppercase">Empresa:</span>
              <span className="font-medium text-gray-700 dark:text-gray-200">{nuevoItem.empresaVinculada || 'P'}</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="font-bold text-gray-500 dark:text-gray-400 text-[9px] uppercase">Desc. Auto:</span>
              <span className="font-medium text-gray-700 dark:text-gray-200">{nuevoItem.descriptorAuto || 'P'}</span>
            </span>
          </div>
        </div>
      </fieldset>

      {cotizaciones.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700/80 rounded-lg p-6 text-center text-[10px] text-slate-400 dark:text-gray-500">
          Aún no hay ítems registrados para esta empresa/fecha.
        </div>
      ) : (
        <div className="space-y-2.5">
          {cotizaciones.map((cot, idx) => (
            <CotizacionCard
              key={cot.id}
              cotizacion={cot}
              bloqueEmpresa={bloqueActivo.empresa}
              recargosActivos={recargosActivos}
              defaultOpen={idx === cotizaciones.length - 1}
              periodoAbierto={periodoAbierto}
              onAgregarItem={(itemData) => onAgregarItem(bloqueActivoIndex, itemData)}
              onEliminarItem={(itemId) => onEliminarItem(bloqueActivoIndex, cot.id, itemId)}
              onEliminarCotizacion={() => onEliminarCotizacion(bloqueActivoIndex, cot.id)}
              onActualizarEstadoItem={(itemId, nuevoEstado) => onActualizarEstadoItem(bloqueActivoIndex, cot.id, itemId, nuevoEstado)}
              onEditarItem={(itemId, camposActualizados) => onEditarItem(bloqueActivoIndex, cot.id, itemId, camposActualizados)}
            />
          ))}
        </div>
      )}

      <p className="text-[9px] text-slate-400 dark:text-gray-500 italic px-1">
        Los ítems se guardan al presionar "Guardar Todo". Cada ítem queda imputado al período {periodoAbierto ? `${periodoAbierto.mes.toUpperCase()} ${periodoAbierto.anio}` : 'que esté abierto'} en Control Mensual.
      </p>
    </div>
  );
});

function buscarRangoRecargoLocal(precio, recargosActivos) {
  const p = Number(precio) || 0;
  return recargosActivos.find(r => p >= Number(r.desde) && p <= Number(r.hasta)) || null;
}
function calcularVentaUnitariaLocal(precio, vecesCosto) {
  const p = Number(precio) || 0;
  const v = Number(vecesCosto) || 1;
  return p * v;
}

export default CargasTab;