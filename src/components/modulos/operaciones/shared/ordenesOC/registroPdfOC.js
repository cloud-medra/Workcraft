// Registro de qué OC ya tienen PDF: UN documento de Firestore
// (ordenesOC/registroPdf) con { pdfs: { [claveOC]: { subidoEn, subidoPor } } }.
// Leerlo cuesta 1 lectura. Cada subida actualiza solo su campo (merge sobre el
// mapa), así que dos personas subiendo a la vez no se pisan. ~80 bytes por
// OC: el límite de 1 MiB alcanza para ~12.000 OC.
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../../../../../firebaseConfig';
import { claveOC } from './ordenesOCHelpers';

const refRegistro = () => doc(db, 'ordenesOC', 'registroPdf');

// { [claveOC]: { subidoEn, subidoPor } } ({} si aún no existe).
export const leerRegistroPdfOC = async () => {
  const snap = await getDoc(refRegistro());
  return (snap.exists() && snap.data().pdfs) || {};
};

// Devuelve la entrada escrita (para actualizar el registro en memoria).
export const registrarPdfOC = async (oc) => {
  const entrada = { subidoEn: serverTimestamp(), subidoPor: auth.currentUser?.email || '' };
  await setDoc(refRegistro(), { pdfs: { [claveOC(oc)]: entrada }, actualizadoEn: serverTimestamp() }, { merge: true });
  return { subidoEn: new Date(), subidoPor: entrada.subidoPor };
};
