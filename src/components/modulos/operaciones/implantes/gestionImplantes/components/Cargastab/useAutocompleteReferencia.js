import { useState, useEffect, useRef } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../../../../../../firebaseConfig';

// --- Caché en memoria compartida, mantenida en vivo con onSnapshot ---
// Antes se cargaba una sola vez con getDocs() y quedaba "congelada": un
// código nuevo o editado en Códigos Maestros no aparecía en el autocompletado
// de Cargas hasta refrescar la página. Ahora hay un listener en tiempo real
// compartido entre todas las instancias del autocompletado montadas en la
// app; cualquier cambio en "maestros_codigos" (crear, editar, importar, o
// modificar precio desde Vista General) actualiza la caché al instante,
// sin depender de que cada punto de escritura recuerde invalidarla.
let cacheCodigosMaestros = [];
let hayDatosCache = false;
let unsubscribeGlobal = null;
let suscriptoresActivos = 0;
const listenersCache = new Set();

const notificarSuscriptores = () => listenersCache.forEach(cb => cb());

const conectarListenerGlobal = () => {
  suscriptoresActivos++;
  if (!unsubscribeGlobal) {
    unsubscribeGlobal = onSnapshot(
      collection(db, "maestros_codigos"),
      (snap) => {
        cacheCodigosMaestros = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        hayDatosCache = true;
        notificarSuscriptores();
      },
      (error) => console.error("Error al escuchar maestros_codigos:", error)
    );
  }
};

const desconectarListenerGlobal = () => {
  suscriptoresActivos = Math.max(0, suscriptoresActivos - 1);
  if (suscriptoresActivos === 0 && unsubscribeGlobal) {
    unsubscribeGlobal();
    unsubscribeGlobal = null;
  }
};

// Se mantiene por compatibilidad si la llamas desde algún lado; ya no hace
// falta porque la caché se mantiene sola vía onSnapshot.
export const invalidarCacheCodigosMaestros = () => {};

export const useAutocompleteReferencia = (referenciaTexto) => {
  const [sugerencias, setSugerencias] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [mostrarSug, setMostrarSug] = useState(false);
  const containerRef = useRef(null);
  const skipNext = useRef(false);
  const ultimoTextoRef = useRef('');

  useEffect(() => {
    conectarListenerGlobal();
    return () => desconectarListenerGlobal();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setMostrarSug(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const recalcularSugerencias = (texto) => {
    const t = (texto || '').trim();
    ultimoTextoRef.current = t;
    if (t.length < 2) {
      setSugerencias([]);
      setBuscando(false);
      return;
    }
    const upper = t.toUpperCase();
    const coincidencias = cacheCodigosMaestros.filter(item => {
      const ref = (item.referencia || '').toUpperCase();
      const cod = (item.codigo || '').toUpperCase();
      return ref.includes(upper) || cod.includes(upper);
    });
    coincidencias.sort((a, b) => {
      const refA = (a.referencia || '').toUpperCase();
      const refB = (b.referencia || '').toUpperCase();
      const empiezaA = refA.startsWith(upper) ? 0 : 1;
      const empiezaB = refB.startsWith(upper) ? 0 : 1;
      if (empiezaA !== empiezaB) return empiezaA - empiezaB;
      return refA.localeCompare(refB);
    });
    setSugerencias(coincidencias.slice(0, 8));
    setBuscando(false);
  };

  useEffect(() => {
    if (skipNext.current) {
      skipNext.current = false;
      return;
    }
    const t = (referenciaTexto || '').trim();
    if (t.length < 2) {
      setSugerencias([]);
      setMostrarSug(false);
      return;
    }
    setBuscando(!hayDatosCache);
    const timeoutId = setTimeout(() => {
      recalcularSugerencias(referenciaTexto);
      setMostrarSug(true);
    }, 350);
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [referenciaTexto]);

  // Si el dropdown está abierto y llega un cambio de la caché (p.ej. alguien
  // más acaba de crear el código que estás buscando), refresca sola.
  useEffect(() => {
    const cb = () => {
      if (ultimoTextoRef.current.length >= 2) recalcularSugerencias(ultimoTextoRef.current);
    };
    listenersCache.add(cb);
    return () => listenersCache.delete(cb);
  }, []);

  return { sugerencias, buscando, mostrarSug, setMostrarSug, containerRef, skipNext };
};