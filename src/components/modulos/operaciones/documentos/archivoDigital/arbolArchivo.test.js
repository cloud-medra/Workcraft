import { describe, it, expect } from 'vitest';
import {
  validarArchivo, tipoContenido, validarNombre, construirIndice, hijosDe, rutaHasta, descendientes,
  estaDentroDe, nombreUnico, buscarNodos, elementosPapelera, formatearTamano, nombreParaStorage,
} from './arbolArchivo';

const MB = 1024 * 1024;
const archivo = (name, type, size = 1000) => ({ name, type, size });

// Inicio
// ├── Contratos
// │   ├── Empresa X
// │   │   └── contrato 10.pdf, contrato 2.pdf
// │   └── resumen.png
// └── leeme.pdf
const NODOS = [
  { id: 'c1', tipo: 'carpeta', nombre: 'Contratos', padreId: null },
  { id: 'c2', tipo: 'carpeta', nombre: 'Empresa X', padreId: 'c1' },
  { id: 'a1', tipo: 'archivo', nombre: 'contrato 10.pdf', padreId: 'c2' },
  { id: 'a2', tipo: 'archivo', nombre: 'contrato 2.pdf', padreId: 'c2' },
  { id: 'a3', tipo: 'archivo', nombre: 'resumen.png', padreId: 'c1' },
  { id: 'a4', tipo: 'archivo', nombre: 'leeme.pdf', padreId: null },
  { id: 'x1', tipo: 'archivo', nombre: 'borrado.pdf', padreId: null, eliminado: true, eliminadoGrupo: 'x1' },
];
const indice = construirIndice(NODOS);

describe('validarArchivo', () => {
  it('acepta PDF, JPG, PNG y WEBP (por MIME o extensión) hasta 25 MB', () => {
    expect(validarArchivo(archivo('a.pdf', 'application/pdf'))).toBeNull();
    expect(validarArchivo(archivo('a.JPEG', ''))).toBeNull();
    expect(tipoContenido(archivo('a.JPEG', ''))).toBe('image/jpeg');
    expect(validarArchivo(archivo('a.webp', 'image/webp', 25 * MB))).toBeNull();
  });
  it('TIFF/HEIC: mensaje claro con los formatos permitidos', () => {
    const m = validarArchivo(archivo('scan.tiff', 'image/tiff'));
    expect(m).toMatch(/Formato no permitido \(TIFF\)/);
    expect(m).toMatch(/PDF, JPG, PNG, WEBP/);
    expect(validarArchivo(archivo('foto.HEIC', ''))).toMatch(/HEIC.*PDF o JPG/);
  });
  it('más de 25 MB: mensaje con el tamaño', () => {
    expect(validarArchivo(archivo('a.pdf', 'application/pdf', 26 * MB))).toMatch(/máximo de 25 MB.*26\.0 MB/);
  });
});

describe('árbol', () => {
  it('carpetas primero y orden natural; los eliminados no aparecen', () => {
    expect(hijosDe(indice, null).map((n) => n.nombre)).toEqual(['Contratos', 'leeme.pdf']);
    expect(hijosDe(indice, 'c2').map((n) => n.nombre)).toEqual(['contrato 2.pdf', 'contrato 10.pdf']);
  });
  it('ruta de navegación', () => {
    expect(rutaHasta(indice, 'c2').map((r) => r.nombre)).toEqual(['Inicio', 'Contratos', 'Empresa X']);
    expect(rutaHasta(indice, null).map((r) => r.nombre)).toEqual(['Inicio']);
  });
  it('cuenta subcarpetas y archivos para confirmar la eliminación', () => {
    const d = descendientes(indice, 'c1');
    expect([d.carpetas, d.archivos]).toEqual([1, 3]);
  });
  it('no se puede mover una carpeta dentro de sí misma', () => {
    expect(estaDentroDe(indice, 'c2', 'c1')).toBe(true);
    expect(estaDentroDe(indice, 'c1', 'c1')).toBe(true);
    expect(estaDentroDe(indice, null, 'c1')).toBe(false);
  });
});

describe('nombres', () => {
  it('nombre único entre hermanos, antes de la extensión, sin distinguir mayúsculas ni tildes', () => {
    const hermanos = [{ id: '1', nombre: 'Contrató.pdf' }, { id: '2', nombre: 'contrato (2).pdf' }];
    expect(nombreUnico('CONTRATO.pdf', hermanos)).toBe('CONTRATO (3).pdf');
    expect(nombreUnico('Otro.pdf', hermanos)).toBe('Otro.pdf');
    expect(nombreUnico('Contrató.pdf', hermanos, '1')).toBe('Contrató.pdf'); // renombrar sin cambios
    expect(nombreUnico('Contratos', [{ id: '9', nombre: 'contratos' }])).toBe('Contratos (2)');
  });
  it('validarNombre', () => {
    expect(validarNombre('  ')).toBeTruthy();
    expect(validarNombre('a/b')).toBeTruthy();
    expect(validarNombre('Contratos 2026')).toBeNull();
  });
  it('nombreParaStorage limpia caracteres problemáticos', () => {
    expect(nombreParaStorage('a/b#c?.pdf')).toBe('a_b_c_.pdf');
  });
});

describe('buscarNodos', () => {
  it('busca por cualquier parte del nombre en todo el árbol y muestra la ubicación', () => {
    const r = buscarNodos(indice, 'CONTRATO');
    expect(r.map((n) => n.nombre)).toEqual(['Contratos', 'contrato 2.pdf', 'contrato 10.pdf']);
    expect(r[1].ubicacion).toBe('Inicio / Contratos / Empresa X');
    expect(buscarNodos(indice, 'borrado')).toEqual([]);
    expect(buscarNodos(indice, '')).toEqual([]);
  });
});

describe('papelera', () => {
  it('un elemento por grupo, con lo que contenía', () => {
    const nodos = [
      { id: 'g', tipo: 'carpeta', nombre: 'Vieja', eliminado: true, eliminadoGrupo: 'g', eliminadoEl: { toMillis: () => 5 } },
      { id: 'h', tipo: 'archivo', nombre: 'a.pdf', eliminado: true, eliminadoGrupo: 'g' },
      { id: 'i', tipo: 'carpeta', nombre: 'Sub', eliminado: true, eliminadoGrupo: 'g' },
      { id: 'j', tipo: 'archivo', nombre: 'suelto.pdf', eliminado: true, eliminadoGrupo: 'j', eliminadoEl: { toMillis: () => 9 } },
    ];
    const p = elementosPapelera(nodos);
    expect(p.map((e) => e.id)).toEqual(['j', 'g']);
    expect([p[1].carpetas, p[1].archivos, p[1].miembros.length]).toEqual([1, 1, 3]);
  });
});

it('formatearTamano', () => {
  expect([formatearTamano(500), formatearTamano(2048), formatearTamano(3.5 * MB)]).toEqual(['500 B', '2 KB', '3.5 MB']);
});
