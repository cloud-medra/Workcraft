import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../../../../../firebaseConfig'; 

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