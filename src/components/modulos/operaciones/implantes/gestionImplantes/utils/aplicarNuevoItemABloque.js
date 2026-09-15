// Reducer puro que agrega un ítem (referencia normal, PAD principal o
// contenido de un PAD, o lote adicional de una referencia normal) a un
// "bloque" (empresa/fecha) dentro de CargasTab.
//
// El modelo de datos solo soporta UNA cotización "oficial" por bloque
// (bloque.cotizaciones[0]) — el resto del módulo (Detallestab, el guardado
// hacia `implantes_imputadas` en useGestionesImplantesData.js, y el módulo
// hermano solicitudImplantes) lee siempre cotizaciones[0] y no itera el
// array. Por eso, aunque un PAD/referencia con lotes y sus hijos (contenido
// o lote adicional) puedan tener cada uno su propio N° de Cotización
// (guardado en item.numCotizacion para el reporte por item en
// `implantes_imputadas`), el numCotizacion "de grupo" (cotizaciones[0].numCotizacion,
// usado en el header de CotizacionCard, Detallestab y SolicitudImplantes)
// solo lo actualizan los ítems "principales" (sin padPadreId ni
// lotePadreId) — así el número propio de un hijo nunca pisa el de su
// referencia/PAD principal.
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
