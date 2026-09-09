// ==========================================================
// CargasTab.jsx
// ==========================================================
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { collectionGroup, collection, query, where, orderBy, onSnapshot, getDocs, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../../../../../../firebaseConfig'; // AJUSTAR según la ubicación real de este archivo
import { User, Package, UploadCloud, Loader2, AlertCircle, CheckCircle2, Save, Link2 } from 'lucide-react';

const COL_MAESTROS_RECARGOS = 'maestros_recargos';

const NOMBRE_SUBCOL_DETALLES_GUIAS = 'detalles';
const COL_MAESTROS_CODIGOS = 'maestros_codigos';

// Mismos códigos excluidos que en DeliveryTab (kits/bypass internos que no
// son ítems reales del despacho).
const CODIGOS_EXCLUIDOS_GUIA = ['KITBYPASSTCRL2'];

const normalizarCodigo = (c) => (c || '').trim().toUpperCase();
const estaExcluido = (codigo) => CODIGOS_EXCLUIDOS_GUIA.includes(normalizarCodigo(codigo));

// -----------------------------------------------------------------------
// Celda Empresa (tabla "Cargas"): prioriza lo ya guardado; si no existe,
// muestra el preview calculado en memoria (pendiente de guardar).
// -----------------------------------------------------------------------
const EmpresaCargaCell = ({ it, pendiente }) => {
  if (it.empresaMaestroVinculada) {
    return <span>{it.empresaMaestroVinculada}</span>;
  }
  if (pendiente) {
    return (
      <span className="text-amber-600 dark:text-amber-400" title="Pendiente de guardar">
        {pendiente.empresaMaestroVinculada || '-'} <span className="text-[8px] font-bold uppercase">(sin guardar)</span>
      </span>
    );
  }

  const deliveryValor = (it.delivery || '').trim();
  const referencia = (it.referencia || '').trim();
  if (!deliveryValor || !referencia) return <span>-</span>;
  if (it.deliveryVinculado) return <span>-</span>;

  return <span className="text-slate-400 dark:text-gray-500 italic">Resolviendo...</span>;
};

// -----------------------------------------------------------------------
// Celda N° de Guía ("Ítems Registrados"): mismo criterio que arriba.
// -----------------------------------------------------------------------
const NumeroGuiaCell = ({ it, pendiente }) => {
  if (it.numeroGuiaVinculada) {
    return <span>{it.numeroGuiaVinculada}</span>;
  }
  if (pendiente) {
    return (
      <span className="text-amber-600 dark:text-amber-400" title="Pendiente de guardar">
        {pendiente.numeroGuiaVinculada || '-'} <span className="text-[8px] font-bold uppercase">(sin guardar)</span>
      </span>
    );
  }

  const deliveryValor = (it.delivery || '').trim();
  if (!deliveryValor) return <span>-</span>;
  if (it.deliveryVinculado) return <span>-</span>;

  return <span className="text-slate-400 dark:text-gray-500 italic">Resolviendo...</span>;
};

const formatearFechaTabla = (fechaString) => {
  if (!fechaString || !fechaString.includes('-')) return fechaString || '-';
  const partes = fechaString.split('-');
  if (partes.length !== 3) return fechaString;
  const [yyyy, mm, dd] = partes;
  return `${dd}-${mm}-${yyyy}`;
};

const renderP = (valor) => (valor === '' || valor === undefined || valor === null ? 'P' : valor);

const ESTADO_BADGE = {
  AGENDADO: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300',
  PENDIENTE: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300',
  INGRESADO: 'bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400',
  REVISAR: 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400',
  INCOMPLETO: 'bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400',
  'S/COTIZACION': 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300',
  CARGADO: 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400'
};

// Firestore permite hasta 30 valores en una cláusula "in"; se trocea por
// seguridad en bloques más chicos.
const trocear = (arr, tamano) => {
  const bloques = [];
  for (let i = 0; i < arr.length; i += tamano) {
    bloques.push(arr.slice(i, i + tamano));
  }
  return bloques;
};

// -----------------------------------------------------------------------
// Desglose de la guía dentro de "Ítems Registrados".
// Prioriza el snapshot guardado (productosGuiaVinculados). Si aún no hay
// nada guardado pero sí hay un preview pendiente (con su propio desglose
// resuelto en memoria), usa ese. Si no hay ninguno de los dos, cae al
// comportamiento en vivo con onSnapshot (comportamiento original).
// -----------------------------------------------------------------------
const DesgloseGuia = ({ deliveryValor, referenciaDestacada, colSpanTotal, productosGuardados, productosPendientes }) => {
  const productosAMostrar = (Array.isArray(productosGuardados) && productosGuardados.length > 0)
    ? productosGuardados
    : (Array.isArray(productosPendientes) && productosPendientes.length > 0)
      ? productosPendientes
      : null;

  const esPreview = !(Array.isArray(productosGuardados) && productosGuardados.length > 0) &&
    Array.isArray(productosPendientes) && productosPendientes.length > 0;

  const [cargandoGuia, setCargandoGuia] = useState(false);
  const [guiaEncontrada, setGuiaEncontrada] = useState(null);
  const [error, setError] = useState('');
  const [vinculosCodigos, setVinculosCodigos] = useState({});
  const [cargandoVinculos, setCargandoVinculos] = useState(false);

  useEffect(() => {
    if (productosAMostrar) return; // ya tenemos datos (guardados o pendientes)

    if (!deliveryValor) {
      setGuiaEncontrada(null);
      setError('');
      return;
    }

    setCargandoGuia(true);
    setError('');

    const q = query(
      collectionGroup(db, NOMBRE_SUBCOL_DETALLES_GUIAS),
      where('numeroDocumento', '==', deliveryValor)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        if (snap.empty) {
          setGuiaEncontrada(null);
        } else {
          const productos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          const primero = productos[0];
          setGuiaEncontrada({
            numeroGuia: primero.numeroGuia || '',
            numeroDocumento: primero.numeroDocumento || deliveryValor,
            fechaEmision: primero.fechaEmision || '',
            productos
          });
        }
        setCargandoGuia(false);
      },
      (err) => {
        console.error('Error al buscar guía por N° Documento:', err);
        setError('No se pudo buscar la guía. Intenta nuevamente.');
        setCargandoGuia(false);
      }
    );

    return () => unsub();
  }, [deliveryValor, productosAMostrar]);

  const productosVisibles = useMemo(
    () => (guiaEncontrada?.productos || []).filter(p => !estaExcluido(p.codigo)),
    [guiaEncontrada]
  );

  useEffect(() => {
    if (productosAMostrar) return;

    const referenciasUnicas = [...new Set(productosVisibles.map(p => (p.codigo || '').trim()).filter(Boolean))];

    if (referenciasUnicas.length === 0) {
      setVinculosCodigos({});
      return;
    }

    let cancelado = false;

    (async () => {
      setCargandoVinculos(true);
      try {
        const bloques = trocear(referenciasUnicas, 10);
        const mapa = {};

        for (const bloque of bloques) {
          const q = query(
            collection(db, COL_MAESTROS_CODIGOS),
            where('referencia', 'in', bloque)
          );
          const snap = await getDocs(q);
          snap.docs.forEach(d => {
            const data = d.data();
            if (data.referencia) {
              mapa[data.referencia] = {
                codigo: data.codigo || '',
                descripcion: data.descriptorEmpresa || data.descriptorAuto || '',
                tipo: data.tipo || '',
                empresa: data.empresa || ''
              };
            }
          });
        }

        if (!cancelado) setVinculosCodigos(mapa);
      } catch (err) {
        console.error('Error al vincular códigos desde maestros_codigos:', err);
      } finally {
        if (!cancelado) setCargandoVinculos(false);
      }
    })();

    return () => { cancelado = true; };
  }, [productosVisibles, productosAMostrar]);

  if (!deliveryValor) {
    return null;
  }

  // ---- Camino con datos ya resueltos (guardados o pendientes) ----
  if (productosAMostrar) {
    return (
      <>
        {esPreview && (
          <tr>
            <td colSpan={colSpanTotal} className="px-2.5 py-1 text-[9px] font-bold uppercase text-amber-700 dark:text-amber-400 bg-amber-50/60 dark:bg-amber-950/10 border-b border-slate-100 dark:border-gray-700/60">
              Vínculo resuelto — pendiente de guardar
            </td>
          </tr>
        )}
        {productosAMostrar.map((p, idx) => {
          const esCoincidente = normalizarCodigo(p.codigo) === normalizarCodigo(referenciaDestacada);
          return (
            <tr
              key={`${p.codigo || 'sc'}-${idx}`}
              className={`text-[10px] ${esCoincidente ? 'bg-blue-100/60 dark:bg-blue-900/30' : 'bg-blue-50/30 dark:bg-blue-950/10'}`}
              title={esCoincidente ? 'Este es el producto que corresponde a este ítem' : ''}
            >
              <td className="px-2.5 py-1 border-b border-r border-slate-100 dark:border-gray-700/60 font-sans font-normal text-slate-500 dark:text-gray-400">
                No lleva OC
              </td>
              <td className="px-2.5 py-1 border-b border-r border-slate-100 dark:border-gray-700/60 font-mono text-emerald-600 dark:text-emerald-400">
                <span className="flex items-center gap-1">
                  {esCoincidente && <CheckCircle2 size={10} className="text-blue-600 dark:text-blue-400 shrink-0" />}
                  {p.codigo || 'N/A'}
                </span>
              </td>
              <td className="px-2.5 py-1 border-b border-r border-slate-100 dark:border-gray-700/60 text-slate-700 dark:text-gray-200 truncate max-w-[180px]">
                {p.descripcion || '-'}
              </td>
              <td className="px-2.5 py-1 border-b border-r border-slate-100 dark:border-gray-700/60 text-slate-700 dark:text-gray-200 truncate max-w-[160px]">
                {p.empresa || '-'}
              </td>
              <td className="px-2.5 py-1 border-b border-r border-slate-100 dark:border-gray-700/60 text-center text-slate-700 dark:text-gray-200 font-semibold">
                {p.cantidad ?? 'N/A'}
              </td>
              <td className="px-2.5 py-1 border-b border-r border-slate-100 dark:border-gray-700/60 text-emerald-700 dark:text-emerald-400">
                $0
              </td>
              <td className="px-2.5 py-1 border-b border-r border-slate-100 dark:border-gray-700/60 text-slate-700 dark:text-gray-200">
                {p.lote || 'N/A'}
              </td>
              <td className="px-2.5 py-1 border-b border-r border-slate-100 dark:border-gray-700/60 text-slate-700 dark:text-gray-200">
                {p.vencimiento || 'N/A'}
              </td>
              <td className="px-2.5 py-1 border-b border-r border-slate-100 dark:border-gray-700/60 text-slate-400 dark:text-gray-500" />
              <td className="px-2.5 py-1 border-b border-r border-slate-100 dark:border-gray-700/60 text-slate-400 dark:text-gray-500" />
              <td className="px-2.5 py-1 border-b border-r border-slate-100 dark:border-gray-700/60 text-slate-400 dark:text-gray-500">
                0
              </td>
              <td className="px-2.5 py-1 border-b border-r border-slate-100 dark:border-gray-700/60 text-slate-700 dark:text-gray-200">
                {p.tipo || '-'}
              </td>
              <td className="px-2.5 py-1 border-b border-slate-100 dark:border-gray-700/60 text-slate-400 dark:text-gray-500" />
            </tr>
          );
        })}
      </>
    );
  }

  // ---- Camino en vivo (fallback mientras no hay nada resuelto todavía) ----
  if (cargandoGuia) {
    return (
      <tr>
        <td colSpan={colSpanTotal} className="px-3 py-2 text-[9px] text-slate-500 dark:text-gray-400 bg-slate-50/60 dark:bg-gray-900/30 border-b border-slate-100 dark:border-gray-700/60">
          <span className="flex items-center gap-1.5"><Loader2 size={11} className="animate-spin" /> Buscando guía con N° Documento {deliveryValor}...</span>
        </td>
      </tr>
    );
  }

  if (error) {
    return (
      <tr>
        <td colSpan={colSpanTotal} className="px-3 py-2 text-[9px] text-red-600 dark:text-red-400 bg-red-50/60 dark:bg-red-950/10 border-b border-slate-100 dark:border-gray-700/60">
          <span className="flex items-center gap-1.5"><AlertCircle size={11} /> {error}</span>
        </td>
      </tr>
    );
  }

  if (!guiaEncontrada) {
    return (
      <tr>
        <td colSpan={colSpanTotal} className="px-3 py-2 text-[9px] text-amber-700 dark:text-amber-400 bg-amber-50/60 dark:bg-amber-950/10 border-b border-slate-100 dark:border-gray-700/60">
          <span className="flex items-center gap-1.5"><AlertCircle size={11} /> No se encontró ninguna guía con N° Documento <strong>{deliveryValor}</strong>.</span>
        </td>
      </tr>
    );
  }

  if (productosVisibles.length === 0) {
    return (
      <tr>
        <td colSpan={colSpanTotal} className="px-3 py-2 text-[9px] text-slate-400 dark:text-gray-500 bg-blue-50/30 dark:bg-blue-950/10 border-b border-slate-100 dark:border-gray-700/60">
          Sin productos visibles en esta guía.
        </td>
      </tr>
    );
  }

  return (
    <>
      {productosVisibles.map((p) => {
        const esCoincidente = normalizarCodigo(p.codigo) === normalizarCodigo(referenciaDestacada);
        const vinculo = vinculosCodigos[(p.codigo || '').trim()];
        return (
          <tr
            key={p.id}
            className={`text-[10px] ${esCoincidente ? 'bg-blue-100/60 dark:bg-blue-900/30' : 'bg-blue-50/30 dark:bg-blue-950/10'}`}
            title={esCoincidente ? 'Este es el producto que corresponde a este ítem' : ''}
          >
            <td className="px-2.5 py-1 border-b border-r border-slate-100 dark:border-gray-700/60 font-sans font-normal text-slate-500 dark:text-gray-400">
              No lleva OC
            </td>
            <td className="px-2.5 py-1 border-b border-r border-slate-100 dark:border-gray-700/60 font-mono text-emerald-600 dark:text-emerald-400">
              <span className="flex items-center gap-1">
                {esCoincidente && <CheckCircle2 size={10} className="text-blue-600 dark:text-blue-400 shrink-0" />}
                {p.codigo || 'N/A'}
              </span>
            </td>
            <td className="px-2.5 py-1 border-b border-r border-slate-100 dark:border-gray-700/60 text-slate-700 dark:text-gray-200 truncate max-w-[180px]">
              {cargandoVinculos ? '...' : (vinculo?.descripcion || '-')}
            </td>
            <td className="px-2.5 py-1 border-b border-r border-slate-100 dark:border-gray-700/60 text-slate-700 dark:text-gray-200 truncate max-w-[160px]">
              {cargandoVinculos ? '...' : (vinculo?.empresa || '-')}
            </td>
            <td className="px-2.5 py-1 border-b border-r border-slate-100 dark:border-gray-700/60 text-center text-slate-700 dark:text-gray-200 font-semibold">
              {p.cantidad ?? 'N/A'}
            </td>
            <td className="px-2.5 py-1 border-b border-r border-slate-100 dark:border-gray-700/60 text-emerald-700 dark:text-emerald-400">
              $0
            </td>
            <td className="px-2.5 py-1 border-b border-r border-slate-100 dark:border-gray-700/60 text-slate-700 dark:text-gray-200">
              {p.lote || 'N/A'}
            </td>
            <td className="px-2.5 py-1 border-b border-r border-slate-100 dark:border-gray-700/60 text-slate-700 dark:text-gray-200">
              {p.vencimiento || 'N/A'}
            </td>
            <td className="px-2.5 py-1 border-b border-r border-slate-100 dark:border-gray-700/60 text-slate-400 dark:text-gray-500" />
            <td className="px-2.5 py-1 border-b border-r border-slate-100 dark:border-gray-700/60 text-slate-400 dark:text-gray-500" />
            <td className="px-2.5 py-1 border-b border-r border-slate-100 dark:border-gray-700/60 text-slate-400 dark:text-gray-500">
              0
            </td>
            <td className="px-2.5 py-1 border-b border-r border-slate-100 dark:border-gray-700/60 text-slate-700 dark:text-gray-200">
              {cargandoVinculos ? '...' : (vinculo?.tipo || '-')}
            </td>
            <td className="px-2.5 py-1 border-b border-slate-100 dark:border-gray-700/60 text-slate-400 dark:text-gray-500" />
          </tr>
        );
      })}
    </>
  );
};

const CargasTab = ({ registro, items = [], formData, onChange, setCargando }) => {
  const totalItems = items.length;
  const sumaCostos = items.reduce((acc, it) => acc + (Number(it.costo) || 0) * (Number(it.cantidad) || 1), 0);

  // Reglas de recargo (maestros_recargos): desde, hasta, vecesCosto, estado
  const [recargos, setRecargos] = useState([]);

  useEffect(() => {
    const q = query(collection(db, COL_MAESTROS_RECARGOS), orderBy('desde', 'asc'));
    const unsub = onSnapshot(
      q,
      (snap) => setRecargos(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      (err) => console.error('Error al cargar recargos maestros:', err)
    );
    return () => unsub();
  }, []);

  const buscarRecargo = (costo) => {
    if (!Number.isFinite(costo) || costo <= 0) return null;
    return recargos.find(r =>
      (r.estado || 'ACTIVO').toUpperCase() !== 'INACTIVO' &&
      costo >= Number(r.desde) &&
      costo <= Number(r.hasta)
    ) || null;
  };

  const calcularVenta = (it) => {
    const costo = Number(it.costo) || 0;
    const cantidad = Number(it.cantidad) || 0;
    const regla = buscarRecargo(costo);
    if (!regla) return { vecesCosto: null, venta: null };
    const vecesCosto = Number(regla.vecesCosto);
    const venta = Math.round(costo * vecesCosto * cantidad);
    return { vecesCosto, venta };
  };

  // Este auto-guardado (recargo/venta) es un cálculo puramente numérico y
  // determinístico según reglas activas — se mantiene como auto-guardado
  // silencioso porque no requiere revisión humana, a diferencia del
  // vínculo con la guía de Delivery.
  useEffect(() => {
    if (!recargos.length) return;

    items.forEach(async (it) => {
      if (!it.ref) return;
      const { vecesCosto, venta } = calcularVenta(it);
      if (vecesCosto === null || venta === null) return;

      if (it.recargoVecesCosto !== vecesCosto || it.venta !== venta) {
        try {
          await updateDoc(it.ref, { recargoVecesCosto: vecesCosto, venta });
        } catch (err) {
          console.error('Error al guardar recargo/venta del ítem:', err);
        }
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, recargos]);

  // -------------------------------------------------------------------
  // RESOLUCIÓN (SIN GUARDAR) DEL VÍNCULO CON LA GUÍA DE DELIVERY
  //
  // Para cada ítem con N° de Delivery pero sin `deliveryVinculado`, busca
  // la guía y su cruce en maestros_codigos, y deja el resultado en estado
  // local `pendientes` (NO se escribe en Firestore automáticamente).
  // El usuario decide cuándo persistirlo con el botón "Guardar
  // Vinculaciones de Delivery".
  // -------------------------------------------------------------------
  const cacheGuiasRef = useRef({});
  const cacheMaestrosRef = useRef({});
  const procesandoRef = useRef(new Set());

  const [pendientes, setPendientes] = useState({}); // { [itemId]: payloadParaGuardar }
  const [guardandoPendientes, setGuardandoPendientes] = useState(false);

  const claveVinculacion = items
    .map(it => `${it.id}:${(it.delivery || '').trim()}:${(it.referencia || '').trim()}:${it.deliveryVinculado ? 1 : 0}`)
    .join('|');

  useEffect(() => {
    let cancelado = false;

    const resolverMaestro = async (referenciaCodigo) => {
      if (!referenciaCodigo) return null;
      if (Object.prototype.hasOwnProperty.call(cacheMaestrosRef.current, referenciaCodigo)) {
        return cacheMaestrosRef.current[referenciaCodigo];
      }
      try {
        const qMaestro = query(
          collection(db, COL_MAESTROS_CODIGOS),
          where('referencia', '==', referenciaCodigo)
        );
        const snap = await getDocs(qMaestro);
        const data = snap.docs[0]?.data();
        const vinculo = data
          ? {
              codigo: data.codigo || '',
              descripcion: data.descriptorEmpresa || data.descriptorAuto || '',
              tipo: data.tipo || '',
              empresa: data.empresa || ''
            }
          : null;
        cacheMaestrosRef.current[referenciaCodigo] = vinculo;
        return vinculo;
      } catch (err) {
        console.error('Error al resolver maestro_codigos:', err);
        return null;
      }
    };

    const resolverGuia = async (deliveryValor) => {
      if (cacheGuiasRef.current[deliveryValor] !== undefined) {
        return cacheGuiasRef.current[deliveryValor];
      }
      try {
        const qGuia = query(
          collectionGroup(db, NOMBRE_SUBCOL_DETALLES_GUIAS),
          where('numeroDocumento', '==', deliveryValor)
        );
        const snapGuia = await getDocs(qGuia);
        if (snapGuia.empty) {
          cacheGuiasRef.current[deliveryValor] = null;
          return null;
        }
        const productos = snapGuia.docs
          .map(d => d.data())
          .filter(p => !estaExcluido(p.codigo));
        const primero = snapGuia.docs[0].data();
        const guia = {
          numeroGuia: primero.numeroGuia || '',
          fechaEmision: primero.fechaEmision || '',
          productos
        };
        cacheGuiasRef.current[deliveryValor] = guia;
        return guia;
      } catch (err) {
        console.error('Error al resolver guía de delivery:', err);
        return null;
      }
    };

    (async () => {
      for (const it of items) {
        if (cancelado) return;
        if (!it.ref || it.deliveryVinculado || pendientes[it.id]) continue;

        const deliveryValor = (it.delivery || '').trim();
        const referencia = (it.referencia || '').trim();
        if (!deliveryValor) continue;

        const claveEnCurso = `${it.id}:${deliveryValor}`;
        if (procesandoRef.current.has(claveEnCurso)) continue;
        procesandoRef.current.add(claveEnCurso);

        try {
          const guia = await resolverGuia(deliveryValor);
          if (!guia) continue; // aún no existe la guía; se reintentará en el próximo cambio

          const productoCoincidente = guia.productos.find(
            p => normalizarCodigo(p.codigo) === normalizarCodigo(referencia)
          );

          const productosGuiaVinculados = [];
          for (const p of guia.productos) {
            const codigoRef = (p.codigo || '').trim();
            const vinculoProducto = codigoRef ? await resolverMaestro(codigoRef) : null;
            productosGuiaVinculados.push({
              codigo: p.codigo || '',
              descripcion: vinculoProducto?.descripcion || '',
              empresa: vinculoProducto?.empresa || '',
              tipo: vinculoProducto?.tipo || '',
              lote: p.lote || '',
              vencimiento: p.vencimiento || '',
              cantidad: p.cantidad ?? null
            });
          }

          const vinculoMaestroCoincidente = productoCoincidente
            ? await resolverMaestro((productoCoincidente.codigo || '').trim())
            : null;

          const payload = productoCoincidente
            ? {
                numeroGuiaVinculada: guia.numeroGuia || '',
                fechaEmisionGuiaVinculada: guia.fechaEmision || '',
                loteGuiaVinculado: productoCoincidente.lote || '',
                vencimientoGuiaVinculado: productoCoincidente.vencimiento || '',
                codigoMaestroVinculado: vinculoMaestroCoincidente?.codigo || '',
                descripcionMaestroVinculado: vinculoMaestroCoincidente?.descripcion || '',
                tipoMaestroVinculado: vinculoMaestroCoincidente?.tipo || '',
                empresaMaestroVinculada: vinculoMaestroCoincidente?.empresa || '',
                productosGuiaVinculados,
                deliveryVinculado: true,
                vinculoIncompleto: false,
                fechaVinculacionDelivery: new Date()
              }
            : {
                numeroGuiaVinculada: guia.numeroGuia || '',
                fechaEmisionGuiaVinculada: guia.fechaEmision || '',
                productosGuiaVinculados,
                deliveryVinculado: true,
                vinculoIncompleto: true,
                fechaVinculacionDelivery: new Date()
              };

          if (!cancelado) {
            setPendientes(prev => ({ ...prev, [it.id]: { ref: it.ref, payload } }));
          }
        } catch (err) {
          console.error('Error al resolver vínculo con guía de delivery:', err);
        } finally {
          procesandoRef.current.delete(claveEnCurso);
        }
      }
    })();

    return () => { cancelado = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claveVinculacion]);

  const cantidadPendientes = Object.keys(pendientes).length;

  const handleGuardarPendientes = async () => {
    if (cantidadPendientes === 0) return;
    setGuardandoPendientes(true);
    try {
      const batch = writeBatch(db);
      Object.values(pendientes).forEach(({ ref, payload }) => {
        batch.update(ref, payload);
      });
      await batch.commit();
      setPendientes({});
    } catch (err) {
      console.error('Error al guardar las vinculaciones de delivery:', err);
    } finally {
      setGuardandoPendientes(false);
    }
  };

  // Marca/desmarca un ítem como CARGADO al tildar el check de la fila.
  const [actualizandoEstadoId, setActualizandoEstadoId] = useState(null);

  const handleToggleCargado = async (it, marcado) => {
    if (!it.ref) return;
    setActualizandoEstadoId(it.id);
    try {
      await updateDoc(it.ref, { estado: marcado ? 'CARGADO' : 'INGRESADO' });
    } catch (err) {
      console.error('Error al actualizar el estado del ítem:', err);
    } finally {
      setActualizandoEstadoId(null);
    }
  };

  return (
    <div className="p-4 max-w-7xl mx-auto w-full space-y-4">

      {/* Barra de guardado de vinculaciones pendientes de Delivery */}
      {cantidadPendientes > 0 && (
        <div className="flex items-center justify-between gap-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-lg px-3 py-2">
          <span className="flex items-center gap-1.5 text-[11px] text-amber-800 dark:text-amber-300 font-medium">
            <Link2 size={13} />
            {cantidadPendientes} ítem{cantidadPendientes !== 1 ? 's' : ''} con vínculo de Delivery resuelto, pendiente de guardar.
          </span>
          <button
            type="button"
            onClick={handleGuardarPendientes}
            disabled={guardandoPendientes}
            className="h-7 px-3 bg-[#2383C2] hover:bg-[#1d6fa5] text-white rounded font-semibold flex items-center gap-1.5 transition text-[11px] disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            {guardandoPendientes ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            Guardar Vinculaciones de Delivery ({cantidadPendientes})
          </button>
        </div>
      )}

      {/* Contenedor 1: Información General */}
      <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700/80 rounded-lg shadow-xs overflow-hidden">
        <div className="px-3 py-1.5 bg-slate-50/80 dark:bg-gray-800/80 border-b border-slate-200 dark:border-gray-700 flex items-center gap-1.5">
          <User size={13} className="text-[#2383C2]" />
          <h3 className="text-[11px] font-bold text-slate-700 dark:text-gray-200 uppercase tracking-wide">
            Información General — Admisión #{registro?.gestionId || 'N/A'}
          </h3>
        </div>

        <div className="p-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-2.5 text-[10px]">
          <div className="flex flex-col gap-0.5">
            <span className="font-bold text-slate-400 dark:text-gray-500 text-[9px] uppercase">Paciente</span>
            <span className="text-slate-700 dark:text-gray-200 font-medium">{renderP(registro?.nombre)}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="font-bold text-slate-400 dark:text-gray-500 text-[9px] uppercase">Médico</span>
            <span className="text-slate-700 dark:text-gray-200">{renderP(registro?.medico)}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="font-bold text-slate-400 dark:text-gray-500 text-[9px] uppercase">Fecha</span>
            <span className="text-slate-700 dark:text-gray-200">{formatearFechaTabla(registro?.fecha)}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="font-bold text-slate-400 dark:text-gray-500 text-[9px] uppercase">Centro</span>
            <span className="text-slate-700 dark:text-gray-200">{renderP(registro?.centro)}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="font-bold text-slate-400 dark:text-gray-500 text-[9px] uppercase">Convenio</span>
            <span className="text-slate-700 dark:text-gray-200">{renderP(registro?.convenio)}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="font-bold text-slate-400 dark:text-gray-500 text-[9px] uppercase">Previsión</span>
            <span className="text-slate-700 dark:text-gray-200">{renderP(registro?.prevision)}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="font-bold text-slate-400 dark:text-gray-500 text-[9px] uppercase">Registrado Por</span>
            <span className="text-slate-700 dark:text-gray-200">{renderP(registro?.registradoPor)}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="font-bold text-slate-400 dark:text-gray-500 text-[9px] uppercase">N° de Ítems</span>
            <span className="text-slate-700 dark:text-gray-200 font-semibold">{totalItems}</span>
          </div>

          {registro?.descripcionPabellon && (
            <div className="flex flex-col gap-0.5 col-span-2 md:col-span-3 lg:col-span-4">
              <span className="font-bold text-slate-400 dark:text-gray-500 text-[9px] uppercase">Descripción Pabellón</span>
              <span className="text-slate-700 dark:text-gray-200">{registro.descripcionPabellon}</span>
            </div>
          )}
        </div>
      </div>

      {/* Contenedor 2: Cargas — Admisión, Código, Cantidad, Venta, Estado */}
      <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700/80 rounded-lg shadow-xs overflow-hidden">
        <div className="px-3 py-1.5 bg-slate-50/80 dark:bg-gray-800/80 border-b border-slate-200 dark:border-gray-700 flex items-center gap-1.5">
          <UploadCloud size={13} className="text-[#2383C2]" />
          <h3 className="text-[11px] font-bold text-slate-700 dark:text-gray-200 uppercase tracking-wide">
            Cargas
          </h3>
        </div>

        <div className="overflow-auto">
          <table className="w-full text-left text-[10px] border-collapse">
            <thead className="bg-slate-50 dark:bg-gray-900/60">
              <tr className="text-slate-500 dark:text-gray-400 uppercase font-bold text-[9px]">
                <th className="px-2.5 py-1.5 border-b border-r border-slate-200 dark:border-gray-700 text-center w-10">Cargar</th>
                <th className="px-2.5 py-1.5 border-b border-r border-slate-200 dark:border-gray-700">Admisión</th>
                <th className="px-2.5 py-1.5 border-b border-r border-slate-200 dark:border-gray-700">Código</th>
                <th className="px-2.5 py-1.5 border-b border-r border-slate-200 dark:border-gray-700">Empresa</th>
                <th className="px-2.5 py-1.5 border-b border-r border-slate-200 dark:border-gray-700 text-center">Cantidad</th>
                <th className="px-2.5 py-1.5 border-b border-r border-slate-200 dark:border-gray-700">Venta</th>
                <th className="px-2.5 py-1.5 border-b border-r border-slate-200 dark:border-gray-700 text-center">Recargo</th>
                <th className="px-2.5 py-1.5 border-b border-slate-200 dark:border-gray-700">Estado</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-4 text-center text-slate-400 dark:text-gray-500">
                    Sin ítems registrados para esta admisión
                  </td>
                </tr>
              ) : (
                items.map((it) => {
                  const estadoKey = (it.estado || 'INGRESADO').toUpperCase();
                  const costo = Number(it.costo) || 0;
                  const { vecesCosto: vecesCostoCalculado, venta: ventaCalculada } = calcularVenta(it);
                  const vecesCosto = it.recargoVecesCosto ?? vecesCostoCalculado;
                  const venta = it.venta ?? ventaCalculada;
                  const estaCargado = estadoKey === 'CARGADO';
                  const actualizando = actualizandoEstadoId === it.id;
                  const pendiente = pendientes[it.id]?.payload;
                  return (
                    <tr key={it.id} className={estaCargado ? 'bg-emerald-50/40 dark:bg-emerald-950/10' : ''}>
                      <td className="px-2.5 py-1.5 border-b border-r border-slate-100 dark:border-gray-700/60 text-center">
                        <input
                          type="checkbox"
                          checked={estaCargado}
                          disabled={actualizando}
                          onChange={(e) => handleToggleCargado(it, e.target.checked)}
                          title={estaCargado ? 'Desmarcar (vuelve a INGRESADO)' : 'Marcar como CARGADO'}
                          className="w-3.5 h-3.5 accent-[#2383C2] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        />
                      </td>
                      <td className="px-2.5 py-1.5 border-b border-r border-slate-100 dark:border-gray-700/60 font-semibold text-[#2383C2]">
                        {registro?.gestionId || 'N/A'}
                      </td>
                      <td className="px-2.5 py-1.5 border-b border-r border-slate-100 dark:border-gray-700/60 font-mono text-emerald-600 dark:text-emerald-400">
                        {it.codigo || 'S/C'}
                      </td>
                      <td className="px-2.5 py-1.5 border-b border-r border-slate-100 dark:border-gray-700/60 text-slate-600 dark:text-gray-300 truncate max-w-[160px]">
                        <EmpresaCargaCell it={it} pendiente={pendiente} />
                      </td>
                      <td className="px-2.5 py-1.5 border-b border-r border-slate-100 dark:border-gray-700/60 text-center text-slate-700 dark:text-gray-200 font-semibold">
                        {it.cantidad ?? 0}
                      </td>
                      <td className="px-2.5 py-1.5 border-b border-r border-slate-100 dark:border-gray-700/60 text-emerald-700 dark:text-emerald-400 font-semibold">
                        {venta != null ? (
                          `$${Number(venta).toLocaleString('es-CL')}`
                        ) : costo === 0 ? (
                          <span className="text-slate-400 dark:text-gray-500 italic font-normal">Sin costo</span>
                        ) : (
                          <span className="text-amber-600 dark:text-amber-400 italic font-normal">Sin regla</span>
                        )}
                      </td>
                      <td className="px-2.5 py-1.5 border-b border-r border-slate-100 dark:border-gray-700/60 text-center text-slate-700 dark:text-gray-200">
                        {vecesCosto != null ? `${vecesCosto} x` : '-'}
                      </td>
                      <td className="px-2.5 py-1.5 border-b border-slate-100 dark:border-gray-700/60">
                        <span className={`inline-block px-1.5 py-0.5 text-[9px] font-bold rounded-full uppercase ${ESTADO_BADGE[estadoKey] || 'bg-slate-100 text-slate-600'}`}>
                          {estadoKey}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Contenedor 3: Ítems Registrados — tabla completa, incluyendo el ítem vinculado del delivery */}
      <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700/80 rounded-lg shadow-xs overflow-hidden">
        <div className="px-3 py-1.5 bg-slate-50/80 dark:bg-gray-800/80 border-b border-slate-200 dark:border-gray-700 flex items-center gap-1.5">
          <Package size={13} className="text-[#2383C2]" />
          <h3 className="text-[11px] font-bold text-slate-700 dark:text-gray-200 uppercase tracking-wide">
            Ítems Registrados
          </h3>
        </div>

        <div className="overflow-auto">
          <table className="w-full text-left text-[10px] border-collapse">
            <thead className="bg-slate-50 dark:bg-gray-900/60">
              <tr className="text-slate-500 dark:text-gray-400 uppercase font-bold text-[9px]">
                <th className="px-2.5 py-1.5 border-b border-r border-slate-200 dark:border-gray-700">Código</th>
                <th className="px-2.5 py-1.5 border-b border-r border-slate-200 dark:border-gray-700">Referencia</th>
                <th className="px-2.5 py-1.5 border-b border-r border-slate-200 dark:border-gray-700">Descripción</th>
                <th className="px-2.5 py-1.5 border-b border-r border-slate-200 dark:border-gray-700">Empresa</th>
                <th className="px-2.5 py-1.5 border-b border-r border-slate-200 dark:border-gray-700 text-center">Cant.</th>
                <th className="px-2.5 py-1.5 border-b border-r border-slate-200 dark:border-gray-700">Costo</th>
                <th className="px-2.5 py-1.5 border-b border-r border-slate-200 dark:border-gray-700">Lote</th>
                <th className="px-2.5 py-1.5 border-b border-r border-slate-200 dark:border-gray-700">Vencimiento</th>
                <th className="px-2.5 py-1.5 border-b border-r border-slate-200 dark:border-gray-700">Total</th>
                <th className="px-2.5 py-1.5 border-b border-r border-slate-200 dark:border-gray-700">Delivery</th>
                <th className="px-2.5 py-1.5 border-b border-r border-slate-200 dark:border-gray-700">N° Guía</th>
                <th className="px-2.5 py-1.5 border-b border-r border-slate-200 dark:border-gray-700">Atributo</th>
                <th className="px-2.5 py-1.5 border-b border-slate-200 dark:border-gray-700">Estado</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={13} className="px-3 py-4 text-center text-slate-400 dark:text-gray-500">
                    Sin ítems registrados para esta admisión
                  </td>
                </tr>
              ) : (
                (() => {
                  const deliveriesMostrados = new Set();
                  return items.map((it) => {
                    const estadoKey = (it.estado || 'INGRESADO').toUpperCase();
                    const total = (Number(it.costo) || 0) * (Number(it.cantidad) || 1);
                    const deliveryValor = (it.delivery || '').trim();
                    const mostrarDesglose = Boolean(deliveryValor) && !deliveriesMostrados.has(deliveryValor);
                    if (mostrarDesglose) deliveriesMostrados.add(deliveryValor);
                    const pendiente = pendientes[it.id]?.payload;

                    return (
                      <React.Fragment key={it.id}>
                        <tr>
                          <td className="px-2.5 py-1.5 border-b border-r border-slate-100 dark:border-gray-700/60 font-mono text-emerald-600 dark:text-emerald-400">
                            {it.codigo || 'S/C'}
                          </td>
                          <td className="px-2.5 py-1.5 border-b border-r border-slate-100 dark:border-gray-700/60 font-medium text-slate-700 dark:text-gray-200 truncate max-w-[160px]" title={it.referencia}>
                            {it.referencia || '-'}
                          </td>
                          <td className="px-2.5 py-1.5 border-b border-r border-slate-100 dark:border-gray-700/60 text-slate-500 dark:text-gray-400 truncate max-w-[180px]" title={it.descripcion}>
                            {it.descripcion || '-'}
                          </td>
                          <td className="px-2.5 py-1.5 border-b border-r border-slate-100 dark:border-gray-700/60 text-slate-600 dark:text-gray-300">
                            {renderP(it.empresa)}
                          </td>
                          <td className="px-2.5 py-1.5 border-b border-r border-slate-100 dark:border-gray-700/60 text-center text-slate-700 dark:text-gray-200 font-semibold">
                            {it.cantidad ?? 0}
                          </td>
                          <td className="px-2.5 py-1.5 border-b border-r border-slate-100 dark:border-gray-700/60 text-emerald-700 dark:text-emerald-400">
                            {it.costo ? `$${Number(it.costo).toLocaleString('es-CL')}` : '-'}
                          </td>
                          <td className="px-2.5 py-1.5 border-b border-r border-slate-100 dark:border-gray-700/60 text-slate-600 dark:text-gray-300">
                            {deliveryValor ? 'PAD' : 'Sin lote'}
                          </td>
                          <td className="px-2.5 py-1.5 border-b border-r border-slate-100 dark:border-gray-700/60 text-slate-600 dark:text-gray-300">
                            {deliveryValor ? 'PAD' : 'Sin fecha'}
                          </td>
                          <td className="px-2.5 py-1.5 border-b border-r border-slate-100 dark:border-gray-700/60 text-emerald-700 dark:text-emerald-400 font-semibold">
                            {total ? `$${Math.round(total).toLocaleString('es-CL')}` : '-'}
                          </td>
                          <td className="px-2.5 py-1.5 border-b border-r border-slate-100 dark:border-gray-700/60 text-slate-600 dark:text-gray-300">
                            {it.delivery || '-'}
                          </td>
                          <td className="px-2.5 py-1.5 border-b border-r border-slate-100 dark:border-gray-700/60 text-slate-600 dark:text-gray-300">
                            <NumeroGuiaCell it={it} pendiente={pendiente} />
                          </td>
                          <td className="px-2.5 py-1.5 border-b border-r border-slate-100 dark:border-gray-700/60 text-slate-600 dark:text-gray-300">
                            {it.atributo || '-'}
                          </td>
                          <td className="px-2.5 py-1.5 border-b border-slate-100 dark:border-gray-700/60">
                            <span className={`inline-block px-1.5 py-0.5 text-[9px] font-bold rounded-full uppercase ${ESTADO_BADGE[estadoKey] || 'bg-slate-100 text-slate-600'}`}>
                              {estadoKey}
                            </span>
                          </td>
                        </tr>

                        {mostrarDesglose && (
                          <DesgloseGuia
                            deliveryValor={deliveryValor}
                            referenciaDestacada={it.referencia}
                            colSpanTotal={13}
                            productosGuardados={it.productosGuiaVinculados}
                            productosPendientes={pendiente?.productosGuiaVinculados}
                          />
                        )}
                      </React.Fragment>
                    );
                  });
                })()
              )}
            </tbody>
            {items.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50 dark:bg-gray-900/60 font-bold">
                  <td colSpan={8} className="px-2.5 py-1.5 border-t border-r border-slate-200 dark:border-gray-700 text-slate-600 dark:text-gray-300 text-right">
                    Total de la admisión:
                  </td>
                  <td className="px-2.5 py-1.5 border-t border-r border-slate-200 dark:border-gray-700 text-emerald-700 dark:text-emerald-400">
                    ${Math.round(sumaCostos).toLocaleString('es-CL')}
                  </td>
                  <td colSpan={4} className="border-t border-slate-200 dark:border-gray-700"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

    </div>
  );
};

export default CargasTab;