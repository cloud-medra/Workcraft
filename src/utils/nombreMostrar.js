// Preferencia "Nombre a mostrar" (Ajustes → Configuración de privacidad).
// Se guarda en usuarios/{uid}.nombreMostrar, junto al resto de preferencias
// del usuario (modoPantalla, ordenModulos, ...). Única fuente para resolver
// qué nombre del usuario logueado se muestra en los saludos.

export const OPCIONES_NOMBRE_MOSTRAR = [
  { valor: 'usuario', label: 'Usuario', descripcion: 'Tu nombre de usuario', campo: 'nombreUsuario' },
  { valor: 'nombreCompleto', label: 'Nombre completo', descripcion: 'Tu nombre y apellidos', campo: 'nombreCompleto' },
  { valor: 'email', label: 'Correo electrónico', descripcion: 'Tu correo de acceso', campo: 'email' }
];

export const NOMBRE_MOSTRAR_POR_DEFECTO = 'nombreCompleto';

// Orden de respaldo si el dato elegido está vacío.
const ORDEN_RESPALDO = ['nombreCompleto', 'usuario', 'email'];

const opcionPorValor = (valor) => OPCIONES_NOMBRE_MOSTRAR.find(o => o.valor === valor);

export const preferenciaNombreMostrar = (userData) =>
  opcionPorValor(userData?.nombreMostrar) ? userData.nombreMostrar : NOMBRE_MOSTRAR_POR_DEFECTO;

// Devuelve el nombre a mostrar según la preferencia del usuario, con
// respaldo al siguiente dato disponible. Con `mayusculas`, los nombres se
// pasan a mayúsculas (como los saludos actuales) pero el correo no.
export const obtenerNombreMostrar = (userData, { mayusculas = false } = {}) => {
  const preferida = preferenciaNombreMostrar(userData);
  const orden = [preferida, ...ORDEN_RESPALDO.filter(v => v !== preferida)];

  for (const valor of orden) {
    const texto = String(userData?.[opcionPorValor(valor).campo] ?? '').trim();
    if (texto) return mayusculas && valor !== 'email' ? texto.toUpperCase() : texto;
  }
  return '';
};
