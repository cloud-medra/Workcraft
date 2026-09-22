// Orquesta una corrida completa de importación: lee el Excel, calcula el
// hash de cada fila, compara contra el snapshot anterior (1 sola lectura,
// vía Storage), escribe en Firestore SOLO las filas nuevas/cambiadas en
// batches de 450 (bajo el límite de 500), y guarda el snapshot actualizado
// al final.
import * as XLSX from 'xlsx';
import { doc, writeBatch } from 'firebase/firestore';
import { db } from '../../../../../../firebaseConfig';
import { normalizarFilaDetalleOC } from './parsearFilaDetalleOC';
import { calcularHashFila } from './hashFila';
import { clasificarFilas } from './clasificarFilas';
import { normalizarProveedorId } from './normalizarProveedor';
import { leerSnapshotDetallesOC, guardarSnapshotDetallesOC } from './snapshotStorageDetallesOC';

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

export const leerFilasDelExcel = async (file) => {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array', cellDates: true });
  const nombreHoja = workbook.SheetNames.includes('planilla') ? 'planilla' : workbook.SheetNames[0];
  const hoja = workbook.Sheets[nombreHoja];
  const filasCrudas = XLSX.utils.sheet_to_json(hoja, { defval: '' });

  const filas = [];
  filasCrudas.forEach((cruda) => {
    const normalizada = normalizarFilaDetalleOC(cruda, XLSX);
    if (normalizada) filas.push(normalizada);
  });
  return filas;
};

export const procesarImportacionDetallesOC = async (file, { onProgreso } = {}) => {
  onProgreso?.({ etapa: 'leyendo', mensaje: 'Leyendo el archivo Excel...' });
  const filas = await leerFilasDelExcel(file);

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

  const errores = [];
  const hashesFinal = { ...snapshotAnterior };
  let escritos = 0;
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
        errores.push({ id: fila.id, error: err.message });
      }
    }

    if (filasValidas.length > 0) {
      try {
        await batch.commit();
        escritos += filasValidas.length;
        filasValidas.forEach((f) => { hashesFinal[f.id] = f._hash; });
      } catch (err) {
        filasValidas.forEach((f) => errores.push({ id: f.id, error: err.message }));
      }
    }

    onProgreso?.({ etapa: 'escribiendo', actual: Math.min(i + CHUNK_SIZE, aEscribir.length), total: aEscribir.length });
  }

  // Si no se escribió NADA (ni una fila nueva/cambiada) no hace falta
  // resubir el snapshot — mismo contenido, mismo archivo.
  if (aEscribir.length > 0) {
    onProgreso?.({ etapa: 'guardando_snapshot' });
    await guardarSnapshotDetallesOC(hashesFinal);
  }

  const lecturasEstimadas = 1; // el snapshot (1 archivo de Storage, no cuenta como lectura de Firestore)
  const escriturasEstimadas = escritos + marcadoresEscritos.size + (aEscribir.length > 0 ? 1 : 0); // detalles + marcadores + 1 archivo de snapshot

  return {
    totalFilasExcel: filas.length,
    nuevas: nuevas.length,
    cambiadas: cambiadas.length,
    sinCambios: sinCambios.length,
    escritas: escritos,
    errores,
    lecturasFirestoreEstimadas: lecturasEstimadas,
    escriturasFirestoreEstimadas: escriturasEstimadas
  };
};
