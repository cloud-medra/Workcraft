import * as XLSX from 'xlsx';
import { normalizarTexto } from './formatoPrecios';

// Excel simple (sin estilos) con el detalle de las filas con error, para
// corregirlas fuera de la pantalla cuando son muchas.
export const descargarDetalleErrores = ({ errores, empresa, archivo }) => {
  const filas = errores.map(e => ({ Fila: e.fila, Referencia: e.referencia || '', Motivo: e.motivo }));
  const hoja = XLSX.utils.json_to_sheet(filas, { header: ['Fila', 'Referencia', 'Motivo'] });
  hoja['!cols'] = [{ wch: 6 }, { wch: 26 }, { wch: 70 }];
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, 'Errores');
  const slug = normalizarTexto(empresa?.nombre).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'empresa';
  const base = String(archivo || '').replace(/\.xlsx$/i, '');
  XLSX.writeFile(libro, `errores_importacion_precios_${slug}${base ? `_${base}` : ''}.xlsx`);
};
