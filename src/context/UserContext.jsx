import React, { createContext, useState, useContext, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db, prepararCacheParaUsuario } from '../firebaseConfig';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true); // Nuevo estado de carga global
  // Por qué no se pudo cargar el perfil del usuario autenticado:
  // null | 'sin-perfil' (no existe usuarios/{uid}) | 'error-carga'.
  const [perfilError, setPerfilError] = useState(null);

useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
    if (currentUser) {
      // Al iniciar sesión (no solo al recargar) se vuelve a "cargando": así
      // nadie (LoginForm, ProtectedRoute) decide con el userData anterior
      // mientras se prepara la caché y se lee el perfil.
      setLoading(true);
      setPerfilError(null);
      try {
        // Antes de la primera lectura: si la caché local de Firestore es de
        // otro usuario, se borra (ver firebaseConfig.js).
        await prepararCacheParaUsuario(currentUser.uid);

        // Obtenemos el documento directamente
        const userRef = doc(db, "usuarios", currentUser.uid);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
          setUserData({ ...userDoc.data(), uid: currentUser.uid });
        } else {
          // Si el usuario existe en Auth pero no en Firestore, es un error de lógica
          console.error("Usuario sin documento en Firestore");
          setUserData(null);
          setPerfilError('sin-perfil');
        }
      } catch (error) {
        console.error("Error al cargar datos:", error);
        setUserData(null);
        setPerfilError('error-carga');
      }
    } else {
      setUserData(null);
      setPerfilError(null);
    }
    setLoading(false);
  });
  return unsubscribe;
}, []);

  return (
    <UserContext.Provider value={{ userData, setUserData, loading, perfilError }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
