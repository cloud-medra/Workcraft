// Resumen del período abierto para el bloque del sidebar (ver
// PeriodoAbiertoBloque.jsx). Los períodos son por módulo (cierres_periodos):
// normalmente todos están en el mismo mes; si no, se muestra el más reciente
// y se avisa que varía por módulo (con el detalle en el tooltip).
import { MESES } from '../modulos/administracion/controlMensual/constants';
import { MODULES } from '../../config/modulesConfig.jsx';

const mesDe = (id) => MESES.find((m) => m.id === id);
const orden = (p) => Number(p.anio) * 12 + (mesDe(p.mes)?.num || 0);
export const etiquetaPeriodoAbierto = (p) => `${mesDe(p.mes)?.nombre || p.mes} ${p.anio}`;

// → { etiqueta, variaPorModulo, detalle: [{ modulo, etiqueta }] } o null si no hay.
export const resumirPeriodosAbiertos = (docs) => {
  const validos = (docs || []).filter((d) => d.anio && mesDe(d.mes));
  if (!validos.length) return null;
  const masReciente = [...validos].sort((a, b) => orden(b) - orden(a))[0];
  const etiquetas = new Set(validos.map(etiquetaPeriodoAbierto));
  return {
    etiqueta: etiquetaPeriodoAbierto(masReciente),
    variaPorModulo: etiquetas.size > 1,
    detalle: validos
      .map((d) => ({ modulo: MODULES[d.modulo]?.label || d.modulo, etiqueta: etiquetaPeriodoAbierto(d) }))
      .sort((a, b) => a.modulo.localeCompare(b.modulo, 'es')),
  };
};
