export const calcularMargen = (precio, nombrePrevision, configuraciones) => {
  const { rangosPrecio, excepcionesPrevision } = configuraciones;

  const excepcion = excepcionesPrevision.find(ex => ex.prevision === nombrePrevision);
  if (excepcion) return excepcion.margen;

  const rangosOrdenados = [...rangosPrecio].sort((a, b) => a.hasta - b.hasta);

  const rangoEncontrado = rangosOrdenados.find(r => precio <= r.hasta);
  return rangoEncontrado ? rangoEncontrado.margen : 50;
};