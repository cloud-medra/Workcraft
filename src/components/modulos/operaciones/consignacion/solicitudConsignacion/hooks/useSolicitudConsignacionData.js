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
      const docsConsignacion = snapshot.docs.filter(d => d.ref.path.startsWith('consignacion_registros/'));

      const itemsCargados = docsConsignacion.map((document) => {
        const data = document.data();
        const costo = Number(data.costo) || 0;
        const cantidad = Number(data.cantidad) || 0;
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

            const itemRelacionado = itemsCargados.find(it => it.delivery === deliveryValor) || null;

            filasGuiaPorDelivery[deliveryValor] = productos.map((p, idx) => {
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
                precio: 0,
                atributo: vinculo?.tipo || '-',
                fechaRegistro: itemRelacionado?.fechaRegistro || null,
                lote: p.lote || 'N/A',
                vencimiento: p.vencimiento || 'N/A',
                numeroGuia: 0 
              };
            });
          } catch (err) {
            console.error(`Error al construir el desglose de la guía ${deliveryValor}:`, err);
          }
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
      } finally {
        setCargando(false);
      }
    }, (error) => {
      console.error('Error al escuchar registros CARGADO de Consignación:', error);
      showToast('Error al cargar los registros pendientes de solicitar', 'error');
      setCargando(false);
    });

    return () => unsubscribe();
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