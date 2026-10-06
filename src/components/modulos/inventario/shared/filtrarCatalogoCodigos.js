// Búsqueda de "Contenido de la Caja" sobre el maestro (maestros_codigos):
// por Referencia, Código, Descriptor (descriptorAuto) o Empresa. La usan
// Stock General (InventarioForm) y Escaneo.
export const filtrarCatalogoCodigos = (catalogo, texto) => {
  const queryStr = String(texto ?? '').toLowerCase();
  return (catalogo || []).filter((cat) => {
    const referencia = (cat.referencia || '').toLowerCase();
    const codigo = (cat.codigo || '').toLowerCase();
    const descriptorAuto = (cat.descriptorAuto || '').toLowerCase();
    const empresa = (cat.empresa || '').toLowerCase();
    return (
      referencia.includes(queryStr) ||
      codigo.includes(queryStr) ||
      descriptorAuto.includes(queryStr) ||
      empresa.includes(queryStr)
    );
  });
};
