// Firestore rechaza `undefined` en cualquier nivel del objeto y, dentro de
// un writeBatch, un solo campo así hace fallar la exportación completa.
// Se sanea explícitamente cada objeto antes de batch.set()/update() en vez
// de activar `ignoreUndefinedProperties` global en firebaseConfig.
//
// - Propiedad `undefined` en un objeto → se omite (con `merge: true` eso
//   deja intacto el valor que ya tuviera el documento, en vez de pisarlo
//   con null).
// - Elemento `undefined` en un arreglo → null (no se puede omitir sin
//   correr los índices).
// Solo se recorren objetos planos y arreglos: Date, Timestamp,
// DocumentReference, FieldValue, etc. pasan tal cual.

const esObjetoPlano = (v) =>
  v !== null && typeof v === 'object' && Object.getPrototypeOf(v) === Object.prototype;

export const limpiarParaFirestore = (valor) => {
  if (Array.isArray(valor)) {
    return valor.map(v => (v === undefined ? null : limpiarParaFirestore(v)));
  }
  if (!esObjetoPlano(valor)) return valor;
  const limpio = {};
  Object.entries(valor).forEach(([k, v]) => {
    if (v !== undefined) limpio[k] = limpiarParaFirestore(v);
  });
  return limpio;
};

// Rutas ("a.b[2]") de los campos que venían en `undefined`, para dejarlas
// en consola y poder corregir el origen del dato.
export const camposUndefined = (valor, prefijo = '') => {
  if (Array.isArray(valor)) {
    return valor.flatMap((v, i) => (v === undefined ? [`${prefijo}[${i}]`] : camposUndefined(v, `${prefijo}[${i}]`)));
  }
  if (!esObjetoPlano(valor)) return [];
  return Object.entries(valor).flatMap(([k, v]) => {
    const ruta = prefijo ? `${prefijo}.${k}` : k;
    return v === undefined ? [ruta] : camposUndefined(v, ruta);
  });
};
