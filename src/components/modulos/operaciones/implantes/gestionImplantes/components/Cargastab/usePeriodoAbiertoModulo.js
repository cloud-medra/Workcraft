import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../../../../../../firebaseConfig'; // Ajusta la profundidad si falla

/**
 * Escucha en tiempo real si existe un período ABIERTO o REABIERTO para el
 * módulo indicado, consultando directamente 'cierres_periodos' (fuente de
 * verdad real — el documento 'periodo_activo_{modulo}' es solo un puntero
 * que no se actualiza al cerrar, por eso no se usa aquí).
 */
export const usePeriodoAbiertoModulo = (moduloId) => {
  const [periodoAbierto, setPeriodoAbierto] = useState(null); // { id, anio, mes, modulo, estado }
  const [cargandoPeriodo, setCargandoPeriodo] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'cierres_periodos'),
      where('modulo', '==', moduloId),
      where('estado', 'in', ['ABIERTO', 'REABIERTO'])
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const d = snapshot.docs[0];
        setPeriodoAbierto({ id: d.id, ...d.data() });
      } else {
        setPeriodoAbierto(null);
      }
      setCargandoPeriodo(false);
    }, (error) => {
      console.error("Error al escuchar período abierto:", error);
      setCargandoPeriodo(false);
    });

    return () => unsubscribe();
  }, [moduloId]);

  return { periodoAbierto, cargandoPeriodo };
};