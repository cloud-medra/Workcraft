// Elementos `col_<key>` de una sección de tabla a partir de [key, etiqueta].
// La key es la misma `key` de la lista de columnas del componente (ver
// useColumnasPermitidas): así pantalla y mapa no se desincronizan.
export const columnas = (lista) =>
  Object.fromEntries(lista.map(([key, etiqueta]) => [`col_${key}`, { label: `Columna: ${etiqueta}` }]));
