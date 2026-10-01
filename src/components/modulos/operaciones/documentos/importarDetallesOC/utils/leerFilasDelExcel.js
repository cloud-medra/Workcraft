// Lectura del Excel de "Detalles OC" (sin Firebase: corre también dentro
// del Web Worker de la importación, ver importarDetallesOC.worker.js).
import * as XLSX from 'xlsx';
import { normalizarFilaDetalleOC, validarFilaDetalleOC, mapearEncabezados } from './parsearFilaDetalleOC';
import { obtenerHojaDesdeArchivo } from './leerHojaArchivo';
import { asignarIdsFilas } from './idFilaDetalleOC';

// Busca la fila de encabezados en las primeras 10 filas (por si la planilla
// trae títulos arriba): la primera con todas las columnas obligatorias, o
// la que tenga menos faltantes.
const buscarEncabezados = (hoja, rango) => {
  let mejor = null;
  const ultima = Math.min(rango.e.r, rango.s.r + 9);
  for (let r = rango.s.r; r <= ultima; r++) {
    const encabezados = [];
    for (let c = rango.s.c; c <= rango.e.c; c++) {
      const celda = hoja[XLSX.utils.encode_cell({ r, c })];
      encabezados.push(celda ? String(celda.w ?? celda.v ?? '').trim() : '');
    }
    const { mapa, faltantes } = mapearEncabezados(encabezados.filter(Boolean));
    if (!mejor || faltantes.length < mejor.faltantes.length) mejor = { fila: r, encabezados, mapa, faltantes };
    if (faltantes.length === 0) break;
  }
  return mejor;
};

// Columnas de texto en las que, si la celda es numérica, se usa el texto
// que muestra Excel: así un código con formato "00123" no pierde los ceros.
const COLUMNAS_TEXTO_VISIBLE = new Set(['CODIGO', 'LOTE']);

// Lee la hoja celda por celda y devuelve:
//   filas:     filas normalizadas y válidas (se pueden guardar)
//   invalidas: [{ id, filaExcel, error }] con el motivo de cada descarte
//   encabezados / mapa / tieneColumnaOC: para diagnóstico
// Lanza un error (sin escribir nada) si faltan columnas obligatorias.
export const leerFilasDeBuffer = (data) => {
  const { hoja, nombreHoja, formato } = obtenerHojaDesdeArchivo(data);
  if (!hoja || !hoja['!ref']) throw new Error(`La hoja "${nombreHoja}" está vacía.`);
  const rango = XLSX.utils.decode_range(hoja['!ref']);

  const cabecera = buscarEncabezados(hoja, rango);
  if (cabecera.faltantes.length > 0) {
    throw new Error(
      `Faltan columnas obligatorias: ${cabecera.faltantes.join(', ')}. ` +
      `Encabezados encontrados en la hoja "${nombreHoja}": ${cabecera.encabezados.filter(Boolean).join(' | ') || '(ninguno)'}`
    );
  }

  const indicePorColumna = {};
  Object.entries(cabecera.mapa).forEach(([canonica, original]) => {
    indicePorColumna[canonica] = rango.s.c + cabecera.encabezados.indexOf(original);
  });

  // Diagnóstico: la primera fila de datos con la dirección real de cada
  // celda, para ver de inmediato si los valores calzan con sus encabezados.
  const primeraFila = {};
  Object.entries(indicePorColumna).forEach(([canonica, c]) => {
    const direccion = XLSX.utils.encode_cell({ r: cabecera.fila + 1, c });
    primeraFila[canonica] = `${direccion}: ${hoja[direccion] ? String(hoja[direccion].w ?? hoja[direccion].v) : '(vacía)'}`;
  });

  const filas = [];
  const invalidas = [];
  for (let r = cabecera.fila + 1; r <= rango.e.r; r++) {
    const cruda = {};
    let vacia = true;
    Object.entries(indicePorColumna).forEach(([canonica, c]) => {
      const celda = hoja[XLSX.utils.encode_cell({ r, c })];
      if (!celda) return;
      vacia = false;
      cruda[canonica] = (COLUMNAS_TEXTO_VISIBLE.has(canonica) && typeof celda.v === 'number' && celda.w)
        ? celda.w
        : celda.v;
    });
    if (vacia) continue;

    const filaExcel = r + 1; // número de fila tal como lo muestra Excel
    const normalizada = normalizarFilaDetalleOC(cruda, XLSX);
    const motivos = validarFilaDetalleOC(normalizada, cruda);
    if (motivos.length > 0) {
      invalidas.push({ id: normalizada.id, filaExcel, error: motivos.join('; ') });
      continue;
    }
    filas.push({ ...normalizada, _filaExcel: filaExcel });
  }

  return {
    filas: asignarIdsFilas(filas),
    invalidas,
    hoja: nombreHoja,
    formato,
    primeraFila,
    encabezados: cabecera.encabezados.filter(Boolean),
    mapa: cabecera.mapa,
    tieneColumnaOC: Boolean(cabecera.mapa.OC)
  };
};

export const leerFilasDelExcel = async (file) => leerFilasDeBuffer(await file.arrayBuffer());
