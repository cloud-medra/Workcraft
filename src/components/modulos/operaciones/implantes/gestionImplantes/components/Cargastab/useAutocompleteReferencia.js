import { useState, useEffect, useRef } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../../../../../../firebaseConfig';

// --- Caché en memoria a nivel de módulo ---
// Firestore no soporta búsquedas "contiene" nativas (solo rangos de prefijo
// con >= / <=), así que la única forma de encontrar "008" dentro de
// "292.008" es filtrar en el cliente sobre el set completo de códigos.
// Por eso se trae la colección UNA sola vez y se cachea acá (fuera del
// hook), compartida entre todas las instancias del autocompletado que haya
// montadas en la app (Cargas, edición de ítems de PAD, etc.), en vez de
// repetir la lectura completa por cada input o cada tecleo.
let cacheCodigosMaestros = null;
let promesaCargaCodigos = null;

const cargarCodigosMaestros = async () => {
  if (cacheCodigosMaestros) return cacheCodigosMaestros;
  if (!promesaCargaCodigos) {
    promesaCargaCodigos = getDocs(collection(db, "maestros_codigos"))
      .then(snap => {
        cacheCodigosMaestros = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        return cacheCodigosMaestros;
      })
      .catch(err => {
        promesaCargaCodigos = null; // permite reintentar si la carga falló
        throw err;
      });
  }
  return promesaCargaCodigos;
};

// Por si en algún flujo (ej. después de crear/editar un código maestro desde
// otra pantalla) hace falta forzar una recarga en vez de usar la caché vieja.
export const invalidarCacheCodigosMaestros = () => {
  cacheCodigosMaestros = null;
  promesaCargaCodigos = null;
};

export const useAutocompleteReferencia = (referenciaTexto) => {
  const [sugerencias, setSugerencias] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [mostrarSug, setMostrarSug] = useState(false);
  const containerRef = useRef(null);
  const skipNext = useRef(false);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setMostrarSug(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    const timeoutId = setTimeout(async () => {
      setBuscando(true);
      try {
        const upper = t.toUpperCase();
        const todos = await cargarCodigosMaestros();

        // Coincidencia: la referencia o el código CONTIENEN el texto buscado,
        // en cualquier posición (no solo al inicio).
        const coincidencias = todos.filter(item => {
          const ref = (item.referencia || '').toUpperCase();
          const cod = (item.codigo || '').toUpperCase();
          return ref.includes(upper) || cod.includes(upper);
        });

        // Orden de relevancia: primero las que EMPIEZAN con el texto
        // (lo más probable que se esté buscando), después el resto
        // alfabéticamente por referencia.
        coincidencias.sort((a, b) => {
          const refA = (a.referencia || '').toUpperCase();
          const refB = (b.referencia || '').toUpperCase();
          const empiezaA = refA.startsWith(upper) ? 0 : 1;
          const empiezaB = refB.startsWith(upper) ? 0 : 1;
          if (empiezaA !== empiezaB) return empiezaA - empiezaB;
          return refA.localeCompare(refB);
        });

        setSugerencias(coincidencias.slice(0, 8));
        setMostrarSug(true);
      } catch (error) {
        console.error("Error al buscar referencias:", error);
      } finally {
        setBuscando(false);
      }
    }, 350);
    return () => clearTimeout(timeoutId);
  }, [referenciaTexto]);

  return { sugerencias, buscando, mostrarSug, setMostrarSug, containerRef, skipNext };
};