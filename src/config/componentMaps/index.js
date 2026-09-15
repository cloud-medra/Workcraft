import { administracionComponentMaps } from './administracion';
import { laboratorioComponentMaps } from './laboratorio';
import { vacunatorioComponentMaps } from './vacunatorio';
import { maestrosComponentMaps } from './maestros';
import { consignacionComponentMaps } from './consignacion';
import { inventarioComponentMaps } from './inventario';
import { documentosComponentMaps } from './documentos';
import { implantesComponentMaps } from './implantes';
import { hemodinamiaComponentMaps } from './hemodinamia';

export const COMPONENT_MAPS = {
  ...administracionComponentMaps,
  ...laboratorioComponentMaps,
  ...vacunatorioComponentMaps,
  ...maestrosComponentMaps,
  ...consignacionComponentMaps,
  ...inventarioComponentMaps,
  ...documentosComponentMaps,
  ...implantesComponentMaps,
  ...hemodinamiaComponentMaps,
};
