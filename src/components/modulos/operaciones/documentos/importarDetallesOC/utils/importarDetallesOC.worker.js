// Web Worker de Importar Detalles OC: lee el Excel y lo compara contra el
// snapshot fuera del hilo de la pantalla, para que no se congele con
// archivos de miles de filas. Sin Firebase: solo lógica pura.
import { analizarArchivo } from './analizarArchivoDetallesOC';

self.onmessage = async ({ data }) => {
  try {
    const resultado = await analizarArchivo(data.buffer, data.snapshot, (p) => self.postMessage({ tipo: 'progreso', ...p }));
    self.postMessage({ tipo: 'listo', resultado });
  } catch (err) {
    self.postMessage({ tipo: 'error', mensaje: err?.message || String(err) });
  }
};
