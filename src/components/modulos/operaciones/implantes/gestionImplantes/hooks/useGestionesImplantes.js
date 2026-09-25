import { useGestionesImplantesData } from './useGestionesImplantesData';
import { useGestionesImplantesFiltros } from './useGestionesImplantesFiltros';

export const useGestionesImplantes = (opciones) => {
  const data = useGestionesImplantesData(opciones);
  const filtros = useGestionesImplantesFiltros(data.implantes);

  return {
    ...data,
    ...filtros
  };
};