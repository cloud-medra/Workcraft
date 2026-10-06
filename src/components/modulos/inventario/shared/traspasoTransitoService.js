import { collection, doc, getDocs, limit, orderBy, query, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../../firebaseConfig';
import { agruparLineasPorCaja, aplicarRetirosACaja, siguienteNumeroDocumento, DESTINOS_TRANSITO } from './traspasoTransito';

// Escritura del traspaso a tránsito (antes dentro de EgresosInventario.jsx).
// La usan Egresos y Escaneo (egreso por escaneo).

export const COL_INVENTARIO_GENERAL = 'inventario_general';
export const COL_INVENTARIO_TRANSITO = 'inventario_transito';

// Correlativo automático YYNNNN según el último documento en tránsito.
export const generarSiguienteNumeroDocumento = async () => {
  try {
    const q = query(collection(db, COL_INVENTARIO_TRANSITO), orderBy('fechaRegistro', 'desc'), limit(1));
    const snap = await getDocs(q);
    return siguienteNumeroDocumento(snap.empty ? '' : snap.docs[0].data().numeroDocumento);
  } catch (error) {
    console.error('Error al generar correlativo:', error);
    return siguienteNumeroDocumento('');
  }
};

// Transacción: cada caja se relee en el momento y el descuento se calcula
// sobre sus ítems actuales. Si la caja o el ítem cambiaron, o ya no alcanza
// el stock, se aborta todo (el error dice qué caja/ítem falló). Deja el log
// TRASPASO_TRANSITO en cada caja y crea el documento en inventario_transito.
// `origen` (opcional) se agrega al log y al documento en tránsito.
export const ejecutarTraspasoTransito = async ({
  lineas, numeroDocumento, motivo, tipoDestino, solicitante, observaciones, usuario, origen
}) => {
  const retirosPorCaja = agruparLineasPorCaja(lineas);
  const destino = DESTINOS_TRANSITO[tipoDestino] || DESTINOS_TRANSITO.cliente;
  const solicitanteFinal = String(solicitante || '').trim() || 'No especificado';
  const observacionesFinal = String(observaciones || '').trim();
  const conOrigen = origen ? { origen } : {};

  return runTransaction(db, async (tx) => {
    const cajaIds = Object.keys(retirosPorCaja);
    const snaps = await Promise.all(cajaIds.map(id => tx.get(doc(db, COL_INVENTARIO_GENERAL, id))));

    const actualizaciones = snaps.map((snap, i) => {
      const cajaId = cajaIds[i];
      if (!snap.exists()) throw new Error(`La caja ya no existe (${retirosPorCaja[cajaId][0].nombreCaja})`);
      const lineasDeEstaCaja = retirosPorCaja[cajaId];
      return { cajaId, nuevosItems: aplicarRetirosACaja(snap.data().items, lineasDeEstaCaja), lineasDeEstaCaja };
    });

    // Todas las lecturas van antes que las escrituras.
    actualizaciones.forEach(({ cajaId, nuevosItems, lineasDeEstaCaja }) => {
      tx.update(doc(db, COL_INVENTARIO_GENERAL, cajaId), {
        items: nuevosItems,
        ultimaModificacion: serverTimestamp()
      });
      tx.set(doc(collection(db, COL_INVENTARIO_GENERAL, cajaId, 'logs')), {
        accion: 'TRASPASO_TRANSITO',
        numeroDocumento: numeroDocumento.trim(),
        detalles: {
          motivo,
          tipoDestino: destino,
          solicitante: solicitanteFinal,
          observaciones: observacionesFinal,
          ...conOrigen,
          itemsTrasladados: lineasDeEstaCaja.map(l => ({
            ...l.itemOriginal,
            cantidadTraspasada: l.cantidadRetirar
          }))
        },
        usuario: usuario?.nombreCompleto || 'Usuario Desconocido',
        usuarioEmail: usuario?.email || '',
        fecha: new Date(),
        timestamp: serverTimestamp()
      });
    });

    const transitoRef = doc(collection(db, COL_INVENTARIO_TRANSITO));
    tx.set(transitoRef, {
      numeroDocumento: numeroDocumento.trim(),
      estado: 'EN_TRANSITO',
      motivo,
      tipoDestino: destino,
      solicitante: solicitanteFinal,
      observaciones: observacionesFinal,
      ...conOrigen,
      items: lineas.map(linea => ({
        ...linea.itemOriginal,
        cajaOrigenId: linea.cajaId,
        nombreCajaOrigen: linea.nombreCaja,
        ubicacionOrigen: linea.ubicacionOrigen,
        cantidadTraspasada: linea.cantidadRetirar,
        fechaAgregadoLista: new Date()
      })),
      totalUnidades: lineas.reduce((acc, i) => acc + i.cantidadRetirar, 0),
      registradoPor: usuario?.nombreCompleto || 'Usuario',
      usuarioEmail: usuario?.email || '',
      fechaRegistro: serverTimestamp()
    });

    return { transitoId: transitoRef.id };
  });
};
