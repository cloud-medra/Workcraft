// Ajuste automático del ancho de una columna (doble clic en ManijaRedimension).

// Tope del ajuste automático: una celda con un texto muy largo no debe dejar
// la columna más ancha que la pantalla.
const ANCHO_MAXIMO_AJUSTE = 600;

// Ancho natural del contenido de una celda: se mide un clon del contenido,
// sin cortes, dentro de la misma celda (hereda la fuente) y oculto. Así
// sirve tanto para agrandar (texto cortado con "…") como para achicar.
// Más el padding y el borde de la celda.
const anchoContenidoCelda = (celda) => {
  const medidor = document.createElement('span');
  medidor.style.cssText = 'position:absolute;visibility:hidden;display:inline-block;white-space:nowrap;width:auto;max-width:none;left:0;top:0;pointer-events:none';
  celda.childNodes.forEach((nodo) => medidor.appendChild(nodo.cloneNode(true)));
  // Lo que dentro del clon recorta (truncate, max-w) se mide sin recortar.
  medidor.querySelectorAll('*').forEach((el) => { el.style.maxWidth = 'none'; el.style.overflow = 'visible'; });
  celda.appendChild(medidor);
  const contenido = medidor.getBoundingClientRect().width;
  medidor.remove();
  const estilo = getComputedStyle(celda);
  const extra = ['paddingLeft', 'paddingRight', 'borderLeftWidth', 'borderRightWidth']
    .reduce((suma, prop) => suma + (parseFloat(estilo[prop]) || 0), 0);
  return Math.ceil(contenido + extra);
};

// Doble clic en la manija: ancho = el contenido más largo de esa columna
// entre el encabezado y las filas visibles. Se saltan las filas con celdas
// combinadas (colSpan), como el mensaje de "sin registros".
export const medirAnchoContenidoColumna = (th, { anchoMin = 0, anchoMax = ANCHO_MAXIMO_AJUSTE } = {}) => {
  const tabla = th?.closest('table');
  if (!tabla) return null;
  const indice = th.cellIndex;
  const columnasEncabezado = th.parentElement.cells.length;
  let maximo = 0;
  for (const fila of tabla.rows) {
    if (fila.cells.length !== columnasEncabezado) continue;
    const celda = fila.cells[indice];
    if (celda) maximo = Math.max(maximo, anchoContenidoCelda(celda));
  }
  // + 8 px: espacio para la propia manija y para que el texto no quede justo.
  return Math.min(anchoMax, Math.max(anchoMin, maximo + 8));
};
