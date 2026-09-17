import { useGestionesHemodinamiaData } from './useGestionesHemodinamiaData';
import { useGestionesHemodinamiaFiltros } from './useGestionesHemodinamiaFiltros';

export const useGestionesHemodinamia = () => {
  const data = useGestionesHemodinamiaData();
  const filtros = useGestionesHemodinamiaFiltros(data.implantes);

  return {
    ...data,
    ...filtros
  };
};
