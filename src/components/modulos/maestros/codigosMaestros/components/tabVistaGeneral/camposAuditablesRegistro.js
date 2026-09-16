// Lista única de campos auditables del registro de Código Maestro (Vista
// General). La usan tanto ModificarRegistroDrawer.jsx (para construir el
// diff que se guarda en el log) como TabConCodigoDrawers.jsx (para
// renderizarlo en el historial), así evitamos tener la lista de campos
// hardcodeada en dos lugares distintos.
//
// "observacion" queda afuera a propósito: en ModificarRegistroDrawer ese
// campo siempre arranca vacío (es un "motivo de esta modificación", no el
// valor persistido), así que compararlo contra el valor anterior generaría
// un "cambio" falso en cada edición. Se loguea aparte como nota libre
// (ver `logAuditoria.detalles.observacionModificacion` en ModificarRegistroDrawer.jsx).
export const CAMPOS_AUDITABLES_REGISTRO = [
  { key: 'codigo', label: 'Código' },
  { key: 'referencia', label: 'Referencia' },
  { key: 'descriptorEmpresa', label: 'Descriptor Maestro (Empresa)' },
  { key: 'empresa', label: 'Empresa' },
  { key: 'tipo', label: 'Tipo' },
  { key: 'segmento', label: 'Segmento' },
  { key: 'clase', label: 'Clase' },
  { key: 'descriptorAuto', label: 'Descriptor Maestro' },
  { key: 'cx', label: 'CX' },
  { key: 'precioNeto', label: 'Precio Neto', tipoValor: 'moneda' },
  { key: 'estado', label: 'Estado', tipoValor: 'estado' }
];

const normalizarValor = (valor, tipoValor) => {
  if (tipoValor === 'moneda') return Number(valor || 0);
  if (tipoValor === 'estado') return valor || 'ACTIVO';
  return valor ?? '';
};

// Compara registroAnterior vs registroNuevo campo por campo y devuelve un
// objeto con `{campoAnterior, campoNuevo}` solo para los campos que
// realmente cambiaron (mismo estilo que ya usaba precioNetoAnterior /
// precioNetoNuevo, generalizado a todos los campos auditables).
export const construirCambiosRegistro = (registroAnterior, registroNuevo) => {
  const cambios = {};

  CAMPOS_AUDITABLES_REGISTRO.forEach(({ key, tipoValor }) => {
    const valorAnterior = normalizarValor(registroAnterior?.[key], tipoValor);
    const valorNuevo = normalizarValor(registroNuevo?.[key], tipoValor);
    const huboCambio = tipoValor === 'moneda'
      ? valorAnterior !== valorNuevo
      : String(valorAnterior) !== String(valorNuevo);

    if (huboCambio) {
      cambios[`${key}Anterior`] = valorAnterior;
      cambios[`${key}Nuevo`] = valorNuevo;
    }
  });

  return cambios;
};
