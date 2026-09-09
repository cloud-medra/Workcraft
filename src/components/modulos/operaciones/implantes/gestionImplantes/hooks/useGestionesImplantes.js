import { useGestionesImplantesData } from './useGestionesImplantesData';
import { useGestionesImplantesFiltros } from './useGestionesImplantesFiltros';

export const useGestionesImplantes = () => {
  const data = useGestionesImplantesData();
  const filtros = useGestionesImplantesFiltros(data.implantes);

  return {
    ...data,
    ...filtros
  };
};