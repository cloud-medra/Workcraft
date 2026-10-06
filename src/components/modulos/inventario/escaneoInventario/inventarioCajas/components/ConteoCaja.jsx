import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, CheckCircle2, Trash2, Plus, X, AlertTriangle, RefreshCw, Loader2, RotateCcw, Lock } from 'lucide-react';
import { useToast } from '../../../../../../context/ToastContext';
import { useModal } from '../../../../../../context/ModalContext';
import CampoEscaneo from '../../components/CampoEscaneo';
import BuscadorProductoMaestro from '../../components/BuscadorProductoMaestro';
import { interpretarLectura } from '../../utils/escaneo';
import { reproducirSonidoEscaneo } from '../../utils/sonidoEscaneo';
import { leerVinculo, vincularCodigos } from '../../services/escaneoInventarioService';
import {
  ESTADOS_CAJA, lotesEsperadosDeProducto, lineaDeConteo, sumarAlConteo,
  fijarCantidadConteo, quitarDelConteo, compararConteo, normalizarLote, fechaCorta
} from '../utils/inventarioFisico';
import {
  guardarConteoCaja, revisarMovimientosCaja, actualizarFotoCaja, finalizarCaja, reabrirCaja, ERROR_OTRA_SESION
} from '../services/inventarioFisicoService';
import ResumenComparacion from './ResumenComparacion';

const TH = 'px-2 py-1.5 border-b border-slate-200 dark:border-gray-700 font-semibold';
const TD = 'px-2 py-1 border-b border-slate-100 dark:border-gray-700/60';
const INPUT = 'h-7 px-2 border border-gray-300 dark:border-gray-600 rounded text-[11px] outline-none focus:border-[#2383C2] bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100';
const ESPERA_GUARDADO_MS = 1200;
const NUEVO = '__nuevo__';

const nombreProducto = (p) => [p?.referencia, p?.descriptorAuto || p?.tipo].filter(Boolean).join(' — ') || p?.codigo || 'producto';

// Conteo de una caja del inventario. `docCaja` llega en vivo (Firestore);
// el conteo se edita en pantalla y se guarda solo cada ~1 s.
const ConteoCaja = ({ inventario, docCaja, catalogo, usuario, sesion, onVolver }) => {
  const { showToast } = useToast();
  const { confirmAction } = useModal();
  const ciego = inventario.conteoCiego !== false;
  const finalizada = docCaja.estado === ESTADOS_CAJA.FINALIZADA;
  const bloqueada = !finalizada && docCaja.contandoPorSesion && docCaja.contandoPorSesion !== sesion;
  const esperado = useMemo(() => docCaja.esperado || [], [docCaja.esperado]);

  const [conteo, setConteoEstado] = useState(() => docCaja.conteo || []);
  const [pendiente, setPendienteEstado] = useState(null); // { producto, opcion, cantidad, nuevoLote, nuevoVenc }
  const [buscador, setBuscador] = useState(null); // { lectura }
  const [senal, setSenal] = useState({ tipo: null, mensaje: 'Escanea los productos de la caja.' });
  const [vista, setVista] = useState('conteo'); // conteo | movimientos | resumen
  const [ocupado, setOcupado] = useState(false);

  const campoRef = useRef(null);
  const conteoRef = useRef(conteo);
  const pendienteRef = useRef(null);
  const colaRef = useRef(Promise.resolve());
  const guardadoRef = useRef({ timer: null, sucio: false });

  const enfocarCampo = () => setTimeout(() => campoRef.current?.focus(), 0);
  useEffect(() => { campoRef.current?.focus(); }, []);

  const avisar = (tipo, mensaje) => { setSenal({ tipo, mensaje }); reproducirSonidoEscaneo(tipo); };

  // ---------- guardado del conteo ----------
  const guardarAhora = async () => {
    const g = guardadoRef.current;
    clearTimeout(g.timer);
    if (!g.sucio) return;
    g.sucio = false;
    try {
      await guardarConteoCaja(inventario.id, docCaja.id, conteoRef.current, sesion);
    } catch (err) {
      console.error('Error al guardar el conteo:', err);
      if (err.message === ERROR_OTRA_SESION) { showToast(err.message, 'error'); return; }
      g.sucio = true;
      g.timer = setTimeout(guardarAhora, ESPERA_GUARDADO_MS * 3);
      showToast('No se pudo guardar el conteo. Se reintentará.', 'error');
    }
  };
  const setConteo = (nuevo) => {
    conteoRef.current = nuevo;
    setConteoEstado(nuevo);
    const g = guardadoRef.current;
    g.sucio = true;
    clearTimeout(g.timer);
    g.timer = setTimeout(guardarAhora, ESPERA_GUARDADO_MS);
  };
  useEffect(() => () => { guardarAhora(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const setPendiente = (p) => { pendienteRef.current = p; setPendienteEstado(p); };

  // ---------- escaneo ----------
  // `lista`: el conteo (en render se pasa el estado; en los handlers, el ref
  // al día).
  const opcionesLote = (producto, lista) => {
    const delConteo = lista.filter((l) => l.codigoId === producto.id || (!l.codigoId && l.codigo === producto.codigo));
    const porClave = new Map();
    [...lotesEsperadosDeProducto(esperado, producto), ...delConteo].forEach((l) => { if (!porClave.has(l.clave)) porClave.set(l.clave, l); });
    return [...porClave.values()];
  };

  const sumarLinea = (linea, cantidad, producto) => {
    setConteo(sumarAlConteo(conteoRef.current, linea, cantidad));
    const total = conteoRef.current.find((l) => l.clave === linea.clave)?.cantidad;
    avisar('ok', `+${cantidad} ${nombreProducto(producto)} (lote ${linea.lote || 'S/L'}): ${total} contado(s).`);
  };

  const confirmarPendiente = () => {
    const p = pendienteRef.current;
    if (!p) return false;
    const n = Number(p.cantidad);
    if (!Number.isInteger(n) || n <= 0) { avisar('error', 'La cantidad debe ser un entero mayor a cero.'); return false; }
    let linea;
    if (p.opcion === NUEVO) {
      linea = lineaDeConteo(esperado, p.producto, { lote: p.nuevoLote, vencimiento: p.nuevoVenc });
    } else {
      linea = opcionesLote(p.producto, conteoRef.current).find((o) => o.clave === p.opcion);
      if (!linea) { avisar('error', 'Elige un lote.'); return false; }
    }
    setPendiente(null);
    sumarLinea(linea, n, p.producto);
    return true;
  };

  const procesarProducto = (producto, gs1) => {
    if (gs1.lote) {
      let vencimiento = gs1.vencimiento || '';
      if (!vencimiento) {
        const mismos = lotesEsperadosDeProducto(esperado, producto).filter((e) => normalizarLote(e.lote) === normalizarLote(gs1.lote));
        if (mismos.length === 1) vencimiento = mismos[0].vencimiento;
      }
      if (pendienteRef.current && !confirmarPendiente()) return;
      sumarLinea(lineaDeConteo(esperado, producto, { lote: gs1.lote, vencimiento }), 1, producto);
      return;
    }
    const p = pendienteRef.current;
    if (p && p.producto.id === producto.id) {
      setPendiente({ ...p, cantidad: String(Number(p.cantidad || 0) + 1) });
      avisar('ok', `${nombreProducto(producto)}: ${Number(p.cantidad || 0) + 1} pendiente(s). Enter para sumar.`);
      return;
    }
    if (p && !confirmarPendiente()) return;
    const opciones = opcionesLote(producto, conteoRef.current);
    const ultimoContado = [...conteoRef.current].reverse().find((l) => opciones.some((o) => o.clave === l.clave));
    setPendiente({
      producto,
      opcion: ultimoContado?.clave || opciones[0]?.clave || NUEVO,
      cantidad: '1',
      nuevoLote: '',
      nuevoVenc: ''
    });
    avisar(opciones.length > 0 ? 'ok' : 'nuevo', opciones.length > 0
      ? `${nombreProducto(producto)}: elige el lote (Enter suma 1 al seleccionado).`
      : `${nombreProducto(producto)} no estaba en esta caja: indica lote y vencimiento.`);
  };

  const procesarLectura = async (texto) => {
    const lectura = interpretarLectura(texto);
    if (!lectura) return;
    let vinculo;
    try {
      vinculo = await leerVinculo(lectura.clave);
    } catch (err) {
      console.error('Error al leer el vínculo:', err);
      avisar('error', `No se pudo consultar el código ${lectura.codigo}.`);
      return;
    }
    if (!vinculo?.productoId) {
      setBuscador({ lectura });
      avisar('nuevo', `Código nuevo ${lectura.codigo}: elige el producto para vincularlo.`);
      return;
    }
    const producto = catalogo.find((c) => c.id === vinculo.productoId)
      || { id: vinculo.productoId, codigo: vinculo.codigo, referencia: vinculo.referencia, descriptorAuto: vinculo.descriptorAuto, empresa: vinculo.empresa };
    procesarProducto(producto, lectura.gs1.esGS1 ? lectura.gs1 : {});
  };

  const handleLectura = (texto) => {
    if (bloqueada || finalizada || vista !== 'conteo') return;
    colaRef.current = colaRef.current
      .then(() => procesarLectura(texto))
      .catch((err) => console.error('Error al procesar la lectura:', err))
      .finally(() => { if (!buscador) enfocarCampo(); });
  };

  const handleSeleccionarProducto = async (producto) => {
    const { lectura } = buscador;
    setBuscador(null);
    try {
      await vincularCodigos({ codigos: [{ clave: lectura.clave, codigo: lectura.codigo }], producto, usuario });
    } catch (err) {
      avisar('error', err.message || 'No se pudo vincular el código.');
      enfocarCampo();
      return;
    }
    procesarProducto(producto, lectura.gs1.esGS1 ? lectura.gs1 : {});
    enfocarCampo();
  };

  const handleCantidad = (clave, valor) => {
    const { conteo: nuevo, error } = fijarCantidadConteo(conteoRef.current, clave, valor);
    if (error) { avisar('error', error); return; }
    setConteo(nuevo);
  };

  // ---------- finalizar / reabrir ----------
  const resultado = useMemo(() => compararConteo(esperado, conteo), [esperado, conteo]);

  const handleFinalizar = async () => {
    if (pendienteRef.current && !confirmarPendiente()) return;
    setOcupado(true);
    try {
      await guardarAhora();
      const { cambio } = await revisarMovimientosCaja(docCaja);
      setVista(cambio ? 'movimientos' : 'resumen');
    } catch (err) {
      avisar('error', err.message || 'No se pudo revisar la caja.');
    } finally {
      setOcupado(false);
    }
  };

  const handleActualizarFoto = async () => {
    setOcupado(true);
    try {
      await actualizarFotoCaja(inventario.id, docCaja.id);
      setVista('conteo');
      avisar('nuevo', 'Se tomó una nueva foto del stock de la caja. Revisa el conteo y vuelve a finalizar.');
    } catch (err) {
      avisar('error', err.message);
    } finally {
      setOcupado(false);
      enfocarCampo();
    }
  };

  const handleConfirmarCaja = async () => {
    setOcupado(true);
    try {
      await guardarAhora();
      await finalizarCaja({ inventarioId: inventario.id, cajaId: docCaja.id, esperado, conteo: conteoRef.current, usuario, sesion });
      showToast(`Caja ${docCaja.nombreCaja} finalizada`, 'success');
      onVolver();
    } catch (err) {
      avisar('error', err.message || 'No se pudo finalizar la caja.');
      setOcupado(false);
    }
  };

  const handleReabrir = () => confirmAction(
    'Reabrir caja',
    `¿Reabrir el conteo de ${docCaja.nombreCaja}? Su resultado dejará de contar hasta que la vuelvas a finalizar.`,
    async () => {
      try {
        await reabrirCaja({ inventarioId: inventario.id, cajaId: docCaja.id, usuario, sesion });
        setVista('conteo');
        enfocarCampo();
      } catch (err) {
        showToast(err.message, 'error');
      }
    },
    { confirmText: 'Reabrir', type: 'warning' }
  );

  const encabezado = (
    <div className="px-3 py-2 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <button type="button" onClick={async () => { await guardarAhora(); onVolver(); }} title="Volver a la lista de cajas" className="p-1 rounded border border-slate-200 dark:border-gray-700 text-slate-600 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-700/50">
          <ArrowLeft size={13} />
        </button>
        <span className="text-[12px] font-bold text-gray-800 dark:text-gray-100">{docCaja.nombreCaja}</span>
        {docCaja.ubicacion && <span className="text-[11px] text-gray-500">· {docCaja.ubicacion}</span>}
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">{ciego ? 'Conteo a ciegas' : 'Conteo con esperado visible'}</span>
      </div>
      {!finalizada && vista === 'conteo' && !bloqueada && (
        <button type="button" onClick={handleFinalizar} disabled={ocupado} className="h-7 px-3 rounded font-bold text-[11px] flex items-center gap-1 text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50">
          {ocupado ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />} Finalizar caja
        </button>
      )}
      {finalizada && inventario.estado === 'EN_CURSO' && (
        <button type="button" onClick={handleReabrir} className="h-7 px-3 rounded font-bold text-[11px] flex items-center gap-1 bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-950/40 dark:text-amber-300">
          <RotateCcw size={12} /> Reabrir caja
        </button>
      )}
    </div>
  );

  if (finalizada) {
    return (
      <div className="flex-grow min-h-0 flex flex-col">
        {encabezado}
        <div className="flex-grow min-h-0 overflow-auto p-3">
          <div className="mb-2 text-[11px] text-gray-600 dark:text-gray-300">Finalizada por {docCaja.finalizadaPor?.nombre || '-'}.</div>
          <ResumenComparacion resultado={docCaja.resultado} />
        </div>
      </div>
    );
  }

  if (bloqueada) {
    return (
      <div className="flex-grow min-h-0 flex flex-col">
        {encabezado}
        <div className="flex-grow flex flex-col items-center justify-center gap-2 text-center p-6 text-gray-600 dark:text-gray-300">
          <Lock size={24} className="text-amber-500" />
          <span className="text-[12px] font-semibold">Esta caja está en conteo por {docCaja.contandoPor?.nombre || 'otro usuario'} en otro equipo.</span>
          <span className="text-[11px]">Vuelve a la lista y ábrela de nuevo si quieres retomarla aquí.</span>
        </div>
      </div>
    );
  }

  if (vista === 'movimientos') {
    return (
      <div className="flex-grow min-h-0 flex flex-col">
        {encabezado}
        <div className="p-4 flex flex-col gap-3 max-w-2xl">
          <div className="flex items-start gap-2 p-3 rounded border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 text-[12px] text-amber-800 dark:text-amber-300">
            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
            La caja tuvo movimientos (ingresos, egresos o tránsitos) desde que empezaste a contarla. Toma una nueva foto del stock esperado y revisa el conteo antes de finalizar.
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={handleActualizarFoto} disabled={ocupado} className="h-8 px-3 rounded font-bold text-[11px] flex items-center gap-1 text-white bg-[#2383C2] disabled:opacity-50">
              {ocupado ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} Tomar nueva foto y seguir contando
            </button>
            <button type="button" onClick={() => { setVista('conteo'); enfocarCampo(); }} className="h-8 px-3 rounded font-bold text-[11px] bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200">Volver al conteo</button>
          </div>
        </div>
      </div>
    );
  }

  if (vista === 'resumen') {
    return (
      <div className="flex-grow min-h-0 flex flex-col">
        {encabezado}
        <div className="flex-grow min-h-0 overflow-auto p-3 flex flex-col gap-3">
          <span className="text-[12px] font-bold text-gray-700 dark:text-gray-200 uppercase">Resumen de la caja antes de confirmar</span>
          <ResumenComparacion resultado={resultado} />
          <div className="flex gap-2">
            <button type="button" onClick={handleConfirmarCaja} disabled={ocupado} className="h-8 px-4 rounded font-bold text-[12px] flex items-center gap-1.5 text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50">
              {ocupado ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />} Confirmar caja
            </button>
            <button type="button" onClick={() => { setVista('conteo'); enfocarCampo(); }} disabled={ocupado} className="h-8 px-3 rounded font-bold text-[11px] bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200">Volver a contar</button>
          </div>
        </div>
      </div>
    );
  }

  const opciones = pendiente ? opcionesLote(pendiente.producto, conteo) : [];
  const esperadoPorClave = new Map(esperado.map((e) => [e.clave, e.esperado]));

  return (
    <div className="flex-grow min-h-0 flex flex-col">
      {encabezado}
      <div className="flex-grow min-h-0 overflow-auto p-3 flex flex-col gap-3">
        <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3" onBlur={(e) => { if (!e.relatedTarget && !buscador) enfocarCampo(); }}>
          <CampoEscaneo ref={campoRef} onLectura={handleLectura} onEnterVacio={() => { if (confirmarPendiente()) enfocarCampo(); }} senal={senal.tipo} mensaje={senal.mensaje} placeholder="Escanea un producto (Enter con el campo vacío suma el pendiente)" />
        </section>

        {buscador && (
          <BuscadorProductoMaestro
            catalogo={catalogo}
            aviso={`Código nuevo ${buscador.lectura.codigo}: elige el producto para vincularlo.`}
            onSeleccionar={handleSeleccionarProducto}
            onCerrar={() => { setBuscador(null); enfocarCampo(); }}
          />
        )}

        {pendiente && (
          <section className="bg-white dark:bg-gray-800 border border-[#2383C2]/40 rounded-lg p-3 flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12px] font-semibold text-gray-800 dark:text-gray-100">{nombreProducto(pendiente.producto)}</span>
              <button type="button" onClick={() => { setPendiente(null); enfocarCampo(); }} title="Descartar" className="p-0.5 text-gray-400 hover:text-gray-600"><X size={14} /></button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {opciones.map((o) => (
                <label key={o.clave} className={`flex items-center gap-1 px-2 py-1 rounded border text-[11px] cursor-pointer ${pendiente.opcion === o.clave ? 'border-[#2383C2] bg-blue-50 dark:bg-blue-950/30' : 'border-gray-300 dark:border-gray-600'}`}>
                  <input type="radio" name="loteConteo" checked={pendiente.opcion === o.clave} onChange={() => setPendiente({ ...pendiente, opcion: o.clave })} />
                  Lote <b>{o.lote || 'S/L'}</b> · {fechaCorta(o.vencimiento)}
                  {!ciego && esperadoPorClave.has(o.clave) && <span className="text-gray-400">(esp. {esperadoPorClave.get(o.clave)})</span>}
                </label>
              ))}
              <label className={`flex items-center gap-1 px-2 py-1 rounded border text-[11px] cursor-pointer ${pendiente.opcion === NUEVO ? 'border-[#2383C2] bg-blue-50 dark:bg-blue-950/30' : 'border-gray-300 dark:border-gray-600'}`}>
                <input type="radio" name="loteConteo" checked={pendiente.opcion === NUEVO} onChange={() => setPendiente({ ...pendiente, opcion: NUEVO })} />
                Lote nuevo
              </label>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              {pendiente.opcion === NUEVO && (
                <>
                  <input placeholder="Lote" value={pendiente.nuevoLote} onChange={(e) => setPendiente({ ...pendiente, nuevoLote: e.target.value })} className={`${INPUT} w-36`} />
                  <input type="date" value={pendiente.nuevoVenc} onChange={(e) => setPendiente({ ...pendiente, nuevoVenc: e.target.value })} className={`${INPUT} w-36`} />
                </>
              )}
              <input
                type="number" min="1" step="1" aria-label="Cantidad a sumar"
                value={pendiente.cantidad}
                onChange={(e) => setPendiente({ ...pendiente, cantidad: e.target.value })}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (confirmarPendiente()) enfocarCampo(); } }}
                className={`${INPUT} w-20`}
              />
              <button type="button" onClick={() => { if (confirmarPendiente()) enfocarCampo(); }} className="h-7 px-3 rounded font-bold text-[11px] flex items-center gap-1 text-white bg-[#2383C2]">
                <Plus size={12} /> Sumar
              </button>
            </div>
          </section>
        )}

        <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 text-[11px] font-bold text-gray-700 dark:text-gray-200 uppercase">
            Contado: {conteo.length} lote(s) · {conteo.reduce((a, l) => a + l.cantidad, 0)} unidad(es)
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px] border-collapse">
              <thead className="bg-slate-50 dark:bg-gray-900/60 text-slate-600 dark:text-gray-400 uppercase text-[10px]">
                <tr>
                  <th className={TH}>Producto</th>
                  <th className={TH}>Lote</th>
                  <th className={TH}>Vencimiento</th>
                  {!ciego && <th className={`${TH} text-right`}>Esperado</th>}
                  <th className={`${TH} text-right`}>Contado</th>
                  <th className={TH} />
                </tr>
              </thead>
              <tbody>
                {conteo.length === 0 ? (
                  <tr><td colSpan={ciego ? 5 : 6} className="px-3 py-4 text-center text-gray-400 italic">Aún no se ha contado nada en esta caja.</td></tr>
                ) : conteo.map((l) => (
                  <tr key={l.clave} className="text-gray-700 dark:text-gray-200">
                    <td className={TD}>{l.tipo || l.referencia} <span className="text-emerald-600 dark:text-emerald-400">[{l.codigo || 'S/Cod'}]</span></td>
                    <td className={`${TD} font-semibold`}>{l.lote || 'S/L'}</td>
                    <td className={TD}>{fechaCorta(l.vencimiento)}</td>
                    {!ciego && <td className={`${TD} text-right text-gray-500`}>{esperadoPorClave.get(l.clave) ?? 0}</td>}
                    <td className={`${TD} text-right`}>
                      <input
                        key={`${l.clave}-${l.cantidad}`}
                        type="number" min="0" step="1" defaultValue={l.cantidad}
                        aria-label={`Contado lote ${l.lote || 'S/L'}`}
                        onBlur={(e) => { if (Number(e.target.value) !== l.cantidad) handleCantidad(l.clave, e.target.value); }}
                        onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                        className={`${INPUT} w-20 text-right`}
                      />
                    </td>
                    <td className={`${TD} text-center`}>
                      <button type="button" onClick={() => { setConteo(quitarDelConteo(conteoRef.current, l.clave)); enfocarCampo(); }} title="Quitar" className="p-0.5 text-gray-400 hover:text-red-500">
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
};

export default ConteoCaja;
