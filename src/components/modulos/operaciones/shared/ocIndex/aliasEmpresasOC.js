// Equivalencias manuales de empresas para el cruce de OC (Importar Detalles
// OC ↔ Gestión de Implantes), para los casos que la normalización automática
// (sin tildes, sin SPA/SA/LTDA/CHILE/COMERCIAL..., "uno contiene al otro") no
// resuelve. Clave: cómo puede venir escrito; valor: la empresa a la que
// equivale. Ambos lados se normalizan igual que los nombres, así que no
// importan mayúsculas, tildes ni puntos. Se aplica a ambos lados del cruce
// (proveedor del Excel y empresa de Implantes).
//
// Ejemplo:
//   'J&J MEDICAL': 'JOHNSON & JOHNSON',
//   'BSCI': 'BOSTON SCIENTIFIC',
export const ALIAS_EMPRESAS_OC = {
};
