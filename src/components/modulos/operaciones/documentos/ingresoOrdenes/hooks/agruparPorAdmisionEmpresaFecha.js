// Agrupa filas de "detalles" (documentos_sistema) en una fila por cada
// combinación única de ADMISION + EMPRESA (proveedor) + FECHA_CX (por día,
// sin hora). Función pura, sin dependencias de Firestore/React, para poder
// testearla directo con arreglos planos.

// FECHA_CX puede llegar como Timestamp de Firestore (.toDate()), Date o
// string/serial — se normaliza a "YYYY-MM-DD" (sin hora) para que la
// agrupación no dependa de la hora exacta del registro.
export const claveFechaDia = (valor) => {
  if (!valor) return '';
  const fecha = valor.toDate ? valor.toDate() : new Date(valor);
  if (isNaN(fecha.getTime())) return '';
  const yyyy = fecha.getFullYear();
  const mm = String(fecha.getMonth() + 1).padStart(2, '0');
  const dd = String(fecha.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export const construirClaveGrupo = (fila) => {
  const admision = (fila.admision ?? '').toString().trim();
  const proveedor = (fila.proveedor ?? '').toString().trim();
  const diaFecha = claveFechaDia(fila.fecha_cx);
  return `${admision}||${proveedor}||${diaFecha}`;
};

// Devuelve un arreglo de grupos, cada uno con los datos representativos
// (tomados de la primera fila del grupo) + el conteo de ítems + el arreglo
// completo de filas del grupo (para la pestaña "Consumo" del detalle).
// El orden de salida sigue el de la primera aparición de cada grupo en
// `filas` (que ya viene ordenado por documentId() descendente = más
// reciente primero).
export const agruparPorAdmisionEmpresaFecha = (filas) => {
  const gruposPorClave = new Map();

  filas.forEach((fila) => {
    const clave = construirClaveGrupo(fila);
    if (!gruposPorClave.has(clave)) {
      gruposPorClave.set(clave, {
        groupId: clave,
        admision: fila.admision ?? '',
        paciente: fila.paciente ?? '',
        medico: fila.medico ?? '',
        proveedor: fila.proveedor ?? '',
        fecha_cx: fila.fecha_cx ?? null,
        items: []
      });
    }
    gruposPorClave.get(clave).items.push(fila);
  });

  return Array.from(gruposPorClave.values()).map((grupo) => ({
    ...grupo,
    totalItems: grupo.items.length
  }));
};
