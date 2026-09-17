import { doc } from 'firebase/firestore';
import { db } from '../../../../../../firebaseConfig';

export const descomponerFecha = (fechaString) => {
  if (fechaString && fechaString.includes('-')) {
    const [anio, mes, dia] = fechaString.split('-');
    return { anio, mes, dia };
  }
  return { anio: '0000', mes: '00', dia: '00' };
};

export const refImputada = (periodoAnio, periodoMes, itemId) =>
  doc(db, 'hemodinamia_imputadas', String(periodoAnio), 'meses', periodoMes, 'documentos', itemId);

/**
 * Construye el documento de hemodinamia_imputadas correspondiente a un ítem
 * de hemodinamia_gestiones. `dataGestion` es el objeto ya normalizado del
 * bloque (gestionId, admision, nombre, fecha, empresa, informe, convenio,
 * prevision, medico, descripcion, centro, atributo, estado, costo).
 */
export const construirPayloadImputada = (it, dataGestion, periodoAnioItem, periodoMesItem, nombreUsuario) => {
  const { anio, mes, dia } = descomponerFecha(dataGestion.fecha);

  return {
    gestionId: dataGestion.gestionId,
    agendaId: dataGestion.agendaId,
    admision: dataGestion.admision,
    paciente: dataGestion.nombre,
    medico: dataGestion.medico,
    fecha: dataGestion.fecha,
    anio,
    mes,
    dia,
    empresa: dataGestion.empresa,
    informe: dataGestion.informe,
    convenio: dataGestion.convenio,
    prevision: dataGestion.prevision,
    descripcion: dataGestion.descripcion,
    centro: dataGestion.centro,
    atributo: dataGestion.atributo,
    estado: dataGestion.estado,
    costoGestion: dataGestion.costo,

    numCotizacion: it.numCotizacion || 'P',
    totalCotizacion: Number(it.totalCotizacion) || 0,
    itemId: it.id,
    referencia: it.referencia || 'P',
    codigo: it.codigo || 'P',
    descriptorAuto: it.descriptorAuto || 'P',
    clase: it.clase || 'P',
    tipoVinculado: it.tipoVinculado || 'P',
    detalle: it.detalle || 'P',
    empresaVinculada: it.empresaVinculada || 'P',
    precio: Number(it.precio) || 0,
    cantidad: Number(it.cantidad) || 0,
    vecesCosto: Number(it.vecesCosto) || 1,
    recargoEncontrado: !!it.recargoEncontrado,
    venta: Number(it.venta) || 0,
    total: Number(it.totalItem) || 0,
    lote: it.lote || 'P',
    vencimiento: it.vencimiento || '',
    sinCodigo: !!it.sinCodigo,
    estadoCarga: it.estadoCarga || 'PENDIENTE',
    periodoAnio: periodoAnioItem,
    periodoMes: periodoMesItem,
    esPad: !!it.esPad,
    padPadreId: it.padPadreId || null,

    registradoPor: nombreUsuario || 'Usuario',
    actualizadoEn: new Date()
  };
};
