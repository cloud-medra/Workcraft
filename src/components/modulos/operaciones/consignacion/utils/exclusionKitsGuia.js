// Productos de guía de despacho que no se muestran en Cargas (Delivery) ni en
// Solicitud. Se comparan contra el campo `codigo` de cada ítem de
// consignacion_guias/.../detalles, normalizado (ver normalizarCodigoKit), así
// que da igual cómo venga escrito en la guía: "KIT-MANGACRL", "KITMANGACRL"
// y "kit manga crl" se tratan igual.
export const CODIGOS_EXCLUIDOS_GUIA = ['KITBYPASSTCRL2', 'KIT-MANGACRL', 'KITMANGACRL'];

// Mayúsculas y sin espacios (incluye no separables/invisibles) ni guiones.
export const normalizarCodigoKit = (codigo) =>
  String(codigo ?? '').toUpperCase().replace(/[\s\u200B-\u200D\uFEFF-]+/g, '');

const EXCLUIDOS_NORMALIZADOS = new Set(CODIGOS_EXCLUIDOS_GUIA.map(normalizarCodigoKit));

export const estaExcluidoDeGuia = (codigo) => EXCLUIDOS_NORMALIZADOS.has(normalizarCodigoKit(codigo));
