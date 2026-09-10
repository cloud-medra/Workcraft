import { useState, useEffect } from 'react';
import {
  collection,
  collectionGroup,
  onSnapshot,
  doc,
  writeBatch,
  addDoc,
  serverTimestamp,
  query,
  where
} from 'firebase/firestore';
import * as XLSX from 'xlsx';
import { db } from '../../../../../../firebaseConfig';
import { useToast } from '../../../../../../context/ToastContext';
import { useModal } from '../../../../../../context/ModalContext';
import { useUser } from '../../../../../../context/UserContext';

export const useSolicitudImplantesData = () => {
  const [bloques, setBloques] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [exportando, setExportando] = useState(false);
  const [seleccionados, setSeleccionados] = useState(new Set());

  const { showToast } = useToast();
  const { confirmAction } = useModal();
  const { userData } = useUser();

    useEffect(() => {
    const q = query(collectionGroup(db, "detalles"), where("solicitud", "==", "SOLICITAR"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docsImplantes = snapshot.docs.filter(d => d.ref.path.startsWith('implantes_gestiones/'));

      const lista = docsImplantes.map(document => {
        const data = document.data();
        const items = data.cotizaciones?.[0]?.items || [];
        return {
          id: document.id,
          refPath: document.ref.path,
          gestionId: data.gestionId || data.agendaId || 'P',
          agendaId: data.agendaId || data.gestionId || 'P',
          admision: data.admision || 'P',
          nombre: data.nombre || 'P',
          medico: data.medico || 'P',
          empresa: data.empresa || 'P',
          fecha: data.fecha || 'P',
          informe: data.informe || 'PENDIENTE',
          convenio: data.convenio || 'P',
          prevision: data.prevision || 'P',
          descripcion: data.descripcion || 'P',
          centro: data.centro || 'PABELLON',
          atributo: data.atributo || 'IMPLANTES',
          estado: data.estado || 'AGENDANDO',
          costo: data.costo || 0,
          registradoPor: data.registradoPor || 'Usuario',
          fechaRegistro: data.fechaRegistro || null,
          numCotizacion: data.cotizaciones?.[0]?.numCotizacion || 'P',
          items
        };
      });
      setBloques(lista);
      setCargando(false);
    }, (error) => {
      console.error("Error al escuchar solicitudes:", error);
      showToast("Error al cargar solicitudes pendientes", "error");
      setCargando(false);
    });

    return () => unsubscribe();
  }, [showToast]);

  const toggleSeleccion = (refPath) => {
    setSeleccionados(prev => {
      const nuevo = new Set(prev);
      if (nuevo.has(refPath)) {
        nuevo.delete(refPath);
      } else {
        nuevo.add(refPath);
      }
      return nuevo;
    });
  };

  const toggleSeleccionarTodos = () => {
    if (seleccionados.size === bloques.length) {
      setSeleccionados(new Set());
    } else {
      setSeleccionados(new Set(bloques.map(b => b.refPath)));
    }
  };

  const formatearFechaExcel = (fechaString) => {
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

  const descomponerFecha = (fechaString) => {
    if (fechaString && fechaString.includes('-')) {
      const [anio, mes, dia] = fechaString.split('-');
      return { anio, mes, dia };
    }
    return { anio: '0000', mes: '00', dia: '00' };
  };

  const formatearPeriodoTexto = (periodo) => {
    if (!periodo || !periodo.mes || !periodo.anio) return '';
    const mesCapitalizado = periodo.mes.charAt(0).toUpperCase() + periodo.mes.slice(1).toLowerCase();
    return `${mesCapitalizado} ${periodo.anio}`;
  };

  const registrarLog = async (docRef, accion, detalles) => {
    try {
      const logsSubcollectionRef = collection(docRef, "logs");
      await addDoc(logsSubcollectionRef, {
        accion,
        detalles,
        active: true,
        usuario: userData?.nombreCompleto || 'Usuario Desconocido',
        usuarioEmail: userData?.email || '',
        timestamp: serverTimestamp()
      });
    } catch (err) {
      console.error("Error al registrar log de auditoría:", err);
    }
  };

  const handleExportarYMarcarSolicitado = (periodoActivo) => {
    const bloquesSeleccionados = bloques.filter(b => seleccionados.has(b.refPath));

    if (bloquesSeleccionados.length === 0) {
      showToast("Selecciona al menos un registro para exportar", "error");
      return;
    }

    if (!periodoActivo || !periodoActivo.anio || !periodoActivo.mes) {
      showToast("No hay un período abierto para Implantes en Control Mensual. Ábrelo antes de exportar.", "error");
      return;
    }

    const periodoTexto = formatearPeriodoTexto(periodoActivo);

    confirmAction(
      "Exportar y Marcar como Solicitado",
      `Se exportarán ${bloquesSeleccionados.length} registro(s) a Excel y quedarán marcados como SOLICITADO (ya no aparecerán en este listado). Se imputarán en el período ${periodoActivo.mes.toUpperCase()} ${periodoActivo.anio}, que es el período abierto actualmente. ¿Continuar?`,
      async () => {
        setExportando(true);
        try {
          const fechaHoyFormato = formatearFechaExcel(new Date().toISOString().slice(0, 10));

          const filas = [];
          const filasResumen = [];

          bloquesSeleccionados.forEach(bloque => {
            const fechaRegistroBloque = formatearFechaDeTimestamp(bloque.fechaRegistro);

            if (bloque.items.length === 0) {
              filas.push({
                "ID": bloque.gestionId,
                "PACIENTE": bloque.nombre,
                "MEDICO": bloque.medico,
                "FECHA": formatearFechaExcel(bloque.fecha),
                "EMPRESA": bloque.empresa,
                "CODIGO": "",
                "DESCRIPCION": "",
                "CANTIDAD": "",
                "PRECIO": "",
                "ATRIBUTO": "",
                "FECHA REGISTRO": fechaRegistroBloque,
                "FECHA CARGA": formatearFechaExcel(bloque.fecha),
                "N° COTIZACION": bloque.numCotizacion,
                "FECHA INGRESO": fechaHoyFormato,
                "LOTE": "",
                "VENCIMIENTO": ""
              });

              filasResumen.push({
                "Ingreso": fechaHoyFormato,
                "Area": bloque.centro,
                "Previsión": bloque.prevision,
                "Id": bloque.gestionId,
                "Cód": "",
                "Cant": "",
                "Venta": "",
                "Médico": bloque.medico,
                "Fecha": formatearFechaExcel(bloque.fecha),
                "Descripción": "",
                "Estado": ""
              });
              return;
            }

            bloque.items.forEach(it => {
              filas.push({
                "ID": bloque.gestionId,
                "PACIENTE": bloque.nombre,
                "MEDICO": bloque.medico,
                "FECHA": formatearFechaExcel(bloque.fecha),
                "EMPRESA": bloque.empresa,
                "CODIGO": it.codigo || 'P',
                "DESCRIPCION": it.descriptorAuto || 'P',
                "CANTIDAD": it.cantidad || 0,
                "PRECIO": it.totalItem || 0,
                "ATRIBUTO": it.tipoVinculado || 'P',
                "FECHA REGISTRO": fechaRegistroBloque,
                "FECHA CARGA": formatearFechaExcel(bloque.fecha),
                "N° COTIZACION": bloque.numCotizacion,
                "FECHA INGRESO": fechaHoyFormato,
                "LOTE": it.lote || 'P',
                "VENCIMIENTO": formatearFechaExcel(it.vencimiento)
              });

              filasResumen.push({
                "Ingreso": fechaHoyFormato,
                "Area": bloque.centro,
                "Previsión": bloque.prevision,
                "Id": bloque.gestionId,
                "Cód": it.codigo || 'P',
                "Cant": it.cantidad || 0,
                "Venta": it.totalItem || 0,
                "Médico": bloque.medico,
                "Fecha": formatearFechaExcel(bloque.fecha),
                "Descripción": it.descriptorAuto || 'P',
                "Estado": it.estadoCarga || 'PENDIENTE'
              });
            });
          });

          const worksheet = XLSX.utils.json_to_sheet(filas);
          const worksheetResumen = XLSX.utils.json_to_sheet(filasResumen);
          const workbook = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(workbook, worksheet, "Solicitud Implantes");
          XLSX.utils.book_append_sheet(workbook, worksheetResumen, "Resumen");
          const fechaHoy = new Date().toISOString().slice(0, 10);
          XLSX.writeFile(workbook, `solicitud_implantes_${fechaHoy}.xlsx`);

          const batch = writeBatch(db);
          let opsEnBatch = 0;
          let batchActual = batch;
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

          bloquesSeleccionados.forEach(bloque => {
            const docRef = doc(db, bloque.refPath);

            agregarOp(b => b.update(docRef, {
              solicitud: 'SOLICITADO',
              fechaSolicitud: new Date(),
              solicitadoPor: userData?.nombreCompleto || 'Usuario',
              periodo: periodoTexto
            }));

            const { anio, mes, dia } = descomponerFecha(bloque.fecha);

            bloque.items.forEach(it => {
              const imputadaRef = doc(
                db,
                'implantes_imputadas', String(periodoActivo.anio),
                'meses', periodoActivo.mes,
                'documentos', it.id
              );

              agregarOp(b => b.set(imputadaRef, {
                gestionId: bloque.gestionId,
                agendaId: bloque.agendaId,
                admision: bloque.admision,
                paciente: bloque.nombre,
                medico: bloque.medico,
                fecha: bloque.fecha,
                anio,
                mes,
                dia,
                empresa: bloque.empresa,
                informe: bloque.informe,
                convenio: bloque.convenio,
                prevision: bloque.prevision,
                descripcion: bloque.descripcion,
                centro: bloque.centro,
                atributo: bloque.atributo,
                estado: bloque.estado,
                costoGestion: bloque.costo,

                numCotizacion: bloque.numCotizacion,
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

                periodoAnio: periodoActivo.anio,
                periodoMes: periodoActivo.mes,
                periodo: periodoTexto,
                periodoAnioCarga: it.periodoAnio || null,
                periodoMesCarga: it.periodoMes || null,

                registradoPor: userData?.nombreCompleto || 'Usuario',
                actualizadoEn: new Date()
              }, { merge: true }));
            });
          });

          for (const b of batches) {
            await b.commit();
          }

          await Promise.all(
            bloquesSeleccionados.map(bloque =>
              registrarLog(doc(db, bloque.refPath), 'SOLICITUD_EXPORTADA', {
                gestionId: bloque.gestionId,
                empresa: bloque.empresa,
                fecha: bloque.fecha,
                cantidadItems: bloque.items.length,
                periodoAnio: periodoActivo.anio,
                periodoMes: periodoActivo.mes,
                periodo: periodoTexto
              })
            )
          );

          setSeleccionados(new Set());
          showToast(`${bloquesSeleccionados.length} registro(s) exportado(s) y marcado(s) como SOLICITADO`, "success");
        } catch (error) {
          console.error("Error al exportar solicitud:", error);
          showToast("Error al exportar: " + error.message, "error");
        } finally {
          setExportando(false);
        }
      }
    );
  };

  return {
    bloques,
    cargando,
    exportando,
    seleccionados,
    toggleSeleccion,
    toggleSeleccionarTodos,
    handleExportarYMarcarSolicitado
  };
};