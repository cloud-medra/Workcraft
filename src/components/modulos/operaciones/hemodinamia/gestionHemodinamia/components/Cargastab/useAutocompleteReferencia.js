import { useState, useEffect, useRef } from 'react';
import { cargarCatalogo, leerCatalogo, suscribirCatalogo } from '../../../../../../../stores/catalogosStore';

import { esCodigoDeHemodinamia, buscarCodigosHemodinamia } from './cargasHelpers';


// Mismo patrón que useAutocompleteReferencia de Implantes, pero acotado al
// segmento "HEMODINAMIA" de maestros_codigos (campo `segmento`, ya existente
// en Códigos Maestros junto a IMPLANTES/CONSIGNACION) — a diferencia de
// Implantes/Consignación, que buscan en toda la colección sin filtrar.
// La colección vive en el catalogosStore: un único listener de
// maestros_codigos para toda la app, que no se cierra al desmontar.
// Aquí solo se deriva (y memoiza) el subconjunto de Hemodinamia.
let ultimaBase = null;
let codigosHemodinamia = [];
const obtenerCodigos = () => {
  const base = leerCatalogo('codigos');
  if (!base) return [];
  if (base !== ultimaBase) {
    ultimaBase = base;
    codigosHemodinamia = base.filter(esCodigoDeHemodinamia);
  }
  return codigosHemodinamia;
};

export const useAutocompleteReferencia = (referenciaTexto) => {
  const [sugerencias, setSugerencias] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [mostrarSug, setMostrarSug] = useState(false);
  const containerRef = useRef(null);
  const portalRef = useRef(null);
  const skipNext = useRef(false);
  const ultimoTextoRef = useRef('');

  useEffect(() => {
    cargarCatalogo('codigos').catch(() => {});
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      const dentroContainer = containerRef.current && containerRef.current.contains(e.target);
      const dentroPortal = portalRef.current && portalRef.current.contains(e.target);
      if (!dentroContainer && !dentroPortal) setMostrarSug(false);
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
    setSugerencias(buscarCodigosHemodinamia(obtenerCodigos(), t));
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
    setBuscando(leerCatalogo('codigos') === null);
    const timeoutId = setTimeout(() => {
      recalcularSugerencias(referenciaTexto);
      setMostrarSug(true);
    }, 350);
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [referenciaTexto]);

  useEffect(() => {
    const cb = () => {
      if (ultimoTextoRef.current.length >= 2) recalcularSugerencias(ultimoTextoRef.current);
    };
    return suscribirCatalogo('codigos', cb);
  }, []);

  return { sugerencias, buscando, mostrarSug, setMostrarSug, containerRef, portalRef, skipNext };
};
