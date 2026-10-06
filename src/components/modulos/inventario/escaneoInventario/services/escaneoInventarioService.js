import { collection, doc, getDoc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../../../firebaseConfig';
import { COL_CODIGOS_BARRA, idVinculo, planificarVinculos, construirVinculo } from '../utils/vinculosCodigoBarra';
import { agregarItemACaja, validarItem, ORIGEN_ESCANEO } from '../utils/itemsCaja';

// Escrituras de Escaneo sobre inventario_general (misma colección y
// estructura que Stock General) e inventario_codigos_barra. Separado de la
// pantalla para reutilizarlo en la etapa 2 (egreso / traspaso a tránsito).

export const COL_INVENTARIO = 'inventario_general';

// Vínculo de un código (o null si no está vinculado). 1 lectura.
export const leerVinculo = async (clave) => {
  const id = idVinculo(clave);
  if (!id) return null;
  const snap = await getDoc(doc(db, COL_CODIGOS_BARRA, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

const logInventario = (accion, detalles, usuario) => ({
  accion,
  detalles,
  usuario: usuario?.nombreCompleto || 'Usuario Desconocido',
  usuarioEmail: usuario?.email || '',
  fecha: new Date(),
  timestamp: serverTimestamp()
});

// Guarda un producto escaneado en una caja, en una transacción:
//   - caja existente (cajaId): relee la caja y agrega el ítem a `items`
//     (suma la cantidad si ya está el mismo producto/lote/vencimiento);
//   - caja nueva (nuevaCaja: { nombreCaja, ubicacion }): la crea con la
//     estructura de Stock General y su log CREACION;
//   - deja el log INGRESO_ESCANEO con origen "Inventario por escaneo";
//   - crea los vínculos código -> producto (y reasigna los confirmados).
// Si un código pasó a otro producto desde el escaneo, o la caja ya no
// existe, no se escribe nada. Devuelve { cajaId, sumado, vinculosEscritos }.
export const guardarIngresoEscaneo = async ({ cajaId, nuevaCaja, producto, item, codigos, usuario }) => {
  const errorItem = validarItem(item);
  if (errorItem) throw new Error(errorItem);
  if (!cajaId && !String(nuevaCaja?.nombreCaja || '').trim()) throw new Error('El nombre de la caja es obligatorio.');

  return runTransaction(db, async (tx) => {
    const cajaRef = cajaId ? doc(db, COL_INVENTARIO, cajaId) : doc(collection(db, COL_INVENTARIO));
    const refsVinculo = codigos.map((c) => doc(db, COL_CODIGOS_BARRA, idVinculo(c.clave)));

    // Todas las lecturas antes que las escrituras.
    const [snapCaja, ...snapsVinculo] = await Promise.all([
      cajaId ? tx.get(cajaRef) : Promise.resolve(null),
      ...refsVinculo.map((r) => tx.get(r))
    ]);
    if (cajaId && !snapCaja.exists()) throw new Error('La caja ya no existe. Elige otra caja.');

    const actuales = {};
    codigos.forEach((c, i) => { actuales[c.clave] = snapsVinculo[i].exists() ? snapsVinculo[i].data() : null; });
    const aEscribir = planificarVinculos(codigos, producto.id, actuales);

    const nombreUsuario = usuario?.nombreCompleto || usuario?.nombre || 'Usuario';
    const caja = cajaId ? snapCaja.data() : { nombreCaja: nuevaCaja.nombreCaja.trim(), ubicacion: (nuevaCaja.ubicacion || '').trim() };
    const { items, sumado } = agregarItemACaja(cajaId ? caja.items : [], item);

    if (cajaId) {
      tx.update(cajaRef, { items, ultimaModificacion: serverTimestamp() });
    } else {
      tx.set(cajaRef, {
        nombreCaja: caja.nombreCaja,
        ubicacion: caja.ubicacion,
        descripcion: '',
        items,
        registradoPor: nombreUsuario,
        fechaRegistro: serverTimestamp(),
        ultimaModificacion: serverTimestamp()
      });
      tx.set(doc(collection(db, COL_INVENTARIO, cajaRef.id, 'logs')), logInventario('CREACION', {
        nombreCaja: caja.nombreCaja,
        ubicacion: caja.ubicacion,
        cantidadItems: 0,
        origen: ORIGEN_ESCANEO
      }, usuario));
    }

    tx.set(doc(collection(db, COL_INVENTARIO, cajaRef.id, 'logs')), logInventario('INGRESO_ESCANEO', {
      origen: ORIGEN_ESCANEO,
      nombreCaja: caja.nombreCaja || '',
      ubicacion: caja.ubicacion || '',
      item,
      sumadoAExistente: sumado,
      codigosBarra: codigos.map((c) => c.codigo)
    }, usuario));

    aEscribir.forEach((v) => {
      tx.set(doc(db, COL_CODIGOS_BARRA, idVinculo(v.clave)), {
        ...construirVinculo(v, producto, usuario),
        ...(v.reasignadoDe ? { reasignadoDe: v.reasignadoDe } : {}),
        actualizadoEn: serverTimestamp()
      });
    });

    return { cajaId: cajaRef.id, sumado, vinculosEscritos: aEscribir.length };
  });
};
