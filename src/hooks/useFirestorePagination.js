import { useState, useCallback, useEffect, useRef } from 'react';
import { collection, query, getDocs, limit, startAfter } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export function useFirestorePagination({ colName, constraints, pageSize = 50 }) {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);
  const [hasNext, setHasNext] = useState(false);

  const cursorsRef = useRef([null]);
  const constraintsRef = useRef(constraints);

  const fetchPage = useCallback(
    async (index) => {
      setLoading(true);
      try {
        const cursor = cursorsRef.current[index] ?? null;
        const qParts = [...constraints, limit(pageSize + 1)];
        if (cursor) qParts.push(startAfter(cursor));

        const snap = await getDocs(query(collection(db, colName), ...qParts));
        const allDocs = snap.docs;
        const hayMas = allDocs.length > pageSize;
        const pageDocs = hayMas ? allDocs.slice(0, pageSize) : allDocs;

        setDocs(pageDocs.map((d) => ({ id: d.id, ...d.data() })));
        setHasNext(hayMas);
        setPageIndex(index);

        const nuevosCursores = [...cursorsRef.current];
        nuevosCursores[index + 1] = pageDocs[pageDocs.length - 1] || null;
        cursorsRef.current = nuevosCursores;
      } catch (error) {
        console.error('Error al paginar:', error);
        setDocs([]);
        setHasNext(false);
      } finally {
        setLoading(false);
      }
    },
    [colName, constraints, pageSize]
  );

  useEffect(() => {
    if (constraintsRef.current !== constraints) {
      constraintsRef.current = constraints;
      cursorsRef.current = [null];
      fetchPage(0);
    }
  }, [constraints]);

  useEffect(() => {
    fetchPage(0);
  }, []);

  const goNext = () => {
    if (!hasNext || loading) return;
    fetchPage(pageIndex + 1);
  };

  const goPrev = () => {
    if (pageIndex === 0 || loading) return;
    fetchPage(pageIndex - 1);
  };

  const reload = () => fetchPage(pageIndex);

  const reset = () => {
    cursorsRef.current = [null];
    fetchPage(0);
  };

  return {
    docs,
    loading,
    hasNext,
    hasPrev: pageIndex > 0,
    pageIndex,
    goNext,
    goPrev,
    reload,
    reset
  };
}