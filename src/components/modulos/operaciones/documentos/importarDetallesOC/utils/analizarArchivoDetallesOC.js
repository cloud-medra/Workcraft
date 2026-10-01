// Lectura + planificación de una importación (pura, sin Firebase). Corre en
// el Web Worker (importarDetallesOC.worker.js) o, si no hay Workers, en el
// hilo principal con pausas entre pasos.
import { leerFilasDeBuffer } from './leerFilasDelExcel';
import { planificarImportacion } from './planificarImportacion';

const pausa = () => new Promise(r => setTimeout(r, 0));

export const analizarArchivo = async (buffer, snapshot, onProgreso) => {
  onProgreso?.({ etapa: 'leyendo' });
  await pausa();
  const lectura = leerFilasDeBuffer(buffer);
  onProgreso?.({ etapa: 'comparando', total: lectura.filas.length });
  await pausa();
  const plan = planificarImportacion(lectura.filas, snapshot || {});
  const { filas, ...resto } = lectura; // eslint-disable-line no-unused-vars
  return { lectura: resto, plan };
};

// Desde la pantalla: usa el Worker si existe. `snapshot` viaja copiado
// (structured clone); el ArrayBuffer del archivo se transfiere sin copiar.
export const analizarArchivoEnSegundoPlano = async (file, snapshot, onProgreso) => {
  const buffer = await file.arrayBuffer();
  if (typeof Worker === 'undefined') return analizarArchivo(buffer, snapshot, onProgreso);
  let worker;
  try {
    worker = new Worker(new URL('./importarDetallesOC.worker.js', import.meta.url), { type: 'module' });
  } catch (err) {
    console.warn('No se pudo iniciar el Web Worker; se analiza en la pantalla:', err);
    return analizarArchivo(buffer, snapshot, onProgreso);
  }
  return new Promise((resolve, reject) => {
    worker.onmessage = ({ data }) => {
      if (data.tipo === 'progreso') { onProgreso?.(data); return; }
      worker.terminate();
      if (data.tipo === 'listo') resolve(data.resultado);
      else reject(new Error(data.mensaje));
    };
    worker.onerror = (e) => { worker.terminate(); reject(new Error(e.message || 'Error en el Web Worker de importación')); };
    worker.postMessage({ buffer, snapshot }, [buffer]);
  });
};
