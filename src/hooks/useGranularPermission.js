import { useUser } from '../context/UserContext';

export const useGranularPermission = () => {
  const { userData } = useUser();

  const hasPermission = (viewPath, sectionKey, elementKey = null) => {
    if (!userData) return false;
    if (userData.rol === 'admin' || userData.rol === 'dev') return true;

    const granularMap = userData.permisosGranulares || {};
    const viewConfig = granularMap[viewPath];

    if (!viewConfig) {
      console.warn(`[PERMISOS] ¡ALERTA! No hay config para ${viewPath}. Bloqueando por seguridad.`);
      return false;
    }

    const seccionConfig = viewConfig[sectionKey];
    if (!seccionConfig) {
      return true;
    }

    if (seccionConfig.visible === false) {
      return false;
    }

    if (elementKey) {
      const elementoActivo = seccionConfig.elements?.[elementKey];
      if (elementoActivo === false) {
        return false;
      }
    }

    return true;
  };

  return { hasPermission };
};