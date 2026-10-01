// "OC sin PDF" de Ingreso de Órdenes. Se arma con el índice de OC (caché
// local; 1 lectura de ocImport/meta) y el registro de PDF (1 lectura de
// ordenesOC/registroPdf): 2 lecturas al abrir, sin leer filas de Firestore.
// Cada PDF subido actualiza el registro en memoria y la OC sale de la tabla.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useToast } from '../../../../../../context/ToastContext';
import { useModal } from '../../../../../../context/ModalContext';
import { obtenerIndiceOC } from '../../../shared/ocIndex/indiceOCRemoto';
import { agruparIndicePorOC, listarOCSinPdf, clasificarArchivosOC } from '../../../shared/ordenesOC/ordenesOCHelpers';
import { subirPdfOC, mensajeErrorPdfOC } from '../../../shared/ordenesOC/ordenesOCStorage';
import { leerRegistroPdfOC, registrarPdfOC } from '../../../shared/ordenesOC/registroPdfOC';
import { normalizarTexto } from '../../../shared/ocIndex/normalizacionOC';

export const TAMANO_PAGINA_OC_SIN_PDF = 50;

export const filtrarOCSinPdf = (filas, { anio, mes, busqueda }) => {
  const periodo = anio ? (mes ? `${anio}-${mes}` : anio) : '';
  const texto = normalizarTexto(busqueda);
  return filas.filter((f) => {
    if (periodo && !f.fechas.some(fecha => fecha.startsWith(periodo))) return false;
    if (!texto) return true;
    return normalizarTexto([f.oc, ...f.admisiones, ...f.pacientes, ...f.empresas].join(' ')).includes(texto);
  });
};

export const useOCSinPdf = () => {
  const { showToast } = useToast();
  const { confirmAction } = useModal();

  const [indice, setIndice] = useState(null);
  const [registro, setRegistro] = useState({});
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const [anio, setAnio] = useState('');
  const [mes, setMes] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [pagina, setPagina] = useState(1);

  const [progreso, setProgreso] = useState(null); // { actual, total, porcentaje }
  const [resumen, setResumen] = useState(null);

  // 2 lecturas: ocImport/meta (el índice sale de la caché local si la
  // versión coincide) + ordenesOC/registroPdf. `intento` vuelve a cargar.
  const [intento, setIntento] = useState(0);
  useEffect(() => {
    let vigente = true;
    Promise.all([obtenerIndiceOC(), leerRegistroPdfOC()])
      .then(([{ meta, indice: idx }, pdfs]) => {
        if (!vigente) return;
        if (!meta) throw new Error('Aún no hay un índice de OC: importa el Excel en Importar Detalles OC.');
        setIndice(idx);
        setRegistro(pdfs);
        setError(null);
      })
      .catch((err) => {
        console.error('Error al cargar las OC sin PDF:', err);
        if (vigente) setError(err.message || 'No se pudieron cargar las OC.');
      })
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, [intento]);

  const cargar = () => { setCargando(true); setError(null); setIntento(n => n + 1); };

  const porOC = useMemo(() => agruparIndicePorOC(indice), [indice]);
  const filas = useMemo(() => listarOCSinPdf(porOC, registro), [porOC, registro]);

  const anios = useMemo(() => [...new Set(filas.flatMap(f => f.fechas.map(x => x.slice(0, 4))))].sort().reverse(), [filas]);
  const meses = useMemo(() => (anio
    ? [...new Set(filas.flatMap(f => f.fechas.filter(x => x.startsWith(anio)).map(x => x.slice(5, 7))))].sort()
    : []), [filas, anio]);

  const filasFiltradas = useMemo(() => filtrarOCSinPdf(filas, { anio, mes, busqueda }), [filas, anio, mes, busqueda]);
  const totalPaginas = Math.max(1, Math.ceil(filasFiltradas.length / TAMANO_PAGINA_OC_SIN_PDF));
  const paginaSegura = Math.min(pagina, totalPaginas);
  const filasPagina = useMemo(() => {
    const inicio = (paginaSegura - 1) * TAMANO_PAGINA_OC_SIN_PDF;
    return filasFiltradas.slice(inicio, inicio + TAMANO_PAGINA_OC_SIN_PDF);
  }, [filasFiltradas, paginaSegura]);

  const cambiarAnio = (valor) => { setAnio(valor); setMes(''); setPagina(1); };
  const cambiarMes = (valor) => { setMes(valor); setPagina(1); };
  const cambiarBusqueda = (valor) => { setBusqueda(valor); setPagina(1); };

  const onRegistrado = useCallback((oc, entrada) => {
    setRegistro(prev => ({ ...prev, [oc]: entrada }));
  }, []);

  const preguntar = (titulo, mensaje, opciones) => new Promise((resolve) => {
    confirmAction(titulo, mensaje, () => resolve(true), { ...opciones, onCancel: () => resolve(false) });
  });

  // Subida masiva: clasifica en el navegador, pregunta UNA vez si reemplazar
  // las OC que ya tenían PDF (por defecto no) y sube de a uno. Un archivo con
  // error se anota y se sigue con el resto.
  const subirMasivo = async (archivos) => {
    if (progreso || !indice || archivos.length === 0) return;
    setResumen(null);
    const { aSubir, yaTenian, rechazados } = clasificarArchivosOC(archivos, { porOC, registro });

    let omitidos = yaTenian;
    if (yaTenian.length > 0) {
      const lista = yaTenian.slice(0, 8).map(y => y.oc).join(', ') + (yaTenian.length > 8 ? '…' : '');
      const reemplazar = await preguntar(
        'OC que ya tienen PDF',
        `${yaTenian.length} archivo(s) son de OC que ya tienen PDF (${lista}). ¿Reemplazarlos? Si no, se omiten.`,
        { confirmText: 'Reemplazar', cancelText: 'No reemplazar', type: 'warning' }
      );
      if (reemplazar) { aSubir.push(...yaTenian); omitidos = []; }
    }

    const subidos = [];
    const fallidos = [];
    for (let i = 0; i < aSubir.length; i++) {
      const { file, oc } = aSubir[i];
      setProgreso({ actual: i + 1, total: aSubir.length, porcentaje: 0 });
      try {
        await subirPdfOC(oc, file, (porcentaje) => setProgreso({ actual: i + 1, total: aSubir.length, porcentaje }));
        const entrada = await registrarPdfOC(oc);
        onRegistrado(oc, entrada);
        subidos.push({ nombre: file.name, oc });
      } catch (err) {
        console.error(`Error al subir el PDF de la OC ${oc}:`, err);
        fallidos.push({ nombre: file.name, tipo: 'ERROR', motivo: mensajeErrorPdfOC(err) });
      }
    }
    setProgreso(null);

    const porTipo = (tipo) => rechazados.filter(r => r.tipo === tipo);
    const r = {
      subidos,
      noEncontrada: porTipo('NO_ENCONTRADA'),
      nombreNoReconocido: porTipo('NOMBRE'),
      noPdf: porTipo('NO_PDF'),
      yaTenian: omitidos.map(({ file, oc }) => ({ nombre: file.name, oc })),
      otros: [...porTipo('TAMANO'), ...porTipo('DUPLICADO'), ...fallidos]
    };
    setResumen(r);
    const noSubidos = archivos.length - subidos.length;
    showToast(
      `${subidos.length} PDF subido(s)${noSubidos ? ` · ${noSubidos} no subido(s), revisa el resumen` : ''}.`,
      subidos.length && !noSubidos ? 'success' : noSubidos && !subidos.length ? 'error' : 'info'
    );
  };

  return {
    cargando, error, recargar: cargar,
    totalOC: porOC.size, totalSinPdf: filas.length,
    anio, setAnio: cambiarAnio, anios,
    mes, setMes: cambiarMes, meses,
    busqueda, setBusqueda: cambiarBusqueda,
    filasPagina, totalFiltradas: filasFiltradas.length,
    pagina: paginaSegura, setPagina, totalPaginas,
    registro, onRegistrado,
    progreso, resumen, cerrarResumen: () => setResumen(null),
    subirMasivo
  };
};
