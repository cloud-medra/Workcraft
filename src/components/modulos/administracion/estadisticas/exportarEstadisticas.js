// Exportar a Excel lo que se está viendo en Estadísticas (sin lecturas: sale
// de las filas ya calculadas en pantalla).
import * as XLSX from 'xlsx';
import { etiquetaPeriodo } from './estadisticasConfig';

const redondear = (v) => (v == null ? '' : Math.round(v * 10) / 10);

const pesos = (v) => (v == null ? '' : Math.round(v));

// Columnas de monto (solo con "Ver montos"; sin permiso no se exportan).
// Sin `anterior` (modo "Solo un mes") van solo las del período.
const columnasMonto = (f, { periodo, anterior }) => ({
  [`Monto ${etiquetaPeriodo(periodo)}`]: pesos(f.monto),
  ...(anterior ? {
    [`Monto ${etiquetaPeriodo(anterior)}`]: pesos(f.montoAnterior),
    'Diferencia de monto': pesos(f.montoDiferencia),
    'Variación % de monto': redondear(f.montoVariacion),
  } : {}),
});

// Columnas de comparación con el período anterior (si hay `anterior`).
const columnasComparacion = (f, unidad, anterior) => (anterior ? {
  [`${unidad} ${etiquetaPeriodo(anterior)}`]: f.anterior,
  Diferencia: f.diferencia,
  'Variación %': redondear(f.variacion),
} : {});

// Filas de una tabla comparada (médicos, cirugías, empresas o cruces) ->
// objetos con encabezados legibles. `unidad`: 'Admisiones' o 'Cantidad'.
// Sin `anterior` (modo "Solo un mes") no lleva columnas comparativas.
export const filasParaExcel = (filas, { singular, periodo, anterior, conMontos = false, unidad = 'Admisiones' }) => filas.map((f) => ({
  [singular]: f.nombre,
  [`${unidad} ${etiquetaPeriodo(periodo)}`]: f.actual,
  ...columnasComparacion(f, unidad, anterior),
  ...(f.participacion != null ? { '% del total': redondear(f.participacion) } : {}),
  ...(f.admisiones != null && unidad !== 'Admisiones' ? { Admisiones: f.admisiones } : {}),
  ...(conMontos ? columnasMonto(f, { periodo, anterior }) : {}),
}));

// Filas de códigos (pestaña Códigos o sección Códigos del detalle).
export const filasCodigosParaExcel = (filas, { periodo, anterior, conMontos = false }) => filas.map((f) => ({
  Código: f.codigo,
  Descripción: f.descripcion,
  [`Cantidad ${etiquetaPeriodo(periodo)}`]: f.actual,
  ...columnasComparacion(f, 'Cantidad', anterior),
  Admisiones: f.admisiones,
  ...(conMontos ? {
    'Precio unitario (promedio)': pesos(f.precio),
    'Precio mínimo': pesos(f.precioMin),
    'Precio máximo': pesos(f.precioMax),
    ...columnasMonto(f, { periodo, anterior }),
  } : {}),
}));

const hoja = (titulo, contexto, filas) => {
  const encabezado = [[titulo], [contexto], []];
  const ws = XLSX.utils.aoa_to_sheet(encabezado);
  XLSX.utils.sheet_add_json(ws, filas, { origin: 'A4' });
  const columnas = Object.keys(filas[0] || { a: '' });
  ws['!cols'] = columnas.map((c, i) => ({ wch: i === 0 ? 45 : Math.max(14, c.length + 2) }));
  return ws;
};

const nombreHoja = (t) => t.replace(/[\\/?*[\]:]/g, ' ').slice(0, 31);

// hojas: [{ titulo, filas }]; contexto: "Período: … · Módulo: …".
export const exportarEstadisticas = ({ archivo, contexto, hojas }) => {
  const libro = XLSX.utils.book_new();
  hojas.forEach(({ titulo, filas }) => XLSX.utils.book_append_sheet(libro, hoja(titulo, contexto, filas), nombreHoja(titulo)));
  XLSX.writeFile(libro, `${archivo}.xlsx`);
};
