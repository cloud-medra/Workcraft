// Lógica pura del Archivo digital (carpetas y archivos). Los nodos vienen de
// Firestore (documentos_archivo): { id, tipo: 'carpeta'|'archivo', nombre,
// padreId (null = Inicio), tamano?, subidoEl?, eliminado, eliminadoGrupo }.
// Al eliminar una carpeta, ella y todo su contenido quedan con
// eliminadoGrupo = id de la carpeta: la papelera muestra un elemento por
// grupo y restaurar devuelve el grupo completo.

export const RUTA_VISTA_ARCHIVO = '/documentos/archivoDigital';
export const COLECCION_ARCHIVO = 'documentos_archivo';
export const CARPETA_STORAGE_ARCHIVO = 'documentos_archivo';
export const TAMANO_MAXIMO_MB = 25;
export const LARGO_MAXIMO_NOMBRE = 120;

// Formatos permitidos (deben coincidir con storage.rules).
export const FORMATOS = [
  { tipo: 'application/pdf', extensiones: ['pdf'], etiqueta: 'PDF' },
  { tipo: 'image/jpeg', extensiones: ['jpg', 'jpeg'], etiqueta: 'JPG' },
  { tipo: 'image/png', extensiones: ['png'], etiqueta: 'PNG' },
  { tipo: 'image/webp', extensiones: ['webp'], etiqueta: 'WEBP' },
];
export const FORMATOS_TEXTO = FORMATOS.map((f) => f.etiqueta).join(', ');
export const ACEPTA_INPUT = FORMATOS.flatMap((f) => [f.tipo, ...f.extensiones.map((e) => `.${e}`)]).join(',');

const extension = (nombre) => (String(nombre).match(/\.([^.]+)$/)?.[1] || '').toLowerCase();

// Tipo de contenido con que se sube (por MIME o, si el navegador no lo da,
// por extensión). null si no es un formato permitido.
export const tipoContenido = (file) => {
  const porTipo = FORMATOS.find((f) => f.tipo === file?.type);
  if (porTipo) return porTipo.tipo;
  const ext = extension(file?.name);
  return FORMATOS.find((f) => f.extensiones.includes(ext))?.tipo || null;
};

// Mensaje claro si el archivo no se puede subir (null = se puede).
export const validarArchivo = (file) => {
  if (!file) return 'Falta el archivo.';
  if (!tipoContenido(file)) {
    const ext = extension(file.name).toUpperCase();
    const detalle = ['TIF', 'TIFF', 'HEIC', 'HEIF'].includes(ext)
      ? ` Los ${ext} no se pueden previsualizar en el navegador: conviértelo a PDF o JPG.`
      : '';
    return `Formato no permitido${ext ? ` (${ext})` : ''}. Formatos permitidos: ${FORMATOS_TEXTO}.${detalle}`;
  }
  if ((file.size || 0) > TAMANO_MAXIMO_MB * 1024 * 1024) {
    return `Supera el máximo de ${TAMANO_MAXIMO_MB} MB por archivo (${(file.size / 1024 / 1024).toFixed(1)} MB).`;
  }
  return null;
};

export const validarNombre = (nombre) => {
  const t = String(nombre ?? '').trim();
  if (!t) return 'Escribe un nombre.';
  if (/[/\\]/.test(t)) return 'El nombre no puede tener "/" ni "\\".';
  if (t.length > LARGO_MAXIMO_NOMBRE) return `Máximo ${LARGO_MAXIMO_NOMBRE} caracteres.`;
  return null;
};

const COLLATOR = new Intl.Collator('es', { sensitivity: 'base', numeric: true });
const normalizar = (t) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

// Carpetas primero, luego archivos; dentro de cada grupo, orden natural.
export const compararNodos = (a, b) =>
  (a.tipo === b.tipo ? 0 : a.tipo === 'carpeta' ? -1 : 1) || COLLATOR.compare(a.nombre, b.nombre);

// Índice de los nodos visibles (no eliminados).
export const construirIndice = (nodos) => {
  const porId = new Map();
  const hijos = new Map();
  nodos.filter((n) => !n.eliminado).forEach((n) => {
    porId.set(n.id, n);
    const padre = n.padreId || null;
    if (!hijos.has(padre)) hijos.set(padre, []);
    hijos.get(padre).push(n);
  });
  hijos.forEach((lista) => lista.sort(compararNodos));
  return { porId, hijos };
};

export const hijosDe = (indice, padreId) => indice.hijos.get(padreId || null) || [];

// [{ id: null, nombre: 'Inicio' }, ...carpetas hasta `id`]
export const rutaHasta = (indice, id) => {
  const ruta = [];
  let actual = id ? indice.porId.get(id) : null;
  const vistos = new Set();
  while (actual && !vistos.has(actual.id)) {
    vistos.add(actual.id);
    ruta.unshift({ id: actual.id, nombre: actual.nombre });
    actual = actual.padreId ? indice.porId.get(actual.padreId) : null;
  }
  return [{ id: null, nombre: 'Inicio' }, ...ruta];
};

// Todo lo que hay dentro de una carpeta (a cualquier profundidad).
export const descendientes = (indice, id) => {
  const resultado = [];
  const pendientes = [...hijosDe(indice, id)];
  while (pendientes.length) {
    const n = pendientes.pop();
    resultado.push(n);
    if (n.tipo === 'carpeta') pendientes.push(...hijosDe(indice, n.id));
  }
  return {
    nodos: resultado,
    carpetas: resultado.filter((n) => n.tipo === 'carpeta').length,
    archivos: resultado.filter((n) => n.tipo === 'archivo').length,
  };
};

// ¿`destinoId` es la carpeta `id` o está dentro de ella? (no se puede mover
// una carpeta dentro de sí misma).
export const estaDentroDe = (indice, destinoId, id) => {
  let actual = destinoId;
  const vistos = new Set();
  while (actual && !vistos.has(actual)) {
    if (actual === id) return true;
    vistos.add(actual);
    actual = indice.porId.get(actual)?.padreId || null;
  }
  return false;
};

// Nombre libre entre los hermanos: "Contrato.pdf" → "Contrato (2).pdf".
// La comparación ignora mayúsculas y tildes. `excluirId`: el propio nodo al renombrar.
export const nombreUnico = (nombre, hermanos, excluirId = null) => {
  const usados = new Set(hermanos.filter((h) => h.id !== excluirId).map((h) => normalizar(h.nombre)));
  const limpio = String(nombre).trim();
  if (!usados.has(normalizar(limpio))) return limpio;
  const m = limpio.match(/^(.*?)(\.[^.]+)?$/);
  const base = m[1];
  const ext = m[2] || '';
  for (let n = 2; ; n += 1) {
    const candidato = `${base} (${n})${ext}`;
    if (!usados.has(normalizar(candidato))) return candidato;
  }
};

// Búsqueda de archivos y carpetas por cualquier parte del nombre (sin tildes
// ni mayúsculas) sobre el árbol completo ya cargado. Está separada para poder
// cambiar la estrategia (por ejemplo, a una consulta en Firestore) si el
// volumen crece mucho. Devuelve los nodos con su ubicación ("Inicio / A / B").
export const buscarNodos = (indice, texto, limite = 200) => {
  const q = normalizar(texto);
  if (!q) return [];
  const resultados = [];
  indice.porId.forEach((n) => {
    if (normalizar(n.nombre).includes(q)) {
      resultados.push({ ...n, ubicacion: rutaHasta(indice, n.padreId).map((r) => r.nombre).join(' / ') });
    }
  });
  return resultados.sort(compararNodos).slice(0, limite);
};

// Papelera: un elemento por grupo eliminado (la carpeta o archivo que se
// eliminó), con cuánto contenía. Más reciente primero.
export const elementosPapelera = (nodos) => {
  const grupos = new Map();
  nodos.filter((n) => n.eliminado && n.eliminadoGrupo).forEach((n) => {
    if (!grupos.has(n.eliminadoGrupo)) grupos.set(n.eliminadoGrupo, []);
    grupos.get(n.eliminadoGrupo).push(n);
  });
  const ms = (n) => (n.eliminadoEl?.toMillis ? n.eliminadoEl.toMillis() : 0);
  return [...grupos.entries()]
    .map(([grupo, miembros]) => {
      const raiz = miembros.find((m) => m.id === grupo);
      if (!raiz) return null;
      const contenido = miembros.filter((m) => m.id !== grupo);
      return {
        ...raiz,
        miembros,
        carpetas: contenido.filter((m) => m.tipo === 'carpeta').length,
        archivos: contenido.filter((m) => m.tipo === 'archivo').length,
      };
    })
    .filter(Boolean)
    .sort((a, b) => ms(b) - ms(a));
};

export const formatearTamano = (bytes) => {
  if (!Number.isFinite(bytes)) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

// Nombre seguro para la ruta de Storage (el nombre visible vive en Firestore).
export const nombreParaStorage = (nombre) =>
  Array.from(String(nombre)).map((c) => (c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127 ? ' ' : c)).join('')
    .replace(/[/\\#[\]*?]/g, '_').trim() || 'archivo';
