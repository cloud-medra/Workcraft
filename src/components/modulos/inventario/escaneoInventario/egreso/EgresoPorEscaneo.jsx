import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRightLeft, Plus, Trash2, Loader2, FileText, UserCheck, AlertCircle, ShoppingBag, ClipboardList, X } from 'lucide-react';
import { useInventarioGeneral } from '../../../../../hooks/useInventarioGeneral';
import { cargarCatalogo } from '../../../../../stores/catalogosStore';
import { useToast } from '../../../../../context/ToastContext';
import { useModal } from '../../../../../context/ModalContext';
import { useUser } from '../../../../../context/UserContext';
import CampoEscaneo from '../../shared/escaneo/CampoEscaneo';
import { interpretarLectura } from '../../shared/escaneo/escaneo';
import { reproducirSonidoEscaneo } from '../../shared/escaneo/sonidoEscaneo';
import { leerVinculo } from '../../shared/escaneo/escaneoInventarioService';
import {
  lotesDelProducto, sugerirLote, agregarALista, sumarUnoPorReescaneo,
  cambiarCantidadLinea, quitarLinea, validarCantidadEgreso, stockActualDeLinea
} from '../../shared/escaneo/stockProducto';
import { validarDatosTraspaso, MOTIVO_TRASPASO, DESTINOS_TRANSITO } from '../../shared/traspasoTransito';
import { ejecutarTraspasoTransito, generarSiguienteNumeroDocumento } from '../../shared/traspasoTransitoService';

export const ORIGEN_EGRESO_ESCANEO = 'Egreso por escaneo';

const CLASE_INPUT = 'h-7 px-2 border border-gray-300 dark:border-gray-600 rounded text-[11px] outline-none focus:border-[#2383C2] bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 disabled:opacity-50';
const TH = 'px-2 py-1.5 border-b border-slate-200 dark:border-gray-700 font-semibold';
const TD = 'px-2 py-1 border-b border-slate-100 dark:border-gray-700/60';

const nombreProducto = (p) => [p?.referencia, p?.descriptorAuto || p?.tipo].filter(Boolean).join(' — ') || p?.codigo || 'producto';
const fechaCorta = (iso) => {
  const [y, m, d] = String(iso || '').split('-');
  return y && m && d ? `${d}-${m}-${y}` : 'S/V';
};

// Etapa 2 de Escaneo: egreso / traspaso a tránsito. Escaneo -> producto
// vinculado -> stock por caja/lote (GS1 o FEFO) -> cantidad -> lista ->
// datos del traspaso -> misma transacción que Egresos.
const EgresoPorEscaneo = ({ onIrA }) => {
  const { cajas } = useInventarioGeneral();
  const { showToast } = useToast();
  const { confirmAction } = useModal();
  const { userData } = useUser();

  const [catalogo, setCatalogo] = useState([]);
  const [seleccion, setSeleccionEstado] = useState(null); // { producto, loteClave, cantidad, aviso, motivo }
  const [lista, setListaEstado] = useState([]);
  const [senal, setSenal] = useState({ tipo: null, mensaje: 'Escanea el código del producto a egresar.' });
  const [sinVinculo, setSinVinculo] = useState(false);

  const [numeroDocumento, setNumeroDocumento] = useState('');
  const [tipoDestino, setTipoDestino] = useState('');
  const [solicitante, setSolicitante] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [traspasando, setTraspasando] = useState(false);

  const campoRef = useRef(null);
  const listaRef = useRef([]);
  const seleccionRef = useRef(null);
  const cajasRef = useRef(cajas);
  const colaRef = useRef(Promise.resolve());
  useEffect(() => { cajasRef.current = cajas; }, [cajas]);

  const setLista = (l) => { listaRef.current = l; setListaEstado(l); };
  const setSeleccion = (s) => { seleccionRef.current = s; setSeleccionEstado(s); };

  useEffect(() => {
    cargarCatalogo('codigos').then(setCatalogo).catch((err) => {
      console.error('Error al cargar el maestro de códigos:', err);
      showToast('No se pudo cargar el maestro de códigos', 'error');
    });
    generarSiguienteNumeroDocumento().then(setNumeroDocumento);
  }, [showToast]);

  const enfocarCampo = () => setTimeout(() => campoRef.current?.focus(), 0);
  useEffect(() => { campoRef.current?.focus(); }, []);

  const avisar = (tipo, mensaje) => {
    setSenal({ tipo, mensaje });
    reproducirSonidoEscaneo(tipo);
  };

  // Stock actual (listener en vivo) de la posición de una línea; 0 si el
  // ítem de esa posición ya no es el mismo.
  const stockDeLinea = (linea) => stockActualDeLinea(cajasRef.current, linea);

  const lotesSeleccion = useMemo(
    () => (seleccion ? lotesDelProducto(cajas, seleccion.producto, lista) : []),
    [cajas, seleccion, lista]
  );
  const loteElegido = lotesSeleccion.find((l) => l.clave === seleccion?.loteClave) || null;

  // Agrega a la lista lo pendiente; devuelve true si se agregó.
  const confirmarSeleccion = () => {
    const sel = seleccionRef.current;
    if (!sel) return false;
    const lotes = lotesDelProducto(cajasRef.current, sel.producto, listaRef.current);
    const lote = lotes.find((l) => l.clave === sel.loteClave);
    if (!lote) { avisar('error', 'Elige un lote con stock.'); return false; }
    const { lista: nueva, error } = agregarALista(listaRef.current, lote, sel.cantidad, sel.producto);
    if (error) { avisar('error', error); return false; }
    setLista(nueva);
    setSeleccion(null);
    avisar('ok', `Agregado: ${sel.cantidad} × ${nombreProducto(sel.producto)} (lote ${lote.item.lote || 'S/L'}, ${lote.nombreCaja}).`);
    return true;
  };

  const procesarLectura = async (texto) => {
    const lectura = interpretarLectura(texto);
    if (!lectura) return;

    let vinculo;
    try {
      vinculo = await leerVinculo(lectura.clave);
    } catch (err) {
      console.error('Error al leer el vínculo del código:', err);
      avisar('error', `No se pudo consultar el código ${lectura.codigo}.`);
      return;
    }
    if (!vinculo?.productoId) {
      setSinVinculo(true);
      avisar('error', `El código ${lectura.codigo} no está vinculado a ningún producto. Vincúlalo en Ingreso directo.`);
      return;
    }
    setSinVinculo(false);
    const producto = catalogo.find((c) => c.id === vinculo.productoId)
      || { id: vinculo.productoId, codigo: vinculo.codigo, referencia: vinculo.referencia, descriptorAuto: vinculo.descriptorAuto, empresa: vinculo.empresa };
    const gs1 = lectura.gs1.esGS1 ? lectura.gs1 : {};

    // Mismo producto pendiente: +1 a la cantidad pendiente.
    const pendiente = seleccionRef.current;
    const lotesPendiente = pendiente ? lotesDelProducto(cajasRef.current, pendiente.producto, listaRef.current) : [];
    const lote = lotesPendiente.find((l) => l.clave === pendiente?.loteClave);
    const mismoLoteGS1 = !gs1.lote || String(lote?.item.lote || '').trim().toUpperCase() === gs1.lote.trim().toUpperCase();
    if (pendiente && pendiente.producto.id === producto.id && mismoLoteGS1) {
      const siguiente = Number(pendiente.cantidad || 0) + 1;
      const error = lote ? validarCantidadEgreso(siguiente, lote.disponible) : 'Elige un lote con stock.';
      if (error) return avisar('error', error);
      setSeleccion({ ...pendiente, cantidad: String(siguiente) });
      return avisar('ok', `${nombreProducto(producto)}: ${siguiente} unidad(es) pendientes. Enter para agregar.`);
    }
    // Otro producto (u otro lote) con uno pendiente: el pendiente se agrega
    // a la lista antes de seguir.
    if (pendiente && !confirmarSeleccion()) return;

    // Producto ya en la lista (mismo lote si la lectura GS1 lo trae): +1.
    const reescaneo = sumarUnoPorReescaneo(listaRef.current, producto.id, gs1, stockDeLinea);
    if (reescaneo) {
      if (reescaneo.error) return avisar('error', reescaneo.error);
      setLista(reescaneo.lista);
      return avisar('ok', `+1 ${nombreProducto(producto)} (lote ${reescaneo.linea.itemOriginal.lote || 'S/L'}): ${reescaneo.linea.cantidadRetirar + 1} en la lista.`);
    }

    const lotes = lotesDelProducto(cajasRef.current, producto, listaRef.current);
    const sugerencia = sugerirLote(lotes, gs1);
    if (!sugerencia.lote) {
      setSeleccion(null);
      return avisar('error', `No hay stock disponible de ${nombreProducto(producto)}.`);
    }
    setSeleccion({ producto, loteClave: sugerencia.lote.clave, cantidad: '1', aviso: sugerencia.aviso, motivo: sugerencia.motivo });
    avisar(sugerencia.aviso ? 'nuevo' : 'ok', sugerencia.aviso
      || `${nombreProducto(producto)}: ${sugerencia.motivo === 'gs1' ? 'lote del código preseleccionado' : 'se sugiere el lote que vence primero'}. Indica la cantidad y presiona Enter.`);
  };

  const handleLectura = (texto) => {
    colaRef.current = colaRef.current
      .then(() => procesarLectura(texto))
      .catch((err) => console.error('Error al procesar la lectura:', err))
      .finally(enfocarCampo);
  };

  const handleEnterVacio = () => {
    if (seleccionRef.current) confirmarSeleccion();
  };

  const handleCambiarCantidadLinea = (linea, valor) => {
    const { lista: nueva, error } = cambiarCantidadLinea(listaRef.current, linea.idTemp, valor, stockDeLinea(linea));
    if (error) { avisar('error', error); return; }
    setLista(nueva);
  };

  const totalUnidades = lista.reduce((acc, l) => acc + l.cantidadRetirar, 0);

  const handleTraspasar = () => {
    if (seleccionRef.current) return avisar('error', 'Agrega o descarta el producto pendiente antes de traspasar.');
    const errorDatos = validarDatosTraspaso({ lineas: lista, numeroDocumento, tipoDestino });
    if (errorDatos) return avisar('error', errorDatos);

    const resumen = (
      <span className="block">
        ¿Deseas descontar {totalUnidades} unidad(es) en {lista.length} ítem(s) bajo el documento N° {numeroDocumento}, destino {DESTINOS_TRANSITO[tipoDestino]}?
        <span className="block mt-2 max-h-48 overflow-y-auto text-[12px]">
          {lista.map((l) => (
            <span key={l.idTemp} className="block">
              • {l.cantidadRetirar} × {l.itemOriginal.tipo || l.itemOriginal.referencia || l.itemOriginal.codigo} — lote {l.itemOriginal.lote || 'S/L'} ({l.nombreCaja})
            </span>
          ))}
        </span>
      </span>
    );
    confirmAction(
      'Confirmar Traspaso a Tránsito',
      resumen,
      async () => {
        setTraspasando(true);
        try {
          await ejecutarTraspasoTransito({
            lineas: lista,
            numeroDocumento,
            motivo: MOTIVO_TRASPASO,
            tipoDestino,
            solicitante,
            observaciones,
            usuario: userData,
            origen: ORIGEN_EGRESO_ESCANEO
          });
          setLista([]);
          setSeleccion(null);
          setSolicitante('');
          setObservaciones('');
          setTipoDestino('');
          avisar('ok', `Traspaso N° ${numeroDocumento} realizado (${totalUnidades} unidad(es)). Escanea el siguiente egreso.`);
          showToast('Traspaso a tránsito realizado con éxito', 'success');
          setNumeroDocumento(await generarSiguienteNumeroDocumento());
        } catch (error) {
          console.error('Error al procesar el traspaso:', error);
          avisar('error', `No se realizó el traspaso: ${error.message}`);
          showToast('Error al procesar el traspaso: ' + error.message, 'error');
        } finally {
          setTraspasando(false);
          enfocarCampo();
        }
      },
      { confirmText: 'Traspasar', onCancel: enfocarCampo }
    );
  };

  const handleBlurCampo = (e) => {
    if (!e.relatedTarget) enfocarCampo();
  };

  return (
    <div className="flex-grow min-h-0 overflow-auto p-3 flex flex-col gap-3">
      <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 flex flex-col gap-2">
        <div onBlur={handleBlurCampo}>
          <CampoEscaneo
            ref={campoRef}
            onLectura={handleLectura}
            onEnterVacio={handleEnterVacio}
            senal={senal.tipo}
            mensaje={senal.mensaje}
            deshabilitado={traspasando}
            placeholder="Escanea el producto a egresar (Enter con el campo vacío agrega el pendiente)"
          />
        </div>
        {sinVinculo && onIrA && (
          <button type="button" onClick={() => onIrA('ingresoDirecto')} className="self-start text-[11px] font-semibold text-[#2383C2] hover:underline flex items-center gap-1">
            <ClipboardList size={12} /> Ir a Ingreso directo para vincular el código
          </button>
        )}
      </section>

      {seleccion && (
        <section className="bg-white dark:bg-gray-800 border border-[#2383C2]/40 rounded-lg overflow-hidden">
          <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between gap-2">
            <div className="text-[12px] text-gray-800 dark:text-gray-100 flex flex-wrap items-center gap-1.5">
              <b>{seleccion.producto.referencia || 'S/Ref'}</b>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">[{seleccion.producto.codigo || 'S/Cod'}]</span>
              <span className="text-[#2383C2]">{seleccion.producto.descriptorAuto || ''}</span>
            </div>
            <button type="button" onClick={() => { setSeleccion(null); enfocarCampo(); }} title="Descartar" className="p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
              <X size={14} />
            </button>
          </div>
          {seleccion.aviso && <div className="px-3 pt-2 text-[11px] font-semibold text-amber-700 dark:text-amber-300">{seleccion.aviso}</div>}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px] border-collapse">
              <thead className="bg-slate-50 dark:bg-gray-900/60 text-slate-600 dark:text-gray-400 uppercase text-[10px]">
                <tr>
                  <th className={TH} />
                  <th className={TH}>Caja</th>
                  <th className={TH}>Ubicación</th>
                  <th className={TH}>Lote</th>
                  <th className={TH}>Vencimiento</th>
                  <th className={`${TH} text-right`}>Stock</th>
                  <th className={`${TH} text-right`}>En lista</th>
                  <th className={`${TH} text-right`}>Disponible</th>
                </tr>
              </thead>
              <tbody>
                {lotesSeleccion.map((l, i) => (
                  <tr
                    key={l.clave}
                    onClick={() => l.disponible > 0 && setSeleccion({ ...seleccion, loteClave: l.clave })}
                    className={`text-gray-700 dark:text-gray-200 ${l.disponible > 0 ? 'cursor-pointer hover:bg-blue-50 dark:hover:bg-gray-700/40' : 'opacity-50'} ${l.clave === seleccion.loteClave ? 'bg-blue-50 dark:bg-blue-950/30' : ''}`}
                  >
                    <td className={TD}>
                      <input type="radio" readOnly checked={l.clave === seleccion.loteClave} disabled={l.disponible <= 0} aria-label={`Lote ${l.item.lote || 'S/L'} en ${l.nombreCaja}`} />
                    </td>
                    <td className={TD}>{l.nombreCaja}</td>
                    <td className={TD}>{l.ubicacion || '-'}</td>
                    <td className={`${TD} font-semibold`}>
                      {l.item.lote || 'S/L'}
                      {i === 0 && <span className="ml-1 px-1 rounded text-[9px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">FEFO</span>}
                    </td>
                    <td className={TD}>{fechaCorta(l.item.vencimiento)}</td>
                    <td className={`${TD} text-right`}>{l.stock}</td>
                    <td className={`${TD} text-right`}>{l.enLista || '-'}</td>
                    <td className={`${TD} text-right font-bold`}>{l.disponible}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-3 py-2 flex flex-wrap items-end gap-2">
            <div>
              <label className="block text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-0.5">Cantidad a egresar</label>
              <input
                type="number" min="1" step="1"
                value={seleccion.cantidad}
                onChange={(e) => setSeleccion({ ...seleccion, cantidad: e.target.value })}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (confirmarSeleccion()) enfocarCampo(); } }}
                className={`${CLASE_INPUT} w-24`}
              />
            </div>
            <span className="h-7 flex items-center text-[10px] text-gray-500">máx. {loteElegido?.disponible ?? 0}</span>
            <button
              type="button"
              onClick={() => { if (confirmarSeleccion()) enfocarCampo(); }}
              className="h-7 px-3 rounded font-bold text-[11px] flex items-center gap-1 text-white bg-[#2383C2] hover:bg-[#369BCE]"
            >
              <Plus size={12} /> Agregar a la lista
            </button>
          </div>
        </section>
      )}

      <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between gap-2">
          <span className="text-[11px] font-bold text-gray-700 dark:text-gray-200 uppercase flex items-center gap-1.5">
            <ShoppingBag size={13} className="text-[#2383C2]" /> Lista de egreso: {lista.length} ítem(s) · {totalUnidades} unidad(es)
          </span>
          {lista.length > 0 && (
            <button type="button" onClick={() => { setLista([]); enfocarCampo(); }} disabled={traspasando} className="text-[10px] font-semibold text-red-600 hover:underline disabled:opacity-50">
              Vaciar lista
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px] border-collapse">
            <thead className="bg-slate-50 dark:bg-gray-900/60 text-slate-600 dark:text-gray-400 uppercase text-[10px]">
              <tr>
                <th className={TH}>Producto</th>
                <th className={TH}>Caja</th>
                <th className={TH}>Lote</th>
                <th className={TH}>Vencimiento</th>
                <th className={`${TH} text-right`}>Cantidad</th>
                <th className={TH} />
              </tr>
            </thead>
            <tbody>
              {lista.length === 0 ? (
                <tr><td colSpan={6} className="px-3 py-4 text-center text-gray-400 italic">Escanea productos para armar la lista.</td></tr>
              ) : lista.map((l) => {
                const stock = stockActualDeLinea(cajas, l);
                return (
                  <tr key={l.idTemp} className="text-gray-700 dark:text-gray-200">
                    <td className={TD}>{l.itemOriginal.tipo || l.itemOriginal.referencia} <span className="text-emerald-600 dark:text-emerald-400">[{l.itemOriginal.codigo || 'S/Cod'}]</span></td>
                    <td className={TD}>{l.nombreCaja}{l.ubicacionOrigen && <span className="text-gray-400"> · {l.ubicacionOrigen}</span>}</td>
                    <td className={`${TD} font-semibold`}>{l.itemOriginal.lote || 'S/L'}</td>
                    <td className={TD}>{fechaCorta(l.itemOriginal.vencimiento)}</td>
                    <td className={`${TD} text-right`}>
                      <input
                        key={`${l.idTemp}-${l.cantidadRetirar}`}
                        type="number" min="1" step="1" max={stock}
                        defaultValue={l.cantidadRetirar}
                        onBlur={(e) => { if (Number(e.target.value) !== l.cantidadRetirar) handleCambiarCantidadLinea(l, e.target.value); }}
                        onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                        disabled={traspasando}
                        className={`${CLASE_INPUT} w-20 text-right`}
                      />
                      {stock < l.cantidadRetirar && (
                        <div className="text-[9px] text-red-600 flex items-center justify-end gap-0.5"><AlertCircle size={9} /> stock actual: {stock}</div>
                      )}
                    </td>
                    <td className={`${TD} text-center`}>
                      <button type="button" onClick={() => { setLista(quitarLinea(listaRef.current, l.idTemp)); enfocarCampo(); }} disabled={traspasando} title="Quitar de la lista" className="p-0.5 text-gray-400 hover:text-red-500 disabled:opacity-40">
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="p-3 border-t border-gray-200 dark:border-gray-700 grid gap-2 md:grid-cols-2">
          <div>
            <label className="font-semibold text-gray-600 dark:text-gray-400 block mb-0.5">N° de Documento / Guía / Orden (Autogenerado)</label>
            <div className="relative">
              <FileText size={13} className="absolute left-2 top-2 text-gray-400" />
              <input type="text" readOnly value={numeroDocumento} placeholder="Cargando..." className="w-full pl-7 p-1 border border-amber-300 dark:border-amber-600/50 rounded bg-amber-100/50 dark:bg-gray-700/80 text-[10.5px] font-bold text-amber-900 dark:text-amber-300 cursor-not-allowed focus:outline-none" />
            </div>
          </div>
          <div>
            <span className="font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1 mb-0.5"><UserCheck size={12} /> Destino del tránsito (obligatorio)</span>
            <div className="flex items-center gap-3 h-7">
              {Object.entries(DESTINOS_TRANSITO).map(([valor, etiqueta]) => (
                <label key={valor} className="flex items-center gap-1 cursor-pointer text-gray-700 dark:text-gray-300">
                  <input type="radio" name="tipoDestinoEscaneo" value={valor} checked={tipoDestino === valor} onChange={(e) => setTipoDestino(e.target.value)} disabled={traspasando} />
                  {etiqueta}
                </label>
              ))}
            </div>
          </div>
          <input placeholder="Solicitante / Destino" value={solicitante} onChange={(e) => setSolicitante(e.target.value)} disabled={traspasando} className={`${CLASE_INPUT} w-full`} />
          <input placeholder="Observaciones (Incluir cliente si aplica)" value={observaciones} onChange={(e) => setObservaciones(e.target.value)} disabled={traspasando} className={`${CLASE_INPUT} w-full`} />
          <div className="md:col-span-2 flex justify-end">
            <button
              type="button"
              onClick={handleTraspasar}
              disabled={traspasando || lista.length === 0}
              className="h-8 px-4 rounded font-bold text-[12px] flex items-center gap-1.5 text-white bg-amber-600 hover:bg-amber-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {traspasando ? <Loader2 size={14} className="animate-spin" /> : <ArrowRightLeft size={14} />} Traspasar a tránsito
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default EgresoPorEscaneo;
