// Obtiene la hoja de cálculo de un archivo subido, sea cual sea su formato
// real. Muchos sistemas exportan un ".xls" que en realidad es una tabla HTML.
// Excel la abre bien, pero SheetJS descarta las celdas vacías escritas como
// <td/> (autocerradas) y corre el resto de la fila una columna a la
// izquierda (ej. el PROVEEDOR terminaba bajo FECHA_CX). Por eso el HTML se
// lee con el parser HTML del navegador —que, igual que Excel, trata <td/>
// como una celda vacía— respetando colspan/rowspan, y recién después se
// arma la hoja.
import * as XLSX from 'xlsx';

export const detectarFormato = (bytes) => {
  const b = new Uint8Array(bytes.slice(0, 4));
  if (b[0] === 0x50 && b[1] === 0x4b) return 'xlsx';
  if (b[0] === 0xd0 && b[1] === 0xcf && b[2] === 0x11 && b[3] === 0xe0) return 'xls';
  const inicio = new TextDecoder('utf-8').decode(bytes.slice(0, 65536)).replace(/^\uFEFF/, '').trimStart().toLowerCase();
  if (inicio.startsWith('<?xml') && inicio.includes('urn:schemas-microsoft-com:office:spreadsheet')) return 'xml2003';
  if (inicio.startsWith('<') && /<(table|html)[\s>]/.test(inicio)) return 'html';
  return 'texto';
};

// UTF-8 si es válido; si no, Windows-1252 (habitual en exports antiguos).
const decodificarTexto = (bytes) => {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder('windows-1252').decode(bytes);
  }
};

// <table> -> matriz de textos, con la posición real de cada celda.
export const tablaHtmlAMatriz = (tabla) => {
  const matriz = [];
  // ocupadas[r][c] = texto heredado de un rowspan de arriba. En un export de
  // datos, una celda combinada en vertical significa "mismo valor para estas
  // filas" (ej. la admisión de varios ítems), así que se repite hacia abajo.
  const ocupadas = [];
  Array.from(tabla.rows).forEach((tr, r) => {
    const fila = matriz[r] || (matriz[r] = []);
    let c = 0;
    const saltarOcupadas = () => {
      while (ocupadas[r]?.[c] !== undefined) { fila[c] = ocupadas[r][c]; c++; }
    };
    Array.from(tr.cells).forEach((td) => {
      saltarOcupadas();
      const texto = td.textContent.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
      const colspan = Math.max(1, Number(td.getAttribute('colspan')) || 1);
      const rowspan = Math.max(1, Number(td.getAttribute('rowspan')) || 1);
      fila[c] = texto;
      for (let dc = 0; dc < colspan; dc++) {
        if (dc > 0) fila[c + dc] = '';
        for (let dr = 1; dr < rowspan; dr++) {
          (ocupadas[r + dr] || (ocupadas[r + dr] = []))[c + dc] = dc === 0 ? texto : '';
        }
      }
      c += colspan;
    });
    saltarOcupadas(); // rowspan de arriba al final de la fila
  });
  return matriz.map(f => Array.from(f, v => v ?? ''));
};

const hojaDesdeHtml = (bytes) => {
  const doc = new DOMParser().parseFromString(decodificarTexto(bytes), 'text/html');
  const tablas = Array.from(doc.querySelectorAll('table'));
  if (tablas.length === 0) throw new Error('El archivo es HTML pero no contiene ninguna tabla.');
  // La tabla con más filas es la de datos (los exports a veces traen una
  // tabla chica de título arriba).
  const tabla = tablas.reduce((a, b) => (b.rows.length > a.rows.length ? b : a));
  return XLSX.utils.aoa_to_sheet(tablaHtmlAMatriz(tabla));
};

// Devuelve { hoja, nombreHoja, formato }.
export const obtenerHojaDesdeArchivo = (data) => {
  const formato = detectarFormato(data);
  if (formato === 'html') return { hoja: hojaDesdeHtml(data), nombreHoja: '(tabla HTML)', formato };
  const workbook = XLSX.read(data, { type: 'array', cellDates: true });
  const nombreHoja = workbook.SheetNames.includes('planilla') ? 'planilla' : workbook.SheetNames[0];
  return { hoja: workbook.Sheets[nombreHoja], nombreHoja, formato };
};
