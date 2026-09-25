import { useGestionesHemodinamiaData } from './useGestionesHemodinamiaData';
import { useGestionesHemodinamiaFiltros } from './useGestionesHemodinamiaFiltros';

export const useGestionesHemodinamia = (opciones) => {
  const data = useGestionesHemodinamiaData(opciones);
  const filtros = useGestionesHemodinamiaFiltros(data.implantes);

  return {
    ...data,
    ...filtros
  };
};
