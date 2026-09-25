// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { soloDigitos, nombreEnMayusculas, nombreParaGuardar, limpiarInputConservandoCursor } from './camposPaciente';

describe('camposPaciente — pestaña Información (Implantes)', () => {
  it('ID: deja solo dígitos y conserva ceros a la izquierda como string', () => {
    expect(soloDigitos('00 12-a3b ')).toBe('00123');
    expect(soloDigitos('')).toBe('');
    expect(soloDigitos(undefined)).toBe('');
  });

  it('Nombre: mayúsculas respetando tildes y Ñ', () => {
    expect(nombreEnMayusculas('josé muñoz')).toBe('JOSÉ MUÑOZ');
    expect(nombreParaGuardar('  maría ñuñez  ')).toBe('MARÍA ÑUÑEZ');
  });

  it('conserva la posición del cursor al limpiar a mitad del texto', () => {
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();
    // Se escribió "x" entre "12" y "34": el cursor queda tras la "x".
    input.value = '12x34';
    input.setSelectionRange(3, 3);
    expect(limpiarInputConservandoCursor(input, soloDigitos)).toBe('1234');
    expect(input.value).toBe('1234');
    expect(input.selectionStart).toBe(2);

    input.value = 'JOSé MUÑOZ';
    input.setSelectionRange(4, 4);
    expect(limpiarInputConservandoCursor(input, nombreEnMayusculas)).toBe('JOSÉ MUÑOZ');
    expect(input.selectionStart).toBe(4);
    input.remove();
  });
});
