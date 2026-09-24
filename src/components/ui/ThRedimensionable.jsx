import { ManijaRedimension } from './ManijaRedimension';

// Encabezado de tabla con manija para redimensionar la columna. Pensado para
// usarse junto a useColumnResize(COLUMNAS) y un <colgroup> con los anchos:
//
//   <ThRedimensionable col={COLUMNAS[0]} anchos={anchos} onResize={handleResize}>Código</ThRedimensionable>
export const ThRedimensionable = ({ col, anchos, onResize, className = '', children, ...rest }) => (
  <th className={`relative overflow-hidden ${className}`} {...rest}>
    <span className="block truncate">{children}</span>
    <ManijaRedimension
      colKey={col.key}
      anchoActual={anchos[col.key] ?? col.ancho}
      anchoMin={col.min}
      onResize={onResize}
    />
  </th>
);

// <colgroup> que aplica los anchos actuales de cada columna.
export const ColgroupRedimensionable = ({ columnas, anchos }) => (
  <colgroup>
    {columnas.map(col => (
      <col key={col.key} style={{ width: anchos[col.key] ?? col.ancho }} />
    ))}
  </colgroup>
);
