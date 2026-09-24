import { useEffect, useState } from 'react';

// Devuelve `valor` con retraso: solo se actualiza cuando deja de cambiar
// durante `ms` milisegundos. Útil para filtrar mientras el usuario escribe.
export const useDebouncedValue = (valor, ms = 250) => {
  const [debounced, setDebounced] = useState(valor);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(valor), ms);
    return () => clearTimeout(t);
  }, [valor, ms]);

  return debounced;
};
