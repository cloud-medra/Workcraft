import { useState, useEffect, useMemo, useCallback } from 'react';
import { collection, onSnapshot, doc, writeBatch, getDocs, increment, query, collectionGroup, where } from 'firebase/firestore';
import { db } from '../../../../firebaseConfig';
import { useToast } from '../../../../context/ToastContext';
import { useUser } from '../../../../context/UserContext';
import * as XLSX from 'xlsx';

const TODOS_LOS_MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

export const useCargaDatos = () => {
  const [datos, setDatos] = useState([]);
  const [aniosDisponibles, setAniosDisponibles] = useState([]);
  const [mesesDisponibles, setMesesDisponibles] = useState([]);
  const [registrosDetalle, setRegistrosDetalle] = useState([]);

  const [cargando, setCargando] = useState(false);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);

  const [filtros, setFiltros] = useState({ anio: '', mes: '', dia: '', busqueda: '', estadoOC: 'todos' });

  const { showToast } = useToast();
  const { userData } = useUser();

  useEffect(() => {
    getDocs(collection(db, "documentos_cargaDatos")).then((snapshot) => {
      const anios = snapshot.docs.map(d => d.id).sort((a, b) => b - a);
      setAniosDisponibles(anios);
    });
  }, []);

  useEffect(() => {
    if (!filtros.anio) {
      setMesesDisponibles([]);
      return;
    }
    getDocs(collection(db, `documentos_cargaDatos/${filtros.anio}/meses`)).then((snapshot) => {
      const meses = snapshot.docs.map(d => d.id);
      setMesesDisponibles(TODOS_LOS_MESES.filter(m => meses.includes(m)));
    });
  }, [filtros.anio]);

  useEffect(() => {
    if (!filtros.anio || !filtros.mes) {
      setDatos([]);
      return;
    }

    const pathDias = `documentos_cargaDatos/${filtros.anio}/meses/${filtros.mes}/dias`;
    const unsubscribeList = [];

    getDocs(collection(db, pathDias)).then(async (snapshotDias) => {
      const dias = snapshotDias.docs.map(d => d.id);

      for (const dia of dias) {
        const admisionesPath = `${pathDias}/${dia}/admisiones`;
        const unsub = onSnapshot(collection(db, admisionesPath), (snapAdm) => {
          setDatos(prev => {
            const sinEsteDia = prev.filter(d => d._dia !== dia);
            const nuevasFilas = snapAdm.docs
              .filter(admDoc => admDoc.data().active !== false)
              .map(admDoc => ({
                id: `${dia}_${admDoc.id}`,
                _dia: dia,
                _admision: admDoc.id,
                ...admDoc.data(),
              }));
            return [...sinEsteDia, ...nuevasFilas];
          });
        });
        unsubscribeList.push(unsub);
      }
    });
    return () => unsubscribeList.forEach(unsub => unsub());
  }, [filtros.anio, filtros.mes]);

  const cargarDetallesAdmision = async (fila) => {
    const { _dia, _admision } = fila;
    const pathProveedores = `documentos_cargaDatos/${filtros.anio}/meses/${filtros.mes}/dias/${_dia}/admisiones/${_admision}/proveedores`;

    setCargandoDetalle(true);
    setRegistrosDetalle([]);
    try {
      const snapProveedores = await getDocs(collection(db, pathProveedores));
      let todosLosRegistros = [];

      for (const provDoc of snapProveedores.docs) {
        const registrosPath = `${pathProveedores}/${provDoc.id}/registros`;
        const snapRegistros = await getDocs(collection(db, registrosPath));
        todosLosRegistros = [...todosLosRegistros, ...snapRegistros.docs.map(r => ({ id: r.id, ...r.data() }))];
      }
      setRegistrosDetalle(todosLosRegistros);
    } catch (e) {
      showToast("Error cargando detalles", "error");
    } finally {
      setCargandoDetalle(false);
    }
  };

  const onDropExcel = useCallback(async (acceptedFiles) => {
    setCargando(true);
    try {
      for (const file of acceptedFiles) {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawJson = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

        const jsonData = rawJson.map(obj =>
          Object.keys(obj).reduce((acc, key) => {
            const cleanKey = key.trim().toUpperCase()
              .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
              .replace(/\s+/g, '_');
            acc[cleanKey] = obj[key];
            return acc;
          }, {})
        );

        const fechasValidas = jsonData.map(f => {
          const raw = f.FECHA_CX;
          return raw instanceof Date ? raw.toISOString().split('T')[0] : String(raw).trim();
        }).filter(f => f.includes('-')).sort();

        if (fechasValidas.length === 0) throw new Error("No se detectaron fechas válidas en la columna FECHA_CX");
        const fechaMin = fechasValidas[0];
        const fechaMax = fechasValidas[fechasValidas.length - 1];

        const qRegistros = query(
          collectionGroup(db, "registros"),
          where("FECHA_CX", ">=", fechaMin),
          where("FECHA_CX", "<=", fechaMax)
        );
        const snapshotExistentes = await getDocs(qRegistros);
        const mapaExistentes = {};
        snapshotExistentes.forEach(docSnap => {
          const d = docSnap.data();
          if (d.ID) mapaExistentes[String(d.ID).trim()] = d;
        });

        const cacheAdmisiones = {};
        for (const fila of jsonData) {
          const admision = String(fila.ADMISION || "").trim();
          if (!admision || admision === "0") continue;
          const monto = Number(fila.OC_MONTO) || 0;
          const estadoFila = String(fila.ESTADO || "PENDIENTE").trim().toUpperCase();
          const prov = String(fila.PROVEEDOR || "Sin Empresa").trim();

          if (!cacheAdmisiones[admision]) {
            cacheAdmisiones[admision] = { total: 0, estados: new Set(), proveedores: new Set() };
          }
          cacheAdmisiones[admision].total += monto;
          cacheAdmisiones[admision].estados.add(estadoFila);
          cacheAdmisiones[admision].proveedores.add(prov);
        }

        const resumenDeltas = { anios: {}, meses: {}, empresas: {} };

        const inicializarEstructuraDelta = (a, m, e) => {
          if (!resumenDeltas.anios[a]) resumenDeltas.anios[a] = { total: 0, facturado: 0, pendiente: 0 };
          const kMes = `${a}_${m}`;
          if (!resumenDeltas.meses[kMes]) resumenDeltas.meses[kMes] = { total: 0, facturado: 0, pendiente: 0, anio: a, mes: m };
          const kEmp = `${a}_${m}_${e}`;
          if (!resumenDeltas.empresas[kEmp]) resumenDeltas.empresas[kEmp] = { total: 0, facturado: 0, pendiente: 0, anio: a, mes: m, empresa: e };
          return { kMes, kEmp };
        };

        const batch = writeBatch(db);

        for (const fila of jsonData) {
          const rawFecha = fila.FECHA_CX || "";
          let fechaStr = rawFecha instanceof Date ? rawFecha.toISOString().split('T')[0] : String(rawFecha).trim();
          if (!fechaStr || !fechaStr.includes('-')) continue;

          const [a, m, d] = fechaStr.split('-');
          const mesIndex = parseInt(m) - 1;
          const mesStr = TODOS_LOS_MESES[mesIndex];

          const idFila = String(fila.ID || "").trim();
          if (!idFila) continue;

          const admision = String(fila.ADMISION || "0").trim();
          const nombreProveedor = String(fila.PROVEEDOR || "Sin Empresa").trim();
          const montoNuevo = Number(fila.OC_MONTO) || 0;
          const estadoNuevo = String(fila.ESTADO || "PENDIENTE").trim().toUpperCase();

          const { kMes, kEmp } = inicializarEstructuraDelta(a, mesStr, nombreProveedor);
          const registroExistente = mapaExistentes[idFila];

          let dTotal = 0;
          let dFacturado = 0;
          let dPendiente = 0;

          if (!registroExistente) {
            dTotal = montoNuevo;
            if (estadoNuevo === "FACTURADO") dFacturado = montoNuevo;
            else dPendiente = montoNuevo;
          } else {
            const montoViejo = Number(registroExistente.OC_MONTO) || 0;
            const estadoViejo = String(registroExistente.ESTADO || "PENDIENTE").trim().toUpperCase();

            dTotal = montoNuevo - montoViejo;

            if (estadoViejo === estadoNuevo) {
              if (estadoNuevo === "FACTURADO") dFacturado = dTotal;
              else dPendiente = dTotal;
            } else {
              if (estadoViejo === "FACTURADO") dFacturado -= montoViejo;
              else dPendiente -= montoViejo;

              if (estadoNuevo === "FACTURADO") dFacturado += montoNuevo;
              else dPendiente += montoNuevo;
            }
          }

          resumenDeltas.anios[a].total += dTotal;
          resumenDeltas.anios[a].facturado += dFacturado;
          resumenDeltas.anios[a].pendiente += dPendiente;

          resumenDeltas.meses[kMes].total += dTotal;
          resumenDeltas.meses[kMes].facturado += dFacturado;
          resumenDeltas.meses[kMes].pendiente += dPendiente;

          resumenDeltas.empresas[kEmp].total += dTotal;
          resumenDeltas.empresas[kEmp].facturado += dFacturado;
          resumenDeltas.empresas[kEmp].pendiente += dPendiente;

          const toFechaStr = (val) => {
            if (!val) return "";
            if (val instanceof Date) return val.toISOString().split('T')[0];
            if (typeof val === 'number') return new Date(Math.round((val - 25569) * 86400 * 1000)).toISOString().split('T')[0];
            return String(val);
          };

          const infoAgregada = cacheAdmisiones[admision];
          let estadoGeneral = "SIN ESTADO";
          if (infoAgregada) {
            if (infoAgregada.estados.has("PENDIENTE")) estadoGeneral = "PENDIENTE";
            else if (infoAgregada.estados.has("FACTURADO")) estadoGeneral = "FACTURADO";
            else if (infoAgregada.estados.size > 0) estadoGeneral = Array.from(infoAgregada.estados)[0];
          }

          const anioRef = doc(db, "documentos_cargaDatos", a);
          const mesRef = doc(db, "documentos_cargaDatos", a, "meses", mesStr);
          const diaRef = doc(db, "documentos_cargaDatos", a, "meses", mesStr, "dias", d);
          const admisionRef = doc(db, "documentos_cargaDatos", a, "meses", mesStr, "dias", d, "admisiones", admision);
          const proveedorRef = doc(db, "documentos_cargaDatos", a, "meses", mesStr, "dias", d, "admisiones", admision, "proveedores", nombreProveedor);
          const registroRef = doc(db, "documentos_cargaDatos", a, "meses", mesStr, "dias", d, "admisiones", admision, "proveedores", nombreProveedor, "registros", idFila);

          batch.set(anioRef, { active: true, anio: a }, { merge: true });
          batch.set(mesRef, { active: true, mes: mesStr }, { merge: true });
          batch.set(diaRef, { active: true, dia: d }, { merge: true });

          batch.set(admisionRef, {
            active: true,
            ADMISION: admision,
            PACIENTE: String(fila.PACIENTE || ""),
            FECHA_CX: fechaStr,
            MEDICO: String(fila.MEDICO || ""),
            PREVISION: String(fila.PREVISION || ""),
            CONVENIO: String(fila.CONVENIO || ""),
            CIRUGIA: String(fila.CIRUGIA || ""),
            TOTAL: infoAgregada ? infoAgregada.total : 0,
            ESTADO_GENERAL: estadoGeneral,
            CANT_PROVEEDORES: infoAgregada ? infoAgregada.proveedores.size : 1
          }, { merge: true });

          batch.set(proveedorRef, { active: true, EMPRESA: nombreProveedor, ADMISION: admision, PACIENTE: String(fila.PACIENTE || ""), FECHA_CX: fechaStr, MEDICO: String(fila.MEDICO || ""), PREVISION: String(fila.PREVISION || ""), CONVENIO: String(fila.CONVENIO || ""), CIRUGIA: String(fila.CIRUGIA || ""), OC: String(fila.OC || "") }, { merge: true });

          batch.set(registroRef, {
            ID: idFila, ADMISION: admision, PACIENTE: String(fila.PACIENTE || ""), MEDICO: String(fila.MEDICO || ""), FECHA_CX: fechaStr,
            PREVISION: String(fila.PREVISION || ""), CONVENIO: String(fila.CONVENIO || ""), PROVEEDOR: nombreProveedor, CIRUGIA: String(fila.CIRUGIA || ""),
            CODIGO: String(fila.CODIGO || ""), DESCRIPCION: String(fila.DESCRIPCION || ""), CANT: Number(fila.CANT) || 0, PRECIO_U: Number(fila.PRECIO_U) || 0,
            ATRIBUTO: String(fila.ATRIBUTO || ""), OC: String(fila.OC || ""), OC_MONTO: montoNuevo, ESTADO: estadoNuevo,
            FECHA_RECEPCION: toFechaStr(fila.FECHA_RECEPCION), FECHA_CARGO: toFechaStr(fila.FECHA_CARGO), NUMERO_GUIA: String(fila.NUMERO_GUIA || ""),
            NUMERO_FACTURA: String(fila.NUMERO_FACTURA || ""), FECHA_EMISION: toFechaStr(fila.FECHA_EMISION), FECHA_INGRESO: toFechaStr(fila.FECHA_INGRESO),
            LOTE: String(fila.LOTE || ""), FECHA_VENCIMIENTO: toFechaStr(fila.FECHA_VENCIMIENTO), active: true, fechaActualizacion: new Date(), registradoPor: userData?.nombreCompleto || 'Usuario'
          });
        }

        Object.keys(resumenDeltas.anios).forEach(anioKey => {
          const d = resumenDeltas.anios[anioKey];
          if (d.total !== 0 || d.facturado !== 0 || d.pendiente !== 0) {
            const ref = doc(db, "documentos_financieros", anioKey);
            batch.set(ref, { anio: anioKey, total: increment(d.total), facturado: increment(d.facturado), pendiente: increment(d.pendiente) }, { merge: true });
          }
        });

        Object.keys(resumenDeltas.meses).forEach(mesKey => {
          const d = resumenDeltas.meses[mesKey];
          if (d.total !== 0 || d.facturado !== 0 || d.pendiente !== 0) {
            const ref = doc(db, "documentos_financieros", d.anio, "meses", d.mes);
            batch.set(ref, { mes: d.mes, total: increment(d.total), facturado: increment(d.facturado), pendiente: increment(d.pendiente) }, { merge: true });
          }
        });

        Object.keys(resumenDeltas.empresas).forEach(empKey => {
          const d = resumenDeltas.empresas[empKey];
          if (d.total !== 0 || d.facturado !== 0 || d.pendiente !== 0) {
            const cleanEmpId = `${d.mes}_${d.empresa.replace(/\s+/g, '_')}`;
            const ref = doc(db, "documentos_financieros", d.anio, "empresas", cleanEmpId);
            batch.set(ref, { mes: d.mes, empresa: d.empresa, total: increment(d.total), facturado: increment(d.facturado), pendiente: increment(d.pendiente) }, { merge: true });
          }
        });

        await batch.commit();
      }
      showToast("Procesamiento diferencial completado de forma segura", "success");
      return true;
    } catch (error) {
      console.error("❌ ERROR DETALLADO DE IMPORTACIÓN:", error);
      showToast("Error en procesamiento. Revisa la consola del navegador.", "error");
      return false;
    } finally {
      setCargando(false);
    }
  }, [userData, showToast]);

  const totalPendientesOC = useMemo(() => {
    return datos.filter(d => {
      const cantOC = d.documentos?.filter(docObj => docObj.nombre.toUpperCase().startsWith('OC_')).length || 0;
      const cantProveedores = d.CANT_PROVEEDORES || 1;
      return cantOC < cantProveedores;
    }).length;
  }, [datos]);

  const datosFiltrados = useMemo(() => {
    return datos.filter(d => {
      const matchBusqueda = d.ADMISION?.toString().toLowerCase().includes(filtros.busqueda.toLowerCase()) || d.PACIENTE?.toLowerCase().includes(filtros.busqueda.toLowerCase());
      const matchDia = filtros.dia ? d._dia === filtros.dia.padStart(2, '0') : true;

      const cantOC = d.documentos?.filter(docObj => docObj.nombre.toUpperCase().startsWith('OC_')).length || 0;
      const cantProveedores = d.CANT_PROVEEDORES || 1;

      let matchOC = true;
      if (filtros.estadoOC === 'con_oc') matchOC = (cantOC >= cantProveedores && cantOC > 0);
      if (filtros.estadoOC === 'sin_oc') matchOC = (cantOC === 0);
      if (filtros.estadoOC === 'parcial') matchOC = (cantOC > 0 && cantOC < cantProveedores);

      return matchBusqueda && matchDia && matchOC;
    });
  }, [datos, filtros.busqueda, filtros.dia, filtros.estadoOC]);

  const estadisticasDetalle = useMemo(() => {
    let totalGeneral = 0;
    const porEstado = {};
    const porProveedor = {};

    registrosDetalle.forEach(reg => {
      const monto = Number(reg.OC_MONTO) || 0;
      const estado = (reg.ESTADO || "SIN ESTADO").trim().toUpperCase();
      const prov = (reg.PROVEEDOR || "SIN PROVEEDOR").trim();

      totalGeneral += monto;
      porEstado[estado] = (porEstado[estado] || 0) + monto;

      if (!porProveedor[prov]) porProveedor[prov] = { total: 0, facturado: 0, pendiente: 0 };
      porProveedor[prov].total += monto;
      if (estado === "FACTURADO") porProveedor[prov].facturado += monto;
      else porProveedor[prov].pendiente += monto;
    });

    return {
      totalGeneral,
      facturadoGlobal: porEstado["FACTURADO"] || 0,
      pendienteGlobal: totalGeneral - (porEstado["FACTURADO"] || 0),
      porEstado: Object.entries(porEstado),
      porProveedor: Object.entries(porProveedor)
    };
  }, [registrosDetalle]);

  return {
    cargando,
    cargandoDetalle,
    datosFiltrados,
    totalPendientesOC,
    registrosDetalle,
    estadisticasDetalle,
    filtros,
    setFiltros,
    listasFiltros: { aniosDisponibles, mesesDisponibles },
    cargarDetallesAdmision,
    onDropExcel
  };
};