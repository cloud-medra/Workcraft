// Orquesta una corrida completa de importación: lee el Excel, calcula el
// hash de cada fila, compara contra el snapshot anterior (1 sola lectura,
// vía Storage), escribe en Firestore SOLO las filas nuevas/cambiadas en
// batches de 450 (bajo el límite de 500), y guarda el snapshot actualizado
// al final.
import * as XLSX from 'xlsx';
import { doc, writeBatch } from 'firebase/firestore';
import { db } from '../../../../../../firebaseConfig';
import { normalizarFilaDetalleOC, validarFilaDetalleOC, mapearEncabezados } from './parsearFilaDetalleOC';
import { calcularHashFila } from './hashFila';
import { clasificarFilas } from './clasificarFilas';
import { normalizarProveedorId } from './normalizarProveedor';
import { asignarIdsFilas, idsHuerfanos } from './idFilaDetalleOC';
import { obtenerHojaDesdeArchivo } from './leerHojaArchivo';
import { leerSnapshotDetallesOC, guardarSnapshotDetallesOC } from './snapshotStorageDetallesOC';
import { mezclarIndiceOC } from '../../../shared/ocIndex/indiceOC';
import { descargarIndiceOC, publicarIndiceOC } from '../../../shared/ocIndex/indiceOCRemoto';

export const COL_BASE = 'documentos_sistema';
const CHUNK_SIZE = 450;

const obtenerAnioMes = (fechaCx) => {
  if (!(fechaCx instanceof Date) || isNaN(fechaCx.getTime())) return null;
  return {
    anio: String(fechaCx.getFullYear()),
    mes: String(fechaCx.getMonth() + 1).padStart(2, '0')
  };
};

const construirPayloadDetalle = (fila) => ({
  admision: fila.admision,
  paciente: fila.paciente,
  medico: fila.medico,
  fecha_cx: fila.fecha_cx,
  proveedor: fila.proveedor,
  codigo: fila.codigo,
  descripcion: fila.descripcion,
  cantidad: fila.cantidad,
  precio_u: fila.precio_u,
  atributo: fila.atributo,
  oc: fila.oc,
  oc_monto: fila.oc_monto,
  estado: fila.estado,
  fecha_recepcion: fila.fecha_recepcion,
  fecha_cargo: fila.fecha_cargo,
  numero_guia: fila.numero_guia,
  numero_factura: fila.numero_factura,
  fecha_emision: fila.fecha_emision,
  fecha_ingreso: fila.fecha_ingreso,
  lote: fila.lote,
  fecha_vencimiento: fila.fecha_vencimiento,
  actualizadoEn: new Date()
});

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
export const leerFilasDelExcel = async (file) => {
  const data = await file.arrayBuffer();
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

// Borra de Firestore las filas huérfanas: IDs del snapshot anterior cuyo
// grupo (admisión + fecha + proveedor + código) viene en este archivo pero
// que ya no están en él (ej. una fila repetida que se quitó). Se sabe qué
// existía por el snapshot, sin leer Firestore; la ruta sale de una fila del
// mismo grupo. Devuelve los IDs efectivamente borrados.
const eliminarHuerfanos = async (huerfanos, filas, errores) => {
  const filaPorGrupo = new Map();
  filas.forEach((f) => { if (f._grupo && !filaPorGrupo.has(f._grupo)) filaPorGrupo.set(f._grupo, f); });

  const eliminados = [];
  for (let i = 0; i < huerfanos.length; i += CHUNK_SIZE) {
    const chunk = huerfanos.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);
    chunk.forEach((id) => {
      const base = filaPorGrupo.get(id.replace(/_\d+$/, ''));
      const { anio, mes } = obtenerAnioMes(base.fecha_cx);
      batch.delete(doc(
        db, COL_BASE, anio, 'meses', mes, 'admisiones', base.admision,
        'empresas', normalizarProveedorId(base.proveedor), 'detalles', id
      ));
    });
    try {
      await batch.commit();
      eliminados.push(...chunk);
    } catch (err) {
      console.error('[Importar Detalles OC] Falló el borrado de filas huérfanas:', err);
      chunk.forEach(id => errores.push({ id, filaExcel: null, error: `Error al eliminar fila que ya no viene en el archivo: ${err.code || err.message}` }));
    }
  }
  return eliminados;
};

// Índice de OC para "Sincronizar OC" de Gestión de Implantes. Se mezcla con
// TODAS las filas del Excel (no solo las nuevas/cambiadas: es barato y deja
// el índice consistente aunque una importación anterior haya fallado a
// medias) y solo se republica si cambió algo, para no invalidar la caché de
// los demás clientes sin necesidad. Un error acá no anula la importación.
const actualizarIndiceOC = async (filas, tieneColumnaOC) => {
  if (!tieneColumnaOC) {
    return { ok: false, error: 'El Excel no trae la columna "OC": el índice de OC no se actualizó.' };
  }
  try {
    const { indice: anterior } = await descargarIndiceOC();
    const { indice, stats } = mezclarIndiceOC(anterior, filas, idsHuerfanos(Object.keys(anterior || {}), filas));
    if (stats.cambios > 0) await publicarIndiceOC(indice);
    return { ok: true, ...stats, totalEntradas: Object.keys(indice).length, publicado: stats.cambios > 0 };
  } catch (err) {
    console.error('Error al actualizar el índice de OC:', err);
    return { ok: false, error: 'No se pudo actualizar el índice de OC: ' + err.message };
  }
};

export const procesarImportacionDetallesOC = async (file, { onProgreso } = {}) => {
  onProgreso?.({ etapa: 'leyendo', mensaje: 'Leyendo el archivo Excel...' });
  const { filas, invalidas, tieneColumnaOC, encabezados, mapa, hoja, formato, primeraFila } = await leerFilasDelExcel(file);
  console.info(`[Importar Detalles OC] Formato real del archivo: ${formato} · hoja "${hoja}". Columnas reconocidas:`, mapa, '· Encabezados:', encabezados);
  console.info('[Importar Detalles OC] Primera fila de datos (columna -> celda: valor):');
  console.table(primeraFila);
  if (invalidas.length > 0) {
    console.warn(`[Importar Detalles OC] ${invalidas.length} fila(s) descartada(s) antes de escribir. Primeras 20:`);
    console.table(invalidas.slice(0, 20));
  }

  onProgreso?.({ etapa: 'hasheando', actual: 0, total: filas.length });
  const filasConHash = [];
  for (const fila of filas) {
    const _hash = await calcularHashFila(fila);
    filasConHash.push({ ...fila, _hash });
    if (filasConHash.length % 500 === 0) {
      onProgreso?.({ etapa: 'hasheando', actual: filasConHash.length, total: filas.length });
    }
  }

  const snapshotAnterior = await leerSnapshotDetallesOC();
  const { nuevas, cambiadas, sinCambios } = clasificarFilas(filasConHash, snapshotAnterior);
  const aEscribir = [...nuevas, ...cambiadas];

  const errores = [...invalidas];
  const hashesFinal = { ...snapshotAnterior };
  let escritos = 0;
  const idsEscritos = new Set();
  const marcadoresEscritos = new Set();

  onProgreso?.({ etapa: 'escribiendo', actual: 0, total: aEscribir.length });

  for (let i = 0; i < aEscribir.length; i += CHUNK_SIZE) {
    const chunk = aEscribir.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);
    const filasValidas = [];

    for (const fila of chunk) {
      try {
        const periodo = obtenerAnioMes(fila.fecha_cx);
        if (!periodo) throw new Error('FECHA_CX vacía o inválida');
        const { anio, mes } = periodo;
        if (!fila.admision) throw new Error('ADMISION vacía');
        const proveedorSlug = normalizarProveedorId(fila.proveedor);

        const claveAnio = anio;
        if (!marcadoresEscritos.has(claveAnio)) {
          batch.set(doc(db, COL_BASE, anio), { active: true }, { merge: true });
          marcadoresEscritos.add(claveAnio);
        }
        const claveMes = `${anio}_${mes}`;
        if (!marcadoresEscritos.has(claveMes)) {
          batch.set(doc(db, COL_BASE, anio, 'meses', mes), { active: true }, { merge: true });
          marcadoresEscritos.add(claveMes);
        }
        const claveAdmision = `${anio}_${mes}_${fila.admision}`;
        if (!marcadoresEscritos.has(claveAdmision)) {
          batch.set(doc(db, COL_BASE, anio, 'meses', mes, 'admisiones', fila.admision), { active: true }, { merge: true });
          marcadoresEscritos.add(claveAdmision);
        }
        const claveEmpresa = `${claveAdmision}_${proveedorSlug}`;
        if (!marcadoresEscritos.has(claveEmpresa)) {
          batch.set(
            doc(db, COL_BASE, anio, 'meses', mes, 'admisiones', fila.admision, 'empresas', proveedorSlug),
            { nombreOriginal: fila.proveedor, active: true },
            { merge: true }
          );
          marcadoresEscritos.add(claveEmpresa);
        }

        const detalleRef = doc(
          db, COL_BASE, anio, 'meses', mes, 'admisiones', fila.admision,
          'empresas', proveedorSlug, 'detalles', fila.id
        );
        batch.set(detalleRef, construirPayloadDetalle(fila), { merge: true });
        filasValidas.push(fila);
      } catch (err) {
        errores.push({ id: fila.id, filaExcel: fila._filaExcel, error: err.message });
      }
    }

    if (filasValidas.length > 0) {
      try {
        await batch.commit();
        escritos += filasValidas.length;
        filasValidas.forEach((f) => { hashesFinal[f.id] = f._hash; idsEscritos.add(f.id); });
      } catch (err) {
        console.error('[Importar Detalles OC] Falló un lote de escritura:', err);
        filasValidas.forEach((f) => errores.push({ id: f.id, filaExcel: f._filaExcel, error: `Error al guardar en Firestore: ${err.code || err.message}` }));
      }
    }

    onProgreso?.({ etapa: 'escribiendo', actual: Math.min(i + CHUNK_SIZE, aEscribir.length), total: aEscribir.length });
  }

  const huerfanos = idsHuerfanos(Object.keys(snapshotAnterior), filas);
  let eliminados = [];
  if (huerfanos.length > 0) {
    onProgreso?.({ etapa: 'eliminando', total: huerfanos.length });
    eliminados = await eliminarHuerfanos(huerfanos, filas, errores);
    eliminados.forEach((id) => { delete hashesFinal[id]; });
  }

  // Si no se escribió ni borró NADA no hace falta resubir el snapshot —
  // mismo contenido, mismo archivo.
  if (escritos > 0 || eliminados.length > 0) {
    onProgreso?.({ etapa: 'guardando_snapshot' });
    await guardarSnapshotDetallesOC(hashesFinal);
  }

  if (errores.length > invalidas.length) {
    console.warn(`[Importar Detalles OC] ${errores.length - invalidas.length} fila(s) fallaron al guardar. Primeras 20:`);
    console.table(errores.slice(invalidas.length, invalidas.length + 20));
  }

  onProgreso?.({ etapa: 'indice_oc' });
  const indiceOC = await actualizarIndiceOC(filas, tieneColumnaOC);

  const lecturasEstimadas = 1; // el snapshot (1 archivo de Storage, no cuenta como lectura de Firestore)
  const escriturasEstimadas = escritos + marcadoresEscritos.size + eliminados.length // detalles + marcadores + borrados
    + (escritos > 0 || eliminados.length > 0 ? 1 : 0) // 1 archivo de snapshot
    + (indiceOC.publicado ? 1 : 0); // ocImport/meta (el archivo del índice va a Storage)

  return {
    totalFilasExcel: filas.length + invalidas.length,
    formatoArchivo: formato,
    // Solo cuentan las que efectivamente quedaron guardadas: una fila con
    // error no es "nueva" ni "actualizada".
    nuevas: nuevas.filter(f => idsEscritos.has(f.id)).length,
    cambiadas: cambiadas.filter(f => idsEscritos.has(f.id)).length,
    sinCambios: sinCambios.length,
    escritas: escritos,
    eliminadas: eliminados.length,
    errores,
    indiceOC,
    lecturasFirestoreEstimadas: lecturasEstimadas,
    escriturasFirestoreEstimadas: escriturasEstimadas
  };
};
