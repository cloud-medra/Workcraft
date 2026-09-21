export const formatearFechaTabla = (fechaString) => {
  if (!fechaString || !fechaString.includes('-')) return fechaString || '-';
  const [yyyy, mm, dd] = fechaString.split('-');
  return `${dd}-${mm}-${yyyy}`;
};

export const calcularEmpresaNoCoincide = (item, bloqueEmpresa) => {
  if (item.sinCodigo) return false;
  if (item.padPadreId) return false; // los ítems de contenido de un PAD no llevan validación de empresa
  if (item.lotePadreId) return false; // las entradas de lote adicional heredan la empresa de su referencia principal
  if (!item.empresaVinculada || !bloqueEmpresa) return false;
  return item.empresaVinculada.trim().toUpperCase() !== bloqueEmpresa.trim().toUpperCase();
};

// Hemodinamia NO usa la tabla de Recargos Maestros: el recargo es un % fijo y el
// precio ingresado representa (1 - %) de la venta, por lo que se hace un
// "gross-up" al 100%: venta = precio / (1 - %). Ej: 50.370 / 0.73 = 69.000.
export const PORCENTAJE_RECARGO_HEMODINAMIA = 0.27;

export const calcularVentaUnitaria = (precio, porcentajeRecargo = PORCENTAJE_RECARGO_HEMODINAMIA) => {
  const p = Number(precio) || 0;
  return Math.round(p / (1 - porcentajeRecargo));
};

export const calcularCamposFinancieros = (precio, cantidad, porcentajeRecargo = PORCENTAJE_RECARGO_HEMODINAMIA) => {
  const cantidadNum = Number(cantidad) || 0;
  const venta = calcularVentaUnitaria(precio, porcentajeRecargo) * cantidadNum;
  const totalItem = (Number(precio) || 0) * cantidadNum;

  // vecesCosto (multiplicador equivalente) y recargoEncontrado se conservan para
  // no romper el shape de los ítems ya guardados ni la tabla.
  return { vecesCosto: 1 / (1 - porcentajeRecargo), recargoEncontrado: true, venta, totalItem };
};

// En maestros_codigos el "centro/unidad" de un código es el campo `segmento`
// (string en MAYÚSCULAS, ver Códigos Maestros). Hemodinamia solo ve HEMODINAMIA.
export const SEGMENTO_HEMODINAMIA = 'HEMODINAMIA';

export const esCodigoDeHemodinamia = (item) =>
  (item?.segmento || '').trim().toUpperCase() === SEGMENTO_HEMODINAMIA;

// Mayúsculas y sin tildes, para comparar texto de búsqueda.
export const normalizarTextoBusqueda = (texto) =>
  (texto || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();

// Busca por referencia, código o descripción (Desc. Auto). Siempre acota a HEMODINAMIA.
export const buscarCodigosHemodinamia = (items, texto, limite = 8) => {
  const q = normalizarTextoBusqueda(texto);
  if (q.length < 2) return [];
  return (items || [])
    .filter(esCodigoDeHemodinamia)
    .filter(item =>
      normalizarTextoBusqueda(item.referencia).includes(q) ||
      normalizarTextoBusqueda(item.codigo).includes(q) ||
      normalizarTextoBusqueda(item.descriptorAuto).includes(q)
    )
    .sort((a, b) => {
      const refA = normalizarTextoBusqueda(a.referencia);
      const refB = normalizarTextoBusqueda(b.referencia);
      const empiezaA = refA.startsWith(q) ? 0 : 1;
      const empiezaB = refB.startsWith(q) ? 0 : 1;
      if (empiezaA !== empiezaB) return empiezaA - empiezaB;
      return refA.localeCompare(refB);
    })
    .slice(0, limite);
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

const ESTADO_CARGA_ROW_STYLES = {
  PENDIENTE: 'bg-amber-50/40 dark:bg-amber-950/10 hover:bg-amber-50/70 dark:hover:bg-amber-950/20',
  CARGADO: 'bg-emerald-50/40 dark:bg-emerald-950/10 hover:bg-emerald-50/70 dark:hover:bg-emerald-950/20',
  REVISAR: 'bg-orange-50/40 dark:bg-orange-950/10 hover:bg-orange-50/70 dark:hover:bg-orange-950/20',
  'S/COTIZACION': 'bg-purple-50/30 dark:bg-purple-950/10 hover:bg-purple-50/60 dark:hover:bg-purple-950/20'
};

export const getEstadoCargaRowStyle = (estado) => ESTADO_CARGA_ROW_STYLES[estado] || ESTADO_CARGA_ROW_STYLES.PENDIENTE;

// --- Reglas de PAD ---
export const CLASE_PAD = 'PAD';
export const CODIGO_SIN_OC = 'No lleva OC';
export const VALOR_LOTE_VENCIMIENTO_PAD = 'PAD';

export const esClasePad = (clase) => (clase || '').trim().toUpperCase() === CLASE_PAD;

export const esEstadoCargaCompleto = (estado) => estado === 'CARGADO' || estado === 'PAD';

export const tieneContenidoPad = (items, padPadreId) =>
  (items || []).some(it => it.padPadreId === padPadreId);

export const obtenerPeriodosDeItems = (items) => {
  const mapa = new Map();
  (items || []).forEach(it => {
    if (!it.periodoAnio || !it.periodoMes) return;
    const clave = `${it.periodoAnio}__${it.periodoMes}`;
    if (!mapa.has(clave)) mapa.set(clave, { anio: it.periodoAnio, mes: it.periodoMes });
  });
  return [...mapa.values()];
};
