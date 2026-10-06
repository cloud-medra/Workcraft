// =====================================================================
// Grilla tipo Excel de Carga Masiva: columnas de ingreso, filas y pegado
// desde el portapapeles (formato de Excel: columnas separadas por
// tabulación y filas por salto de línea).
// =====================================================================

export const COLUMNAS_INGRESO = [
  { key: 'admision', label: 'Admisión', ancho: 'w-[90px]' },
  { key: 'paciente', label: 'Paciente', ancho: 'w-[170px]' },
  { key: 'medico', label: 'Médico', ancho: 'w-[160px]' },
  { key: 'fecha', label: 'Fecha cirugía', ancho: 'w-[100px]' },
  { key: 'proveedor', label: 'Proveedor', ancho: 'w-[130px]' },
  { key: 'codigo', label: 'Código interno', ancho: 'w-[110px]' },
  { key: 'cantidad', label: 'Cantidad', ancho: 'w-[70px]' },
  { key: 'delivery', label: 'Delivery', ancho: 'w-[110px]' }
];

export const CLAVES_INGRESO = COLUMNAS_INGRESO.map((c) => c.key);

let contadorFilas = 0;

export const crearFilaVacia = () => {
  contadorFilas += 1;
  return {
    id: `fila-${Date.now().toString(36)}-${contadorFilas}`,
    valores: Object.fromEntries(CLAVES_INGRESO.map((k) => [k, ''])),
    // null = sin cargar (o editada después de "Cargar").
    resultado: null
  };
};

export const crearFilasVacias = (cantidad) => Array.from({ length: cantidad }, crearFilaVacia);

export const filaEstaVacia = (fila) => CLAVES_INGRESO.every((k) => String(fila.valores[k] ?? '').trim() === '');

// Separación simple (sin comillas) por salto de línea y tabulación.
const separarSimple = (texto) => texto.split('\n').map((linea) => linea.split('\t'));

// Texto del portapapeles -> matriz de celdas (string[][]).
// - Acepta \r\n, \r o \n como salto de fila.
// - Respeta celdas entre comillas (Excel las usa cuando la celda contiene
//   saltos de línea, tabulaciones o comillas; "" es una comilla literal).
// - Ignora la última línea vacía que agrega Excel al copiar.
export const parsearTextoPortapapeles = (texto) => {
  if (texto === null || texto === undefined) return [];
  const t = String(texto).replace(/\r\n?/g, '\n');
  if (t === '') return [];

  const filas = [];
  let fila = [];
  let celda = '';
  let enComillas = false;

  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (enComillas) {
      if (c === '"') {
        if (t[i + 1] === '"') {
          celda += '"';
          i++;
        } else {
          enComillas = false;
        }
      } else {
        celda += c;
      }
    } else if (c === '"' && celda === '') {
      enComillas = true;
    } else if (c === '\t') {
      fila.push(celda);
      celda = '';
    } else if (c === '\n') {
      fila.push(celda);
      filas.push(fila);
      fila = [];
      celda = '';
    } else {
      celda += c;
    }
  }

  // Comilla sin cerrar: no era una celda entre comillas de Excel, sino
  // texto que empieza con comilla. Se separa sin interpretar comillas.
  const matriz = enComillas ? separarSimple(t) : [...filas, [...fila, celda]];

  const ultima = matriz[matriz.length - 1];
  if (matriz.length > 0 && ultima.length === 1 && ultima[0] === '') matriz.pop();

  return matriz;
};

// Pega `matriz` en `filas` a partir de (filaInicio, colInicio), hacia la
// derecha y hacia abajo. Las columnas que se salen de la grilla se
// ignoran; si faltan filas se agregan con `crearFila`. Las filas tocadas
// quedan sin cargar (resultado = null). No muta `filas`.
export const pegarMatrizEnFilas = (filas, filaInicio, colInicio, matriz, crearFila = crearFilaVacia) => {
  const nuevas = [...filas];
  const totalCols = CLAVES_INGRESO.length;

  matriz.forEach((valoresFila, r) => {
    const indiceFila = filaInicio + r;
    while (nuevas.length <= indiceFila) nuevas.push(crearFila());

    const fila = nuevas[indiceFila];
    const valores = { ...fila.valores };
    let cambio = false;

    valoresFila.forEach((valor, c) => {
      const indiceCol = colInicio + c;
      if (indiceCol < 0 || indiceCol >= totalCols) return;
      valores[CLAVES_INGRESO[indiceCol]] = String(valor ?? '').trim();
      cambio = true;
    });

    if (cambio) nuevas[indiceFila] = { ...fila, valores, resultado: null };
  });

  return nuevas;
};
