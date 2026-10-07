import { collection, doc, getDoc, getDocs, query, where, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../../../firebaseConfig';
import { COL_CODIGOS_BARRA, idVinculo, planificarVinculos, construirVinculo } from '../escaneo/vinculosCodigoBarra';
import {
  COL_INVENTARIO, COL_DOCUMENTOS_INGRESO, ACCION_LOG_INGRESO,
  validarIngresoStock, idDocumentoIngreso, claveDocumentoIngreso, esMismoDocumentoIngreso, variantesGuia,
  mensajeIngresoDuplicado, construirRegistroIngreso, detallesLogIngreso
} from './ingresoStock';

// Guardado de un ingreso con guía o factura, compartido por Ingresos y por
// Escaneo · Con guía o factura.

export class IngresoDuplicadoError extends Error {
  constructor(mensaje, previo) {
    super(mensaje);
    this.name = 'IngresoDuplicadoError';
    this.previo = previo;
  }
}

// Ingreso anterior con la misma empresa + guía/factura + OC, o null:
// { fecha, usuario, ingresoId }. Mira el registro de documentos ingresados
// y, para los ingresos anteriores a ese registro, inventario_general.
export const buscarIngresoDuplicado = async (cabecera) => {
  const snapDoc = await getDoc(doc(db, COL_DOCUMENTOS_INGRESO, idDocumentoIngreso(cabecera)));
  if (snapDoc.exists()) {
    const d = snapDoc.data();
    // Si el ingreso se eliminó de Stock General, el documento se puede volver a ingresar.
    const snapIngreso = d.ingresoId ? await getDoc(doc(db, COL_INVENTARIO, d.ingresoId)) : null;
    if (snapIngreso?.exists()) return { fecha: d.fecha, usuario: d.registradoPor, ingresoId: d.ingresoId };
  }
  const snap = await getDocs(query(collection(db, COL_INVENTARIO), where('numeroGuiaFactura', 'in', variantesGuia(cabecera.numeroGuiaFactura))));
  const previo = snap.docs.find((d) => esMismoDocumentoIngreso(d.data(), cabecera));
  if (!previo) return null;
  const data = previo.data();
  return { fecha: data.fechaRegistro, usuario: data.registradoPor, ingresoId: previo.id };
};

const logInventario = (accion, detalles, usuario) => ({
  accion,
  detalles,
  usuario: usuario?.nombreCompleto || 'Usuario Desconocido',
  usuarioEmail: usuario?.email || '',
  fecha: new Date(),
  timestamp: serverTimestamp()
});

// Vínculos código de barras -> producto a guardar con el ingreso. Si un
// código aparece en más de una línea vale la última.
const vinculosPorClave = (vinculos) => {
  const porClave = new Map();
  (vinculos || []).forEach(({ producto, codigos }) => (codigos || []).forEach((c) => porClave.set(c.clave, { entrada: c, producto })));
  return [...porClave.values()];
};

// Guarda el ingreso: crea su documento en inventario_general (como Ingresos:
// cada ingreso es un documento de caja), el log INGRESO_CON_DOCUMENTO, el
// registro del documento ingresado y, desde Escaneo, los vínculos de
// códigos de barras. Todo en una transacción: si el documento ya fue
// ingresado (o un código pasó a otro producto) no se escribe nada.
// vinculos: [{ producto, codigos }] (opcional). Devuelve { id }.
export const guardarIngresoStock = async ({ cabecera, items, usuario, origen, vinculos }) => {
  const error = validarIngresoStock(cabecera, items);
  if (error) throw new Error(error);

  const previo = await buscarIngresoDuplicado(cabecera);
  if (previo) throw new IngresoDuplicadoError(mensajeIngresoDuplicado(cabecera, previo), previo);

  const porVincular = vinculosPorClave(vinculos);
  const nombreUsuario = usuario?.nombreCompleto || usuario?.nombre || 'Usuario';

  return runTransaction(db, async (tx) => {
    const refDocumento = doc(db, COL_DOCUMENTOS_INGRESO, idDocumentoIngreso(cabecera));
    const refsVinculo = porVincular.map(({ entrada }) => doc(db, COL_CODIGOS_BARRA, idVinculo(entrada.clave)));

    // Todas las lecturas antes que las escrituras.
    const [snapDocumento, ...snapsVinculo] = await Promise.all([tx.get(refDocumento), ...refsVinculo.map((r) => tx.get(r))]);
    if (snapDocumento.exists()) {
      const d = snapDocumento.data();
      const snapIngreso = d.ingresoId ? await tx.get(doc(db, COL_INVENTARIO, d.ingresoId)) : null;
      if (snapIngreso?.exists()) {
        const previoTx = { fecha: d.fecha, usuario: d.registradoPor, ingresoId: d.ingresoId };
        throw new IngresoDuplicadoError(mensajeIngresoDuplicado(cabecera, previoTx), previoTx);
      }
    }

    const aEscribir = porVincular.flatMap(({ entrada, producto }, i) => planificarVinculos(
      [entrada], producto.id, { [entrada.clave]: snapsVinculo[i].exists() ? snapsVinculo[i].data() : null }
    ).map((v) => ({ ...v, producto })));

    const refIngreso = doc(collection(db, COL_INVENTARIO));
    tx.set(refIngreso, {
      ...construirRegistroIngreso({ cabecera, items, usuario, origen }),
      fechaRegistro: serverTimestamp(),
      ultimaModificacion: serverTimestamp()
    });
    tx.set(doc(collection(db, COL_INVENTARIO, refIngreso.id, 'logs')), logInventario(ACCION_LOG_INGRESO, detallesLogIngreso({ cabecera, items, origen }), usuario));
    tx.set(refDocumento, {
      clave: claveDocumentoIngreso(cabecera),
      ingresoId: refIngreso.id,
      numeroGuiaFactura: cabecera.numeroGuiaFactura,
      numeroOrden: cabecera.numeroOrden,
      empresa: cabecera.empresa,
      empresaId: cabecera.empresaId,
      registradoPor: nombreUsuario,
      registradoPorEmail: usuario?.email || '',
      fecha: serverTimestamp()
    });
    aEscribir.forEach((v) => {
      tx.set(doc(db, COL_CODIGOS_BARRA, idVinculo(v.clave)), {
        ...construirVinculo(v, v.producto, usuario),
        ...(v.reasignadoDe ? { reasignadoDe: v.reasignadoDe } : {}),
        actualizadoEn: serverTimestamp()
      });
    });

    return { id: refIngreso.id };
  });
};
