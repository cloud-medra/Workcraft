import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

// Mismo patrón que registrarLogImplantes.js — subcolección "logs" del propio
// documento en hemodinamia_gestiones.
export const registrarLogHemodinamia = async (docRef, accion, detalles, userData) => {
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
