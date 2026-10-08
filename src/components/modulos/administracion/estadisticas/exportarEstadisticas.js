// Exportar a Excel lo que se está viendo en Estadísticas (sin lecturas: sale
// de las filas ya calculadas en pantalla).
import * as XLSX from 'xlsx';
import { etiquetaPeriodo } from './estadisticasConfig';

const redondear = (v) => (v == null ? '' : Math.round(v * 10) / 10);

// Filas de una tabla comparada -> arreglo de objetos con encabezados legibles.
export const filasParaExcel = (filas, { singular, periodo, anterior }) => filas.map((f) => ({
  [singular]: f.nombre,
  [`Admisiones ${etiquetaPeriodo(periodo)}`]: f.actual,
  [`Admisiones ${etiquetaPeriodo(anterior)}`]: f.anterior,
  Diferencia: f.diferencia,
  'Variación %': redondear(f.variacion),
  '% del total': redondear(f.participacion),
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
