// Reporte Info → detalle de la gestión en la URL: ?vista=<ruta de Reporte
// Info>&detalle=<admisión>&anio=&mes=. Permite volver con "atrás" del
// navegador y, al recargar, reabrir el mismo detalle (el Dashboard abre la
// vista con vistaInicialDesdeURL). La app no tiene router: solo se tocan
// estos parámetros con history.pushState / replaceState.
import { subItemsVisibles } from '../../../../../config/accesoMenu';

const PARAMS = ['vista', 'detalle', 'anio', 'mes'];
export const RUTAS_REPORTE_INFO = { '/documentos/reportesInfo': 'documentos', '/implantes/reportesInfo': 'implantes' };

export const leerURL = () => {
  const p = new URLSearchParams(window.location.search);
  return Object.fromEntries(PARAMS.map((k) => [k, p.get(k) || '']));
};

// URL actual con los parámetros dados (los demás de Reporte Info se quitan).
export const urlCon = (params = {}) => {
  const u = new URL(window.location.href);
  PARAMS.forEach((k) => u.searchParams.delete(k));
  Object.entries(params).forEach(([k, v]) => { if (v) u.searchParams.set(k, v); });
  return `${u.pathname}${u.search}${u.hash}`;
};

// Vista con la que arranca el Dashboard: la de Reporte Info del detalle en
// la URL, si el usuario la tiene; si no, null.
export const vistaInicialDesdeURL = (userData) => {
  if (typeof window === 'undefined') return null;
  const { vista, detalle } = leerURL();
  const modulo = RUTAS_REPORTE_INFO[vista];
  if (!modulo || !detalle || !userData) return null;
  return subItemsVisibles(userData, modulo).some((s) => s.path === vista) ? { modulo, vista } : null;
};
