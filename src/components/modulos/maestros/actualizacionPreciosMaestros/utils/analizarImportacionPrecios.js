// Clasifica cada fila del Excel importado en: actualizar, omitir o error.
// Es lógica pura (sin Firestore) para poder mostrar la vista previa y
// testearla; el guardado vuelve a verificar los precios en una transacción.
//
// Cada fila se identifica por la columna "ID interno" (id del documento en
// maestros_codigos). Referencia, código y descripción del Excel son solo
// informativos: si el usuario los modifica, no afecta la importación.
//
// Si el archivo no tiene el formato esperado o trae filas de otra empresa,
// se rechaza completo (`rechazo`) y no se clasifica ninguna fila.

import { COLUMNAS, indiceColumna, normalizarTexto, precioActualDe, descripcionDe } from './formatoPrecios';
import { parsearPrecio } from './parsearPrecio';

export const MOTIVO_SIN_NUEVO_PRECIO = 'Sin nuevo precio';
export const MOTIVO_SIN_CAMBIO = 'Sin cambio (mismo precio actual)';

const I_EMPRESA = indiceColumna('empresa');
const I_ID = indiceColumna('id');
const I_REFERENCIA = indiceColumna('referencia');
const I_NUEVO_PRECIO = indiceColumna('nuevoPrecio');

const celdaTexto = (fila, indice) => String(fila?.[indice] ?? '').trim();
const filaVacia = (fila) => !fila || fila.every(v => String(v ?? '').trim() === '');

const rechazar = (mensaje) => ({ rechazo: mensaje, actualizar: [], omitidos: [], errores: [] });

// `filas`: arreglo de filas (arreglos de celdas), incluido el encabezado,
// tal como lo entrega XLSX.utils.sheet_to_json(hoja, { header: 1 }).
// `empresa`: { nombre } de la empresa seleccionada.
// `codigos`: documentos de maestros_codigos ({ id, empresa, precioNeto, ... }).
export const analizarImportacionPrecios = ({ filas, empresa, codigos }) => {
  const nombreEmpresa = empresa?.nombre || '';
  const empresaNorm = normalizarTexto(nombreEmpresa);

  if (!Array.isArray(filas) || filas.length === 0) {
    return rechazar('El archivo está vacío.');
  }

  const encabezado = (filas[0] || []).map(normalizarTexto);
  const formatoOk = COLUMNAS.every((col, i) => encabezado[i] === normalizarTexto(col.titulo));
  if (!formatoOk) {
    return rechazar(
      `El archivo no tiene el formato esperado. Las columnas deben ser: ${COLUMNAS.map(c => c.titulo).join(', ')}. ` +
      `Descargue el formato de ${nombreEmpresa} y vuelva a intentarlo.`
    );
  }

  const filasDatos = filas
    .map((fila, i) => ({ fila, numero: i + 1 }))
    .slice(1)
    .filter(({ fila }) => !filaVacia(fila));

  if (filasDatos.length === 0) {
    return rechazar('El archivo no contiene filas de datos.');
  }

  const empresasAjenas = new Set();
  filasDatos.forEach(({ fila }) => {
    const valor = celdaTexto(fila, I_EMPRESA);
    if (normalizarTexto(valor) !== empresaNorm) empresasAjenas.add(valor || '(vacía)');
  });
  if (empresasAjenas.size > 0) {
    return rechazar(
      `El archivo contiene filas de otra empresa (${[...empresasAjenas].join(', ')}). ` +
      `Solo se pueden importar precios de ${nombreEmpresa}. No se actualizó ningún precio.`
    );
  }

  const codigosPorId = new Map((codigos || []).map(c => [c.id, c]));
  const filaPorId = new Map();
  const actualizar = [];
  const omitidos = [];
  const errores = [];

  filasDatos.forEach(({ fila, numero }) => {
    const id = celdaTexto(fila, I_ID);
    const referenciaExcel = celdaTexto(fila, I_REFERENCIA);
    const error = (motivo, referencia = referenciaExcel) => errores.push({ fila: numero, referencia, motivo });

    if (!id) return error('Falta el ID interno');
    if (filaPorId.has(id)) return error(`ID interno repetido (ya aparece en la fila ${filaPorId.get(id)})`);
    filaPorId.set(id, numero);

    const codigo = codigosPorId.get(id);
    if (!codigo) return error('El código no existe en el maestro');
    const referencia = codigo.referencia || referenciaExcel;
    if (normalizarTexto(codigo.empresa) !== empresaNorm) {
      return error(`El código pertenece a otra empresa (${codigo.empresa || 'sin empresa'})`, referencia);
    }

    const precio = parsearPrecio(fila[I_NUEVO_PRECIO]);
    if (precio.vacio) return omitidos.push({ fila: numero, referencia, motivo: MOTIVO_SIN_NUEVO_PRECIO });
    if (!precio.ok) return error(precio.motivo, referencia);

    const precioAnterior = precioActualDe(codigo);
    if (precio.valor === precioAnterior) return omitidos.push({ fila: numero, referencia, motivo: MOTIVO_SIN_CAMBIO });

    actualizar.push({
      fila: numero,
      id,
      codigo: codigo.codigo || '',
      referencia,
      descripcion: descripcionDe(codigo),
      precioAnterior,
      precioNuevo: precio.valor
    });
  });

  return { rechazo: null, actualizar, omitidos, errores };
};
