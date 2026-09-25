import { useMemo } from 'react';
import { useCatalogo } from '../../../../hooks/useCatalogo';

// Notas del panel (administracion_notas) desde el catalogosStore: una sola
// lectura por sesión compartida por el Dashboard (NuevoModuloCard) y Notas
// Admin, en vez de un listener en cada uno. Las escrituras de la app se
// reflejan con upsertLocal/removeLocal o `refrescar()`.
// Mismo orden que el orderBy('orden', 'asc') original.
export const useNotasPanel = () => {
  const { datos, cargando, refrescar } = useCatalogo('notas');
  const notas = useMemo(
    () => datos
      .filter(n => n.orden !== undefined)
      .sort((a, b) => a.orden - b.orden),
    [datos]
  );
  return { notas, cargando, refrescar };
};
