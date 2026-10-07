// Vínculos código de barras -> producto del maestro (maestros_codigos), en
// inventario_codigos_barra/{id}. El id del documento sale del código, así
// cada código apunta a un solo producto; un producto puede tener varios
// códigos. Lógica pura (sin Firebase).

export const COL_CODIGOS_BARRA = 'inventario_codigos_barra';

// Clave del código -> id de documento válido en Firestore (no admite "/",
// ni "." / ".." solos, ni el patrón __x__). encodeURIComponent cubre "/" y
// caracteres de control; los demás casos se prefijan.
export const idVinculo = (clave) => {
  const texto = String(clave ?? '').trim();
  if (!texto) return '';
  const codificado = encodeURIComponent(texto).replace(/\./g, '%2E');
  return /^__.*__$/.test(codificado) ? `cb_${codificado}` : codificado;
};

// Estado de una lectura frente al producto que se está ingresando.
//   'nuevo': el código no está vinculado a nada.
//   'mismo': ya está vinculado a este producto.
//   'otro':  está vinculado a otro producto (requiere confirmación).
//   'sinProducto': está vinculado y aún no hay producto elegido (se elige ese).
export const evaluarVinculo = (vinculo, productoId) => {
  if (!vinculo?.productoId) return 'nuevo';
  if (!productoId) return 'sinProducto';
  return vinculo.productoId === productoId ? 'mismo' : 'otro';
};

// Lista de códigos escaneados para el producto en curso. Cada entrada:
// { clave, codigo, vinculoProductoId, reasignar }. No repite claves.
export const agregarCodigoALista = (lista, entrada) => {
  if (!entrada?.clave || lista.some((c) => c.clave === entrada.clave)) return lista;
  return [...lista, { reasignar: false, vinculoProductoId: null, ...entrada }];
};

export const quitarCodigoDeLista = (lista, clave) => lista.filter((c) => c.clave !== clave);

// Al cambiar el producto en curso se quitan los códigos que ya apuntaban a
// otro producto sin confirmación de reasignar (devuelve { lista, quitados }).
export const ajustarListaAProducto = (lista, productoId) => {
  const quitados = lista.filter((c) => c.vinculoProductoId && c.vinculoProductoId !== productoId && !c.reasignar);
  return { lista: lista.filter((c) => !quitados.includes(c)), quitados };
};

// Qué escribir al guardar. `actuales`: { [clave]: vinculo | null } leídos
// dentro de la transacción. Lanza error si un código quedó vinculado a otro
// producto y no se confirmó la reasignación (puede haber cambiado desde el
// escaneo). Devuelve [{ clave, codigo, reasignadoDe }] a escribir (los que
// ya apuntan a este producto no se reescriben).
export const planificarVinculos = (lista, productoId, actuales = {}) => {
  const escribir = [];
  lista.forEach((c) => {
    const actual = actuales[c.clave];
    if (actual?.productoId === productoId) return;
    if (actual?.productoId && !(c.reasignar && actual.productoId === c.vinculoProductoId)) {
      throw new Error(`El código ${c.codigo} está vinculado a otro producto (${actual.referencia || actual.codigo || actual.productoId}). Vuelve a escanearlo para confirmar.`);
    }
    escribir.push({ clave: c.clave, codigo: c.codigo, reasignadoDe: actual?.productoId || null });
  });
  return escribir;
};

// Documento del vínculo (copia de los datos del producto para mostrarlo sin
// leer el maestro).
export const construirVinculo = ({ clave, codigo }, producto, usuario) => ({
  clave,
  codigoLeido: codigo,
  productoId: producto.id,
  codigo: producto.codigo || '',
  referencia: producto.referencia || '',
  descriptorAuto: producto.descriptorAuto || '',
  empresa: producto.empresa || '',
  creadoPor: usuario?.nombreCompleto || 'Usuario',
  creadoPorEmail: usuario?.email || ''
});
