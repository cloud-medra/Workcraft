// Hash de comparación por fila: incluye TODOS los campos de datos excepto
// los que determinan la ruta del documento en Firestore (id, admision,
// proveedor, fecha_cx) — si alguno de esos cambiara, la fila tendría que
// "moverse" de ruta, que es un caso distinto a un upsert simple. Cualquier
// otro campo (incluidos paciente/medico/codigo/descripcion/cantidad/
// precio_u/atributo, no solo los de seguimiento como OC/guía/factura)
// dispara detección de cambio — decisión confirmada explícitamente con el
// usuario antes de implementar.
export const CAMPOS_HASH = [
  'paciente', 'medico', 'codigo', 'descripcion', 'cantidad', 'precio_u', 'atributo',
  'oc', 'oc_monto', 'estado', 'fecha_recepcion', 'fecha_cargo',
  'numero_guia', 'numero_factura', 'fecha_emision', 'fecha_ingreso',
  'lote', 'fecha_vencimiento'
];

// Normaliza cada valor a una representación de texto estable: las fechas
// se comparan solo por día (YYYY-MM-DD, sin hora), los números por su
// valor numérico (no por cómo Excel los formateó), el resto recortado.
const valorParaHash = (valor) => {
  if (valor instanceof Date) {
    if (isNaN(valor.getTime())) return '';
    const yyyy = valor.getFullYear();
    const mm = String(valor.getMonth() + 1).padStart(2, '0');
    const dd = String(valor.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
  if (typeof valor === 'number') return String(valor);
  return (valor ?? '').toString().trim();
};

// SHA-256 vía Web Crypto (sin librería nueva), truncado a 16 hex (64 bits)
// — de sobra para varios miles de filas, sin riesgo práctico de colisión.
export const calcularHashFila = async (filaNormalizada) => {
  const payload = CAMPOS_HASH.map(campo => `${campo}=${valorParaHash(filaNormalizada[campo])}`).join('|');
  const bytes = new TextEncoder().encode(payload);
  const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);
  const hex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
  return hex.slice(0, 16);
};
