import { useId } from 'react';
import { zonaPorId } from '../../../../functions/bodymap/nucleo.mjs';
import { ANCHO, ALTO, SILUETA, formasDe, resaltada } from './geometriaCuerpo';

// Una vista del cuerpo (anterior o posterior). Silueta continua en gris
// neutro (gris azulado en modo oscuro); cada zona se recorta con ella y se
// separa de las demás con una línea muy sutil del mismo tono. Las zonas
// resaltadas van en el azul del sistema con un halo suave. `caja` (opcional,
// [x, y, w, h]) recorta el dibujo para el detalle ampliado y agrega los
// detalles anatómicos de la región (clavícula, deltoides, rótula…). Cada
// zona tiene tooltip con su nombre y el lado del paciente.

const NOMBRE_LADO = { der: 'derecho', izq: 'izquierdo' };
const REFLEJO = `translate(${ANCHO},0) scale(-1,1)`;

const CuerpoSVG = ({ vista, zonas = [], lado, caja, titulo, className = '' }) => {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const recorte = `silueta-${id}`;
  const halo = `halo-${id}`;
  const formas = formasDe(vista);
  const activas = formas.filter((f) => resaltada(f, zonas, lado));
  const ampliado = Boolean(caja);
  const viewBox = (caja || [0, 0, ANCHO, ALTO]).join(' ');
  const trazo = ampliado ? 0.45 : 0.7;

  return (
    <svg viewBox={viewBox} role="img" aria-label={titulo || `Vista ${vista}`} className={className} data-vista={vista}>
      <defs>
        <clipPath id={recorte}><path d={SILUETA} /></clipPath>
        <filter id={halo} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={ampliado ? 2.2 : 3.2} />
        </filter>
      </defs>

      {/* Silueta base (con un borde apenas visible). */}
      <path d={SILUETA} strokeWidth={trazo} className="fill-slate-200 stroke-slate-300 dark:fill-slate-600 dark:stroke-slate-500" />

      {/* Halo de las zonas resaltadas: desenfocado y FUERA del recorte. */}
      {activas.length > 0 && (
        <g filter={`url(#${halo})`} opacity="0.55" aria-hidden="true">
          <g clipPath={`url(#${recorte})`}>
            {activas.map((f) => (
              <path key={f.clave} d={f.d} transform={f.reflejada ? REFLEJO : undefined} className="fill-[#2383C2] dark:fill-[#4aa8e8]" />
            ))}
          </g>
        </g>
      )}

      {/* Zonas, recortadas con la silueta. */}
      <g clipPath={`url(#${recorte})`}>
        {formas.map((f) => {
          const activa = activas.includes(f);
          const nombre = `${zonaPorId(f.zona)?.nombre || f.zona}${f.lado ? ` ${NOMBRE_LADO[f.lado]}` : ''}`;
          return (
            <g key={f.clave} transform={f.reflejada ? REFLEJO : undefined}>
              <path
                d={f.d}
                data-zona={f.zona}
                data-lado={f.lado || undefined}
                data-activa={activa || undefined}
                strokeWidth={trazo}
                strokeLinejoin="round"
                className={`transition-colors ${activa
                  ? 'fill-[#2383C2] stroke-[#1d6fa5] dark:fill-[#3b9de0] dark:stroke-[#7cc0ee]'
                  : 'fill-slate-200 stroke-slate-300 hover:fill-slate-300 dark:fill-slate-600 dark:stroke-slate-500 dark:hover:fill-slate-500'}`}
              >
                <title>{nombre}</title>
              </path>
              {/* Detalles anatómicos: solo en el detalle ampliado. */}
              {ampliado && f.detalles.map((d) => (
                <path key={d} d={d} fill="none" strokeWidth={0.5} strokeLinecap="round" pointerEvents="none" aria-hidden="true"
                  className={activa ? 'stroke-white/70 dark:stroke-white/60' : 'stroke-slate-400/70 dark:stroke-slate-400/60'} />
              ))}
            </g>
          );
        })}
      </g>

      {/* Contorno suave encima, para que la silueta se lea continua. */}
      <path d={SILUETA} fill="none" strokeWidth={trazo} pointerEvents="none" aria-hidden="true" className="stroke-slate-300 dark:stroke-slate-500" />
    </svg>
  );
};

export default CuerpoSVG;
