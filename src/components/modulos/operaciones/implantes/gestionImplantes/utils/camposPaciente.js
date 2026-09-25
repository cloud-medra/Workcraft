// Normalización de los campos del paciente en la pestaña Información del
// detalle de gestión: ID / Nº Admisión (solo dígitos, como string para no
// perder ceros a la izquierda) y Nombre (MAYÚSCULAS con tildes y Ñ).

export const soloDigitos = (valor) => String(valor ?? '').replace(/\D/g, '');

export const nombreEnMayusculas = (valor) => String(valor ?? '').toLocaleUpperCase('es-CL');

// Al guardar: mayúsculas y sin espacios al inicio/final.
export const nombreParaGuardar = (valor) => nombreEnMayusculas(valor).trim();

// Aplica `limpiar` al valor del input sin que el cursor salte al final.
// Se escribe el valor limpio directo en el DOM y se reubica el cursor: como
// después el estado de React trae ese mismo valor, React no vuelve a tocar
// el input. El cursor se corre según lo que `limpiar` eliminó antes de él
// (p. ej. las letras quitadas en un campo numérico o en un pegado).
export const limpiarInputConservandoCursor = (input, limpiar) => {
  const original = input.value;
  const limpio = limpiar(original);
  if (limpio === original) return limpio;
  const inicio = input.selectionStart;
  const fin = input.selectionEnd;
  input.value = limpio;
  if (inicio !== null && fin !== null && document.activeElement === input) {
    const ajustar = (pos) => limpiar(original.slice(0, pos)).length;
    input.setSelectionRange(ajustar(inicio), ajustar(fin));
  }
  return limpio;
};
