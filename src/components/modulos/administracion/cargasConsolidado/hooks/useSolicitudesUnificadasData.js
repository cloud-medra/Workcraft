import { useEffect, useState } from 'react';
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
import { ORIGEN, normalizarSolicitudImplantes, normalizarSolicitudConsignacion } from '../utils/normalizarFila';

const RANGO_MIN_IMPLANTES = 'implantes_gestiones/0000';
const RANGO_MAX_IMPLANTES = 'implantes_gestiones/9999';
const COL_CONSIGNACION = 'consignacion_registros';

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
  const [cargando, setCargando] = useState(true);
  const [exportando, setExportando] = useState(false);
  const [seleccionados, setSeleccionados] = useState(new Set());

  const { showToast } = useToast();
  const { confirmAction } = useModal();
  const { userData } = useUser();

  const periodoImplantes = usePeriodoActivo('implantes');
  const periodoConsignacion = usePeriodoActivo('consignacion');

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
      where('estado', '==', 'CARGADO')
    );
    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs
        .filter(d => d.ref.path.startsWith(`${COL_CONSIGNACION}/`))
        .map(d => ({ id: d.id, ref: d.ref, refPath: d.ref.path, ...d.data() }));
      setItemsConsignacion(docs);
      setCargando(false);
    }, (err) => {
      console.error('Error al escuchar solicitudes de Consignación:', err);
      setCargando(false);
    });
    return () => unsub();
  }, []);

  const filas = [
    ...bloquesImplantes.map(normalizarSolicitudImplantes),
    ...itemsConsignacion.map(normalizarSolicitudConsignacion)
  ];

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

    if (seleccionImplantes.length > 0 && !periodoImplantes) {
      showToast('No hay un período abierto para Implantes en Control Mensual. Ábrelo antes de exportar.', 'error');
      return;
    }
    if (seleccionConsignacion.length > 0 && !periodoConsignacion) {
      showToast('No hay un período abierto para Consignación en Control Mensual. Ábrelo antes de exportar.', 'error');
      return;
    }

    confirmAction(
      'Exportar y Marcar como Solicitado',
      `Se exportarán ${filasSeleccionadas.length} registro(s) (${seleccionImplantes.length} de Implantes, ${seleccionConsignacion.length} de Consignación) a un único Excel y quedarán marcados como SOLICITADO — cada uno se copiará a la colección de imputadas de su propio módulo. ¿Continuar?`,
      async () => {
        setExportando(true);
        try {
          const fechaHoy = new Date().toISOString().slice(0, 10);
          const fechaHoyFormato = formatearFechaExcel(fechaHoy);

          const filasImplantesExcel = [];
          const filasConsignacionExcel = [];
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

          const workbook = XLSX.utils.book_new();
          if (filasImplantesExcel.length > 0) {
            XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(filasImplantesExcel), 'Solicitud Implantes');
          }
          if (filasConsignacionExcel.length > 0) {
            XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(filasConsignacionExcel), 'Solicitud Consignación');
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

          seleccionConsignacion.forEach(fila => {
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
    cargando,
    exportando,
    seleccionados,
    toggleSeleccion,
    toggleSeleccionarTodos,
    periodoImplantes,
    periodoConsignacion,
    handleExportarYMarcarSolicitado
  };
};
