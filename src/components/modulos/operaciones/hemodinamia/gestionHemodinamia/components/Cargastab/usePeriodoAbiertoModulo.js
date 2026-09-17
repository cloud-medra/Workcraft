import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../../../../../../firebaseConfig';

export const usePeriodoAbiertoModulo = (moduloId) => {
  const [periodoAbierto, setPeriodoAbierto] = useState(null);
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
