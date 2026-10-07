import { useEffect, useState } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { normalizarAtajosGuardados, ATAJOS_POR_DEFECTO } from '../config/atajosDashboard';

// =====================================================================
// Atajos del Dashboard — configuración GLOBAL (una sola para el sistema)
// =====================================================================
// configuracion_sistema/atajosDashboard = { atajos: [{ modulo, path }],
// actualizadoEn, actualizadoPor }. La edita un admin/dev desde Ajustes →
// Atajos; cada usuario ve solo los que tiene permitidos (resolverAtajos).
// Se lee una vez por sesión (caché a nivel de módulo) y se actualiza al
// guardar, así el Dashboard no gasta una lectura cada vez que se abre.
// =====================================================================

const refConfig = () => doc(db, 'configuracion_sistema', 'atajosDashboard');

let promesa = null;
const suscriptores = new Set();

export const obtenerAtajosConfigurados = (forzar = false) => {
  if (!promesa || forzar) {
    promesa = getDoc(refConfig())
      .then((snap) => normalizarAtajosGuardados(snap.exists() ? snap.data() : null))
      .catch((error) => {
        console.error('Error al leer los atajos del Dashboard:', error);
        promesa = null;
        return ATAJOS_POR_DEFECTO;
      });
  }
  return promesa;
};

export const guardarAtajosConfigurados = async (atajos, usuario) => {
  const limpios = normalizarAtajosGuardados({ atajos });
  await setDoc(refConfig(), {
    atajos: limpios,
    actualizadoEn: serverTimestamp(),
    actualizadoPor: usuario?.nombreCompleto || usuario?.email || ''
  });
  promesa = Promise.resolve(limpios);
  suscriptores.forEach((cb) => cb(limpios));
  return limpios;
};

// Lista configurada ([{ modulo, path }]) o null mientras carga.
export const useAtajosConfigurados = () => {
  const [atajos, setAtajos] = useState(null);
  useEffect(() => {
    let activo = true;
    const cb = (lista) => { if (activo) setAtajos(lista); };
    suscriptores.add(cb);
    obtenerAtajosConfigurados().then(cb);
    return () => { activo = false; suscriptores.delete(cb); };
  }, []);
  return atajos;
};
