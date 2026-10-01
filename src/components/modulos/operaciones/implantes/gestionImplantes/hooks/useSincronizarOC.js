import { useState } from 'react';
import { useToast } from '../../../../../../context/ToastContext';
import { useModal } from '../../../../../../context/ModalContext';
import { useUser } from '../../../../../../context/UserContext';
import { prepararSincronizacionOC, ejecutarSincronizacionOC } from '../../../shared/ocIndex/sincronizarOC';

// Botón "Sincronizar OC" de la barra de Gestión de Implantes. Los cambios
// escritos llegan a la tabla por el listener que ya existe (compensación de
// latencia del SDK): no se vuelve a leer nada a mano.
export const useSincronizarOC = () => {
  const { showToast } = useToast();
  const { confirmAction } = useModal();
  const { userData } = useUser();
  const [sincronizandoOC, setSincronizandoOC] = useState(false);
  const [resumenOC, setResumenOC] = useState(null);

  const ejecutar = async (preparado) => {
    setSincronizandoOC(true);
    try {
      const resultado = await ejecutarSincronizacionOC(preparado, { userData });
      setResumenOC(resultado);
      const { itemsActualizados, erroresEscritura } = resultado;
      showToast(
        `Sincronizar OC: ${itemsActualizados} ítem(s) con OC asignada${erroresEscritura.length ? `, ${erroresEscritura.length} gestión(es) no se pudieron guardar` : ''}`,
        erroresEscritura.length ? 'error' : 'success'
      );
    } catch (err) {
      console.error('Error al sincronizar OC:', err);
      // Índice compuesto aún no desplegado: Firestore lo dice con este código.
      const mensaje = err?.code === 'failed-precondition'
        ? 'Falta desplegar el índice de Firestore (ocPendiente + fecha). Revisa firestore.indexes.json.'
        : err.message;
      showToast('Error al sincronizar OC: ' + mensaje, 'error');
    } finally {
      setSincronizandoOC(false);
    }
  };

  const handleSincronizarOC = async () => {
    if (sincronizandoOC) return;
    setSincronizandoOC(true);
    let preparado;
    try {
      preparado = await prepararSincronizacionOC();
    } catch (err) {
      console.error('Error al preparar Sincronizar OC:', err);
      showToast(err.message, 'error');
      setSincronizandoOC(false);
      return;
    }
    setSincronizandoOC(false);

    if (preparado.sinNovedades) {
      confirmAction(
        'Sin importaciones nuevas',
        'No se ha importado un Excel de OC desde la última sincronización. Solo se asignarían OC a gestiones o ítems agregados después. ¿Sincronizar de todos modos?',
        () => ejecutar(preparado),
        { confirmText: 'Sincronizar' }
      );
      return;
    }
    await ejecutar(preparado);
  };

  return { sincronizandoOC, handleSincronizarOC, resumenOC, cerrarResumenOC: () => setResumenOC(null) };
};
