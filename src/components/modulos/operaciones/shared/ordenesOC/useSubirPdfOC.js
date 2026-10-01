import { useState } from 'react';
import { useToast } from '../../../../../context/ToastContext';
import { useModal } from '../../../../../context/ModalContext';
import { esPdf, superaTamanoPdfOC, nombreCoincideConOC, nombreArchivoOC, claveOC, TAMANO_MAXIMO_PDF_OC_MB } from './ordenesOCHelpers';
import { subirPdfOC, obtenerBlobPdfOC, mensajeErrorPdfOC } from './ordenesOCStorage';
import { registrarPdfOC } from './registroPdfOC';

// Subida y apertura del PDF de UNA OC (pestaña Orden de Gestión de Implantes
// y cada fila de "OC sin PDF"). `registro` es el registro ya en memoria;
// onRegistrado(claveOC, entrada) lo actualiza sin volver a leerlo.
export const useSubirPdfOC = ({ registro = {}, onRegistrado } = {}) => {
  const { showToast } = useToast();
  const { confirmAction } = useModal();
  const [subiendo, setSubiendo] = useState(null); // { oc, porcentaje }
  const [abriendo, setAbriendo] = useState(null); // oc

  const preguntar = (titulo, mensaje, opciones = {}) => new Promise((resolve) => {
    confirmAction(titulo, mensaje, () => resolve(true), { ...opciones, onCancel: () => resolve(false) });
  });

  // Devuelve true si quedó subido y registrado.
  const subirParaOC = async (oc, archivos) => {
    const clave = claveOC(oc);
    const lista = Array.from(archivos || []);
    if (lista.length === 0 || subiendo) return false;
    if (lista.length > 1) {
      showToast('Cada OC tiene un solo PDF: suelta un archivo a la vez.', 'error');
      return false;
    }
    const [file] = lista;
    if (!esPdf(file)) { showToast(`"${file.name}" no es un archivo PDF.`, 'error'); return false; }
    if (superaTamanoPdfOC(file)) { showToast(`"${file.name}" supera el máximo de ${TAMANO_MAXIMO_PDF_OC_MB} MB.`, 'error'); return false; }

    if (!nombreCoincideConOC(file.name, clave)) {
      const seguir = await preguntar(
        'El nombre no coincide con la OC',
        `El archivo "${file.name}" no se llama ${nombreArchivoOC(clave)}. ¿Subirlo igual como PDF de la OC ${clave}?`,
        { confirmText: 'Subir igual', type: 'warning' }
      );
      if (!seguir) return false;
    }
    if (registro[clave]) {
      const reemplazar = await preguntar(
        'La OC ya tiene PDF',
        `La OC ${clave} ya tiene un PDF. ¿Reemplazarlo por "${file.name}"? Se reemplaza para todas las admisiones que usan esta OC.`,
        { confirmText: 'Reemplazar', cancelText: 'No reemplazar', type: 'warning' }
      );
      if (!reemplazar) return false;
    }

    setSubiendo({ oc: clave, porcentaje: 0 });
    try {
      await subirPdfOC(clave, file, (porcentaje) => setSubiendo({ oc: clave, porcentaje }));
      const entrada = await registrarPdfOC(clave);
      onRegistrado?.(clave, entrada);
      showToast(`PDF de la OC ${clave} subido.`, 'success');
      return true;
    } catch (err) {
      console.error('Error al subir el PDF de la OC:', err);
      showToast(`OC ${clave}: ${mensajeErrorPdfOC(err)}`, 'error');
      return false;
    } finally {
      setSubiendo(null);
    }
  };

  const verPdfOC = async (oc) => {
    const clave = claveOC(oc);
    setAbriendo(clave);
    try {
      const url = URL.createObjectURL(await obtenerBlobPdfOC(clave));
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      console.error('Error al abrir el PDF de la OC:', err);
      showToast(mensajeErrorPdfOC(err), 'error');
    } finally {
      setAbriendo(null);
    }
  };

  return { subirParaOC, verPdfOC, subiendo, abriendo };
};
