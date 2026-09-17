import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../../../../firebaseConfig';

const MODULO_CONSIGNACION = 'consignacion';

// Mismo patrón que verificacionPeriodoBloque.js de Implantes, pero acá el
// candado es por ítem (cada carga es un documento propio en
// consignacion_registros, no hay bloques de varias cotizaciones) — por eso
// alcanza con verificar un único período puntual, sin agregación previa.
export const periodoEstaAbierto = async (anio, mes) => {
  if (!anio || !mes) return false;

  const q = query(
    collection(db, 'cierres_periodos'),
    where('modulo', '==', MODULO_CONSIGNACION),
    where('anio', '==', anio),
    where('mes', '==', mes),
    where('estado', 'in', ['ABIERTO', 'REABIERTO'])
  );
  const snap = await getDocs(q);
  return !snap.empty;
};
