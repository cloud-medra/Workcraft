import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

// Documento de log (sin escribir). Lo usan registrarLogConsignacion y las
// escrituras en lote (registroConsignacionService.js), que lo agregan al
// mismo batch que el registro.
export const construirLogConsignacion = (accion, detalles, userData) => ({
  accion,
  detalles,
  active: true,
  usuario: userData?.nombreCompleto || 'Usuario Desconocido',
  usuarioEmail: userData?.email || '',
  timestamp: serverTimestamp()
});

// Mismo patrón que registrarLogImplantes.js (implantes/gestionImplantes/utils)
// — subcolección "logs" del propio documento en consignacion_registros, para
// que el mismo componente de UI (HistorialLogsContenido) pueda mostrar el
// historial de ambos módulos sin distinción.
export const registrarLogConsignacion = async (docRef, accion, detalles, userData) => {
  try {
    const logsSubcollectionRef = collection(docRef, 'logs');
    await addDoc(logsSubcollectionRef, construirLogConsignacion(accion, detalles, userData));
  } catch (err) {
    console.error('Error al registrar log de auditoría:', err);
  }
};
