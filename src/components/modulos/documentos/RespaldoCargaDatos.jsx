import React, { useState, useEffect, useCallback } from 'react';
import { collection, onSnapshot, doc, writeBatch, getDocs } from 'firebase/firestore';
import { useDropzone } from 'react-dropzone';
import { db } from '../../../firebaseConfig';
import { Folder, Upload, X, FileText, Search, Eye, Trash2 } from 'lucide-react';
import { useToast } from '../../../context/ToastContext';
import { useUser } from '../../../context/UserContext';
import * as XLSX from 'xlsx';
import Spinner from '../../ui/Spinner';

const CargaDatos = () => {
  const [datos, setDatos] = useState([]);
  const [aniosDisponibles, setAniosDisponibles] = useState([]);
  const [mesesDisponibles, setMesesDisponibles] = useState([]);
  const [registrosDetalle, setRegistrosDetalle] = useState([]);

  const [vista, setVista] = useState('tabla');
  const [filaSeleccionada, setFilaSeleccionada] = useState(null);

  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(false);
  const [cargandoDetalle, setCargandoDetalle] = useState(false); // Estado agregado
  const [showModal, setShowModal] = useState(false);

  const [filtroAnio, setFiltroAnio] = useState("");
  const [filtroMes, setFiltroMes] = useState("");
  const [filtroDia, setFiltroDia] = useState("");

  const { showToast } = useToast();
  const { userData } = useUser();
  const todosLosMeses = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

  useEffect(() => {
    const q = collection(db, "documentos_cargaDatos");
    getDocs(q).then((snapshot) => {
      const anios = snapshot.docs.map(d => d.id).sort((a, b) => b - a);
      setAniosDisponibles(anios);
    });
  }, []);

  useEffect(() => {
    if (!filtroAnio) {
      setMesesDisponibles([]);
      return;
    }
    const q = collection(db, `documentos_cargaDatos/${filtroAnio}/meses`);
    getDocs(q).then((snapshot) => {
      const meses = snapshot.docs.map(d => d.id);
      setMesesDisponibles(todosLosMeses.filter(m => meses.includes(m)));
    });
  }, [filtroAnio]);

  useEffect(() => {
    if (!filtroAnio || !filtroMes) {
      setDatos([]);
      return;
    }

    const pathDias = `documentos_cargaDatos/${filtroAnio}/meses/${filtroMes}/dias`;
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
  }, [filtroAnio, filtroMes]);

  const cargarDetallesAdmision = async (fila) => {
    const { _dia, _admision } = fila;
    const pathProveedores = `documentos_cargaDatos/${filtroAnio}/meses/${filtroMes}/dias/${_dia}/admisiones/${_admision}/proveedores`;

    setCargandoDetalle(true);
    try {
      const snapProveedores = await getDocs(collection(db, pathProveedores));
      let todosLosRegistros = [];

      for (const provDoc of snapProveedores.docs) {
        const registrosPath = `${pathProveedores}/${provDoc.id}/registros`;
        const snapRegistros = await getDocs(collection(db, registrosPath));
        const regs = snapRegistros.docs.map(r => ({ id: r.id, ...r.data() }));
        todosLosRegistros = [...todosLosRegistros, ...regs];
      }
      setRegistrosDetalle(todosLosRegistros);
    } catch (e) {
      showToast("Error cargando detalles", "error");
    } finally {
      setCargandoDetalle(false);
    }
  };

  const onDrop = useCallback(async (acceptedFiles) => {
    setCargando(true);
    try {
      for (const file of acceptedFiles) {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawJson = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

        const jsonData = rawJson.map(obj => {
          return Object.keys(obj).reduce((acc, key) => {
            const cleanKey = key.trim().toUpperCase().replace(/\s+/g, '_');
            acc[cleanKey] = obj[key];
            return acc;
          }, {});
        });

        const batch = writeBatch(db);
        for (const fila of jsonData) {
          const rawFecha = fila.FECHA_CX || "";
          let fechaStr = rawFecha instanceof Date ? rawFecha.toISOString().split('T')[0] : String(rawFecha).trim();
          if (!fechaStr || !fechaStr.includes('-')) continue;

          const [a, m, d] = fechaStr.split('-');
          const mesIndex = parseInt(m) - 1;
          if (isNaN(mesIndex) || mesIndex < 0 || mesIndex > 11) continue;

          const id = String(fila.ID || Math.random());
          const admision = String(fila.ADMISION || "0");
          const nombreProveedor = String(fila.PROVEEDOR || "Sin Empresa").trim();
          const mes = todosLosMeses[mesIndex];

          const toFechaStr = (val) => {
            if (!val || val === "") return "";
            if (val instanceof Date) return val.toISOString().split('T')[0];
            if (typeof val === 'number') {
              const date = new Date(Math.round((val - 25569) * 86400 * 1000));
              return date.toISOString().split('T')[0];
            }
            return String(val);
          };

          const anioRef = doc(db, "documentos_cargaDatos", a);
          const mesRef = doc(db, "documentos_cargaDatos", a, "meses", mes);
          const diaRef = doc(db, "documentos_cargaDatos", a, "meses", mes, "dias", d);
          const admisionRef = doc(db, "documentos_cargaDatos", a, "meses", mes, "dias", d, "admisiones", admision);
          const proveedorRef = doc(db, "documentos_cargaDatos", a, "meses", mes, "dias", d, "admisiones", admision, "proveedores", nombreProveedor);
          const registroRef = doc(db, "documentos_cargaDatos", a, "meses", mes, "dias", d, "admisiones", admision, "proveedores", nombreProveedor, "registros", id);

          batch.set(anioRef, { active: true, anio: a }, { merge: true });
          batch.set(mesRef, { active: true, mes }, { merge: true });
          batch.set(diaRef, { active: true, dia: d }, { merge: true });
          batch.set(admisionRef, { active: true, ADMISION: admision, PACIENTE: String(fila.PACIENTE || ""), FECHA_CX: fechaStr, MEDICO: String(fila.MEDICO || ""), PREVISION: String(fila.PREVISION || ""), CONVENIO: String(fila.CONVENIO || "") }, { merge: true });
          batch.set(proveedorRef, { active: true, EMPRESA: nombreProveedor, ADMISION: admision, PACIENTE: String(fila.PACIENTE || ""), FECHA_CX: fechaStr, MEDICO: String(fila.MEDICO || ""), PREVISION: String(fila.PREVISION || ""), CONVENIO: String(fila.CONVENIO || ""), OC: String(fila.OC || "") }, { merge: true });

          const datosLimpios = {
            ID: id, ADMISION: admision, PACIENTE: String(fila.PACIENTE || ""), MEDICO: String(fila.MEDICO || ""), FECHA_CX: fechaStr,
            PREVISION: String(fila.PREVISION || ""), CONVENIO: String(fila.CONVENIO || ""), PROVEEDOR: nombreProveedor,
            CODIGO: String(fila.CODIGO || ""), DESCRIPCION: String(fila.DESCRIPCION || ""), CANT: Number(fila.CANT) || 0,
            PRECIO_U: Number(fila.PRECIO_U) || 0, ATRIBUTO: String(fila.ATRIBUTO || ""), OC: String(fila.OC || ""),
            OC_MONTO: Number(fila.OC_MONTO) || 0, ESTADO: String(fila.ESTADO || ""), FECHA_RECEPCION: toFechaStr(fila.FECHA_RECEPCION),
            FECHA_CARGO: toFechaStr(fila.FECHA_CARGO), NUMERO_GUIA: String(fila.NUMERO_GUIA || ""), NUMERO_FACTURA: String(fila.NUMERO_FACTURA || ""),
            FECHA_EMISION: toFechaStr(fila.FECHA_EMISION), FECHA_INGRESO: toFechaStr(fila.FECHA_INGRESO), LOTE: String(fila.LOTE || ""),
            FECHA_VENCIMIENTO: toFechaStr(fila.FECHA_VENCIMIENTO), active: true, fechaActualizacion: new Date(), registradoPor: userData?.nombreCompleto || 'Usuario'
          };
          batch.set(registroRef, datosLimpios);
        }
        await batch.commit();
      }
      showToast("Importación completada con éxito", "success");
      setShowModal(false);
    } catch (error) {
      showToast("Error: " + error.message, "error");
    } finally {
      setCargando(false);
    }
  }, [userData, showToast, todosLosMeses]);

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx', '.csv'] },
  });

  const datosFiltrados = datos.filter(d => {
    const busquedaMatch = d.ADMISION?.toString().toLowerCase().includes(busqueda.toLowerCase()) || d.PACIENTE?.toLowerCase().includes(busqueda.toLowerCase());
    const diaMatch = filtroDia ? d._dia === filtroDia.padStart(2, '0') : true;
    return busquedaMatch && diaMatch;
  });

  const manejarClickFila = (fila) => {
    setFilaSeleccionada(fila);
    setRegistrosDetalle([]);
    cargarDetallesAdmision(fila);
    setVista('detalle');
  };

  const estadisticasDetalle = React.useMemo(() => {
    let totalGeneral = 0;
    const porEstado = {};
    const porProveedor = {};

    registrosDetalle.forEach(reg => {
      const monto = Number(reg.OC_MONTO) || 0;
      const estado = (reg.ESTADO || "SIN ESTADO").trim().toUpperCase();
      const prov = (reg.PROVEEDOR || "SIN PROVEEDOR").trim();

      totalGeneral += monto;

      if (!porEstado[estado]) {
        porEstado[estado] = 0;
      }
      porEstado[estado] += monto;

      if (!porProveedor[prov]) {
        porProveedor[prov] = { total: 0, facturado: 0, pendiente: 0 };
      }
      porProveedor[prov].total += monto;

      if (estado === "FACTURADO") {
        porProveedor[prov].facturado += monto;
      } else {
        porProveedor[prov].pendiente += monto;
      }
    });

    const facturadoGlobal = porEstado["FACTURADO"] || 0;
    const pendienteGlobal = totalGeneral - facturadoGlobal;

    return {
      totalGeneral,
      facturadoGlobal,
      pendienteGlobal,
      porEstado: Object.entries(porEstado),
      porProveedor: Object.entries(porProveedor)
    };
  }, [registrosDetalle]);

  return (
    <div className="w-full h-full flex flex-col bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden p-0 relative">
      {cargando && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-gray-500/20 backdrop-blur-[2px]">
          <div className="bg-white/90 p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-5">
            <Spinner size="md" color="#2383C2" />
            <h3 className="text-[#2383C2] font-bold">Procesando...</h3>
          </div>
        </div>
      )}

      {vista === 'tabla' ? (
        <>
          <h2 className="text-[14px] font-bold text-gray-700 p-4 flex items-center gap-2 border-b border-gray-200">
            <Folder size={16} className="text-[#2383C2]" /> GESTIÓN DE DATOS (EXCEL)
            <button onClick={() => setShowModal(true)} className="ml-auto bg-[#2383C2] text-white px-3 py-1 rounded text-[11px] font-bold flex items-center gap-1 hover:bg-[#0a4856]">
              <Upload size={12} /> Importar Excel
            </button>
          </h2>

          <div className="bg-gray-50 p-3 flex flex-wrap gap-2 items-center border-b border-gray-200">
            <select value={filtroAnio} onChange={(e) => { setFiltroAnio(e.target.value); setFiltroMes(""); setFiltroDia(""); }} className="h-8 border border-gray-300 rounded text-[12px] px-2 outline-none">
              <option value="">Año</option>
              {aniosDisponibles.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <select value={filtroMes} onChange={(e) => { setFiltroMes(e.target.value); setFiltroDia(""); }} disabled={!filtroAnio} className="h-8 border border-gray-300 rounded text-[12px] px-2 outline-none capitalize disabled:opacity-50">
              <option value="">Mes</option>
              {mesesDisponibles.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <input value={filtroDia} onChange={(e) => setFiltroDia(e.target.value)} disabled={!filtroMes} className="h-8 w-16 border border-gray-300 rounded text-[12px] px-2 outline-none disabled:opacity-50" placeholder="Día" />
            <div className="relative flex-grow max-w-sm">
              <Search className="absolute left-2 top-2 text-gray-400" size={14} />
              <input value={busqueda} onChange={e => setBusqueda(e.target.value)} className="w-full h-8 pl-8 pr-2 border border-gray-300 rounded text-[12px] outline-none" placeholder="Buscar admisión o paciente..." />
            </div>
            <span className="ml-auto text-[11px] text-gray-400">{datosFiltrados.length} fila(s)</span>
          </div>

          <div className="flex-grow overflow-auto">
            <table className="w-full text-left text-[11px] border-collapse">
              <thead className="bg-gray-100 sticky top-0">
                <tr className="text-gray-600 uppercase font-bold">
                  <th className="p-2 border-b border-r border-gray-200">Admisión</th>
                  <th className="p-2 border-b border-r border-gray-200">Paciente</th>
                  <th className="p-2 border-b border-r border-gray-200">Fecha CX</th>
                  <th className="p-2 border-b border-r border-gray-200">Médico</th>
                  <th className="p-2 border-b border-r border-gray-200">Previsión</th>
                  <th className="p-2 border-b border-r border-gray-200">Convenio</th>
                  <th className="p-2 border-b border-gray-200 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {datosFiltrados.map((d) => (
                  <tr key={d.id} onDoubleClick={() => manejarClickFila(d)} className="hover:bg-gray-50 transition-colors cursor-pointer">
                    <td className="p-2 border-b border-r border-gray-200 font-bold">{d.ADMISION}</td>
                    <td className="p-2 border-b border-r border-gray-200">{d.PACIENTE}</td>
                    <td className="p-2 border-b border-r border-gray-200">{d.FECHA_CX}</td>
                    <td className="p-2 border-b border-r border-gray-200">{d.MEDICO}</td>
                    <td className="p-2 border-b border-r border-gray-200">{d.PREVISION || "-"}</td>
                    <td className="p-2 border-b border-r border-gray-200">{d.CONVENIO || "-"}</td>
                    <td className="p-2 border-b border-gray-200 text-center">
                      <button onClick={() => manejarClickFila(d)} className="text-green-600 hover:text-green-800"><Eye size={14} /></button>
                      <button className="text-red-500 hover:text-red-700 ml-2"><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="p-6 h-full overflow-auto">
          <button onClick={() => setVista('tabla')} className="text-[#2383C2] font-bold mb-4 flex items-center gap-1 text-[12px] hover:underline">
            &larr; Volver a la tabla
          </button>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            <div className="bg-white p-4 rounded border border-gray-200 shadow-sm">
              <h3 className="text-[11px] font-bold text-[#2383C2] uppercase mb-3 border-b border-gray-100 pb-1">
                Detalle de Admisión
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-bold">Admisión</p>
                  <h2 className="text-[14px] font-bold text-gray-800">{filaSeleccionada?.ADMISION}</h2>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-bold">Paciente</p>
                  <p className="text-[14px] text-gray-700 truncate" title={filaSeleccionada?.PACIENTE}>
                    {filaSeleccionada?.PACIENTE}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-bold">Fecha CX</p>
                  <p className="text-[14px] text-gray-700">{filaSeleccionada?.FECHA_CX}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-bold">Médico</p>
                  <p className="text-[14px] text-gray-700 truncate" title={filaSeleccionada?.MEDICO}>
                    {filaSeleccionada?.MEDICO}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded border border-gray-200 shadow-sm flex flex-col gap-4 text-[11px]">

              <div>
                <h3 className="text-[11px] font-bold text-[#2383C2] uppercase mb-2 border-b border-gray-100 pb-1">
                  Resumen General Monto OC
                </h3>

                <div className="grid grid-cols-3 gap-2 mb-3 text-center">
                  <div className="bg-gray-50 p-2 rounded border border-gray-100">
                    <p className="text-[9px] text-gray-400 font-bold uppercase">Total OC</p>
                    <p className="text-[13px] font-bold text-gray-800">${estadisticasDetalle.totalGeneral.toLocaleString()}</p>
                  </div>
                  <div className="bg-green-50 p-2 rounded border border-green-100">
                    <p className="text-[9px] text-green-600 font-bold uppercase">Facturado</p>
                    <p className="text-[13px] font-bold text-green-700">${estadisticasDetalle.facturadoGlobal.toLocaleString()}</p>
                  </div>
                  <div className="bg-amber-50 p-2 rounded border border-amber-100">
                    <p className="text-[9px] text-amber-600 font-bold uppercase">Pendiente</p>
                    <p className="text-[13px] font-bold text-amber-700">${estadisticasDetalle.pendienteGlobal.toLocaleString()}</p>
                  </div>
                </div>

                {estadisticasDetalle.porEstado.length > 0 && (
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] bg-gray-50 p-1.5 rounded border border-gray-100">
                    <span className="font-bold text-gray-500 uppercase">Estados:</span>
                    {estadisticasDetalle.porEstado.map(([estado, monto]) => (
                      <span key={estado} className="text-gray-700">
                        <span className="font-semibold text-gray-900">{estado}:</span> ${monto.toLocaleString()}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex-grow flex flex-col min-h-[120px]">
                <h3 className="text-[11px] font-bold text-[#2383C2] uppercase mb-1.5 border-b border-gray-100 pb-1">
                  Monto OC por Proveedor
                </h3>

                <div className="overflow-auto max-h-[140px] border border-gray-100 rounded">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50 sticky top-0 text-[10px] text-gray-500 font-bold uppercase border-b border-gray-200">
                      <tr>
                        <th className="p-1.5">Proveedor</th>
                        <th className="p-1.5 text-right">Facturado</th>
                        <th className="p-1.5 text-right">Pendiente</th>
                        <th className="p-1.5 text-right bg-gray-100 text-gray-700">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {estadisticasDetalle.porProveedor.length === 0 ? (
                        <tr>
                          <td colSpan="4" className="text-center p-4 text-gray-400 italic">No hay registros</td>
                        </tr>
                      ) : (
                        estadisticasDetalle.porProveedor.map(([proveedor, datos]) => (
                          <tr key={proveedor} className="border-b border-gray-50 hover:bg-gray-50/80 last:border-b-0 text-[10.5px]">
                            <td className="p-1.5 font-medium text-gray-700 truncate max-w-[120px]" title={proveedor}>
                              {proveedor}
                            </td>
                            <td className="p-1.5 text-right text-green-600">${datos.facturado.toLocaleString()}</td>
                            <td className="p-1.5 text-right text-amber-600">${datos.pendiente.toLocaleString()}</td>
                            <td className="p-1.5 text-right font-bold bg-gray-50/50 text-gray-800">${datos.total.toLocaleString()}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

          </div>

          <div className="overflow-auto border border-gray-200 rounded relative min-h-[100px]">
            {cargandoDetalle && (
              <div className="absolute top-10 left-0 right-0 z-10 flex justify-center bg-white/80 pt-4">
                <div className="flex flex-col items-center gap-2">
                  <Spinner size="sm" color="#2383C2" />
                  <span className="text-[10px] text-[#2383C2] font-bold">Cargando registros...</span>
                </div>
              </div>
            )}
            <table className="w-full text-[11px] text-left border-collapse">
              <thead className="bg-gray-100">
                <tr className="text-gray-600 uppercase font-bold">
                  <th className="p-2 border-b border-gray-200">Proveedor</th>
                  <th className="p-2 border-b border-gray-200">Descripción</th>
                  <th className="p-2 border-b border-gray-200">Cant</th>
                  <th className="p-2 border-b border-gray-200">Precio U.</th>
                  <th className="p-2 border-b border-gray-200">Monto OC</th>
                  <th className="p-2 border-b border-gray-200">OC</th>
                  <th className="p-2 border-b border-gray-200">Estado</th>
                  <th className="p-2 border-b border-gray-200">N° Factura</th>
                  <th className="p-2 border-b border-gray-200">F. Emisión</th>
                  <th className="p-2 border-b border-gray-200">N° Guía</th>
                  <th className="p-2 border-b border-gray-200">Lote</th>
                  <th className="p-2 border-b border-gray-200">F. Vencimiento</th>
                </tr>
              </thead>
              <tbody>
                {registrosDetalle.map((reg) => (
                  <tr key={reg.id} className="hover:bg-gray-50 border-b border-gray-100 last:border-b-0">
                    <td className="p-2">{reg.PROVEEDOR}</td>
                    <td className="p-2">{reg.DESCRIPCION}</td>
                    <td className="p-2">{reg.CANT}</td>
                    <td className="p-2">${reg.PRECIO_U?.toLocaleString()}</td>
                    <td className="p-2">${reg.OC_MONTO?.toLocaleString()}</td>
                    <td className="p-2">{reg.OC}</td>
                    <td className="p-2">{reg.ESTADO}</td>
                    <td className="p-2">{reg.NUMERO_FACTURA}</td>
                    <td className="p-2">{reg.FECHA_EMISION}</td>
                    <td className="p-2">{reg.NUMERO_GUIA}</td>
                    <td className="p-2">{reg.LOTE}</td>
                    <td className="p-2">{reg.FECHA_VENCIMIENTO}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-gray-700">Importar Excel</h3>
              <button onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            <div {...getRootProps()} className="border-2 border-dashed rounded-lg p-10 text-center cursor-pointer">
              <input {...getInputProps()} />
              <FileText size={40} className="mx-auto text-gray-400 mb-4" />
              <p className="text-[13px] text-gray-500">Arrastra tu archivo aquí o haz clic</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CargaDatos;