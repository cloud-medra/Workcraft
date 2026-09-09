import { useState, useEffect } from 'react';
import {
  collection,
  collectionGroup,
  onSnapshot,
  doc,
  getDoc,
  writeBatch,
  addDoc,
  getDocs,
  serverTimestamp,
  query,
  where,
  orderBy
} from 'firebase/firestore';
import * as XLSX from 'xlsx';
import { db } from '../../../../../../firebaseConfig'; // AJUSTAR según la ubicación real de este archivo
import { useToast } from '../../../../../../context/ToastContext'; // AJUSTAR ruta
import { useModal } from '../../../../../../context/ModalContext'; // AJUSTAR ruta
import { useUser } from '../../../../../../context/UserContext'; // AJUSTAR ruta

const NOMBRE_SUBCOL_DETALLES = 'detalles';
const ESTADO_ORIGEN = 'CARGADO';
const ESTADO_DESTINO = 'SOLICITADO';

const COL_MAESTROS_CODIGOS = 'maestros_codigos';

// Mismos códigos excluidos que en DeliveryTab/CargasTab (kits/bypass
// internos que no son ítems reales del despacho).
const CODIGOS_EXCLUIDOS_GUIA = ['KITBYPASSTCRL2'];
const normalizarCodigo = (c) => (c || '').trim().toUpperCase();
const estaExcluido = (codigo) => CODIGOS_EXCLUIDOS_GUIA.includes(normalizarCodigo(codigo));

// Firestore permite hasta 30 valores en una cláusula "in"; se trocea por
// seguridad en bloques más chicos (igual que en DeliveryTab/CargasTab).
const trocear = (arr, tamano) => {
  const bloques = [];
  for (let i = 0; i < arr.length; i += tamano) {
    bloques.push(arr.slice(i, i + tamano));
  }
  return bloques;
};

const formatearFechaDDMMYYYY = (fechaString) => {
  if (!fechaString || !fechaString.includes('-')) return fechaString || '';
  const [yyyy, mm, dd] = fechaString.split('-');
  return `${dd}-${mm}-${yyyy}`;
};

// Convierte un Timestamp de Firestore (o Date/string) a dd-mm-yyyy.
const formatearFechaDeTimestamp = (valor) => {
  if (!valor) return '';
  const date = valor.toDate ? valor.toDate() : new Date(valor);
  if (isNaN(date.getTime())) return '';
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
};

// "Fecha de Ingreso" NO se guarda: siempre es el día real en que se está
// viendo/exportando esta pantalla (hoy si se abre hoy, mañana si se abre
// mañana), tal como se pidió.
const obtenerFechaHoyTexto = () => {
  const hoy = new Date();
  const dd = String(hoy.getDate()).padStart(2, '0');
  const mm = String(hoy.getMonth() + 1).padStart(2, '0');
  const yyyy = hoy.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
};

/**
 * useSolicitudConsignacionData
 *
 * Versión simplificada: ya no agrupa por gestionId en "bloques" con
 * subfilas — entrega directamente la lista PLANA de todos los ítems con
 * estado "CARGADO" (uno por fila en la tabla), igual que "Ítems
 * Registrados" en CargasTab.jsx.
 *
 * FUENTE DE DATOS: collectionGroup sobre "detalles", filtrando por
 * estado == "CARGADO".
 *
 * Cada ítem trae, además de sus campos originales, los siguientes
 * calculados/derivados:
 *   - precio: usa el campo "venta" ya guardado (costo * recargo *
 *     cantidad); si no existe, respalda con costo * cantidad.
 *   - lote / vencimiento: si el ítem ya fue vinculado con una guía en
 *     Delivery, usa los valores reales guardados (loteGuiaVinculado /
 *     vencimientoGuiaVinculado); si tiene delivery asignado pero sin
 *     vincular, muestra "PAD"; si no tiene delivery, "Sin lote" / "Sin
 *     fecha".
 *   - fechaIngreso: SIEMPRE la fecha real de hoy (no es un campo
 *     guardado en Firestore).
 *
 * EXPORTAR Y MARCAR COMO SOLICITADO: al confirmar, se genera un Excel
 * (una fila por ítem seleccionado) y, en un solo writeBatch (partido
 * cada 400 operaciones), se actualiza el campo "estado" de cada ítem
 * seleccionado de "CARGADO" a "SOLICITADO" — dejan de aparecer en este
 * listado. También se registra un log de auditoría por ítem.
 */
export const useSolicitudConsignacionData = () => {
  const [items, setItems] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [exportando, setExportando] = useState(false);
  const [seleccionados, setSeleccionados] = useState(new Set());

  const { showToast } = useToast();
  const { confirmAction } = useModal();
  const { userData } = useUser();

  useEffect(() => {
    const q = query(
      collectionGroup(db, NOMBRE_SUBCOL_DETALLES),
      where('estado', '==', ESTADO_ORIGEN),
      orderBy('fechaRegistro', 'desc')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const itemsCargados = snapshot.docs.map((document) => {
        const data = document.data();
        const costo = Number(data.costo) || 0;
        const cantidad = Number(data.cantidad) || 0;
        const deliveryValor = (data.delivery || '').trim();
        const tieneVinculo = Boolean(data.deliveryVinculado);

        return {
          id: document.id,
          ref: document.ref,
          refPath: document.ref.path,
          datosOriginales: data, // se usa al exportar, para copiar TODOS los campos a consignacion_imputadas
          gestionId: data.gestionId || 'P',
          nombre: data.nombre || 'P',
          medico: data.medico || 'P',
          fecha: data.fecha || '',
          empresa: data.empresa || 'P',
          codigo: data.codigo || 'S/C',
          descripcion: data.descripcion || 'P',
          cantidad,
          precio: data.venta != null ? Number(data.venta) : costo * cantidad,
          costoTotal: costo * cantidad,
          atributo: data.atributo || 'P',
          fechaRegistro: data.fechaRegistro || null,
          delivery: deliveryValor,
          numeroGuiaVinculada: data.numeroGuiaVinculada || null,
          lote: tieneVinculo && data.loteGuiaVinculado
            ? data.loteGuiaVinculado
            : (deliveryValor ? 'PAD' : 'Sin lote'),
          vencimiento: tieneVinculo && data.vencimientoGuiaVinculado
            ? data.vencimientoGuiaVinculado
            : (deliveryValor ? 'PAD' : 'Sin fecha')
        };
      });

      try {
        // Por cada N° de Delivery único presente, traer el desglose
        // completo de la guía (productos) y cruzarlo con maestros_codigos
        // — igual que en CargasTab, pero acá se agregan como filas
        // normales de la misma lista (no como subfilas colapsables).
        const deliveriesUnicos = [...new Set(
          itemsCargados.map(it => it.delivery).filter(Boolean)
        )];

        const filasGuiaPorDelivery = {};
        const numeroGuiaPorDelivery = {};

        await Promise.all(deliveriesUnicos.map(async (deliveryValor) => {
          try {
            const qGuia = query(
              collectionGroup(db, NOMBRE_SUBCOL_DETALLES),
              where('numeroDocumento', '==', deliveryValor)
            );
            const snapGuia = await getDocs(qGuia);
            if (snapGuia.empty) return;

            // N° de Guía real (igual para todos los documentos de esta guía).
            numeroGuiaPorDelivery[deliveryValor] = snapGuia.docs[0]?.data()?.numeroGuia || null;

            const productos = snapGuia.docs
              .map(d => d.data())
              .filter(p => !estaExcluido(p.codigo));
            if (productos.length === 0) return;

            const referenciasUnicas = [...new Set(
              productos.map(p => (p.codigo || '').trim()).filter(Boolean)
            )];
            const vinculosCodigos = {};

            if (referenciasUnicas.length > 0) {
              const bloques = trocear(referenciasUnicas, 10);
              for (const bloque of bloques) {
                const qMaestro = query(
                  collection(db, COL_MAESTROS_CODIGOS),
                  where('referencia', 'in', bloque)
                );
                const snapMaestro = await getDocs(qMaestro);
                snapMaestro.docs.forEach(d => {
                  const data = d.data();
                  if (data.referencia) {
                    vinculosCodigos[data.referencia] = {
                      descripcion: data.descriptorEmpresa || data.descriptorAuto || '',
                      tipo: data.tipo || '',
                      empresa: data.empresa || ''
                    };
                  }
                });
              }
            }

            // Se toma el ítem que trajo este N° de Delivery para
            // autocompletar Paciente, Médico, Fecha y Fecha de Registro
            // en las filas del desglose de guía (Fecha de Carga usa el
            // mismo campo "fecha", así que queda igual automáticamente).
            const itemRelacionado = itemsCargados.find(it => it.delivery === deliveryValor) || null;

            filasGuiaPorDelivery[deliveryValor] = productos.map((p, idx) => {
              const vinculo = vinculosCodigos[(p.codigo || '').trim()];
              return {
                id: `guia-${deliveryValor}-${idx}`,
                ref: null, // no hay documento propio: no se puede marcar SOLICITADO
                esFilaGuia: true,
                gestionId: itemRelacionado?.gestionId || '-',
                nombre: itemRelacionado?.nombre || '-',
                medico: itemRelacionado?.medico || '-',
                fecha: itemRelacionado?.fecha || '',
                empresa: vinculo?.empresa || '-',
                codigo: 'No lleva OC',
                descripcion: vinculo?.descripcion || '-',
                cantidad: p.cantidad ?? 0,
                precio: 0,
                atributo: vinculo?.tipo || '-',
                fechaRegistro: itemRelacionado?.fechaRegistro || null,
                lote: p.lote || 'N/A',
                vencimiento: p.vencimiento || 'N/A',
                numeroGuia: 0 // en las filas del desglose de Delivery siempre queda en 0
              };
            });
          } catch (err) {
            console.error(`Error al construir el desglose de la guía ${deliveryValor}:`, err);
          }
        }));

        // Asigna el N° de Guía real a cada ítem: prioriza el campo ya
        // guardado (numeroGuiaVinculada); si no existe, usa el que se
        // acaba de resolver desde la guía asociada a su N° de Delivery.
        const itemsConNumeroGuia = itemsCargados.map(it => ({
          ...it,
          numeroGuia: it.numeroGuiaVinculada || numeroGuiaPorDelivery[it.delivery] || 0
        }));

        // Intercalar: cada ítem va seguido (una sola vez) por las filas de
        // su guía, aunque varios ítems compartan el mismo N° de Delivery.
        const deliveriesYaInsertados = new Set();
        const listaFinal = [];

        itemsConNumeroGuia.forEach(it => {
          listaFinal.push(it);
          if (it.delivery && !deliveriesYaInsertados.has(it.delivery) && filasGuiaPorDelivery[it.delivery]) {
            deliveriesYaInsertados.add(it.delivery);
            listaFinal.push(...filasGuiaPorDelivery[it.delivery]);
          }
        });

        setItems(listaFinal);
      } catch (err) {
        console.error('Error al construir filas de guías de Delivery:', err);
        setItems(itemsCargados);
      } finally {
        setCargando(false);
      }
    }, (error) => {
      console.error('Error al escuchar registros CARGADO de Consignación:', error);
      showToast('Error al cargar los registros pendientes de solicitar', 'error');
      setCargando(false);
    });

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleSeleccion = (id) => {
    setSeleccionados(prev => {
      const nuevo = new Set(prev);
      if (nuevo.has(id)) {
        nuevo.delete(id);
      } else {
        nuevo.add(id);
      }
      return nuevo;
    });
  };

  const toggleSeleccionarTodos = () => {
    if (seleccionados.size === items.length) {
      setSeleccionados(new Set());
    } else {
      setSeleccionados(new Set(items.map(it => it.id)));
    }
  };

  const registrarLog = async (docRef, accion, detalles) => {
    try {
      const logsSubcollectionRef = collection(docRef, 'logs');
      await addDoc(logsSubcollectionRef, {
        accion,
        detalles,
        active: true,
        usuario: userData?.nombreCompleto || 'Usuario Desconocido',
        usuarioEmail: userData?.email || '',
        timestamp: serverTimestamp()
      });
    } catch (err) {
      console.error('Error al registrar log de auditoría:', err);
    }
  };

  // periodoActivo: { anio, mes } — el período que está abierto AHORA en
  // Control Mensual (se le pasa desde el componente, que ya lo obtiene con
  // usePeriodoAbiertoModulo('consignacion') para el banner informativo).
  const handleExportarYMarcarSolicitado = (periodoActivo) => {
    const itemsSeleccionados = items.filter(it => seleccionados.has(it.id));

    if (itemsSeleccionados.length === 0) {
      showToast('Selecciona al menos un ítem para exportar', 'error');
      return;
    }

    const itemsConRef = itemsSeleccionados.filter(it => it.ref);

    if (itemsConRef.length > 0 && (!periodoActivo || !periodoActivo.anio || !periodoActivo.mes)) {
      showToast('No hay un período abierto para Consignación en Control Mensual. Ábrelo antes de exportar.', 'error');
      return;
    }

    confirmAction(
      'Exportar y Marcar como Solicitado',
      `Se exportarán ${itemsSeleccionados.length} fila(s) a Excel. De ellas, ${itemsConRef.length} ítem(s) reales quedarán marcados como SOLICITADO y se copiarán a Consignación Imputadas en el período ${periodoActivo?.mes?.toUpperCase()} ${periodoActivo?.anio} (las filas de desglose de guía no tienen documento propio y no cambian de estado). ¿Continuar?`,
      async () => {
        setExportando(true);
        try {
          // 1. Armar filas del Excel (una fila por ítem o producto de guía)
          const fechaIngresoHoy = obtenerFechaHoyTexto();
          const filas = itemsSeleccionados.map(it => ({
            'ADMISION': it.gestionId,
            'PACIENTE': it.nombre,
            'MEDICO': it.medico,
            'FECHA': formatearFechaDDMMYYYY(it.fecha),
            'EMPRESA': it.empresa,
            'CODIGO': it.codigo,
            'DESCRIPCION': it.descripcion,
            'CANTIDAD': it.cantidad,
            'PRECIO': it.precio,
            'ATRIBUTO': it.atributo,
            'FECHA DE REGISTRO': formatearFechaDeTimestamp(it.fechaRegistro),
            'FECHA DE CARGA': formatearFechaDDMMYYYY(it.fecha),
            'N GUIA': it.numeroGuia,
            'FECHA DE INGRESO': fechaIngresoHoy,
            'LOTE': it.lote,
            'VENCIMIENTO': it.vencimiento
          }));

          const worksheet = XLSX.utils.json_to_sheet(filas);
          const workbook = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(workbook, worksheet, 'Solicitud Consignacion');
          const fechaArchivo = new Date().toISOString().slice(0, 10);
          XLSX.writeFile(workbook, `solicitud_consignacion_${fechaArchivo}.xlsx`);

          // 2. Batch: marcar cada ítem REAL como SOLICITADO + copiar TODOS
          //    sus campos a consignacion_imputadas en el período activo
          //    (partido cada 400 operaciones por seguridad). Las filas de
          //    desglose de guía (sin "ref") se omiten de ambas acciones.
          //
          //    Antes de copiar, se relee cada documento directamente desde
          //    Firestore (getDoc) en vez de confiar en el dato guardado en
          //    memoria: así queda garantizado que se copian TODOS los
          //    campos actuales del ítem, sin depender de si "datosOriginales"
          //    llegó completo o desactualizado hasta este punto.
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

          for (const it of itemsConRef) {
            // a) Marcar el ítem original como SOLICITADO
            agregarOp(b => b.update(it.ref, {
              estado: ESTADO_DESTINO,
              fechaSolicitud: new Date(),
              solicitadoPor: userData?.nombreCompleto || 'Usuario'
            }));

            // b) Releer el documento completo y fresco, y copiar TODOS sus
            //    campos a consignacion_imputadas, en el período que está
            //    abierto ahora mismo (no uno guardado históricamente),
            //    igual que se hace en Implantes.
            let datosFrescos = it.datosOriginales || {};
            try {
              const snapFresco = await getDoc(it.ref);
              if (snapFresco.exists()) {
                datosFrescos = snapFresco.data();
              }
            } catch (err) {
              console.error(`Error al releer el ítem ${it.id} antes de imputar (se usa el dato en memoria como respaldo):`, err);
            }

            const imputadaRef = doc(
              db,
              'consignacion_imputadas', String(periodoActivo.anio),
              'meses', periodoActivo.mes,
              'documentos', it.id
            );

            agregarOp(b => b.set(imputadaRef, {
              ...datosFrescos,
              estado: ESTADO_DESTINO,
              numeroGuia: it.numeroGuia,
              total: it.costoTotal,
              fechaIngreso: fechaIngresoHoy,
              fechaSolicitud: new Date(),
              solicitadoPor: userData?.nombreCompleto || 'Usuario',
              periodoAnio: periodoActivo.anio,
              periodoMes: periodoActivo.mes,
              modulo: 'CONSIGNACION',
              actualizadoEn: new Date()
            }, { merge: true }));
          }

          for (const b of batches) {
            await b.commit();
          }

          // 3. Logs de auditoría (después del commit, uno por ítem real)
          await Promise.all(
            itemsConRef.map(it =>
              registrarLog(it.ref, 'SOLICITUD_EXPORTADA', {
                gestionId: it.gestionId,
                codigo: it.codigo,
                cantidad: it.cantidad,
                precio: it.precio,
                periodoAnio: periodoActivo.anio,
                periodoMes: periodoActivo.mes
              })
            )
          );

          setSeleccionados(new Set());
          showToast(`${itemsSeleccionados.length} fila(s) exportada(s); ${itemsConRef.length} ítem(s) marcado(s) como ${ESTADO_DESTINO} e imputado(s)`, 'success');
        } catch (error) {
          console.error('Error al exportar solicitud de consignación:', error);
          showToast('Error al exportar: ' + error.message, 'error');
        } finally {
          setExportando(false);
        }
      }
    );
  };

  return {
    items,
    cargando,
    exportando,
    seleccionados,
    toggleSeleccion,
    toggleSeleccionarTodos,
    handleExportarYMarcarSolicitado
  };
};