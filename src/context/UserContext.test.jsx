// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';

// Cambio de usuario: la caché local de Firestore debe prepararse (y, si es de
// otro usuario, borrarse y reinicializarse) ANTES de la primera lectura del
// usuario que entra, y esa lectura debe usar la instancia nueva de `db`.
const eventos = [];
let notificarAuth = null;
let dbActual = { instancia: 'A' };

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: (_auth, cb) => { notificarAuth = cb; return () => {}; }
}));
vi.mock('firebase/firestore', () => ({
  doc: (db, col, id) => ({ db, path: `${col}/${id}` }),
  getDoc: async (ref) => {
    eventos.push(`getDoc ${ref.path} en db ${ref.db.instancia}`);
    return { exists: () => true, data: () => ({ nombre: ref.path }) };
  }
}));
vi.mock('../firebaseConfig', () => ({
  auth: {},
  // Binding vivo, como `export let db` en firebaseConfig.js.
  get db() { return dbActual; },
  prepararCacheParaUsuario: vi.fn(async (uid) => {
    eventos.push(`preparar ${uid}`);
    await Promise.resolve();
    if (uid === 'B') {
      dbActual = { instancia: 'B' }; // caché de otro usuario: se borró y se reinicializó
      eventos.push('db reinicializada');
    }
  })
}));

const { UserProvider, useUser } = await import('./UserContext');

const Mostrar = () => {
  const { userData } = useUser();
  return <span>{userData ? userData.nombre : 'sin-usuario'}</span>;
};

beforeEach(() => {
  eventos.length = 0;
  dbActual = { instancia: 'A' };
});

describe('UserContext — cambio de usuario y caché local', () => {
  it('prepara la caché antes de leer y la lectura del nuevo usuario usa la db reinicializada', async () => {
    render(<UserProvider><Mostrar /></UserProvider>);

    await act(async () => { await notificarAuth({ uid: 'A' }); });
    expect(screen.getByText('usuarios/A')).toBeTruthy();

    // Cierre de sesión y entra otro usuario en la misma pestaña.
    await act(async () => { await notificarAuth(null); });
    expect(screen.getByText('sin-usuario')).toBeTruthy();
    await act(async () => { await notificarAuth({ uid: 'B' }); });

    expect(eventos).toEqual([
      'preparar A',
      'getDoc usuarios/A en db A',
      'preparar B',
      'db reinicializada',
      'getDoc usuarios/B en db B'
    ]);
    expect(screen.getByText('usuarios/B')).toBeTruthy();
  });
});
