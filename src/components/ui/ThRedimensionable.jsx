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

// <colgroup> que aplica los anchos actuales de cada columna. Con `relleno`
// agrega al final una columna SIN ancho: con table-layout fixed, el espacio
// que sobra (tabla más angosta que su contenedor, por minWidth: '100%') va
// solo a esa columna, en vez de repartirse entre las demás. Así cada columna
// mide exactamente lo que dice `anchos`, el arrastre sigue al mouse y se
// respeta el mínimo. Cada fila debe terminar con <ThRelleno>/<TdRelleno>.
export const ColgroupRedimensionable = ({ columnas, anchos, relleno = false }) => (
  <colgroup>
    {columnas.map(col => (
      <col key={col.key} style={{ width: anchos[col.key] ?? col.ancho }} />
    ))}
    {relleno && <col />}
  </colgroup>
);

// Celdas de la columna de relleno (vacías, fuera del árbol de accesibilidad).
// `className` para el borde/fondo de la fila.
export const ThRelleno = ({ className = '' }) => <th aria-hidden="true" className={`p-0 ${className}`} />;
export const TdRelleno = ({ className = '' }) => <td aria-hidden="true" className={`p-0 ${className}`} />;
