import {
  collection, doc, getDoc, getDocs, limit, onSnapshot, orderBy, query,
  runTransaction, serverTimestamp, updateDoc
} from 'firebase/firestore';
import { db } from '../../../../../firebaseConfig';
import { mismosItemsTransito as mismosItems } from '../../shared/traspasoTransito';
import {
  ESTADOS_INVENTARIO, ESTADOS_CAJA, ESTADOS_AJUSTE,
  esperadoDeItems, compararConteo, ajustarItemsCaja, sumarTotales
} from '../utils/inventarioFisico';

// Inventario por cajas:
//   inventarios_fisicos/{id}              inventario (nombre, fecha, estado...)
//   inventarios_fisicos/{id}/cajas/{caja} conteo de cada caja (foto del stock
//                                         esperado, conteo, resultado, ajuste)
//   inventarios_fisicos/_control          { inventarioEnCurso } para que haya
//                                         uno solo a la vez
// El stock de inventario_general solo se modifica al finalizar el inventario.

export const COL_INVENTARIOS = 'inventarios_fisicos';
export const ID_CONTROL = '_control';
const COL_GENERAL = 'inventario_general';

const refControl = () => doc(db, COL_INVENTARIOS, ID_CONTROL);
const refInventario = (id) => doc(db, COL_INVENTARIOS, id);
const refCajaInventario = (inventarioId, cajaId) => doc(db, COL_INVENTARIOS, inventarioId, 'cajas', cajaId);
const datosUsuario = (u) => ({ nombre: u?.nombreCompleto || 'Usuario', email: u?.email || '' });

// ---------------- Inventario ----------------

// Id del inventario en curso (o null), en vivo.
export const escucharInventarioEnCurso = (callback, onError) => onSnapshot(
  refControl(),
  (snap) => callback(snap.exists() ? snap.data().inventarioEnCurso || null : null),
  onError
);

export const escucharInventario = (id, callback, onError) => onSnapshot(
  refInventario(id), (snap) => callback(snap.exists() ? { id: snap.id, ...snap.data() } : null), onError
);

export const escucharCajasInventario = (id, callback, onError) => onSnapshot(
  collection(db, COL_INVENTARIOS, id, 'cajas'),
  (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
  onError
);

// Crea el inventario si no hay otro en curso (transacción sobre _control).
export const iniciarInventario = async ({ nombre, fecha, conteoCiego = true, usuario }) => {
  if (!String(nombre || '').trim()) throw new Error('Escribe un nombre o descripción para el inventario.');
  if (!fecha) throw new Error('Indica la fecha del inventario.');
  return runTransaction(db, async (tx) => {
    const snapControl = await tx.get(refControl());
    const enCurso = snapControl.exists() ? snapControl.data().inventarioEnCurso : null;
    if (enCurso) {
      const snapActual = await tx.get(refInventario(enCurso));
      if (snapActual.exists() && snapActual.data().estado === ESTADOS_INVENTARIO.EN_CURSO) {
        throw new Error('Ya hay un inventario en curso. Retómalo o finalízalo antes de iniciar otro.');
      }
    }
    const ref = doc(collection(db, COL_INVENTARIOS));
    tx.set(ref, {
      nombre: nombre.trim(),
      fecha,
      conteoCiego: Boolean(conteoCiego),
      estado: ESTADOS_INVENTARIO.EN_CURSO,
      iniciadoPor: datosUsuario(usuario),
      fechaInicio: serverTimestamp()
    });
    tx.set(refControl(), { inventarioEnCurso: ref.id, actualizadoEn: serverTimestamp() });
    return ref.id;
  });
};

// Historial: inventarios por fecha de inicio (el documento _control no
// tiene fechaInicio y queda fuera). Sin índice compuesto.
export const leerHistorialInventarios = async (max = 50) => {
  const snap = await getDocs(query(collection(db, COL_INVENTARIOS), orderBy('fechaInicio', 'desc'), limit(max)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const leerCajasInventario = async (id) => {
  const snap = await getDocs(collection(db, COL_INVENTARIOS, id, 'cajas'));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

// ---------------- Conteo de una caja ----------------

// Inicia (foto del stock esperado) o retoma el conteo de una caja en este
// equipo (`sesion`). Si la caja ya estaba finalizada, no hace nada.
export const iniciarOTomarCaja = async ({ inventarioId, cajaId, usuario, sesion }) => runTransaction(db, async (tx) => {
  const ref = refCajaInventario(inventarioId, cajaId);
  const [snapInv, snap, snapCaja] = await Promise.all([
    tx.get(refInventario(inventarioId)), tx.get(ref), tx.get(doc(db, COL_GENERAL, cajaId))
  ]);
  if (!snapInv.exists() || snapInv.data().estado !== ESTADOS_INVENTARIO.EN_CURSO) throw new Error('El inventario ya no está en curso.');
  const contando = { contandoPor: datosUsuario(usuario), contandoPorSesion: sesion, tomadaEn: serverTimestamp() };
  if (snap.exists()) {
    if (snap.data().estado === ESTADOS_CAJA.FINALIZADA) return { ...snap.data(), id: snap.id };
    tx.update(ref, contando);
    return { ...snap.data(), id: snap.id, ...contando };
  }
  if (!snapCaja.exists()) throw new Error('La caja ya no existe en Stock General.');
  const caja = snapCaja.data();
  const items = caja.items || [];
  const nuevo = {
    cajaId,
    nombreCaja: caja.nombreCaja || '',
    ubicacion: caja.ubicacion || '',
    estado: ESTADOS_CAJA.EN_CONTEO,
    fotoItems: items,
    esperado: esperadoDeItems(items),
    conteo: [],
    iniciadaPor: datosUsuario(usuario),
    iniciadaEn: serverTimestamp(),
    ...contando
  };
  tx.set(ref, nuevo);
  return { ...nuevo, id: cajaId };
});

// Guardado del conteo a medida que se escanea. Solo si la caja sigue
// tomada por este equipo (otro equipo pudo retomarla) y en conteo.
export const ERROR_OTRA_SESION = 'La caja fue retomada en otro equipo. Este conteo ya no se guarda aquí.';
export const guardarConteoCaja = (inventarioId, cajaId, conteo, sesion) => runTransaction(db, async (tx) => {
  const ref = refCajaInventario(inventarioId, cajaId);
  const snap = await tx.get(ref);
  if (!snap.exists() || snap.data().estado !== ESTADOS_CAJA.EN_CONTEO || snap.data().contandoPorSesion !== sesion) {
    throw new Error(ERROR_OTRA_SESION);
  }
  tx.update(ref, { conteo, actualizadoEn: serverTimestamp() });
});

// ¿Cambió la caja en Stock General desde la foto? Devuelve { cambio, items }.
export const revisarMovimientosCaja = async (cajaInventario) => {
  const snap = await getDoc(doc(db, COL_GENERAL, cajaInventario.cajaId || cajaInventario.id));
  if (!snap.exists()) return { cambio: true, existe: false, items: [] };
  const items = snap.data().items || [];
  return { cambio: !mismosItems(items, cajaInventario.fotoItems), existe: true, items };
};

// Nueva foto del stock esperado (después de un movimiento durante el
// conteo). El conteo hecho se mantiene.
export const actualizarFotoCaja = async (inventarioId, cajaId) => {
  const snap = await getDoc(doc(db, COL_GENERAL, cajaId));
  if (!snap.exists()) throw new Error('La caja ya no existe en Stock General.');
  const items = snap.data().items || [];
  const datos = { fotoItems: items, esperado: esperadoDeItems(items), fotoActualizadaEn: serverTimestamp() };
  await updateDoc(refCajaInventario(inventarioId, cajaId), datos);
  return datos;
};

// Finaliza la caja: guarda el conteo y su resultado. No toca el stock.
export const finalizarCaja = async ({ inventarioId, cajaId, esperado, conteo, usuario, sesion }) => {
  const resultado = compararConteo(esperado, conteo);
  const ref = refCajaInventario(inventarioId, cajaId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists() || snap.data().contandoPorSesion !== sesion) throw new Error(ERROR_OTRA_SESION);
    tx.update(ref, {
    conteo,
    resultado,
    estado: ESTADOS_CAJA.FINALIZADA,
    finalizadaPor: datosUsuario(usuario),
      finalizadaEn: serverTimestamp(),
      contandoPorSesion: null
    });
  });
  return resultado;
};

// Reabre una caja finalizada (solo con el inventario en curso).
export const reabrirCaja = async ({ inventarioId, cajaId, usuario, sesion }) => runTransaction(db, async (tx) => {
  const snapInv = await tx.get(refInventario(inventarioId));
  if (!snapInv.exists() || snapInv.data().estado !== ESTADOS_INVENTARIO.EN_CURSO) throw new Error('El inventario ya no está en curso.');
  tx.update(refCajaInventario(inventarioId, cajaId), {
    estado: ESTADOS_CAJA.EN_CONTEO,
    resultado: null,
    contandoPor: datosUsuario(usuario),
    contandoPorSesion: sesion,
    reabiertaPor: datosUsuario(usuario),
    reabiertaEn: serverTimestamp()
  });
});

// ---------------- Finalizar inventario ----------------

// Ajusta UNA caja en su propia transacción: si su stock cambió desde la
// foto no se toca (CON_MOVIMIENTOS). Cada ajuste deja un log
// AJUSTE_INVENTARIO. Exportada para los tests.
export const ajustarCajaEnTransaccion = ({ inventarioId, cajaInventario, usuario }) => runTransaction(db, async (tx) => {
  const cajaId = cajaInventario.cajaId || cajaInventario.id;
  const refCaja = doc(db, COL_GENERAL, cajaId);
  const refEnInventario = refCajaInventario(inventarioId, cajaId);
  const [snapCaja, snapEnInventario] = await Promise.all([tx.get(refCaja), tx.get(refEnInventario)]);

  const yaAjustada = snapEnInventario.data()?.ajuste?.estado;
  if (yaAjustada === ESTADOS_AJUSTE.AJUSTADA || yaAjustada === ESTADOS_AJUSTE.SIN_DIFERENCIAS) {
    return snapEnInventario.data().ajuste; // reintento: ya estaba hecha
  }

  let ajuste;
  if (!snapCaja.exists()) {
    ajuste = { estado: ESTADOS_AJUSTE.NO_EXISTE, ajustes: [] };
  } else if (!mismosItems(snapCaja.data().items || [], cajaInventario.fotoItems)) {
    ajuste = { estado: ESTADOS_AJUSTE.CON_MOVIMIENTOS, ajustes: [] };
  } else {
    const { items, ajustes } = ajustarItemsCaja(snapCaja.data().items || [], cajaInventario.conteo || []);
    ajuste = { estado: ajustes.length > 0 ? ESTADOS_AJUSTE.AJUSTADA : ESTADOS_AJUSTE.SIN_DIFERENCIAS, ajustes };
    if (ajustes.length > 0) {
      tx.update(refCaja, { items, ultimaModificacion: serverTimestamp() });
      ajustes.forEach((a) => {
        tx.set(doc(collection(db, COL_GENERAL, cajaId, 'logs')), {
          accion: 'AJUSTE_INVENTARIO',
          inventarioId,
          detalles: {
            inventarioId,
            producto: { codigoId: a.codigoId, codigo: a.codigo, referencia: a.referencia, tipo: a.tipo },
            lote: a.lote,
            vencimiento: a.vencimiento,
            cantidadAnterior: a.anterior,
            cantidadNueva: a.nueva,
            diferencia: a.diferencia,
            loteNuevo: a.loteNuevo
          },
          usuario: usuario?.nombreCompleto || 'Usuario Desconocido',
          usuarioEmail: usuario?.email || '',
          fecha: new Date(),
          timestamp: serverTimestamp()
        });
      });
    }
  }
  tx.update(refEnInventario, { ajuste: { ...ajuste, ajustadaEn: serverTimestamp() } });
  return ajuste;
});

// Ajusta todas las cajas finalizadas (una transacción por caja, en orden),
// y cierra el inventario con su resumen. Las cajas pendientes o en conteo no
// se ajustan. Si alguna caja falla por error (no por movimientos), el
// inventario queda en curso para reintentar; las ya ajustadas no se repiten.
// onProgreso({ actual, total, caja }).
export const finalizarInventario = async ({ inventarioId, cajasStock, usuario, onProgreso }) => {
  const docsCajas = await leerCajasInventario(inventarioId);
  const finalizadas = docsCajas.filter((d) => d.estado === ESTADOS_CAJA.FINALIZADA);
  const porId = new Map(docsCajas.map((d) => [d.cajaId || d.id, d]));
  const sinFinalizar = (cajasStock || [])
    .filter((c) => porId.get(c.id)?.estado !== ESTADOS_CAJA.FINALIZADA)
    .map((c) => ({ cajaId: c.id, nombreCaja: c.nombreCaja || '', ubicacion: c.ubicacion || '', estado: porId.get(c.id)?.estado || ESTADOS_CAJA.PENDIENTE }));

  const resultados = [];
  const errores = [];
  for (let i = 0; i < finalizadas.length; i++) {
    const caja = finalizadas[i];
    onProgreso?.({ actual: i + 1, total: finalizadas.length, caja: caja.nombreCaja });
    try {
      const ajuste = await ajustarCajaEnTransaccion({ inventarioId, cajaInventario: caja, usuario });
      resultados.push({ cajaId: caja.cajaId || caja.id, nombreCaja: caja.nombreCaja, ubicacion: caja.ubicacion, estadoAjuste: ajuste.estado, totales: caja.resultado?.totales || null });
    } catch (error) {
      console.error('Error al ajustar la caja', caja.nombreCaja, error);
      errores.push({ cajaId: caja.cajaId || caja.id, nombreCaja: caja.nombreCaja, error: error.message });
    }
  }

  if (errores.length > 0) return { finalizado: false, resultados, errores, sinFinalizar };

  const resumen = {
    cajasContadas: finalizadas.length,
    cajasAjustadas: resultados.filter((r) => r.estadoAjuste === ESTADOS_AJUSTE.AJUSTADA).length,
    cajasConMovimientos: resultados.filter((r) => r.estadoAjuste === ESTADOS_AJUSTE.CON_MOVIMIENTOS).map((r) => r.nombreCaja),
    cajasNoExisten: resultados.filter((r) => r.estadoAjuste === ESTADOS_AJUSTE.NO_EXISTE).map((r) => r.nombreCaja),
    cajasSinFinalizar: sinFinalizar,
    totales: sumarTotales(resultados.filter((r) => r.estadoAjuste !== ESTADOS_AJUSTE.CON_MOVIMIENTOS && r.estadoAjuste !== ESTADOS_AJUSTE.NO_EXISTE).map((r) => r.totales)),
    porCaja: resultados
  };

  await runTransaction(db, async (tx) => {
    const snapControl = await tx.get(refControl());
    tx.update(refInventario(inventarioId), {
      estado: ESTADOS_INVENTARIO.FINALIZADO,
      resumenFinal: resumen,
      finalizadoPor: datosUsuario(usuario),
      fechaFin: serverTimestamp()
    });
    if (snapControl.exists() && snapControl.data().inventarioEnCurso === inventarioId) {
      tx.set(refControl(), { inventarioEnCurso: null, actualizadoEn: serverTimestamp() });
    }
  });

  return { finalizado: true, resultados, errores, sinFinalizar, resumen };
};
