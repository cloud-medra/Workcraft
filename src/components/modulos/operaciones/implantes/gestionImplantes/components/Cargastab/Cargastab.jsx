import React, { useState, useEffect } from 'react';
import {
  UploadCloud,
  Building2,
  Calendar as CalendarIcon,
  Plus,
  AlertCircle,
  Loader2,
  Lock,
  Package
} from 'lucide-react';
import { formatearFechaTabla, calcularCamposFinancieros, esClasePad, VALOR_LOTE_VENCIMIENTO_PAD } from './cargasHelpers';
import { useRecargosActivos } from './useRecargosActivos';
import { useAutocompleteReferencia } from './useAutocompleteReferencia';
import { usePeriodoAbiertoModulo } from './usePeriodoAbiertoModulo';
import { CotizacionCard } from './CotizacionCard';
import { PadContenidoRow, crearFilaContenidoPadVacia, construirItemContenidoPadDesdeFila } from './PadContenidoRow';

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

/**
 * Tab "Cargas": como cada bloque (empresa/fecha) admite UNA sola cotización,
 * el formulario precarga automáticamente el N° Cotización y el Total apenas
 * detecta que el bloque activo ya tiene su cotización creada. El Total Cot.
 * queda sincronizado en ambas direcciones con "Costo ($)" de Información.
 *
 * Al seleccionar una Referencia se traen desde Códigos Maestros: Código,
 * Precio, Empresa, Tipo, Detalle y Clase. El "Recargo" se busca en Recargos
 * Maestros según el rango del Precio. Venta = Precio x VecesCosto x Cantidad.
 * Total Ítem = Precio x Cantidad.
 *
 * Cada ítem que se agrega queda sellado con el Período (mes/año) que esté
 * ABIERTO/REABIERTO para el módulo "implantes" en Control Mensual. Si no hay
 * ningún período abierto, no se permite agregar ítems nuevos.
 *
 * REGLA PAD: si la Referencia elegida tiene clase "PAD", el ítem principal
 * queda con Lote y Vencimiento = "PAD" (no aplica un lote/vencimiento único).
 * El contenido real del pack (varios ítems con su propio lote/vencimiento) es
 * OPCIONAL en este momento — puede completarse ahora o más adelante desde la
 * tabla (ver CotizacionCard), ya que a veces no se tiene el detalle a mano al
 * momento de crear el PAD. Cada ítem de contenido se guarda con Precio $0,
 * Código "No lleva OC" y Estado de Carga "PAD".
 */
export const CargasTab = ({ formData, bloqueActivoIndex, onAgregarItem, onEliminarItem, onEliminarCotizacion, onActualizarEstadoItem, onEditarItem }) => {
  const bloqueActivo = formData?.bloques?.[bloqueActivoIndex];
  const cotizaciones = bloqueActivo?.cotizaciones || [];

  const [nuevoItem, setNuevoItem] = useState(INITIAL_ITEM);
  const [errores, setErrores] = useState({});
  const [esPad, setEsPad] = useState(false);
  const [contenidoPad, setContenidoPad] = useState([]);

  const { recargosActivos, cargandoRecargos } = useRecargosActivos();
  const { periodoAbierto, cargandoPeriodo } = usePeriodoAbiertoModulo('implantes');
  const {
    sugerencias, buscando, mostrarSug, setMostrarSug, containerRef, skipNext
  } = useAutocompleteReferencia(nuevoItem.referencia);

  const rangoActual = buscarRangoRecargoLocal(nuevoItem.precio, recargosActivos);
  const vecesCostoActual = rangoActual ? Number(rangoActual.vecesCosto) : 1;
  const cantidadActual = Number(nuevoItem.cantidad) || 1;
  const ventaActual = calcularVentaUnitariaLocal(nuevoItem.precio, vecesCostoActual) * cantidadActual;

  // Precarga N° Cotización y Total si el bloque activo ya tiene su (única) cotización creada
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
    setContenidoPad([]);
    setErrores({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bloqueActivoIndex]);

  const handleSeleccionarSugerencia = (item) => {
    skipNext.current = true;
    const esPadItem = esClasePad(item.clase);
    setEsPad(esPadItem);
    // Se ofrece una fila de contenido vacía por comodidad, pero es opcional:
    // el usuario puede dejarla en blanco y guardar el PAD sin contenido.
    setContenidoPad(prev => (esPadItem && prev.length === 0) ? [crearFilaContenidoPadVacia()] : (esPadItem ? prev : []));

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
      setContenidoPad([]);
      return;
    }
    setNuevoItem(prev => ({ ...prev, [field]: value }));
    if (errores[field]) setErrores(prev => ({ ...prev, [field]: false }));
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

    const sinCodigo = !nuevoItem.codigo;
    const { vecesCosto, recargoEncontrado, venta, totalItem } = calcularCamposFinancieros(
      nuevoItem.precio, nuevoItem.cantidad, recargosActivos
    );

    const idPadPrincipal = esPad ? crypto.randomUUID() : undefined;

    onAgregarItem(bloqueActivoIndex, {
      ...(idPadPrincipal ? { id: idPadPrincipal } : {}),
      esPad,
      numCotizacion: nuevoItem.numCotizacion.trim(),
      totalCotizacion: nuevoItem.totalCotizacion ? Number(nuevoItem.totalCotizacion) : 0,
      referencia: nuevoItem.referencia.trim(),
      cantidad: Number(nuevoItem.cantidad) || 0,
      lote: esPad ? VALOR_LOTE_VENCIMIENTO_PAD : (nuevoItem.lote.trim() || 'P'),
      vencimiento: esPad ? VALOR_LOTE_VENCIMIENTO_PAD : (nuevoItem.vencimiento || ''),
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
    });

    // El contenido del PAD es opcional: solo se agregan las filas que el
    // usuario haya completado (referencia + cantidad). Si no completó
    // ninguna, el PAD se guarda solo y quedará marcado como "pendiente"
    // en la tabla hasta que se le agregue contenido (ahí o más adelante).
    if (esPad) {
      const contenidoValido = contenidoPad.filter(f => f.referencia.trim() && Number(f.cantidad) > 0);
      contenidoValido.forEach(fila => {
        onAgregarItem(bloqueActivoIndex, construirItemContenidoPadDesdeFila(fila, idPadPrincipal, {
          numCotizacion: nuevoItem.numCotizacion.trim(),
          totalCotizacion: nuevoItem.totalCotizacion ? Number(nuevoItem.totalCotizacion) : 0,
          periodoAnio: periodoAbierto.anio,
          periodoMes: periodoAbierto.mes
        }));
      });
    }

    setNuevoItem(prev => ({
      ...INITIAL_ITEM,
      numCotizacion: prev.numCotizacion,
      totalCotizacion: prev.totalCotizacion
    }));
    setEsPad(false);
    setContenidoPad([]);
    setErrores({});
  };

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
                type="number"
                value={nuevoItem.totalCotizacion}
                onChange={e => handleChange('totalCotizacion', e.target.value)}
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
            <div className="border border-fuchsia-200 dark:border-fuchsia-900 bg-fuchsia-50/40 dark:bg-fuchsia-950/10 rounded-lg p-2.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-fuchsia-700 dark:text-fuchsia-400 uppercase flex items-center gap-1">
                  <Package size={12} /> Contenido del PAD <span className="text-[9px] font-normal normal-case text-fuchsia-500 dark:text-fuchsia-500">(opcional, puedes completarlo ahora o más adelante)</span>
                </span>
                <button
                  type="button"
                  onClick={() => setContenidoPad(prev => [...prev, crearFilaContenidoPadVacia()])}
                  className="text-[9px] font-semibold text-[#2383C2] hover:underline flex items-center gap-0.5"
                >
                  <Plus size={11} /> Agregar línea
                </button>
              </div>

              {contenidoPad.map((fila, idx) => (
                <PadContenidoRow
                  key={fila.tempId}
                  fila={fila}
                  onChange={(nueva) => setContenidoPad(prev => prev.map((f, i) => i === idx ? nueva : f))}
                  onRemove={() => setContenidoPad(prev => prev.filter((_, i) => i !== idx))}
                  puedeEliminar={contenidoPad.length > 1}
                />
              ))}

              <p className="text-[9px] text-fuchsia-600 dark:text-fuchsia-400 italic">
                Si dejas estas líneas en blanco, el PAD se guardará solo y quedará marcado como "Contenido pendiente" en la tabla
                hasta que se lo agregues (ahí mismo, cuando quieras). El ítem principal (el código que buscaste) queda con Lote y
                Vencimiento = "PAD".
              </p>
            </div>
          )}

          {/* DATOS VINCULADOS DEL ÍTEM PRINCIPAL QUE SE ESTÁ ARMANDO */}
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
};

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