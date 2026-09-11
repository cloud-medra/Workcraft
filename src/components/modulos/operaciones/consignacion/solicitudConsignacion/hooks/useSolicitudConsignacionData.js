import { useState, useCallback, useEffect } from 'react';
import {
  collection,
  collectionGroup,
  doc,
  writeBatch,
  addDoc,
  getDocs,
  serverTimestamp,
  query,
  where,
  orderBy
} from 'firebase/firestore';
import * as XLSX from 'xlsx';
import { db } from '../../../../../../firebaseConfig';
import { useToast } from '../../../../../../context/ToastContext';
import { useModal } from '../../../../../../context/ModalContext';
import { useUser } from '../../../../../../context/UserContext';

const NOMBRE_SUBCOL_DETALLES = 'detalles';
const ESTADO_ORIGEN = 'CARGADO';
const ESTADO_DESTINO = 'SOLICITADO';

const COL_MAESTROS_CODIGOS = 'maestros_codigos';

const CODIGOS_EXCLUIDOS_GUIA = ['KITBYPASSTCRL2'];
const normalizarCodigo = (c) => (c || '').trim().toUpperCase();
const estaExcluido = (codigo) => CODIGOS_EXCLUIDOS_GUIA.includes(normalizarCodigo(codigo));

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

const formatearFechaDeTimestamp = (valor) => {
  if (!valor) return '';
  const date = valor.toDate ? valor.toDate() : new Date(valor);
  if (isNaN(date.getTime())) return '';
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
};

const obtenerFechaHoyTexto = () => {
  const hoy = new Date();
  const dd = String(hoy.getDate()).padStart(2, '0');
  const mm = String(hoy.getMonth() + 1).padStart(2, '0');
  const yyyy = hoy.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
};

const cacheGuiasPorDelivery = new Map(); 
const cacheMaestrosPorCodigo = new Map(); 

const resolverGuiaCacheada = async (deliveryValor, forzar) => {
  if (!forzar && cacheGuiasPorDelivery.has(deliveryValor)) {
    return cacheGuiasPorDelivery.get(deliveryValor);
  }
  try {
    const qGuia = query(
      collectionGroup(db, NOMBRE_SUBCOL_DETALLES),
      where('numeroDocumento', '==', deliveryValor)
    );
    const snapGuia = await getDocs(qGuia);
    if (snapGuia.empty) {
      cacheGuiasPorDelivery.set(deliveryValor, null);
      return null;
    }
    const numeroGuia = snapGuia.docs[0]?.data()?.numeroGuia || null;
    const productos = snapGuia.docs.map(d => d.data()).filter(p => !estaExcluido(p.codigo));
    const resultado = { numeroGuia, productos };
    cacheGuiasPorDelivery.set(deliveryValor, resultado);
    return resultado;
  } catch (err) {
    console.error(`Error al resolver la guía ${deliveryValor}:`, err);
    return null;
  }
};

const resolverMaestrosCacheados = async (referencias, forzar) => {
  const unicas = [...new Set(referencias.map(r => (r || '').trim()).filter(Boolean))];
  const pendientes = forzar ? unicas : unicas.filter(r => !cacheMaestrosPorCodigo.has(r));

  if (pendientes.length > 0) {
    const bloques = trocear(pendientes, 10);
    for (const bloque of bloques) {
      try {
        const qMaestro = query(collection(db, COL_MAESTROS_CODIGOS), where('referencia', 'in', bloque));
        const snapMaestro = await getDocs(qMaestro);
        const encontrados = new Set();
        snapMaestro.docs.forEach(d => {
          const data = d.data();
          if (data.referencia) {
            cacheMaestrosPorCodigo.set(data.referencia, {
              descripcion: data.descriptorEmpresa || data.descriptorAuto || '',
              tipo: data.tipo || '',
              empresa: data.empresa || ''
            });
            encontrados.add(data.referencia);
          }
        });
        bloque.forEach(r => {
          if (!encontrados.has(r)) cacheMaestrosPorCodigo.set(r, cacheMaestrosPorCodigo.get(r) ?? null);
        });
      } catch (err) {
        console.error('Error al resolver bloque de maestros_codigos:', bloque, err);
      }
    }
  }

  const resultado = {};
  unicas.forEach(r => { resultado[r] = cacheMaestrosPorCodigo.get(r) ?? null; });
  return resultado;
};

export const useSolicitudConsignacionData = () => {
  const [items, setItems] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [exportando, setExportando] = useState(false);
  const [seleccionados, setSeleccionados] = useState(new Set());

  const { showToast } = useToast();
  const { confirmAction } = useModal();
  const { userData } = useUser();

  const cargarDatos = useCallback(async (forzarRelecturaGuias = false) => {
    setCargando(true);
    try {
      const q = query(
        collectionGroup(db, NOMBRE_SUBCOL_DETALLES),
        where('estado', '==', ESTADO_ORIGEN),
        orderBy('fechaRegistro', 'desc')
      );
      const snapshot = await getDocs(q);
      const docsConsignacion = snapshot.docs.filter(d => d.ref.path.startsWith('consignacion_registros/'));

      const itemsCargados = docsConsignacion.map((document) => {
        const data = document.data();
        const costo = Number(data.costo) || 0;
        const cantidad = Number(data.cantidad) || 0;
        const vecesCosto = data.recargoVecesCosto != null ? Number(data.recargoVecesCosto) : 1;
        const deliveryValor = (data.delivery || '').trim();
        const tieneVinculo = Boolean(data.deliveryVinculado);

        return {
          id: document.id,
          ref: document.ref,
          refPath: document.ref.path,
          datosOriginales: data,
          gestionId: data.gestionId || 'P',
          nombre: data.nombre || 'P',
          medico: data.medico || 'P',
          fecha: data.fecha || '',
          empresa: data.empresa || 'P',
          codigo: data.codigo || 'S/C',
          descripcion: data.descripcion || 'P',
          cantidad,
          costo,
          ventaUnitaria: costo * vecesCosto,
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
        const deliveriesUnicos = [...new Set(itemsCargados.map(it => it.delivery).filter(Boolean))];

        const filasGuiaPorDelivery = {};
        const numeroGuiaPorDelivery = {};

        await Promise.all(deliveriesUnicos.map(async (deliveryValor) => {
          const guia = await resolverGuiaCacheada(deliveryValor, forzarRelecturaGuias);
          if (!guia || guia.productos.length === 0) return;

          numeroGuiaPorDelivery[deliveryValor] = guia.numeroGuia;

          const referenciasUnicas = guia.productos.map(p => (p.codigo || '').trim()).filter(Boolean);
          const vinculosCodigos = await resolverMaestrosCacheados(referenciasUnicas, forzarRelecturaGuias);

          const itemRelacionado = itemsCargados.find(it => it.delivery === deliveryValor) || null;

          filasGuiaPorDelivery[deliveryValor] = guia.productos.map((p, idx) => {
            const vinculo = vinculosCodigos[(p.codigo || '').trim()];
            return {
              id: `guia-${deliveryValor}-${idx}`,
              ref: null,
              esFilaGuia: true,
              gestionId: itemRelacionado?.gestionId || '-',
              nombre: itemRelacionado?.nombre || '-',
              medico: itemRelacionado?.medico || '-',
              fecha: itemRelacionado?.fecha || '',
              empresa: vinculo?.empresa || '-',
              codigo: 'No lleva OC',
              descripcion: vinculo?.descripcion || '-',
              cantidad: p.cantidad ?? 0,
              costo: 0,
              ventaUnitaria: 0,
              costoTotal: 0,
              atributo: vinculo?.tipo || '-',
              fechaRegistro: itemRelacionado?.fechaRegistro || null,
              lote: p.lote || 'N/A',
              vencimiento: p.vencimiento || 'N/A',
              numeroGuia: 0
            };
          });
        }));

        const itemsConNumeroGuia = itemsCargados.map(it => ({
          ...it,
          numeroGuia: it.numeroGuiaVinculada || numeroGuiaPorDelivery[it.delivery] || 0
        }));

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
      }
    } catch (error) {
      console.error('Error al cargar registros CARGADO de Consignación:', error);
      showToast('Error al cargar los registros pendientes de solicitar', 'error');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos(false);
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
            'PRECIO': it.costo,
            'ATRIBUTO': it.atributo,
            'FECHA DE REGISTRO': formatearFechaDeTimestamp(it.fechaRegistro),
            'FECHA DE CARGA': formatearFechaDDMMYYYY(it.fecha),
            'N GUIA': it.numeroGuia,
            'FECHA DE INGRESO': fechaIngresoHoy,
            'LOTE': it.lote,
            'VENCIMIENTO': it.vencimiento
          }));

          // Hoja "Resumen", mismo criterio que la de Solicitud Implantes
          // (useSolicitudImplantesData.js): una fila por ítem, con las
          // columnas Ingreso/Area/Previsión/Id/Cód/Cant/Venta/Médico/Fecha/
          // Descripción/Estado. A diferencia de Implantes, en Consignación
          // no existe un estado de carga por ítem: como el export solo
          // toma documentos con estado=='CARGADO', ese es el valor fijo
          // para todas las filas reales. Las filas de desglose de guía
          // (esFilaGuia) no tienen documento propio, así que Previsión y
          // Estado quedan en '-' (mismo criterio que ya usan esas filas
          // para EMPRESA en la hoja principal).
          const filasResumen = itemsSeleccionados.map(it => ({
            'Ingreso': fechaIngresoHoy,
            'Area': 'PABELLON',
            'Previsión': it.esFilaGuia ? '-' : (it.datosOriginales?.prevision || 'P'),
            'Id': it.gestionId,
            'Cód': it.codigo,
            'Cant': it.cantidad,
            'Venta': it.ventaUnitaria,
            'Médico': it.medico,
            'Fecha': formatearFechaDDMMYYYY(it.fecha),
            'Descripción': it.descripcion,
            'Estado': it.esFilaGuia ? '-' : 'CARGADO'
          }));

          const worksheet = XLSX.utils.json_to_sheet(filas);
          const worksheetResumen = XLSX.utils.json_to_sheet(filasResumen);
          const workbook = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(workbook, worksheet, 'Solicitud Consignacion');
          XLSX.utils.book_append_sheet(workbook, worksheetResumen, 'Resumen');
          const fechaArchivo = new Date().toISOString().slice(0, 10);
          XLSX.writeFile(workbook, `solicitud_consignacion_${fechaArchivo}.xlsx`);

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
            agregarOp(b => b.update(it.ref, {
              estado: ESTADO_DESTINO,
              fechaSolicitud: new Date(),
              solicitadoPor: userData?.nombreCompleto || 'Usuario'
            }));

            const imputadaRef = doc(
              db,
              'consignacion_imputadas', String(periodoActivo.anio),
              'meses', periodoActivo.mes,
              'documentos', it.id
            );

            agregarOp(b => b.set(imputadaRef, {
              ...it.datosOriginales,
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

          await Promise.all(
            itemsConRef.map(it =>
              registrarLog(it.ref, 'SOLICITUD_EXPORTADA', {
                gestionId: it.gestionId,
                codigo: it.codigo,
                cantidad: it.cantidad,
                costo: it.costo,
                ventaUnitaria: it.ventaUnitaria,
                periodoAnio: periodoActivo.anio,
                periodoMes: periodoActivo.mes
              })
            )
          );

          const idsAQuitar = new Set(itemsConRef.map(it => it.id));
          const deliveriesAfectados = new Set(itemsConRef.map(it => it.delivery).filter(Boolean));
          setItems(prev => prev.filter(it => {
            if (idsAQuitar.has(it.id)) return false;
            if (it.esFilaGuia) {
              const deliveryDeEstaFila = it.id.startsWith('guia-')
                ? it.id.slice('guia-'.length, it.id.lastIndexOf('-'))
                : null;
              if (deliveryDeEstaFila && deliveriesAfectados.has(deliveryDeEstaFila)) {
                const siguePresente = prev.some(
                  o => !idsAQuitar.has(o.id) && !o.esFilaGuia && o.delivery === deliveryDeEstaFila
                );
                return siguePresente;
              }
            }
            return true;
          }));
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
    handleExportarYMarcarSolicitado,
    refrescar: () => cargarDatos(true)
  };
};