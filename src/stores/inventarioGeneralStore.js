import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebaseConfig';

// =====================================================================
// inventario_general — un único listener compartido
// =====================================================================
// General, Ingresos, Egresos y Existencias leían cada una la colección
// completa con su propio listener/getDocs (y Egresos lo recreaba cada vez
// que se elegía otra caja). Ahora comparten este listener, que se abre con
// la primera pantalla de Inventario montada y se cierra cuando ya no queda
// ninguna.
//
// Sigue en tiempo real a propósito (decisión del equipo): el stock que se
// muestra debe estar al día. Las escrituras de stock (Egresos, Tránsito)
// igual releen la caja dentro de una transacción; no dependen de esta copia.
// =====================================================================

const COLECCION = 'inventario_general';
const ESTADO_INICIAL = Object.freeze({ datos: null, error: null });

let estado = ESTADO_INICIAL;
let unsubscribe = null;
let referencias = 0;
const suscriptores = new Set();

const actualizar = (cambios) => {
  estado = { ...estado, ...cambios };
  suscriptores.forEach((cb) => cb());
};

const abrir = () => {
  unsubscribe = onSnapshot(
    collection(db, COLECCION),
    (snap) => actualizar({ datos: snap.docs.map((d) => ({ id: d.id, ...d.data() })), error: null }),
    (error) => {
      console.error(`Error al escuchar ${COLECCION}:`, error);
      unsubscribe = null;
      actualizar({ error });
    }
  );
};

/** Registra una pantalla que usa el inventario; devuelve la función para soltarla. */
export const retenerInventarioGeneral = () => {
  referencias += 1;
  if (!unsubscribe) abrir();
  let soltado = false;
  return () => {
    if (soltado) return;
    soltado = true;
    referencias = Math.max(0, referencias - 1);
    if (referencias === 0 && unsubscribe) {
      unsubscribe();
      unsubscribe = null;
      estado = ESTADO_INICIAL;
    }
  };
};

export const suscribirInventarioGeneral = (cb) => {
  suscriptores.add(cb);
  return () => suscriptores.delete(cb);
};

export const obtenerEstadoInventarioGeneral = () => estado;
