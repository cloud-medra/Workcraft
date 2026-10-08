import { useEffect, useRef, useState } from 'react';
import { elegirSiguiente } from '../utils/puntosAnimados';

// Grilla decorativa de puntos (esquina del panel azul del login) que "cobra
// vida": cada INTERVALO_MS se destaca un punto al azar con un efecto (brillo,
// brillo y crecimiento leve, u onda) que dura entre 1,8 y 2,4 s. Como el
// intervalo es más corto que la duración, un punto se apaga mientras otro
// enciende: se siente continuo, con un máximo de MAX_ACTIVOS a la vez.
// Las animaciones son CSS (index.css, .punto-*) y solo mueven transform y
// opacity. Con "movimiento reducido" los puntos quedan quietos. Los
// temporizadores se limpian al desmontar.

const MAX_ACTIVOS = 2;
const INTERVALO_MS = 1150;

const prefiereMovimientoReducido = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const CLASE_EFECTO = { brillo: 'punto-brillo', brilloCrece: 'punto-brilloCrece', onda: 'punto-onda-activa' };

const PuntosAnimados = ({ total = 12, columnas = 4, className = '' }) => {
  // { [indice]: { efecto, duracion, clave } }
  const [activos, setActivos] = useState({});
  const activosRef = useRef({});

  useEffect(() => {
    if (prefiereMovimientoReducido()) return undefined;
    let recientes = [];
    let clave = 0;
    const apagados = new Set();

    const actualizar = (nuevo) => {
      activosRef.current = nuevo;
      setActivos(nuevo);
    };

    const intervalo = setInterval(() => {
      const enCurso = Object.keys(activosRef.current).map(Number);
      if (enCurso.length >= MAX_ACTIVOS) return;
      const sig = elegirSiguiente(total, enCurso, recientes);
      recientes = [...recientes, sig.indice].slice(-3);
      clave += 1;
      actualizar({ ...activosRef.current, [sig.indice]: { efecto: sig.efecto, duracion: sig.duracion, clave } });
      // Al terminar su animación, el punto vuelve al reposo.
      const t = setTimeout(() => {
        apagados.delete(t);
        const resto = { ...activosRef.current };
        delete resto[sig.indice];
        actualizar(resto);
      }, sig.duracion);
      apagados.add(t);
    }, INTERVALO_MS);

    return () => {
      clearInterval(intervalo);
      apagados.forEach(clearTimeout);
    };
  }, [total]);

  return (
    <div
      aria-hidden="true"
      className={`grid gap-3 ${className}`}
      style={{ gridTemplateColumns: `repeat(${columnas}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: total }, (_, i) => {
        const activo = activos[i];
        return (
          <span
            // `key` con la clave del efecto reinicia la animación CSS cada vez.
            key={activo ? `${i}-${activo.clave}` : i}
            data-efecto={activo?.efecto || 'normal'}
            className={`relative block w-2 h-2 ${activo ? CLASE_EFECTO[activo.efecto] : ''}`}
            style={activo ? { '--punto-duracion': `${activo.duracion}ms` } : undefined}
          >
            <span className="punto-halo absolute -inset-1.5 rounded-full" />
            <span className="punto-onda absolute inset-0 rounded-full" />
            <span className="punto-nucleo absolute inset-0 rounded-full bg-white" />
          </span>
        );
      })}
    </div>
  );
};

export default PuntosAnimados;
