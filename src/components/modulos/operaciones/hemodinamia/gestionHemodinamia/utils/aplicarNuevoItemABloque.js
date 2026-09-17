export const aplicarNuevoItemABloque = (bloque, data) => {
  const { numCotizacion, totalCotizacion, ...itemFields } = data;
  const cotizaciones = [...(bloque.cotizaciones || [])];
  const esPrimeraReferencia = cotizaciones.length === 0;

  const numLimpio = (numCotizacion || '').trim();
  const nuevoItem = {
    ...itemFields,
    numCotizacion: numLimpio,
    id: itemFields.id || `item_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
  };

  let totalFinal;

  if (esPrimeraReferencia) {
    totalFinal = Number(totalCotizacion) > 0 ? Number(totalCotizacion) : (Number(bloque.costo) || 0);
    cotizaciones.push({
      id: `cot_${Date.now()}`,
      numCotizacion: numLimpio,
      totalCotizacion: totalFinal,
      items: [nuevoItem]
    });
  } else {
    const cot = cotizaciones[0];
    totalFinal = Number(totalCotizacion) > 0 ? Number(totalCotizacion) : cot.totalCotizacion;
    const esHijoDeOtroItem = !!(nuevoItem.padPadreId || nuevoItem.lotePadreId);
    cotizaciones[0] = {
      ...cot,
      numCotizacion: esHijoDeOtroItem ? cot.numCotizacion : (numLimpio || cot.numCotizacion),
      totalCotizacion: totalFinal,
      items: [...(cot.items || []), nuevoItem]
    };
  }

  return {
    ...bloque,
    cotizaciones,
    costo: totalFinal,
    ...(esPrimeraReferencia && !bloque.fechaInicioCarga ? { fechaInicioCarga: new Date() } : {})
  };
};
