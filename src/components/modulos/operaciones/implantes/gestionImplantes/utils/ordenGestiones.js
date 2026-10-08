// Orden por defecto de la tabla de Gestión de Implantes (y de su Excel):
//   1. Fecha (la columna "Fecha" de la tabla, campo `fecha`): más reciente primero.
//   2. Nombre del paciente: A→Z.
//   3. Empresa: A→Z.
// Los textos se comparan sin distinguir mayúsculas ni tildes, y lo vacío
// (incluido el marcador 'P' que usa el módulo para "pendiente") va al final.
// Último desempate: la ruta del documento, para que el orden sea siempre el
// mismo entre recargas.

const COLLATOR = new Intl.Collator('es', { sensitivity: 'base', numeric: true });

const esVacio = (v) => {
  if (v === null || v === undefined) return true;
  const t = String(v).trim();
  return t === '' || t.toUpperCase() === 'P';
};

const valida = (anio, mes, dia) => {
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return null;
  const ms = Date.UTC(anio, mes - 1, dia);
  const d = new Date(ms);
  return d.getUTCFullYear() === anio && d.getUTCMonth() === mes - 1 && d.getUTCDate() === dia ? ms : null;
};

// Fecha real (milisegundos UTC del día) a partir de lo que se haya guardado
// en `fecha`. Lo normal es texto 'AAAA-MM-DD', pero la importación masiva
// guarda el valor tal como venía en el archivo, así que también se aceptan
// 'DD-MM-AAAA', 'DD/MM/AAAA', 'AAAA/MM/DD', número de serie de Excel,
// Date y Timestamp de Firestore. Devuelve null si no hay fecha válida.
export const fechaGestionEnMs = (valor) => {
  if (esVacio(valor)) return null;
  if (typeof valor?.toMillis === 'function') return valor.toMillis();
  if (valor instanceof Date) return Number.isNaN(valor.getTime()) ? null : valor.getTime();
  if (typeof valor === 'number') {
    // Serie de Excel (días desde 1899-12-30), rango razonable 1955–2119.
    return valor > 20000 && valor < 80000 ? Math.round((valor - 25569) * 86400000) : null;
  }
  const t = String(valor).trim();
  let m = t.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (m) return valida(+m[1], +m[2], +m[3]);
  m = t.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (m) return valida(+m[3], +m[2], +m[1]);
  if (/^\d+(\.\d+)?$/.test(t)) return fechaGestionEnMs(Number(t));
  return null;
};

const compararTexto = (a, b) => {
  const va = esVacio(a);
  const vb = esVacio(b);
  if (va || vb) return va === vb ? 0 : va ? 1 : -1;
  return COLLATOR.compare(String(a).trim(), String(b).trim());
};

export const compararGestiones = (a, b) => {
  const fa = fechaGestionEnMs(a.fecha);
  const fb = fechaGestionEnMs(b.fecha);
  if (fa !== fb) {
    if (fa === null) return 1;
    if (fb === null) return -1;
    return fb - fa;
  }
  return compararTexto(a.nombre, b.nombre)
    || compararTexto(a.empresa, b.empresa)
    || String(a.refPath || a.id || '').localeCompare(String(b.refPath || b.id || ''));
};

export const ordenarGestiones = (gestiones) => [...gestiones].sort(compararGestiones);
