import { useMemo, useState } from 'react';
import { useDebouncedValue } from '../../../../hooks/useDebouncedValue';
import { incluyeTexto } from '../../../../utils/normalizarTexto';
import { normalizarCodigo } from './useFacturacionOrden';

const FILTROS_VACIOS = { descripcion: '', codigo: '', documento: '' };

/**
 * Filtros combinables (AND) del detalle de una orden: descripción, código y
 * N° documento (folios de las facturas vinculadas). Ignora mayúsculas/tildes
 * y aplica debounce a lo que escribe el usuario.
 */
export const useFiltrosDetalleOrden = (detalle, facturacion) => {
  const [filtros, setFiltros] = useState(FILTROS_VACIOS);
  const f = useDebouncedValue(filtros);

  const setFiltro = (campo, valor) => setFiltros(prev => ({ ...prev, [campo]: valor }));
  const limpiarFiltros = () => setFiltros(FILTROS_VACIOS);
  const hayFiltros = Object.values(filtros).some(v => v.trim() !== '');

  const detalleFiltrado = useMemo(() => detalle.filter(item => {
    if (!incluyeTexto(item["Artículo"], f.descripcion)) return false;
    if (!incluyeTexto(item["Cod.Artículo"], f.codigo)) return false;
    if (f.documento.trim()) {
      const docs = facturacion[normalizarCodigo(item["Cod.Artículo"])]?.documentos || [];
      if (!docs.some(x => incluyeTexto(x.folio, f.documento))) return false;
    }
    return true;
  }), [detalle, facturacion, f]);

  return { filtros, setFiltro, limpiarFiltros, hayFiltros, detalleFiltrado };
};
