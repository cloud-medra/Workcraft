// Caché por sesión de las lecturas por año de Cargas Consolidado.
//
// Antes cada pestaña escuchaba en vivo (onSnapshot) el año completo de las
// tres raíces, y como los hooks de todas las pestañas se montaban siempre,
// abrir la pantalla leía Gestión + Imputadas aunque solo se mirara una.
// Ahora cada año se lee una vez con getDocs y se reutiliza al cambiar de
// pestaña o volver a la pantalla; "Actualizar" fuerza una nueva lectura.
// La caché vive en memoria (se descarta al recargar / cerrar sesión).
const cache = new Map(); // clave -> Promise<docs[]>

export const leerConCache = (clave, leer, { forzar = false } = {}) => {
  if (!forzar && cache.has(clave)) return cache.get(clave);
  const promesa = leer().catch((error) => {
    cache.delete(clave);
    throw error;
  });
  cache.set(clave, promesa);
  return promesa;
};
