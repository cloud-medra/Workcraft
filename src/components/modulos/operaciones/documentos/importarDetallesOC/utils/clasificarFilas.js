// Compara las filas del Excel (ya con su hash calculado) contra el
// snapshot de la importación anterior ({idFila: hash}), en memoria — sin
// tocar Firestore. Función pura, separada de la orquestación de
// lectura/escritura para poder probarla sola.
export const clasificarFilas = (filasConHash, snapshotAnterior) => {
  const nuevas = [];
  const cambiadas = [];
  const sinCambios = [];

  filasConHash.forEach((fila) => {
    const hashAnterior = snapshotAnterior[fila.id];
    if (hashAnterior === undefined) {
      nuevas.push(fila);
    } else if (hashAnterior !== fila._hash) {
      cambiadas.push(fila);
    } else {
      sinCambios.push(fila);
    }
  });

  return { nuevas, cambiadas, sinCambios };
};
