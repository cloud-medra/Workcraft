import { describe, it, expect } from 'vitest';
import { MESES, etiquetaMes } from './constants';

describe('etiquetaMes', () => {
  it('muestra el nombre del mes y su número con dos dígitos', () => {
    expect(MESES.map(etiquetaMes)).toEqual([
      'Enero (01)', 'Febrero (02)', 'Marzo (03)', 'Abril (04)', 'Mayo (05)', 'Junio (06)',
      'Julio (07)', 'Agosto (08)', 'Septiembre (09)', 'Octubre (10)', 'Noviembre (11)', 'Diciembre (12)'
    ]);
  });
});
