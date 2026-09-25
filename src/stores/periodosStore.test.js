import { describe, it, expect, vi } from 'vitest';

vi.mock('../firebaseConfig', () => ({ db: {} }));
vi.mock('../hooks/useVisibleSnapshot', () => ({ onSnapshotVisible: vi.fn(() => () => {}) }));
vi.mock('firebase/firestore', () => ({ collection: vi.fn(), query: vi.fn(), where: vi.fn() }));

const { periodoAbiertoDe } = await import('./periodosStore');
const ts = (ms) => ({ toMillis: () => ms });

describe('periodoAbiertoDe', () => {
  it('devuelve el período del módulo con la fechaApertura más reciente', () => {
    const docs = [
      { id: 'a', modulo: 'implantes', mes: 'agosto', fechaApertura: ts(1) },
      { id: 'b', modulo: 'implantes', mes: 'septiembre', fechaApertura: ts(2) },
      { id: 'c', modulo: 'laboratorio', mes: 'julio', fechaApertura: ts(3) }
    ];
    expect(periodoAbiertoDe(docs, 'implantes').id).toBe('b');
    expect(periodoAbiertoDe(docs, 'laboratorio').id).toBe('c');
    expect(periodoAbiertoDe(docs, 'vacunatorio')).toBeNull();
    expect(periodoAbiertoDe(null, 'implantes')).toBeNull();
  });
});
