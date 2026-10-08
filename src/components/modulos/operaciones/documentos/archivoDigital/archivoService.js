// Firestore + Storage del Archivo digital.
//   Firestore: documentos_archivo/{id}  (carpetas y archivos, con padreId)
//   Storage:   documentos_archivo/{id}/{nombre}  (solo archivos)
// Renombrar y mover solo cambian Firestore (el archivo no se copia). Eliminar
// marca el nodo y todo su contenido como un grupo en la papelera
// (eliminadoGrupo = id del nodo eliminado); restaurar devuelve el grupo.
import { collection, doc, setDoc, updateDoc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, deleteObject } from 'firebase/storage';
import { db, storage, auth } from '../../../../../firebaseConfig';
import { onSnapshotVisible } from '../../../../../hooks/useVisibleSnapshot';
import { COLECCION_ARCHIVO, CARPETA_STORAGE_ARCHIVO, nombreParaStorage, tipoContenido } from './arbolArchivo';

const LOTE = 400; // < 500 escrituras por batch de Firestore

const autor = (usuarioNombre) => ({
  subidoPorUid: auth.currentUser?.uid || null,
  subidoPorNombre: usuarioNombre || auth.currentUser?.email || 'Usuario',
});

const SIN_ELIMINAR = { eliminado: false, eliminadoEl: null, eliminadoPor: null, eliminadoGrupo: null };

export const escucharNodos = (onDatos, onError) =>
  onSnapshotVisible(
    collection(db, COLECCION_ARCHIVO),
    (snap) => onDatos(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    onError
  );

export const crearCarpeta = ({ nombre, padreId, usuarioNombre }) => {
  const nuevo = doc(collection(db, COLECCION_ARCHIVO));
  return setDoc(nuevo, {
    tipo: 'carpeta',
    nombre,
    padreId: padreId || null,
    ...autor(usuarioNombre),
    subidoEl: serverTimestamp(),
    ...SIN_ELIMINAR,
  });
};

// Sube el archivo y luego registra el nodo; si el registro falla, intenta
// quitar el archivo recién subido.
export const subirArchivo = async ({ file, nombre, padreId, usuarioNombre, onProgreso }) => {
  const nuevo = doc(collection(db, COLECCION_ARCHIVO));
  const contentType = tipoContenido(file);
  const ruta = `${CARPETA_STORAGE_ARCHIVO}/${nuevo.id}/${nombreParaStorage(file.name)}`;
  await new Promise((resolve, reject) => {
    const tarea = uploadBytesResumable(ref(storage, ruta), file, {
      contentType,
      customMetadata: { nombreOriginal: file.name, subidoPor: auth.currentUser?.email || '' },
    });
    tarea.on('state_changed',
      (s) => onProgreso?.(s.totalBytes ? Math.round((s.bytesTransferred / s.totalBytes) * 100) : 0),
      reject,
      resolve);
  });
  try {
    await setDoc(nuevo, {
      tipo: 'archivo',
      nombre,
      padreId: padreId || null,
      ruta,
      tamano: file.size,
      contentType,
      ...autor(usuarioNombre),
      subidoEl: serverTimestamp(),
      ...SIN_ELIMINAR,
    });
  } catch (err) {
    await deleteObject(ref(storage, ruta)).catch(() => {});
    throw err;
  }
};

export const renombrarNodo = (id, nombre) =>
  updateDoc(doc(db, COLECCION_ARCHIVO, id), { nombre, actualizadoEl: serverTimestamp() });

// `nombre`: solo si en el destino ya hay otro con el mismo nombre (" (2)").
export const moverNodo = (id, padreId, nombre) =>
  updateDoc(doc(db, COLECCION_ARCHIVO, id), { padreId: padreId || null, ...(nombre ? { nombre } : {}), actualizadoEl: serverTimestamp() });

const enLotes = async (items, aplicar) => {
  for (let i = 0; i < items.length; i += LOTE) {
    const batch = writeBatch(db);
    items.slice(i, i + LOTE).forEach((it) => aplicar(batch, it));
    await batch.commit();
  }
};

// Envía a la papelera el nodo y todo su contenido (`contenido`: los
// descendientes del índice). El nodo raíz se escribe al final, así la
// carpeta no desaparece de la vista antes que su contenido.
export const enviarAPapelera = (nodo, contenido, usuarioNombre) => {
  const marca = { eliminado: true, eliminadoEl: serverTimestamp(), eliminadoPor: usuarioNombre || 'Usuario', eliminadoGrupo: nodo.id };
  return enLotes([...contenido, nodo], (batch, n) => batch.update(doc(db, COLECCION_ARCHIVO, n.id), marca));
};

// Restaura un grupo de la papelera. Si la carpeta donde estaba ya no existe
// (o también está en la papelera), el elemento vuelve a Inicio.
export const restaurarGrupo = (elemento, padreDisponible) => enLotes(elemento.miembros, (batch, n) =>
  batch.update(doc(db, COLECCION_ARCHIVO, n.id), {
    ...SIN_ELIMINAR,
    ...(n.id === elemento.id && !padreDisponible ? { padreId: null } : {}),
  }));

// Borra para siempre los archivos del grupo (Storage) y sus registros.
export const eliminarGrupoDefinitivo = async (elemento) => {
  for (const n of elemento.miembros.filter((m) => m.tipo === 'archivo' && m.ruta)) {
    try {
      await deleteObject(ref(storage, n.ruta));
    } catch (err) {
      if (err?.code !== 'storage/object-not-found') throw err;
    }
  }
  await enLotes(elemento.miembros, (batch, n) => batch.delete(doc(db, COLECCION_ARCHIVO, n.id)));
};
