// PDF de OC en Storage: ordenes_oc/OC_{oc}.pdf. Lectura con getBlob (requiere
// sesión y permiso, ver storage.rules): nunca URLs públicas.
import { ref, uploadBytesResumable, getBlob } from 'firebase/storage';
import { storage, auth } from '../../../../../firebaseConfig';
import { rutaPdfOC } from './ordenesOCHelpers';

// Sube (o reemplaza) el PDF de la OC. onProgreso(porcentaje 0-100).
export const subirPdfOC = (oc, file, onProgreso) => new Promise((resolve, reject) => {
  const tarea = uploadBytesResumable(ref(storage, rutaPdfOC(oc)), file, {
    contentType: 'application/pdf',
    customMetadata: { nombreOriginal: file.name, subidoPor: auth.currentUser?.email || '' }
  });
  tarea.on('state_changed',
    (snap) => onProgreso?.(snap.totalBytes ? Math.round((snap.bytesTransferred / snap.totalBytes) * 100) : 0),
    reject,
    () => resolve(tarea.snapshot.ref.fullPath)
  );
});

export const obtenerBlobPdfOC = (oc) => getBlob(ref(storage, rutaPdfOC(oc)));

export const mensajeErrorPdfOC = (err) => {
  switch (err?.code) {
    case 'storage/unauthorized':
    case 'permission-denied':
      return 'No tienes permiso para los PDF de OC (o el archivo no es un PDF válido de hasta 15 MB).';
    case 'storage/retry-limit-exceeded':
    case 'storage/network-request-failed':
    case 'unavailable':
      return 'Se perdió la conexión con el servidor. Intenta nuevamente.';
    case 'storage/object-not-found':
      return 'El PDF de esta OC ya no existe en el servidor.';
    case 'storage/quota-exceeded':
      return 'Se superó la cuota de almacenamiento. Avisa al administrador.';
    default:
      return 'Ocurrió un error inesperado. Intenta nuevamente.';
  }
};
