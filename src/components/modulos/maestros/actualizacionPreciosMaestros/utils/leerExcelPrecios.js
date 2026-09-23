import * as XLSX from 'xlsx';
import { NOMBRE_HOJA } from './formatoPrecios';

// Devuelve las filas (arreglos de celdas, encabezado incluido) de la hoja
// "Precios", o de la primera hoja si el usuario la renombró. Las celdas
// numéricas llegan como número (raw), las vacías como ''.
export const leerFilasExcel = (libro) => {
  const nombreHoja = libro.SheetNames.includes(NOMBRE_HOJA) ? NOMBRE_HOJA : libro.SheetNames[0];
  const hoja = nombreHoja ? libro.Sheets[nombreHoja] : null;
  if (!hoja) return [];
  return XLSX.utils.sheet_to_json(hoja, { header: 1, defval: '', raw: true, blankrows: false });
};

export const leerArchivoExcelPrecios = async (archivo) => {
  const datos = await archivo.arrayBuffer();
  return leerFilasExcel(XLSX.read(datos, { type: 'array' }));
};
