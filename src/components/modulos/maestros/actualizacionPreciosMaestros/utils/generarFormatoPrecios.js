// Genera el Excel "formato" de actualización de precios de una empresa con
// exceljs (la librería xlsx del proyecto no escribe estilos ni protección
// por celda). La lectura del archivo importado sigue usando xlsx.
//
// - Todas las columnas quedan bloqueadas, salvo "Nuevo precio" (resaltada).
// - La hoja se protege sin contraseña: evita ediciones accidentales, no es
//   un control de seguridad (la importación valida todo de nuevo).
// - "Nuevo precio" tiene validación de datos: número decimal mayor que 0.

import { COLUMNAS, NOMBRE_HOJA, indiceColumna, normalizarTexto, precioActualDe, descripcionDe } from './formatoPrecios';

const FORMATO_PRECIO = '"$" #,##0';
const COLOR_ENCABEZADO = 'FF2383C2';
const COLOR_SOLO_LECTURA = 'FFF1F5F9';
const COLOR_EDITABLE = 'FFFEF9C3';
const COLOR_ENCABEZADO_EDITABLE = 'FFCA8A04';

const relleno = (argb) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });

const fechaArchivo = (fecha = new Date()) => {
  const p = (n) => String(n).padStart(2, '0');
  return `${fecha.getFullYear()}-${p(fecha.getMonth() + 1)}-${p(fecha.getDate())}`;
};

export const nombreArchivoFormato = (nombreEmpresa, fecha = new Date()) => {
  const slug = normalizarTexto(nombreEmpresa).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'empresa';
  return `actualizacion_precios_${slug}_${fechaArchivo(fecha)}.xlsx`;
};

const ordenarPorReferencia = (a, b) =>
  String(a.referencia || '').localeCompare(String(b.referencia || ''), 'es', { numeric: true });

export const construirLibroFormato = async ({ empresa, codigos }) => {
  const { default: ExcelJS } = await import('exceljs');
  const libro = new ExcelJS.Workbook();
  libro.created = new Date();

  const hoja = libro.addWorksheet(NOMBRE_HOJA, { views: [{ state: 'frozen', ySplit: 1 }] });
  hoja.columns = COLUMNAS.map(c => ({ header: c.titulo, key: c.key, width: c.ancho }));

  [...codigos].sort(ordenarPorReferencia).forEach(codigo => {
    hoja.addRow({
      empresa: empresa.nombre,
      id: codigo.id,
      codigo: codigo.codigo || '',
      referencia: codigo.referencia || '',
      descripcion: descripcionDe(codigo),
      precioActual: precioActualDe(codigo),
      nuevoPrecio: null
    });
  });

  const colPrecioActual = indiceColumna('precioActual') + 1;
  const colNuevoPrecio = indiceColumna('nuevoPrecio') + 1;

  hoja.getRow(1).eachCell((celda, col) => {
    celda.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    celda.fill = relleno(col === colNuevoPrecio ? COLOR_ENCABEZADO_EDITABLE : COLOR_ENCABEZADO);
    celda.alignment = { vertical: 'middle' };
  });
  hoja.getCell(1, colNuevoPrecio).note = 'Única columna editable. Deje la celda vacía para no modificar el precio.';

  for (let r = 2; r <= hoja.rowCount; r++) {
    const fila = hoja.getRow(r);
    for (let c = 1; c <= COLUMNAS.length; c++) {
      const celda = fila.getCell(c);
      if (c === colNuevoPrecio) {
        celda.fill = relleno(COLOR_EDITABLE);
        celda.numFmt = FORMATO_PRECIO;
        celda.protection = { locked: false };
        celda.dataValidation = {
          type: 'decimal',
          operator: 'greaterThan',
          formulae: [0],
          allowBlank: true,
          showErrorMessage: true,
          errorStyle: 'stop',
          errorTitle: 'Precio inválido',
          error: 'El nuevo precio debe ser un número mayor que 0.'
        };
      } else {
        celda.fill = relleno(COLOR_SOLO_LECTURA);
        if (c === colPrecioActual) celda.numFmt = FORMATO_PRECIO;
      }
    }
  }

  await hoja.protect('', {
    selectLockedCells: true,
    selectUnlockedCells: true,
    formatColumns: true,
    autoFilter: true
  });
  hoja.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: COLUMNAS.length } };

  return libro;
};

export const descargarFormatoPrecios = async ({ empresa, codigos }) => {
  const libro = await construirLibroFormato({ empresa, codigos });
  const buffer = await libro.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombreArchivoFormato(empresa.nombre);
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  URL.revokeObjectURL(url);
};
