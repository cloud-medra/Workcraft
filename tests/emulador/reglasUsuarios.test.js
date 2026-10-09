// Reglas de usuarios/{uid} y plantillas_permisos (permisos por centro de
// costo). Rol, permisos, permisosGranulares, centroCostoId y excepciones
// solo los escriben las Cloud Functions; desde el navegador cada usuario
// sigue pudiendo editar lo suyo (tema, contraseña, datos, orden del menú) y
// un admin los datos de los demás.
import process from 'node:process';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

const PROYECTO = 'demo-workcraft';
const FIRESTORE = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
const AUTH = process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099';
const apps = [];

// Escribe sin reglas (como el Admin SDK de las funciones): token "owner".
const valor = (v) => {
  if (v === null) return { nullValue: null };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return { integerValue: String(v) };
  if (typeof v === 'string') return { stringValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(valor) } };
  return { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, valor(x)])) } };
};
const sembrar = async (ruta, datos) => {
  const r = await fetch(`http://${FIRESTORE}/v1/projects/${PROYECTO}/databases/(default)/documents/${ruta}`, {
    method: 'PATCH',
    headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: valor(datos).mapValue.fields }),
  });
  if (!r.ok) throw new Error(`sembrar ${ruta}: ${r.status} ${await r.text()}`);
};

// Una sesión del navegador con su propio usuario de Auth.
const sesion = async (nombre, perfil) => {
  const app = initializeApp({ apiKey: 'demo', projectId: PROYECTO, authDomain: `${PROYECTO}.firebaseapp.com` }, `${nombre}-${Date.now()}`);
  apps.push(app);
  const auth = getAuth(app);
  connectAuthEmulator(auth, `http://${AUTH}`, { disableWarnings: true });
  const db = getFirestore(app);
  const [host, puerto] = FIRESTORE.split(':');
  connectFirestoreEmulator(db, host, Number(puerto));
  const { user } = await createUserWithEmailAndPassword(auth, `${nombre}-${Date.now()}@prueba.cl`, 'secreto123');
  await sembrar(`usuarios/${user.uid}`, perfil);
  return { db, uid: user.uid };
};

const PERMISOS = { laboratorio: ['/laboratorio/codigoLaboratorio'] };
let admin;
let operador;

beforeAll(async () => {
  admin = await sesion('admin', { rol: 'admin', nombreCompleto: 'Admin', permisos: {}, permisosGranulares: {} });
  operador = await sesion('operador', { rol: 'operador', nombreCompleto: 'Operador', permisos: PERMISOS, permisosGranulares: {} });
  await sembrar('plantillas_permisos/lab', { permisos: PERMISOS, permisosGranulares: {} });
});
afterAll(async () => { await Promise.all(apps.map((a) => deleteApp(a))); });

const usuario = (s, uid = s.uid) => doc(s.db, 'usuarios', uid);

describe('usuarios: lo que cada uno puede editar de sí mismo', () => {
  it('tema, cambio de contraseña, datos de perfil, privacidad y orden del menú siguen funcionando', async () => {
    await expect(updateDoc(usuario(operador), { modoPantalla: 'oscuro' })).resolves.toBeUndefined();
    await expect(updateDoc(usuario(operador), { nombreCompleto: 'Operador Uno', nombreUsuario: 'op1', email: 'op1@prueba.cl', passwordChanged: true })).resolves.toBeUndefined();
    await expect(updateDoc(usuario(operador), { nombreMostrar: 'nombre', ordenModulos: ['laboratorio'] })).resolves.toBeUndefined();
    await expect(updateDoc(usuario(admin), { modoPantalla: 'oscuro', passwordChanged: true })).resolves.toBeUndefined();
  });

  it('nadie puede darse rol, permisos, centro de costo ni excepciones desde el navegador', async () => {
    const intentos = [
      { rol: 'admin' },
      { permisos: { administracion: ['/administracion/listadoUsuario'] } },
      { permisosGranulares: { '/administracion/listadoUsuario': {} } },
      { centroCostoId: 'lab' },
      { excepciones: { agregados: ['v|/x'], quitados: [] } },
    ];
    for (const cambio of intentos) {
      await expect(updateDoc(usuario(operador), cambio), JSON.stringify(cambio)).rejects.toMatchObject({ code: 'permission-denied' });
    }
    // Tampoco un admin escribe el permiso efectivo o el rol directamente: va por las funciones.
    await expect(updateDoc(usuario(admin, operador.uid), { permisos: {} })).rejects.toMatchObject({ code: 'permission-denied' });
    await expect(updateDoc(usuario(admin), { rol: 'operador' })).rejects.toMatchObject({ code: 'permission-denied' });
  });

  it('un admin edita los datos de otro; un operador no', async () => {
    await expect(updateDoc(usuario(admin, operador.uid), { nombreCompleto: 'Renombrado' })).resolves.toBeUndefined();
    await expect(updateDoc(usuario(operador, admin.uid), { nombreCompleto: 'X' })).rejects.toMatchObject({ code: 'permission-denied' });
  });
});

describe('usuarios: crear (Crear Usuario)', () => {
  it('admin crea el documento base con rol y sin permisos; los permisos van después por la función', async () => {
    await expect(setDoc(doc(admin.db, 'usuarios', 'nuevo1'), { nombreCompleto: 'Nuevo', rol: 'operador', permisos: {}, permisosGranulares: {} })).resolves.toBeUndefined();
    await expect(setDoc(doc(admin.db, 'usuarios', 'nuevo2'), { rol: 'operador', permisos: PERMISOS, permisosGranulares: {} })).rejects.toMatchObject({ code: 'permission-denied' });
    await expect(setDoc(doc(admin.db, 'usuarios', 'nuevo3'), { rol: 'operador', permisos: {}, permisosGranulares: {}, centroCostoId: 'lab' })).rejects.toMatchObject({ code: 'permission-denied' });
    await expect(setDoc(doc(operador.db, 'usuarios', 'nuevo4'), { rol: 'operador', permisos: {}, permisosGranulares: {} })).rejects.toMatchObject({ code: 'permission-denied' });
  });
});

describe('plantillas y auditoría', () => {
  it('las plantillas las lee solo un admin y nadie las escribe desde el navegador', async () => {
    expect((await getDoc(doc(admin.db, 'plantillas_permisos', 'lab'))).exists()).toBe(true);
    await expect(getDoc(doc(operador.db, 'plantillas_permisos', 'lab'))).rejects.toMatchObject({ code: 'permission-denied' });
    await expect(setDoc(doc(admin.db, 'plantillas_permisos', 'lab'), { permisos: {} })).rejects.toMatchObject({ code: 'permission-denied' });
  });

  it('la auditoría de permisos no se escribe desde el navegador', async () => {
    await expect(setDoc(doc(admin.db, 'usuarios', operador.uid, 'logs', 'l1'), { accion: 'X' })).rejects.toMatchObject({ code: 'permission-denied' });
    await expect(setDoc(doc(admin.db, 'plantillas_permisos', 'lab', 'logs', 'l1'), { accion: 'X' })).rejects.toMatchObject({ code: 'permission-denied' });
  });
});
