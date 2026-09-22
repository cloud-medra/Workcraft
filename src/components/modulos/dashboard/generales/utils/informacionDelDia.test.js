import { describe, it, expect } from 'vitest';
import {
  esBisiesto,
  obtenerFechaCompleta,
  obtenerDiaSemana,
  obtenerDiaDelAnio,
  obtenerSemanaDelAnio,
  obtenerEstacionChile,
  calcularDomingoPascua,
  obtenerFeriadoChile
} from './informacionDelDia';

describe('esBisiesto', () => {
  it('identifica años bisiestos y no bisiestos correctamente', () => {
    expect(esBisiesto(2024)).toBe(true); // divisible por 4
    expect(esBisiesto(2025)).toBe(false);
    expect(esBisiesto(1900)).toBe(false); // divisible por 100, no por 400
    expect(esBisiesto(2000)).toBe(true); // divisible por 400
  });
});

describe('obtenerFechaCompleta', () => {
  it('arma "D de Mes de AAAA" con el mes capitalizado', () => {
    expect(obtenerFechaCompleta(new Date(2026, 8, 22))).toBe('22 de Septiembre de 2026');
    expect(obtenerFechaCompleta(new Date(2026, 0, 1))).toBe('1 de Enero de 2026');
  });
});

describe('obtenerDiaSemana', () => {
  it('devuelve el nombre del día en español', () => {
    // 22-09-2026 es martes.
    expect(obtenerDiaSemana(new Date(2026, 8, 22))).toBe('Martes');
  });
});

describe('obtenerDiaDelAnio', () => {
  it('1 de enero es el día 1, con el total de días según si el año es bisiesto', () => {
    const { diaDelAnio, totalDias, porcentaje } = obtenerDiaDelAnio(new Date(2026, 0, 1));
    expect(diaDelAnio).toBe(1);
    expect(totalDias).toBe(365);
    expect(porcentaje).toBeCloseTo((1 / 365) * 100, 5);
  });

  it('31 de diciembre es el último día del año', () => {
    expect(obtenerDiaDelAnio(new Date(2026, 11, 31)).diaDelAnio).toBe(365);
    expect(obtenerDiaDelAnio(new Date(2026, 11, 31)).porcentaje).toBeCloseTo(100, 5);
  });

  it('en año bisiesto, el total de días es 366 y el 29 de febrero existe', () => {
    const { totalDias } = obtenerDiaDelAnio(new Date(2024, 1, 29));
    expect(totalDias).toBe(366);
    // 31 (ene) + 29 (feb) = día 60.
    expect(obtenerDiaDelAnio(new Date(2024, 1, 29)).diaDelAnio).toBe(60);
  });
});

describe('obtenerSemanaDelAnio', () => {
  it('1 de enero cae en la semana 1', () => {
    expect(obtenerSemanaDelAnio(new Date(2026, 0, 1)).semana).toBe(1);
  });

  it('el 8vo día cae en la semana 2', () => {
    expect(obtenerSemanaDelAnio(new Date(2026, 0, 8)).semana).toBe(2);
  });
});

describe('obtenerEstacionChile', () => {
  it('clasifica correctamente un día típico de cada estación', () => {
    expect(obtenerEstacionChile(new Date(2026, 0, 15)).nombre).toBe('Verano'); // 15 enero
    expect(obtenerEstacionChile(new Date(2026, 3, 15)).nombre).toBe('Otoño'); // 15 abril
    expect(obtenerEstacionChile(new Date(2026, 6, 15)).nombre).toBe('Invierno'); // 15 julio
    expect(obtenerEstacionChile(new Date(2026, 9, 15)).nombre).toBe('Primavera'); // 15 octubre
  });

  it('20 de marzo todavía es verano, 21 de marzo ya es otoño', () => {
    expect(obtenerEstacionChile(new Date(2026, 2, 20)).nombre).toBe('Verano');
    expect(obtenerEstacionChile(new Date(2026, 2, 21)).nombre).toBe('Otoño');
  });

  it('20 de junio todavía es otoño, 21 de junio ya es invierno', () => {
    expect(obtenerEstacionChile(new Date(2026, 5, 20)).nombre).toBe('Otoño');
    expect(obtenerEstacionChile(new Date(2026, 5, 21)).nombre).toBe('Invierno');
  });

  it('20 de septiembre todavía es invierno, 21 de septiembre ya es primavera', () => {
    expect(obtenerEstacionChile(new Date(2026, 8, 20)).nombre).toBe('Invierno');
    expect(obtenerEstacionChile(new Date(2026, 8, 21)).nombre).toBe('Primavera');
  });

  it('20 de diciembre todavía es primavera, 21 de diciembre ya es verano', () => {
    expect(obtenerEstacionChile(new Date(2026, 11, 20)).nombre).toBe('Primavera');
    expect(obtenerEstacionChile(new Date(2026, 11, 21)).nombre).toBe('Verano');
  });

  it('a comienzos de enero, el verano viene del 21 de diciembre del año anterior', () => {
    const resultado = obtenerEstacionChile(new Date(2026, 0, 5));
    expect(resultado.nombre).toBe('Verano');
    expect(resultado.proximaEstacion).toBe('Otoño');
    // Del 5 al 21 de marzo de 2026 hay 65 días — pero antes cuenta el resto de enero, febrero, y parte de marzo.
    expect(resultado.fechaCambio.getFullYear()).toBe(2026);
    expect(resultado.fechaCambio.getMonth()).toBe(2); // marzo
    expect(resultado.fechaCambio.getDate()).toBe(21);
  });

  it('diasRestantes cuenta hasta la fecha de cambio (0 en la fecha límite del día anterior)', () => {
    const resultado = obtenerEstacionChile(new Date(2026, 2, 20)); // 20 de marzo
    expect(resultado.diasRestantes).toBe(1); // cambia el 21 de marzo
  });
});

describe('calcularDomingoPascua', () => {
  it('calcula fechas de Pascua conocidas', () => {
    const pascua2024 = calcularDomingoPascua(2024);
    expect(pascua2024.getMonth()).toBe(2); // marzo
    expect(pascua2024.getDate()).toBe(31);

    const pascua2025 = calcularDomingoPascua(2025);
    expect(pascua2025.getMonth()).toBe(3); // abril
    expect(pascua2025.getDate()).toBe(20);
  });
});

describe('obtenerFeriadoChile', () => {
  it('reconoce feriados fijos', () => {
    expect(obtenerFeriadoChile(new Date(2026, 8, 18))).toBe('Independencia Nacional');
    expect(obtenerFeriadoChile(new Date(2026, 11, 25))).toBe('Navidad');
  });

  it('reconoce Viernes y Sábado Santo (móviles, derivados de Pascua)', () => {
    // Pascua 2024 = 31 de marzo -> Viernes Santo 29, Sábado Santo 30.
    expect(obtenerFeriadoChile(new Date(2024, 2, 29))).toBe('Viernes Santo');
    expect(obtenerFeriadoChile(new Date(2024, 2, 30))).toBe('Sábado Santo');
  });

  it('devuelve null en un día sin feriado', () => {
    expect(obtenerFeriadoChile(new Date(2026, 8, 22))).toBeNull();
  });
});
