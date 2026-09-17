import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../../../../../firebaseConfig';

// Mismo "maestros_recargos" global que ya usan Implantes/Consignación (sin
// scope propio todavía) — decisión explícita de dejarlo así por ahora, a
// revisar más adelante si Hemodinamia necesita su propia tabla de precios.
export const useRecargosActivos = () => {
  const [recargosActivos, setRecargosActivos] = useState([]);
  const [cargandoRecargos, setCargandoRecargos] = useState(true);

  useEffect(() => {
    const cargarRecargos = async () => {
      setCargandoRecargos(true);
      try {
        const q = query(collection(db, "maestros_recargos"), where("estado", "==", "ACTIVO"));
        const snap = await getDocs(q);
        setRecargosActivos(snap.docs.map(d => d.data()));
      } catch (error) {
        console.error("Error al cargar Recargos Maestros:", error);
      } finally {
        setCargandoRecargos(false);
      }
    };
    cargarRecargos();
  }, []);

  return { recargosActivos, cargandoRecargos };
};
