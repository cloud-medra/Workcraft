import { useState, useEffect, useCallback } from 'react';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export function useCollectionCache(colName, orderField = 'fechaRegistro', orderDir = 'desc') {
  const [allDocs, setAllDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q = query(collection(db, colName), orderBy(orderField, orderDir));
      const snap = await getDocs(q);
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setAllDocs(data);
    } catch (err) {
      console.error(`Error al cargar la colección "${colName}":`, err);
      setError(err);
      setAllDocs([]);
    } finally {
      setLoading(false);
    }
  }, [colName, orderField, orderDir]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return {
    allDocs,
    loading,
    error,
    reload: cargar
  };
}