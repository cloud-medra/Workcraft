import React, { createContext, useState, useContext, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true); // Nuevo estado de carga global

useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
    if (currentUser) {
      try {
        // Obtenemos el documento directamente
        const userRef = doc(db, "usuarios", currentUser.uid);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
          setUserData({ ...userDoc.data(), uid: currentUser.uid });
        } else {
          // Si el usuario existe en Auth pero no en Firestore, es un error de lógica
          console.error("Usuario sin documento en Firestore");
          setUserData(null);
        }
      } catch (error) {
        console.error("Error al cargar datos:", error);
        setUserData(null);
      }
    } else {
      setUserData(null);
    }
    setLoading(false);
  });
  return unsubscribe;
}, []);

  return (
    <UserContext.Provider value={{ userData, setUserData, loading }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);