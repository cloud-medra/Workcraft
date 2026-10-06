import {
  CENTRO_FIJO,
  ESTADO_FIJO,
  mapearDatosVinculados,
  mapearItemMaestro,
  validarRegistroConsignacion
} from '../../utils/registroConsignacionService';
import { CLAVES_INGRESO, filaEstaVacia } from './grillaPortapapeles';

// =====================================================================
// Parseo de datos pegados desde Excel y evaluación de cada fila contra
// ReportesInfo (Datos Vinculados por Admisión) y maestros_codigos (por
// Código interno), con el mismo mapeo y validación que Registro.
// =====================================================================

export const ESTADOS_FILA = {
  OK: 'OK',
  ADMISION_NO_ENCONTRADA: 'ADMISION_NO_ENCONTRADA',
  CODIGO_NO_ENCONTRADO: 'CODIGO_NO_ENCONTRADO',
  DATO_INVALIDO: 'DATO_INVALIDO'
};

export const ETIQUETAS_ESTADO = {
  OK: 'OK',
  ADMISION_NO_ENCONTRADA: 'Admisión no encontrada',
  CODIGO_NO_ENCONTRADO: 'Código no encontrado',
  DATO_INVALIDO: 'Dato inválido'
};

// "Admisión no encontrada" es solo advertencia: igual que en Registro, se
// guarda con los Datos Vinculados pendientes.
export const esEstadoGuardable = (estado) =>
  estado === ESTADOS_FILA.OK || estado === ESTADOS_FILA.ADMISION_NO_ENCONTRADA;

// Rango aceptado para la fecha de cirugía: evita que un número suelto
// ("15") se interprete como un número de serie de 1900.
const ANIO_MIN = 2000;
const ANIO_MAX = 2099;

// Día 0 del sistema de fechas 1900 de Excel (incluye el desfase del
// 29-02-1900 inexistente, irrelevante en el rango aceptado).
const EPOCA_EXCEL_UTC = Date.UTC(1899, 11, 30);
const MS_POR_DIA = 86400000;

const dosDigitos = (n) => String(n).padStart(2, '0');

const formatearISO = (anio, mes, dia) => {
  if (anio < ANIO_MIN || anio > ANIO_MAX) return null;
  if (mes < 1 || mes > 12 || dia < 1) return null;
  const d = new Date(Date.UTC(anio, mes - 1, dia));
  if (d.getUTCFullYear() !== anio || d.getUTCMonth() !== mes - 1 || d.getUTCDate() !== dia) return null;
  return `${anio}-${dosDigitos(mes)}-${dosDigitos(dia)}`;
};

// Fecha de Excel -> 'YYYY-MM-DD' (formato que guarda Registro) o null.
// Acepta dd-mm-aaaa, dd/mm/aaaa, dd.mm.aaaa (año de 2 o 4 dígitos, con
// hora opcional), aaaa-mm-dd y el número de serie de fecha de Excel.
export const parsearFechaExcel = (valor) => {
  const t = String(valor ?? '').trim();
  if (!t) return null;

  if (/^\d+(\.\d+)?$/.test(t)) {
    const serial = Math.floor(Number(t));
    const d = new Date(EPOCA_EXCEL_UTC + serial * MS_POR_DIA);
    return formatearISO(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
  }

  const sinHora = t.replace(/\s+\d{1,2}:\d{2}(:\d{2})?$/, '');

  let m = sinHora.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4}|\d{2})$/);
  if (m) {
    const anio = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
    return formatearISO(anio, Number(m[2]), Number(m[1]));
  }

  m = sinHora.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (m) return formatearISO(Number(m[1]), Number(m[2]), Number(m[3]));

  return null;
};

// Cantidad: solo enteros mayores a 0. Devuelve el número o null.
export const parsearCantidad = (valor) => {
  const t = String(valor ?? '').trim();
  if (!/^\d+$/.test(t)) return null;
  const n = Number(t);
  return n > 0 && Number.isSafeInteger(n) ? n : null;
};

export const normalizarCodigoInterno = (valor) => String(valor ?? '').trim().toUpperCase();

export const normalizarAdmision = (valor) => String(valor ?? '').trim();

const normalizarTexto = (valor) =>
  String(valor ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();

// Validación de formato de los valores ingresados (sin consultar nada).
// Devuelve { errores: { columna: mensaje }, fecha, cantidad }.
export const validarFormatoFila = (valores) => {
  const errores = {};

  const admision = normalizarAdmision(valores.admision);
  if (admision && !/^\d+$/.test(admision)) errores.admision = `Admisión "${admision}" debe ser numérica`;

  const fechaTexto = String(valores.fecha ?? '').trim();
  const fecha = parsearFechaExcel(fechaTexto);
  if (!fechaTexto) errores.fecha = 'Fecha cirugía obligatoria';
  else if (!fecha) errores.fecha = `Fecha cirugía inválida: "${fechaTexto}"`;

  if (!normalizarCodigoInterno(valores.codigo)) errores.codigo = 'Código interno obligatorio';

  const cantidadTexto = String(valores.cantidad ?? '').trim();
  const cantidad = parsearCantidad(cantidadTexto);
  if (!cantidadTexto) errores.cantidad = 'Cantidad obligatoria';
  else if (cantidad === null) errores.cantidad = `Cantidad inválida: "${cantidadTexto}" (entero mayor a 0)`;

  return { errores, fecha, cantidad };
};

// Índice código normalizado -> ítem del maestro (si un código se repite
// en el maestro, gana el primero).
export const indexarCodigos = (codigos) => {
  const indice = new Map();
  (codigos || []).forEach((item) => {
    const clave = normalizarCodigoInterno(item.codigo);
    if (clave && !indice.has(clave)) indice.set(clave, item);
  });
  return indice;
};

// Payload para guardar: la misma forma que arma el formulario de Registro.
// Paciente y Médico se toman de lo ingresado; si vienen vacíos se
// completan con Paciente/Cirujano de ReportesInfo.
export const construirPayloadFila = (valores, { fecha, cantidad, reporte, item, tipo }) => ({
  gestionId: normalizarAdmision(valores.admision),
  nombre: String(valores.paciente || reporte?.['Paciente'] || '').trim().toUpperCase(),
  medico: String(valores.medico || reporte?.['Cirujano'] || '').trim(),
  fecha,
  cantidad: String(cantidad),
  delivery: String(valores.delivery ?? '').trim(),
  ...mapearItemMaestro(item),
  ...mapearDatosVinculados(reporte),
  tipo,
  atributo: tipo,
  centro: CENTRO_FIJO,
  estado: ESTADO_FIJO
});

// Evalúa una fila con los datos ya consultados.
// `reporte`: registro de ReportesInfo (null si no se encontró).
// `item`: ítem del maestro (undefined si no se encontró).
// Devuelve { estado, detalle, celdasError, celdasAdvertencia, payload, vinculados }.
export const evaluarFila = (valores, { reporte, item, tipo }) => {
  const { errores, fecha, cantidad } = validarFormatoFila(valores);
  const celdasError = { ...errores };
  const celdasAdvertencia = {};

  const codigo = normalizarCodigoInterno(valores.codigo);
  const codigoNoEncontrado = !!codigo && !item;
  if (codigoNoEncontrado) celdasError.codigo = `Código "${codigo}" no encontrado en el maestro (${tipo})`;

  if (item) {
    const proveedor = normalizarTexto(valores.proveedor);
    if (proveedor && proveedor !== normalizarTexto(item.empresa)) {
      celdasError.proveedor = `Proveedor "${String(valores.proveedor).trim()}" no coincide con el del maestro "${item.empresa || 'sin empresa'}"`;
    }
  }

  const admision = normalizarAdmision(valores.admision);
  if (!errores.admision && !reporte) {
    celdasAdvertencia.admision = admision
      ? `Admisión ${admision} no encontrada en Reportes Info`
      : 'Sin Admisión: Datos Vinculados pendientes';
  }

  let payload = null;
  if (Object.keys(celdasError).length === 0) {
    payload = construirPayloadFila(valores, { fecha, cantidad, reporte, item, tipo });
    // Mismas validaciones que el formulario de Registro.
    const errRegistro = validarRegistroConsignacion(payload);
    if (errRegistro.referencia) celdasError.codigo = 'El código no tiene referencia en el maestro';
    if (errRegistro.fecha) celdasError.fecha = 'Fecha cirugía obligatoria';
    if (errRegistro.cantidad) celdasError.cantidad = 'Cantidad inválida';
    if (Object.keys(errRegistro).length > 0) payload = null;
  }

  const soloCodigoNoEncontrado = codigoNoEncontrado && Object.keys(celdasError).length === 1;
  let estado = ESTADOS_FILA.OK;
  if (soloCodigoNoEncontrado) estado = ESTADOS_FILA.CODIGO_NO_ENCONTRADO;
  else if (Object.keys(celdasError).length > 0) estado = ESTADOS_FILA.DATO_INVALIDO;
  else if (Object.keys(celdasAdvertencia).length > 0) estado = ESTADOS_FILA.ADMISION_NO_ENCONTRADA;

  const detalle = [
    ...CLAVES_INGRESO.filter((k) => celdasError[k]).map((k) => celdasError[k]),
    ...CLAVES_INGRESO.filter((k) => celdasAdvertencia[k]).map((k) => celdasAdvertencia[k])
  ].join(' · ');

  const vinculados = {
    ...(item ? mapearItemMaestro(item) : {}),
    ...(reporte ? mapearDatosVinculados(reporte) : {}),
    atributo: item ? tipo : '',
    pacienteReporte: reporte?.['Paciente'] || '',
    cirujanoReporte: reporte?.['Cirujano'] || ''
  };

  return { estado, detalle, celdasError, celdasAdvertencia, payload, vinculados };
};

// Ejecuta `fn` sobre cada elemento con como máximo `limite` en paralelo.
const ejecutarConLimite = async (elementos, limite, fn) => {
  let siguiente = 0;
  const trabajadores = Array.from({ length: Math.min(limite, elementos.length) }, async () => {
    while (siguiente < elementos.length) {
      const elemento = elementos[siguiente++];
      await fn(elemento);
    }
  });
  await Promise.all(trabajadores);
};

// "Cargar": consulta el maestro una vez y cada Admisión distinta una sola
// vez, y evalúa todas las filas no vacías. Las dependencias se inyectan
// para poder testearlo sin Firestore.
// Devuelve un Map idFila -> resultado.
export const resolverFilas = async (filas, { tipo, obtenerCodigos, buscarReporte, concurrencia = 8 }) => {
  const conDatos = filas.filter((f) => !filaEstaVacia(f));

  const indiceCodigos = indexarCodigos(await obtenerCodigos(tipo));

  const admisiones = [...new Set(
    conDatos
      .map((f) => normalizarAdmision(f.valores.admision))
      .filter((a) => /^\d+$/.test(a))
  )];

  const reportes = new Map();
  await ejecutarConLimite(admisiones, concurrencia, async (admision) => {
    try {
      reportes.set(admision, (await buscarReporte(admision)) || null);
    } catch (error) {
      console.error('Error buscando Admisión en Reportes Info:', admision, error);
      reportes.set(admision, null);
    }
  });

  const resultados = new Map();
  conDatos.forEach((f) => {
    const admision = normalizarAdmision(f.valores.admision);
    resultados.set(f.id, evaluarFila(f.valores, {
      tipo,
      reporte: reportes.get(admision) || null,
      item: indiceCodigos.get(normalizarCodigoInterno(f.valores.codigo))
    }));
  });

  return resultados;
};

// Conteo para el resumen superior.
export const resumirFilas = (filas) => {
  const resumen = { ok: 0, advertencias: 0, errores: 0, sinCargar: 0, guardables: 0 };
  filas.forEach((f) => {
    if (filaEstaVacia(f)) return;
    if (!f.resultado) {
      resumen.sinCargar += 1;
      return;
    }
    if (f.resultado.estado === ESTADOS_FILA.OK) resumen.ok += 1;
    else if (f.resultado.estado === ESTADOS_FILA.ADMISION_NO_ENCONTRADA) resumen.advertencias += 1;
    else resumen.errores += 1;
  });
  resumen.guardables = resumen.ok + resumen.advertencias;
  return resumen;
};

export const mensajeConfirmacionGuardado = ({ guardables, errores, sinCargar }) => {
  const partes = [`Se guardarán ${guardables} registro${guardables === 1 ? '' : 's'}.`];
  if (errores > 0) {
    partes.push(errores === 1
      ? 'La fila con errores no se guardará.'
      : `Las ${errores} filas con errores no se guardarán.`);
  }
  if (sinCargar > 0) {
    partes.push(sinCargar === 1
      ? 'La fila sin cargar (editada después de "Cargar") no se guardará.'
      : `Las ${sinCargar} filas sin cargar (editadas después de "Cargar") no se guardarán.`);
  }
  return partes.join(' ');
};
