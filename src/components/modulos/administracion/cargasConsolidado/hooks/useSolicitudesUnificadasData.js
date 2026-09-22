import { useCallback, useEffect, useState } from 'react';
import {
  collection,
  collectionGroup,
  doc,
  query,
  where,
  orderBy,
  documentId,
  onSnapshot,
  writeBatch
} from 'firebase/firestore';
import * as XLSX from 'xlsx';
import { db } from '../../../../../firebaseConfig';
import { useToast } from '../../../../../context/ToastContext';
import { useModal } from '../../../../../context/ModalContext';
import { useUser } from '../../../../../context/UserContext';
import { refImputada as refImputadaImplantes, construirPayloadImputada } from '../../../operaciones/implantes/gestionImplantes/utils/imputadaSync';
import { registrarLogImplantes } from '../../../operaciones/implantes/gestionImplantes/utils/registrarLogImplantes';
import { registrarLogConsignacion } from '../../../operaciones/consignacion/utils/registrarLogConsignacion';
import { registrarLogHemodinamia } from '../../../operaciones/hemodinamia/gestionHemodinamia/utils/registrarLogHemodinamia';
import { cargarCandidatosSolicitudConsignacion } from '../../../operaciones/consignacion/solicitudConsignacion/utils/cargarCandidatosSolicitudConsignacion';
import { ORIGEN, normalizarSolicitudImplantes, normalizarSolicitudConsignacion, normalizarSolicitudHemodinamia, filtrarPorBusquedaYOrigen } from '../utils/normalizarFila';

const RANGO_MIN_IMPLANTES = 'implantes_gestiones/0000';
const RANGO_MAX_IMPLANTES = 'implantes_gestiones/9999';
const RANGO_MIN_HEMODINAMIA = 'hemodinamia_gestiones/0000';
const RANGO_MAX_HEMODINAMIA = 'hemodinamia_gestiones/9999';

const formatearFechaExcel = (fechaString) => {
  if (!fechaString || !fechaString.includes('-')) return fechaString || '';
  const [yyyy, mm, dd] = fechaString.split('-');
  return `${dd}-${mm}-${yyyy}`;
};

// Escucha el período activo de un módulo — mismo query que
// GestionesImplantesDetalleView.jsx / usePeriodoAbiertoModulo.
const usePeriodoActivo = (modulo) => {
  const [periodo, setPeriodo] = useState(null);
  useEffect(() => {
    const q = query(
      collection(db, 'cierres_periodos'),
      where('modulo', '==', modulo),
      where('estado', 'in', ['ABIERTO', 'REABIERTO'])
    );
    const unsub = onSnapshot(q, (snap) => {
      if (snap.empty) { setPeriodo(null); return; }
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      docs.sort((a, b) => (b.fechaApertura?.toMillis?.() || 0) - (a.fechaApertura?.toMillis?.() || 0));
      setPeriodo({ anio: docs[0].anio, mes: docs[0].mes });
    }, (err) => console.error(`Error al escuchar período de ${modulo}:`, err));
    return () => unsub();
  }, [modulo]);
  return periodo;
};

export const useSolicitudesUnificadasData = () => {
  const [bloquesImplantes, setBloquesImplantes] = useState([]);
  const [itemsConsignacion, setItemsConsignacion] = useState([]);
  const [docsHemodinamia, setDocsHemodinamia] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [exportando, setExportando] = useState(false);
  const [seleccionados, setSeleccionados] = useState(new Set());

  const [busqueda, setBusqueda] = useState('');
  const [origenesSeleccionados, setOrigenesSeleccionados] = useState([]);
  const toggleOrigen = (origen) => setOrigenesSeleccionados(prev =>
    prev.includes(origen) ? prev.filter(o => o !== origen) : [...prev, origen]
  );
  const limpiarOrigenes = () => setOrigenesSeleccionados([]);

  const { showToast } = useToast();
  const { confirmAction } = useModal();
  const { userData } = useUser();

  const periodoImplantes = usePeriodoActivo('implantes');
  const periodoConsignacion = usePeriodoActivo('consignacion');
  const periodoHemodinamia = usePeriodoActivo('hemodinamia');

  useEffect(() => {
    const q = query(
      collectionGroup(db, 'detalles'),
      where('solicitud', '==', 'SOLICITAR'),
      where(documentId(), '>=', RANGO_MIN_IMPLANTES),
      where(documentId(), '<', RANGO_MAX_IMPLANTES),
      orderBy(documentId())
    );
    const unsub = onSnapshot(q, (snap) => {
      setBloquesImplantes(snap.docs.map(d => ({ id: d.id, refPath: d.ref.path, ...d.data() })));
    }, (err) => console.error('Error al escuchar solicitudes de Implantes:', err));
    return () => unsub();
  }, []);

  useEffect(() => {
    const q = query(
      collectionGroup(db, 'detalles'),
      where('solicitud', '==', 'SOLICITAR'),
      where(documentId(), '>=', RANGO_MIN_HEMODINAMIA),
      where(documentId(), '<', RANGO_MAX_HEMODINAMIA),
      orderBy(documentId())
    );
    const unsub = onSnapshot(q, (snap) => {
      setDocsHemodinamia(snap.docs.map(d => ({ id: d.id, refPath: d.ref.path, ...d.data() })));
    }, (err) => console.error('Error al escuchar solicitudes de Hemodinamia:', err));
    return () => unsub();
  }, []);

  // Antes esto era un onSnapshot con solo `where('estado','==','CARGADO')`,
  // sin el desglose de guía por delivery que sí arma la pantalla nativa de
  // Consignación (SolicitudConsignacion.jsx) — por eso esta pestaña mostraba
  // menos filas que la nativa para el mismo período: a los ítems con guía
  // vinculada les faltaban sus filas de desglose de productos. Ahora
  // reutiliza exactamente la misma función de carga que usa la pantalla
  // nativa (cargarCandidatosSolicitudConsignacion), así ambas quedan
  // idénticas en qué traen y cuántas filas muestran. Es una carga puntual
  // (no en vivo), igual que la pantalla nativa — no hace falta live update
  // acá tampoco.
  const cargarConsignacion = useCallback(async () => {
    setCargando(true);
    try {
      const lista = await cargarCandidatosSolicitudConsignacion(false);
      setItemsConsignacion(lista);
    } catch (err) {
      console.error('Error al cargar solicitudes de Consignación:', err);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargarConsignacion(); }, [cargarConsignacion]);

  const filasCombinadas = [
    ...bloquesImplantes.map(normalizarSolicitudImplantes),
    ...itemsConsignacion.map(normalizarSolicitudConsignacion),
    ...docsHemodinamia.map(normalizarSolicitudHemodinamia)
  ];

  // Búsqueda por admisión/nombre + Origen se aplican sobre el conjunto
  // COMPLETO ya combinado (sin límite ni recorte previo) — ver comentario
  // arriba sobre por qué Consignación ahora trae el total real.
  const filas = filtrarPorBusquedaYOrigen(filasCombinadas, { busqueda, origenesSeleccionados });

  const toggleSeleccion = (id) => {
    setSeleccionados(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSeleccionarTodos = () => {
    setSeleccionados(prev => (prev.size === filas.length ? new Set() : new Set(filas.map(f => f.id))));
  };

  const handleExportarYMarcarSolicitado = () => {
    const filasSeleccionadas = filas.filter(f => seleccionados.has(f.id));
    if (filasSeleccionadas.length === 0) {
      showToast('Selecciona al menos un registro para exportar', 'error');
      return;
    }

    const seleccionImplantes = filasSeleccionadas.filter(f => f.origen === ORIGEN.IMPLANTES);
    const seleccionConsignacion = filasSeleccionadas.filter(f => f.origen === ORIGEN.CONSIGNACION);
    const seleccionHemodinamia = filasSeleccionadas.filter(f => f.origen === ORIGEN.HEMODINAMIA);
    // Las filas de desglose de guía (esFilaGuia) no tienen documento propio
    // (_raw.ref === null) — van al Excel igual que cualquier otra fila
    // seleccionada, pero se excluyen de las escrituras a Firestore más abajo
    // (mismo criterio que itemsConRef en la pantalla nativa de Consignación).
    const seleccionConsignacionConRef = seleccionConsignacion.filter(f => !f._raw.esFilaGuia);

    if (seleccionImplantes.length > 0 && !periodoImplantes) {
      showToast('No hay un período abierto para Implantes en Control Mensual. Ábrelo antes de exportar.', 'error');
      return;
    }
    if (seleccionConsignacionConRef.length > 0 && !periodoConsignacion) {
      showToast('No hay un período abierto para Consignación en Control Mensual. Ábrelo antes de exportar.', 'error');
      return;
    }

    if (seleccionHemodinamia.length > 0 && !periodoHemodinamia) {
      showToast('No hay un período abierto para Hemodinamia en Control Mensual. Ábrelo antes de exportar.', 'error');
      return;
    }

    confirmAction(
      'Exportar y Marcar como Solicitado',
      `Se exportarán ${filasSeleccionadas.length} fila(s) (${seleccionImplantes.length} de Implantes, ${seleccionConsignacion.length} de Consignación, ${seleccionHemodinamia.length} de Hemodinamia) a un único Excel. De las de Consignación, ${seleccionConsignacionConRef.length} ítem(s) reales quedarán marcados como SOLICITADO (las filas de desglose de guía son informativas y no tienen documento propio). Implantes y Hemodinamia se marcan completos. Cada uno se copiará a la colección de imputadas de su propio módulo. ¿Continuar?`,
      async () => {
        setExportando(true);
        try {
          const fechaHoy = new Date().toISOString().slice(0, 10);
          const fechaHoyFormato = formatearFechaExcel(fechaHoy);

          const filasImplantesExcel = [];
          const filasConsignacionExcel = [];
          const filasHemodinamiaExcel = [];
          const filasResumen = [];

          seleccionImplantes.forEach(fila => {
            const bloque = fila._raw;
            const items = bloque.items?.length ? bloque.items : [null];
            items.forEach(it => {
              filasImplantesExcel.push({
                'ID': fila.gestionId,
                'PACIENTE': fila.paciente,
                'MEDICO': fila.medico,
                'FECHA': formatearFechaExcel(fila.fecha),
                'EMPRESA': fila.empresa,
                'CODIGO': it?.codigo || '',
                'DESCRIPCION': it?.descriptorAuto || '',
                'CANTIDAD': it?.cantidad || '',
                'PRECIO': it?.precio || '',
                'LOTE': it?.lote || '',
                'VENCIMIENTO': it?.vencimiento ? formatearFechaExcel(it.vencimiento) : ''
              });
              filasResumen.push({
                'Origen': 'Implantes',
                'Ingreso': fechaHoyFormato,
                'Id': fila.gestionId,
                'Cód': it?.codigo || '',
                'Cant': it?.cantidad || '',
                'Venta': it?.venta || '',
                'Médico': fila.medico,
                'Fecha': formatearFechaExcel(fila.fecha),
                'Descripción': it?.descriptorAuto || ''
              });
            });
          });

          seleccionConsignacion.forEach(fila => {
            const it = fila._raw;
            filasConsignacionExcel.push({
              'ADMISION': fila.gestionId,
              'PACIENTE': fila.paciente,
              'MEDICO': fila.medico,
              'FECHA': formatearFechaExcel(fila.fecha),
              'EMPRESA': fila.empresa,
              'CODIGO': it.codigo || '',
              'DESCRIPCION': it.descripcion || '',
              'CANTIDAD': it.cantidad || '',
              'PRECIO': it.costo || '',
              'LOTE': it.lote || '',
              'VENCIMIENTO': it.vencimiento || ''
            });
            filasResumen.push({
              'Origen': 'Consignación',
              'Ingreso': fechaHoyFormato,
              'Id': fila.gestionId,
              'Cód': it.codigo || '',
              'Cant': it.cantidad || '',
              'Venta': it.venta || '',
              'Médico': fila.medico,
              'Fecha': formatearFechaExcel(fila.fecha),
              'Descripción': it.descripcion || ''
            });
          });

          seleccionHemodinamia.forEach(fila => {
            const bloque = fila._raw;
            const items = bloque.items?.length ? bloque.items : [null];
            items.forEach(it => {
              filasHemodinamiaExcel.push({
                'ID': fila.gestionId,
                'PACIENTE': fila.paciente,
                'MEDICO': fila.medico,
                'FECHA': formatearFechaExcel(fila.fecha),
                'EMPRESA': fila.empresa,
                'CODIGO': it ? (it.codigo || 'P') : '',
                'DESCRIPCION': it ? (it.descriptorAuto || 'P') : '',
                'CANTIDAD': it ? (it.cantidad || 0) : '',
                'PRECIO': it ? (it.precio || 0) : '',
                'LOTE': it ? (it.lote || 'P') : '',
                'VENCIMIENTO': it?.vencimiento ? formatearFechaExcel(it.vencimiento) : ''
              });
              filasResumen.push({
                'Origen': 'Hemodinamia',
                'Ingreso': fechaHoyFormato,
                'Id': fila.gestionId,
                'Cód': it ? (it.codigo || 'P') : '',
                'Cant': it ? (it.cantidad || 0) : '',
                'Venta': it ? (it.venta || 0) : '',
                'Médico': fila.medico,
                'Fecha': formatearFechaExcel(fila.fecha),
                'Descripción': it ? (it.descriptorAuto || 'P') : ''
              });
            });
          });

          const workbook = XLSX.utils.book_new();
          if (filasImplantesExcel.length > 0) {
            XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(filasImplantesExcel), 'Solicitud Implantes');
          }
          if (filasConsignacionExcel.length > 0) {
            XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(filasConsignacionExcel), 'Solicitud Consignación');
          }
          if (filasHemodinamiaExcel.length > 0) {
            XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(filasHemodinamiaExcel), 'Solicitud Hemodinamia');
          }
          XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(filasResumen), 'Resumen');
          XLSX.writeFile(workbook, `solicitud_unificada_${fechaHoy}.xlsx`);

          // Un solo pool de batches compartido — cada write apunta a la ruta
          // de SU PROPIA colección (implantes_gestiones/implantes_imputadas
          // vs. consignacion_registros/consignacion_imputadas), así que un
          // batch puede mezclar operaciones de ambos módulos sin problema:
          // lo que decide el destino es la ruta del doc, no el batch.
          let opsEnBatch = 0;
          let batchActual = writeBatch(db);
          const batches = [batchActual];
          const agregarOp = (fn) => {
            if (opsEnBatch >= 400) {
              batchActual = writeBatch(db);
              batches.push(batchActual);
              opsEnBatch = 0;
            }
            fn(batchActual);
            opsEnBatch++;
          };

          const logsAEjecutar = [];

          seleccionImplantes.forEach(fila => {
            const bloque = fila._raw;
            const docRef = doc(db, bloque.refPath);
            agregarOp(b => b.update(docRef, {
              solicitud: 'SOLICITADO',
              fechaSolicitud: new Date(),
              solicitadoPor: userData?.nombreCompleto || 'Usuario'
            }));

            (bloque.items || []).forEach(it => {
              const periodoAnioItem = it.periodoAnio || periodoImplantes.anio;
              const periodoMesItem = it.periodoMes || periodoImplantes.mes;
              agregarOp(b => b.set(
                refImputadaImplantes(periodoAnioItem, periodoMesItem, it.id),
                construirPayloadImputada(it, bloque, periodoAnioItem, periodoMesItem, userData?.nombreCompleto)
              ));
            });

            logsAEjecutar.push(() => registrarLogImplantes(docRef, 'SOLICITUD_EXPORTADA', {
              gestionId: fila.gestionId,
              empresa: fila.empresa,
              fecha: fila.fecha,
              cantidadItems: bloque.items?.length || 0,
              periodoAnio: periodoImplantes.anio,
              periodoMes: periodoImplantes.mes
            }, userData));
          });

          seleccionConsignacionConRef.forEach(fila => {
            const it = fila._raw;
            agregarOp(b => b.update(it.ref, {
              estado: 'SOLICITADO',
              fechaSolicitud: new Date(),
              solicitadoPor: userData?.nombreCompleto || 'Usuario',
              periodoAnio: periodoConsignacion.anio,
              periodoMes: periodoConsignacion.mes
            }));

            const imputadaRef = doc(
              db,
              'consignacion_imputadas', String(periodoConsignacion.anio),
              'meses', periodoConsignacion.mes,
              'documentos', it.id
            );
            // eslint-disable-next-line no-unused-vars
            const { ref: _ref, refPath: _refPath, ...datosItemLimpios } = it;
            agregarOp(b => b.set(imputadaRef, {
              ...datosItemLimpios,
              estado: 'SOLICITADO',
              total: (Number(it.costo) || 0) * (Number(it.cantidad) || 1),
              fechaIngreso: fechaHoyFormato,
              fechaSolicitud: new Date(),
              solicitadoPor: userData?.nombreCompleto || 'Usuario',
              periodoAnio: periodoConsignacion.anio,
              periodoMes: periodoConsignacion.mes,
              modulo: 'CONSIGNACION',
              actualizadoEn: new Date()
            }, { merge: true }));

            logsAEjecutar.push(() => registrarLogConsignacion(it.ref, 'SOLICITUD_EXPORTADA', {
              gestionId: fila.gestionId,
              codigo: it.codigo,
              cantidad: it.cantidad,
              costo: it.costo,
              periodoAnio: periodoConsignacion.anio,
              periodoMes: periodoConsignacion.mes
            }, userData));
          });

          // Hemodinamia: mismo criterio que su Solicitud nativa — todos los
          // ítems se imputan al período abierto (periodoAnioCarga/MesCarga
          // conservan el de la carga original).
          const periodoTextoHemodinamia = periodoHemodinamia
            ? `${periodoHemodinamia.mes.charAt(0).toUpperCase()}${periodoHemodinamia.mes.slice(1).toLowerCase()} ${periodoHemodinamia.anio}`
            : '';

          seleccionHemodinamia.forEach(fila => {
            const bloque = fila._raw;
            const docRef = doc(db, bloque.refPath);
            agregarOp(b => b.update(docRef, {
              solicitud: 'SOLICITADO',
              fechaSolicitud: new Date(),
              solicitadoPor: userData?.nombreCompleto || 'Usuario',
              periodo: periodoTextoHemodinamia
            }));

            const [anioF, mesF, diaF] = bloque.fecha && bloque.fecha.includes('-')
              ? bloque.fecha.split('-')
              : ['0000', '00', '00'];

            bloque.items.forEach(it => {
              const imputadaRef = doc(
                db,
                'hemodinamia_imputadas', String(periodoHemodinamia.anio),
                'meses', periodoHemodinamia.mes,
                'documentos', it.id
              );
              agregarOp(b => b.set(imputadaRef, {
                gestionId: bloque.gestionId,
                agendaId: bloque.agendaId,
                admision: bloque.admision,
                paciente: bloque.nombre,
                medico: bloque.medico,
                fecha: bloque.fecha,
                anio: anioF,
                mes: mesF,
                dia: diaF,
                empresa: bloque.empresa,
                informe: bloque.informe,
                convenio: bloque.convenio,
                prevision: bloque.prevision,
                descripcion: bloque.descripcion,
                centro: bloque.centro,
                atributo: bloque.atributo,
                estado: bloque.estado,
                costoGestion: bloque.costo,

                numCotizacion: it.numCotizacion || bloque.numCotizacion,
                itemId: it.id,
                referencia: it.referencia || 'P',
                codigo: it.codigo || 'P',
                descriptorAuto: it.descriptorAuto || 'P',
                clase: it.clase || 'P',
                tipoVinculado: it.tipoVinculado || 'P',
                detalle: it.detalle || 'P',
                empresaVinculada: it.empresaVinculada || 'P',
                precio: Number(it.precio) || 0,
                cantidad: Number(it.cantidad) || 0,
                vecesCosto: Number(it.vecesCosto) || 1,
                recargoEncontrado: !!it.recargoEncontrado,
                venta: Number(it.venta) || 0,
                total: Number(it.totalItem) || 0,
                lote: it.lote || 'P',
                vencimiento: it.vencimiento || '',
                sinCodigo: !!it.sinCodigo,
                estadoCarga: it.estadoCarga || 'PENDIENTE',

                periodoAnio: periodoHemodinamia.anio,
                periodoMes: periodoHemodinamia.mes,
                periodo: periodoTextoHemodinamia,
                periodoAnioCarga: it.periodoAnio || null,
                periodoMesCarga: it.periodoMes || null,

                registradoPor: userData?.nombreCompleto || 'Usuario',
                actualizadoEn: new Date()
              }, { merge: true }));
            });

            logsAEjecutar.push(() => registrarLogHemodinamia(docRef, 'SOLICITUD_EXPORTADA', {
              gestionId: fila.gestionId,
              empresa: fila.empresa,
              fecha: fila.fecha,
              cantidadItems: bloque.items.length,
              periodoAnio: periodoHemodinamia.anio,
              periodoMes: periodoHemodinamia.mes,
              periodo: periodoTextoHemodinamia
            }, userData));
          });

          for (const b of batches) {
            await b.commit();
          }

          await Promise.all(logsAEjecutar.map(fn => fn()));

          setSeleccionados(new Set());
          showToast(`Se exportaron y marcaron como SOLICITADO ${filasSeleccionadas.length} registro(s)`, 'success');
        } catch (error) {
          console.error('Error al exportar solicitud unificada:', error);
          showToast('Error al exportar: ' + error.message, 'error');
        } finally {
          setExportando(false);
        }
      }
    );
  };

  return {
    filas,
    totalFilas: filas.length,
    cargando,
    exportando,
    seleccionados,
    toggleSeleccion,
    toggleSeleccionarTodos,
    busqueda, setBusqueda,
    origenesSeleccionados, toggleOrigen, limpiarOrigenes,
    periodoImplantes,
    periodoConsignacion,
    periodoHemodinamia,
    handleExportarYMarcarSolicitado
  };
};
