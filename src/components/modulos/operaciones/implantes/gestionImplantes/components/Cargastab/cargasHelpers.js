export const formatearFechaTabla = (fechaString) => {
  if (!fechaString || !fechaString.includes('-')) return fechaString || '-';
  const [yyyy, mm, dd] = fechaString.split('-');
  return `${dd}-${mm}-${yyyy}`;
};

export const calcularEmpresaNoCoincide = (item, bloqueEmpresa) => {
  if (item.sinCodigo) return false;
  if (item.padPadreId) return false; // los ítems de contenido de un PAD no llevan validación de empresa
  if (!item.empresaVinculada || !bloqueEmpresa) return false;
  return item.empresaVinculada.trim().toUpperCase() !== bloqueEmpresa.trim().toUpperCase();
};

export const buscarRangoRecargo = (precio, recargosActivos) => {
  const p = Number(precio) || 0;
  return recargosActivos.find(r => p >= Number(r.desde) && p <= Number(r.hasta)) || null;
};

export const calcularVentaUnitaria = (precio, vecesCosto) => {
  const p = Number(precio) || 0;
  const v = Number(vecesCosto) || 1;
  return p * v;
};

export const calcularCamposFinancieros = (precio, cantidad, recargosActivos) => {
  const rango = buscarRangoRecargo(precio, recargosActivos);
  const vecesCosto = rango ? Number(rango.vecesCosto) : 1;
  const cantidadNum = Number(cantidad) || 0;
  const venta = calcularVentaUnitaria(precio, vecesCosto) * cantidadNum;
  const totalItem = (Number(precio) || 0) * cantidadNum;

  return { vecesCosto, recargoEncontrado: !!rango, venta, totalItem };
};

export const ESTADO_CARGA_OPTIONS = ['PENDIENTE', 'CARGADO', 'REVISAR', 'S/COTIZACION'];

const ESTADO_CARGA_STYLES = {
  PENDIENTE: { text: 'text-orange-700 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-950/30', border: 'border-orange-300 dark:border-orange-800' },
  CARGADO: { text: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-300 dark:border-emerald-800' },
  REVISAR: { text: 'text-sky-700 dark:text-sky-400', bg: 'bg-sky-50 dark:bg-sky-950/30', border: 'border-sky-300 dark:border-sky-800' },
  'S/COTIZACION': { text: 'text-purple-700 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-950/30', border: 'border-purple-300 dark:border-purple-800' },
  PAD: { text: 'text-fuchsia-700 dark:text-fuchsia-400', bg: 'bg-fuchsia-50 dark:bg-fuchsia-950/30', border: 'border-fuchsia-300 dark:border-fuchsia-800' }
};

export const getEstadoCargaStyle = (estado) => ESTADO_CARGA_STYLES[estado] || ESTADO_CARGA_STYLES.PENDIENTE;

// --- Reglas de PAD ---
export const CLASE_PAD = 'PAD';
export const CODIGO_SIN_OC = 'No lleva OC';
export const VALOR_LOTE_VENCIMIENTO_PAD = 'PAD';

export const esClasePad = (clase) => (clase || '').trim().toUpperCase() === CLASE_PAD;

// Considera "completo" tanto CARGADO como PAD (para indicadores generales
// que agrupan el estado de carga de una cotización/ítem).
export const esEstadoCargaCompleto = (estado) => estado === 'CARGADO' || estado === 'PAD';

// El contenido de un PAD es OPCIONAL al momento de crear el ítem: puede
// completarse después, en otra sesión. Esta función determina si un ítem
// PAD "padre" ya tiene al menos un ítem de contenido asociado.
export const tieneContenidoPad = (items, padPadreId) =>
  (items || []).some(it => it.padPadreId === padPadreId);