import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

// Extraído de useGestionesImplantesData.js para que otras herramientas del
// módulo Implantes (ej. Sincronización de Imputadas) dejen constancia en el
// MISMO log de auditoría del bloque (subcolección "logs" del documento en
// implantes_gestiones), con el mismo formato que ya lee HistorialLogsContenido.
export const registrarLogImplantes = async (docRef, accion, detalles, userData) => {
  try {
    const logsSubcollectionRef = collection(docRef, 'logs');
    await addDoc(logsSubcollectionRef, {
      accion,
      detalles,
      active: true,
      usuario: userData?.nombreCompleto || 'Usuario Desconocido',
      usuarioEmail: userData?.email || '',
      timestamp: serverTimestamp()
    });
  } catch (err) {
    console.error('Error al registrar log de auditoría:', err);
  }
};
