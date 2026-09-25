import { useMemo } from 'react';
import { useCatalogo } from '../../../../../../../hooks/useCatalogo';

// Mismo "maestros_recargos" global que ya usan Implantes/Consignación (sin
// scope propio todavía) — decisión explícita de dejarlo así por ahora, a
// revisar más adelante si Hemodinamia necesita su propia tabla de precios.
// "maestros_recargos" viene del catalogosStore: una sola lectura por sesión
// compartida por Implantes, Hemodinamia, Consignación y Recargos Maestros
// (antes cada montaje de Cargas hacía su propio getDocs).
export const useRecargosActivos = () => {
  const { datos, cargando } = useCatalogo('recargos');
  const recargosActivos = useMemo(
    // Sin `id`, igual que el d.data() de la consulta original.
    // eslint-disable-next-line no-unused-vars
    () => datos.filter(r => r.estado === 'ACTIVO').map(({ id, ...resto }) => resto),
    [datos]
  );
  return { recargosActivos, cargandoRecargos: cargando };
};
