// "Fecha de Registro" de las Solicitudes (Implantes / Hemodinamia):
// cuándo se ingresó el ID / N° de Admisión, que NO es lo mismo que
// `fechaRegistro` (creación del documento). La gestión puede crearse sin
// ID ('P') y recibirlo días después desde Detalle → Información.
//
// Se calcula en cada punto que escribe el ID (alta, edición del
// formulario, guardado desde el detalle e importación masiva):
//  - ID vacío ('' / 'P')              → null
//  - pasa de vacío a tener valor      → ahora
//  - ya tenía valor (igual o distinto) → se conserva la fecha anterior
// Los registros anteriores a este campo no lo tienen: se dejan en null
// (no se inventa una fecha), aunque se les cambie el ID.

export const tieneIdAdmision = (id) => {
  const valor = String(id ?? '').trim();
  return valor !== '' && valor !== 'P';
};

export const calcularFechaRegistroAdmision = ({ idAnterior, idNuevo, fechaAnterior, ahora = new Date() }) => {
  if (!tieneIdAdmision(idNuevo)) return null;
  if (tieneIdAdmision(idAnterior)) return fechaAnterior ?? null;
  return ahora;
};
