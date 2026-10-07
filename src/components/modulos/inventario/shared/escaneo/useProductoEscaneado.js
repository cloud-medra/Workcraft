import { useEffect, useRef, useState } from 'react';
import { useModal } from '../../../../../context/ModalContext';
import { interpretarLectura } from './escaneo';
import { evaluarVinculo, agregarCodigoALista, quitarCodigoDeLista, ajustarListaAProducto } from './vinculosCodigoBarra';
import { reproducirSonidoEscaneo } from './sonidoEscaneo';
import { leerVinculo } from './escaneoInventarioService';

export const nombreProducto = (p) => [p?.referencia, p?.descriptorAuto].filter(Boolean).join(' — ') || p?.codigo || 'producto';

// Escaneo de un producto (Ingreso directo y Con guía o factura): campo de
// escaneo con foco permanente, producto por código vinculado o búsqueda en
// el maestro si el código es nuevo, y lista de códigos a vincular al guardar.
//   catalogo:      maestro de códigos.
//   validarAntes:  () => mensaje de error o '' (se llama antes de cada lectura).
//   onGS1:         (gs1) => void, con lote/vencimiento leídos de un GS1.
export const useProductoEscaneado = ({ catalogo, validarAntes, onGS1, mensajeInicial }) => {
  const { confirmAction } = useModal();

  const [producto, setProductoEstado] = useState(null);
  const [codigos, setCodigosEstado] = useState([]);
  const [buscador, setBuscadorEstado] = useState(null); // { aviso } | null
  const [senal, setSenal] = useState({ tipo: null, mensaje: mensajeInicial });

  const campoRef = useRef(null);
  // Copias al día para las lecturas encoladas (la pistola puede leer otro
  // código antes de que React vuelva a renderizar).
  const productoRef = useRef(null);
  const codigosRef = useRef([]);
  const colaRef = useRef(Promise.resolve());
  const buscadorAbiertoRef = useRef(false);

  const setProducto = (p) => { productoRef.current = p; setProductoEstado(p); };
  const setCodigos = (lista) => { codigosRef.current = lista; setCodigosEstado(lista); };
  const setBuscador = (valor) => { buscadorAbiertoRef.current = Boolean(valor); setBuscadorEstado(valor); };

  const enfocarCampo = () => setTimeout(() => campoRef.current?.focus(), 0);
  useEffect(() => { campoRef.current?.focus(); }, []);

  const avisar = (tipo, mensaje, { sonido = true } = {}) => {
    setSenal({ tipo, mensaje });
    if (sonido) reproducirSonidoEscaneo(tipo);
  };

  const agregarCodigo = (entrada) => {
    const lista = agregarCodigoALista(codigosRef.current, entrada);
    const repetido = lista === codigosRef.current;
    setCodigos(lista);
    return !repetido;
  };

  const procesarLectura = async (texto) => {
    const errorPrevio = validarAntes?.();
    if (errorPrevio) {
      avisar('error', errorPrevio);
      return;
    }
    const lectura = interpretarLectura(texto);
    if (!lectura) return;

    let vinculo;
    try {
      vinculo = await leerVinculo(lectura.clave);
    } catch (err) {
      console.error('Error al leer el vínculo del código:', err);
      avisar('error', `No se pudo consultar el código ${lectura.codigo}.`);
      return;
    }

    if (lectura.gs1.esGS1) onGS1?.(lectura.gs1);
    const sufijoGS1 = lectura.gs1.esGS1 ? ` (GS1 · GTIN ${lectura.gs1.gtin})` : '';
    const actual = productoRef.current;
    const entrada = { clave: lectura.clave, codigo: lectura.codigo };

    switch (evaluarVinculo(vinculo, actual?.id)) {
      case 'sinProducto': {
        const prod = catalogo.find((c) => c.id === vinculo.productoId);
        if (!prod) {
          avisar('error', `El código ${lectura.codigo} está vinculado a un producto que ya no está en el maestro.`);
          return;
        }
        setProducto(prod);
        agregarCodigo({ ...entrada, vinculoProductoId: prod.id });
        setBuscador(null);
        avisar('ok', `Producto reconocido: ${nombreProducto(prod)}${sufijoGS1}`);
        return;
      }
      case 'mismo': {
        const nuevo = agregarCodigo({ ...entrada, vinculoProductoId: actual.id });
        avisar('ok', nuevo ? `Código ${lectura.codigo} ya vinculado a este producto.` : `El código ${lectura.codigo} ya está en la lista.`);
        return;
      }
      case 'nuevo': {
        const nuevo = agregarCodigo(entrada);
        if (!actual) {
          setBuscador({ aviso: `Código nuevo ${lectura.codigo}${sufijoGS1}: elige el producto para vincularlo.` });
          avisar('nuevo', `Código nuevo ${lectura.codigo}: elige el producto en la búsqueda.`);
        } else {
          avisar('nuevo', nuevo
            ? `Código nuevo ${lectura.codigo}: quedará vinculado a ${nombreProducto(actual)} al guardar.`
            : `El código ${lectura.codigo} ya está en la lista.`);
        }
        return;
      }
      case 'otro': {
        const otro = [vinculo.referencia, vinculo.descriptorAuto].filter(Boolean).join(' — ') || vinculo.codigo || vinculo.productoId;
        avisar('error', `El código ${lectura.codigo} está vinculado a otro producto: ${otro}.`);
        await new Promise((resolve) => {
          confirmAction(
            'Código vinculado a otro producto',
            `El código ${lectura.codigo} está vinculado a "${otro}". ¿Reasignarlo a "${nombreProducto(actual)}"? El cambio se aplica al guardar.`,
            () => {
              agregarCodigo({ ...entrada, vinculoProductoId: vinculo.productoId, reasignar: true });
              avisar('nuevo', `El código ${lectura.codigo} se reasignará a ${nombreProducto(actual)} al guardar.`);
              resolve();
            },
            { confirmText: 'Reasignar', cancelText: 'No cambiar', type: 'warning', onCancel: resolve }
          );
        });
        return;
      }
      default:
    }
  };

  // Las lecturas se procesan en orden, una a la vez.
  const handleLectura = (texto) => {
    colaRef.current = colaRef.current
      .then(() => procesarLectura(texto))
      .catch((err) => console.error('Error al procesar la lectura:', err))
      .finally(() => { if (!buscadorAbiertoRef.current) enfocarCampo(); });
  };

  const handleSeleccionarProducto = (prod) => {
    const { lista, quitados } = ajustarListaAProducto(codigosRef.current, prod.id);
    setCodigos(lista);
    setProducto(prod);
    setBuscador(null);
    const extra = quitados.length > 0 ? ` Se quitaron ${quitados.length} código(s) vinculados a otro producto.` : '';
    avisar('ok', `Producto elegido: ${nombreProducto(prod)}.${extra}`);
    enfocarCampo();
  };

  const handleQuitarCodigo = (clave) => {
    setCodigos(quitarCodigoDeLista(codigosRef.current, clave));
    enfocarCampo();
  };

  // Deja el escaneo listo para el siguiente producto.
  const limpiarProducto = ({ mensaje } = {}) => {
    setProducto(null);
    setCodigos([]);
    setBuscador(null);
    if (mensaje) setSenal({ tipo: null, mensaje });
    enfocarCampo();
  };

  // Clic en un espacio sin campo: el foco vuelve al campo de escaneo.
  const handleBlurCampo = (e) => {
    if (!e.relatedTarget && !buscadorAbiertoRef.current) enfocarCampo();
  };

  return {
    campoRef, senal, setSenal, avisar, enfocarCampo,
    producto, codigos, buscador, setBuscador,
    handleLectura, handleSeleccionarProducto, handleQuitarCodigo, limpiarProducto, handleBlurCampo
  };
};
