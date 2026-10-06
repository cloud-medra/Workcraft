// "OC sin PDF" de Ingreso de Órdenes. La pantalla abre con la tabla VACÍA.
// Los selectores muestran solo los meses que tienen OC importadas
// (ocImport/meta.periodos: 1 lectura al abrir). Al elegir año y mes se leen solo las gestiones de ese mes
// (implantes_gestiones/{anio}/mes/{mes}) + el registro de PDF (1 lectura, la
// primera vez en la sesión). Un mes ya visto sale de la caché en memoria.
// La subida masiva no necesita mes: busca cada OC en el índice de OC (caché
// local), que se carga recién en la primera subida masiva.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useToast } from '../../../../../../context/ToastContext';
import { useModal } from '../../../../../../context/ModalContext';
import { obtenerIndiceOC, obtenerPeriodosOC } from '../../../shared/ocIndex/indiceOCRemoto';
import { agruparIndicePorOC, clasificarArchivosOC } from '../../../shared/ordenesOC/ordenesOCHelpers';
import { subirPdfOC, mensajeErrorPdfOC } from '../../../shared/ordenesOC/ordenesOCStorage';
import { leerRegistroPdfOC, registrarPdfOC } from '../../../shared/ordenesOC/registroPdfOC';
import { leerGestionesConOCDelMes, filasOCSinPdfDesdeGestiones } from '../../../shared/ordenesOC/ocSinPdfPeriodo';
import { normalizarTexto } from '../../../shared/ocIndex/normalizacionOC';
import { ordenarMeses } from '../../../../../../utils/ordenarMeses';

export const TAMANO_PAGINA_OC_SIN_PDF = 50;

// Periodos 'YYYY-MM' (del más reciente al más antiguo) -> años y, para el
// año elegido, sus meses: años del más reciente al más antiguo, meses en
// orden cronológico (ordenarMeses).
export const aniosDePeriodos = (periodos) => [...new Set(periodos.map(p => p.slice(0, 4)))].sort().reverse();
export const mesesDePeriodos = (periodos, anio) => (anio
  ? ordenarMeses(new Set(periodos.filter(p => p.startsWith(`${anio}-`)).map(p => p.slice(5, 7))))
  : []);

export const filtrarOCSinPdf = (filas, busqueda) => {
  const texto = normalizarTexto(busqueda);
  if (!texto) return filas;
  return filas.filter(f => normalizarTexto([f.oc, ...f.admisiones, ...f.pacientes, ...f.empresas].join(' ')).includes(texto));
};

export const useOCSinPdf = () => {
  const { showToast } = useToast();
  const { confirmAction } = useModal();

  const [anio, setAnioState] = useState('');
  const [mes, setMesState] = useState('');
  const [busqueda, setBusquedaState] = useState('');
  const [pagina, setPagina] = useState(1);

  // Mes cargado: { clave, gestiones, lecturas, desdeCache } o null.
  const [periodo, setPeriodo] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const [registro, setRegistro] = useState(null); // null = aún no leído
  const [recarga, setRecarga] = useState({ n: 0, forzar: false });

  const [indice, setIndice] = useState(null); // solo para la subida masiva
  // Periodos con OC: { meta, periodos } o null mientras carga.
  const [periodosOC, setPeriodosOC] = useState(null);
  const [errorPeriodos, setErrorPeriodos] = useState(null);

  useEffect(() => {
    let vigente = true;
    obtenerPeriodosOC()
      .then(({ meta, periodos, indice: idx }) => {
        if (!vigente) return;
        setPeriodosOC({ meta, periodos });
        if (idx) setIndice(idx); // meta antiguo: ya se cargó el índice para calcularlos
      })
      .catch((err) => {
        console.error('Error al leer los períodos con OC:', err);
        if (vigente) { setPeriodosOC({ meta: null, periodos: [] }); setErrorPeriodos('No se pudieron cargar los períodos.'); }
      });
    return () => { vigente = false; };
  }, []);
  const [progreso, setProgreso] = useState(null); // { actual, total, porcentaje }
  const [preparando, setPreparando] = useState(false); // leyendo índice/registro antes de subir
  const [resumen, setResumen] = useState(null);

  const claveMes = anio && mes ? `${anio}-${mes}` : '';

  // Carga del mes elegido (nada si falta año o mes). Los setState van en
  // los callbacks de la promesa, no síncronos dentro del efecto.
  useEffect(() => {
    if (!claveMes) return undefined;
    let vigente = true;
    Promise.all([
      leerGestionesConOCDelMes(anio, mes, { forzar: recarga.forzar }),
      leerRegistroPdfOC({ usarCache: true })
    ])
      .then(([mesLeido, reg]) => {
        if (!vigente) return;
        setPeriodo({ clave: claveMes, gestiones: mesLeido.gestiones, desdeCache: mesLeido.desdeCache, lecturas: mesLeido.lecturas + reg.lecturas });
        setRegistro(reg.pdfs);
        setError(null);
      })
      .catch((err) => {
        console.error('Error al cargar las OC sin PDF del mes:', err);
        if (vigente) setError('No se pudieron cargar las gestiones del mes.');
      })
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, [claveMes, anio, mes, recarga]);

  const elegir = (nuevoAnio, nuevoMes) => {
    setAnioState(nuevoAnio);
    setMesState(nuevoMes);
    setPagina(1);
    setError(null);
    setRecarga(r => ({ n: r.n, forzar: false }));
    if (nuevoAnio && nuevoMes) setCargando(true);
  };
  const setAnio = (valor) => elegir(valor, valor ? mes : '');
  const setMes = (valor) => elegir(anio, valor);
  const setBusqueda = (valor) => { setBusquedaState(valor); setPagina(1); };
  const actualizarMes = () => { if (!claveMes) return; setCargando(true); setRecarga(r => ({ n: r.n + 1, forzar: true })); };

  const periodoVigente = periodo && periodo.clave === claveMes ? periodo : null;
  const filas = useMemo(
    () => (periodoVigente ? filasOCSinPdfDesdeGestiones(periodoVigente.gestiones, registro || {}) : []),
    [periodoVigente, registro]
  );
  const filasFiltradas = useMemo(() => filtrarOCSinPdf(filas, busqueda), [filas, busqueda]);
  const totalPaginas = Math.max(1, Math.ceil(filasFiltradas.length / TAMANO_PAGINA_OC_SIN_PDF));
  const paginaSegura = Math.min(pagina, totalPaginas);
  const filasPagina = useMemo(() => {
    const inicio = (paginaSegura - 1) * TAMANO_PAGINA_OC_SIN_PDF;
    return filasFiltradas.slice(inicio, inicio + TAMANO_PAGINA_OC_SIN_PDF);
  }, [filasFiltradas, paginaSegura]);

  const onRegistrado = useCallback((oc, entrada) => {
    setRegistro(prev => ({ ...(prev || {}), [oc]: entrada }));
  }, []);

  const preguntar = (titulo, mensaje, opciones) => new Promise((resolve) => {
    confirmAction(titulo, mensaje, () => resolve(true), { ...opciones, onCancel: () => resolve(false) });
  });

  // Subida masiva: índice de OC (caché local; 1 lectura de ocImport/meta la
  // primera vez) + registro (caché de la sesión). Pregunta UNA vez si
  // reemplazar las OC que ya tenían PDF (por defecto no) y sube de a uno;
  // un archivo con error se anota y se sigue con el resto.
  const subirMasivo = async (archivos) => {
    if (progreso || preparando || archivos.length === 0) return;
    setResumen(null);

    let idx = indice;
    let reg = registro;
    setPreparando(true);
    try {
      if (!idx) {
        // Si los períodos ya leyeron el meta, no se vuelve a leer.
        const { meta, indice: descargado } = await obtenerIndiceOC({ metaConocida: periodosOC?.meta || undefined });
        if (!meta) throw new Error('Aún no hay un índice de OC: importa el Excel en Importar Detalles OC.');
        idx = descargado;
        setIndice(idx);
      }
      if (!reg) {
        reg = (await leerRegistroPdfOC({ usarCache: true })).pdfs;
        setRegistro(reg);
      }
    } catch (err) {
      console.error('Error al preparar la subida masiva de OC:', err);
      showToast(err.message || 'No se pudo cargar el índice de OC.', 'error');
      return;
    } finally {
      setPreparando(false);
    }

    const { aSubir, yaTenian, rechazados } = clasificarArchivosOC(archivos, { porOC: agruparIndicePorOC(idx), registro: reg });

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
    setResumen({
      subidos,
      noEncontrada: porTipo('NO_ENCONTRADA'),
      nombreNoReconocido: porTipo('NOMBRE'),
      noPdf: porTipo('NO_PDF'),
      yaTenian: omitidos.map(({ file, oc }) => ({ nombre: file.name, oc })),
      otros: [...porTipo('TAMANO'), ...porTipo('DUPLICADO'), ...fallidos]
    });
    const noSubidos = archivos.length - subidos.length;
    showToast(
      `${subidos.length} PDF subido(s)${noSubidos ? ` · ${noSubidos} no subido(s), revisa el resumen` : ''}.`,
      subidos.length && !noSubidos ? 'success' : noSubidos && !subidos.length ? 'error' : 'info'
    );
  };

  const periodos = periodosOC?.periodos || [];
  return {
    cargandoPeriodos: periodosOC === null,
    sinPeriodos: periodosOC !== null && periodos.length === 0,
    errorPeriodos,
    anio, setAnio, anios: aniosDePeriodos(periodos),
    mes, setMes, meses: mesesDePeriodos(periodos, anio),
    busqueda, setBusqueda,
    mesSeleccionado: Boolean(claveMes),
    cargando, error, actualizarMes,
    infoCarga: periodoVigente ? { lecturas: periodoVigente.lecturas, desdeCache: periodoVigente.desdeCache, gestiones: periodoVigente.gestiones.length } : null,
    totalSinPdf: filas.length,
    filasPagina, totalFiltradas: filasFiltradas.length,
    pagina: paginaSegura, setPagina, totalPaginas,
    registro: registro || {}, onRegistrado,
    progreso, preparando, resumen, cerrarResumen: () => setResumen(null),
    subirMasivo
  };
};
