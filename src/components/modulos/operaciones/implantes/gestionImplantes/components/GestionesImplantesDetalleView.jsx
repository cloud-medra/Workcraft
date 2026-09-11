import React, { useState, useMemo, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { Info, ListFilter, UploadCloud, Unlock, Lock, History } from 'lucide-react';

import { db } from '../../../../../../firebaseConfig';
import { COLECCIONES, MESES } from '../../../../administracion/controlMensual/constants';
import { InformacionTab } from './Informaciontab/Informaciontab';
import { DetallesTab } from './Detallestab/Detallestab';
import { CargasTab } from './Cargastab/Cargastab';
import { esEstadoCargaCompleto } from './Cargastab/cargasHelpers';
import { EmpresasFechasPanel } from './EmpresasFechasPanel';
import { HistorialLogsContenido } from '../GestionesImplanteDrawers';

const MODULO_ACTUAL = 'implantes';

const GestionesImplantesDetalleView = forwardRef(({
  item,
  todosLosRegistros = [],
  onGuardar,
  onCancelar,
  logsList = [],
  loadingLogs = false,
  cargarLogsDeImplante,
  formatearFecha
}, ref) => {

  const [periodoActivo, setPeriodoActivo] = useState(null);
  const [cargandoPeriodo, setCargandoPeriodo] = useState(true);

  // Único listener de "cierres_periodos" para esta vista: se pasa hacia
  // abajo como prop (periodoAbierto/cargandoPeriodo) a CargasTab, que antes
  // montaba su propio usePeriodoAbiertoModulo('implantes') con esta misma
  // query, duplicando el listener mientras la pestaña "Cargas" estaba activa.
  useEffect(() => {
    const q = query(
      collection(db, COLECCIONES.CIERRES),
      where('modulo', '==', MODULO_ACTUAL),
      where('estado', 'in', ['ABIERTO', 'REABIERTO'])
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        if (snap.empty) {
          setPeriodoActivo(null);
        } else {
          const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          docs.sort((a, b) => (b.fechaApertura?.toMillis?.() || 0) - (a.fechaApertura?.toMillis?.() || 0));
          const activo = docs[0];
          setPeriodoActivo({ anio: activo.anio, mes: activo.mes });
        }
        setCargandoPeriodo(false);
      },
      (error) => {
        console.error('Error al escuchar el período activo de Implantes:', error);
        setCargandoPeriodo(false);
      }
    );
    return () => unsub();
  }, []);

  const nombrePeriodoActivo = useMemo(() => {
    if (!periodoActivo) return '';
    const mesInfo = MESES.find(m => m.id === periodoActivo.mes);
    return `${mesInfo?.nombre || periodoActivo.mes} ${periodoActivo.anio}`;
  }, [periodoActivo]);

  const esCodigoPendiente = (codigo) => {
    const c = (codigo || '').toString().trim().toUpperCase();
    return c === '' || c === 'P' || c === 'SIN_ADMISION';
  };

  const obtenerCodigoAdmision = (registro) => {
    if (!registro) return '';
    const posibleId =
      registro.gestionId ??
      registro.agendaId ??
      registro.admision ??
      registro.numAdmision ??
      registro.idAdmision ??
      registro.codAdmision ??
      registro.nroAdmision ??
      registro.id;

    const codigo = posibleId !== null && posibleId !== undefined ? String(posibleId).trim() : '';

    return esCodigoPendiente(codigo) ? '' : codigo;
  };

  const admisionCodigoTarget = useMemo(() => {
    return obtenerCodigoAdmision(item);
  }, [item]);

  const registrosDeEstaAdmision = useMemo(() => {
    if (!admisionCodigoTarget) {
      return item ? [item] : [];
    }

    if (!Array.isArray(todosLosRegistros) || todosLosRegistros.length === 0) {
      return item ? [item] : [];
    }

    const filtrados = todosLosRegistros.filter(reg => {
      const regCodigo = obtenerCodigoAdmision(reg);
      return regCodigo === admisionCodigoTarget;
    });

    return filtrados.length > 0 ? filtrados : (item ? [item] : []);
  }, [admisionCodigoTarget, todosLosRegistros, item]);

  const [activeTab, setActiveTab] = useState('detalles');

  const construirEstadoInicial = () => {
    const bloquesEmpresas = registrosDeEstaAdmision.map((reg, index) => ({
      uniqueKey: reg.id ? `id_${reg.id}` : `registro_${index}_${Date.now()}`,
      idOriginal: reg.id,
      refPath: reg.refPath || null,
      empresa: reg.empresa || reg.nombreEmpresa || reg.razonSocial || '',
      fecha: reg.fecha || reg.fechaAgenda || reg.fecha_agenda || '',
      costo: reg.costo ?? reg.monto ?? 0,
      cotizaciones: Array.isArray(reg.cotizaciones) ? reg.cotizaciones : [],
      solicitud: reg.solicitud || 'PENDIENTE',
      estado: reg.estado || 'AGENDADO'
    }));

    return {
      gestionId: admisionCodigoTarget || obtenerCodigoAdmision(item),
      nombre: item?.nombre || item?.paciente || item?.nombrePaciente || '',
      convenio: item?.convenio || '',
      prevision: item?.prevision || '',
      medico: item?.medico || item?.nombreMedico || '',
      informe: item?.informe || 'PENDIENTE',
      atributo: item?.atributo || '',
      centro: item?.centro || item?.centroMedico || '',
      descripcion: item?.descripcion || item?.observacion || '',
      observacion: item?.observacion || item?.notaLibre || item?.notas || '',
      bloques: bloquesEmpresas
    };
  };

  const [formData, setFormData] = useState(construirEstadoInicial);
  const snapshotInicialRef = useRef(JSON.stringify(construirEstadoInicial()));

  const idsItemsOriginalesRef = useRef(
    registrosDeEstaAdmision.map(reg => {
      const items = Array.isArray(reg.cotizaciones) && reg.cotizaciones[0]?.items ? reg.cotizaciones[0].items : [];
      return items.map(it => ({
        id: it.id,
        periodoAnio: it.periodoAnio,
        periodoMes: it.periodoMes
      }));
    })
  );

  const [erroresFecha, setErroresFecha] = useState({});
  const [bloqueActivoIndex, setBloqueActivoIndex] = useState(0);
  const cargasTabRef = useRef(null);

  const handleGeneralChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleBloqueChange = (index, field, value) => {
    if (field === 'fecha' && value) {
      setErroresFecha(prev => ({ ...prev, [index]: false }));
    }

    setFormData(prev => {
      const nuevosBloques = [...prev.bloques];
      const bloque = { ...nuevosBloques[index], [field]: value };

      if (field === 'costo' && Array.isArray(bloque.cotizaciones) && bloque.cotizaciones.length > 0) {
        bloque.cotizaciones = [
          { ...bloque.cotizaciones[0], totalCotizacion: Number(value) || 0 },
          ...bloque.cotizaciones.slice(1)
        ];
      }

      nuevosBloques[index] = bloque;
      return { ...prev, bloques: nuevosBloques };
    });
  };

  const aplicarNuevoItemABloque = (bloque, data) => {
    const { numCotizacion, totalCotizacion, ...itemFields } = data;
    const cotizaciones = [...(bloque.cotizaciones || [])];

    const numLimpio = numCotizacion.trim();
    const nuevoItem = {
      ...itemFields,
      id: itemFields.id || `item_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    };

    let totalFinal;

    if (cotizaciones.length === 0) {
      totalFinal = Number(totalCotizacion) > 0 ? Number(totalCotizacion) : (Number(bloque.costo) || 0);
      cotizaciones.push({
        id: `cot_${Date.now()}`,
        numCotizacion: numLimpio,
        totalCotizacion: totalFinal,
        items: [nuevoItem]
      });
    } else {
      const cot = cotizaciones[0];
      totalFinal = Number(totalCotizacion) > 0 ? Number(totalCotizacion) : cot.totalCotizacion;
      cotizaciones[0] = {
        ...cot,
        numCotizacion: numLimpio || cot.numCotizacion,
        totalCotizacion: totalFinal,
        items: [...(cot.items || []), nuevoItem]
      };
    }

    return { ...bloque, cotizaciones, costo: totalFinal };
  };

  const handleAgregarItemCotizacion = (bloqueIndex, data) => {
    setFormData(prev => {
      const nuevosBloques = [...prev.bloques];
      nuevosBloques[bloqueIndex] = aplicarNuevoItemABloque(nuevosBloques[bloqueIndex], data);
      return { ...prev, bloques: nuevosBloques };
    });
  };

  const handleEliminarItem = (bloqueIndex, cotizacionId, itemId) => {
    setFormData(prev => {
      const nuevosBloques = [...prev.bloques];
      const bloque = nuevosBloques[bloqueIndex];
      const nuevasCotizaciones = (bloque.cotizaciones || []).map(cot => {
        if (cot.id !== cotizacionId) return cot;
        return {
          ...cot,
          items: (cot.items || []).filter(it => it.id !== itemId && it.padPadreId !== itemId)
        };
      });
      nuevosBloques[bloqueIndex] = { ...bloque, cotizaciones: nuevasCotizaciones };
      return { ...prev, bloques: nuevosBloques };
    });
  };

  const handleActualizarEstadoItem = (bloqueIndex, cotizacionId, itemId, nuevoEstadoCarga) => {
    setFormData(prev => {
      const nuevosBloques = [...prev.bloques];
      const bloque = nuevosBloques[bloqueIndex];
      const nuevasCotizaciones = (bloque.cotizaciones || []).map(cot => {
        if (cot.id !== cotizacionId) return cot;
        return {
          ...cot,
          items: (cot.items || []).map(it => it.id === itemId ? { ...it, estadoCarga: nuevoEstadoCarga } : it)
        };
      });
      nuevosBloques[bloqueIndex] = { ...bloque, cotizaciones: nuevasCotizaciones };
      return { ...prev, bloques: nuevosBloques };
    });
  };

  const handleEditarItem = (bloqueIndex, cotizacionId, itemId, camposActualizados) => {
    setFormData(prev => {
      const nuevosBloques = [...prev.bloques];
      const bloque = nuevosBloques[bloqueIndex];
      const nuevasCotizaciones = (bloque.cotizaciones || []).map(cot => {
        if (cot.id !== cotizacionId) return cot;
        return {
          ...cot,
          items: (cot.items || []).map(it => it.id === itemId ? { ...it, ...camposActualizados } : it)
        };
      });
      nuevosBloques[bloqueIndex] = { ...bloque, cotizaciones: nuevasCotizaciones };
      return { ...prev, bloques: nuevosBloques };
    });
  };

  const handleEliminarCotizacion = (bloqueIndex, cotizacionId) => {
    setFormData(prev => {
      const nuevosBloques = [...prev.bloques];
      const bloque = nuevosBloques[bloqueIndex];
      nuevosBloques[bloqueIndex] = {
        ...bloque,
        cotizaciones: (bloque.cotizaciones || []).filter(c => c.id !== cotizacionId),
        costo: 0
      };
      return { ...prev, bloques: nuevosBloques };
    });
  };

  useEffect(() => {
    setFormData(prev => {
      let huboCambios = false;
      const nuevosBloques = prev.bloques.map(bloque => {
        const items = (bloque.cotizaciones || []).flatMap(cot => cot.items || []);
        if (items.length === 0) return bloque;

        const hayItemsSinCodigo = items.some(it => it.sinCodigo);
        if (hayItemsSinCodigo) {
          if (bloque.estado !== 'INCOMPLETO') {
            huboCambios = true;
            return { ...bloque, estado: 'INCOMPLETO' };
          }
          return bloque;
        }

        if (bloque.estado === 'AGENDADO' || bloque.estado === 'AGENDANDO') {
          huboCambios = true;
          return { ...bloque, estado: 'PENDIENTE' };
        }

        const estadosNormalizados = [...new Set(items.map(it => {
          const estado = (it.estadoCarga || 'PENDIENTE').toUpperCase();
          return esEstadoCargaCompleto(estado) ? 'CARGADO' : estado;
        }))];
        const nuevoEstado = estadosNormalizados.length === 1 ? estadosNormalizados[0] : 'INCOMPLETO';

        if (nuevoEstado !== bloque.estado) {
          huboCambios = true;
          return { ...bloque, estado: nuevoEstado };
        }
        return bloque;
      });
      return huboCambios ? { ...prev, bloques: nuevosBloques } : prev;
    });
  }, [formData.bloques]);

  useEffect(() => {
    setFormData(prev => {
      let huboCambios = false;

      const nuevosBloques = prev.bloques.map(bloque => {
        if (bloque.solicitud === 'SOLICITADO') return bloque;

        const items = (bloque.cotizaciones?.[0]?.items) || [];
        if (items.length === 0) return bloque;

        const todosCompletos = items.every(it => esEstadoCargaCompleto((it.estadoCarga || '').toUpperCase()));
        const nuevoValor = todosCompletos ? 'SOLICITAR' : 'PENDIENTE';

        if (nuevoValor !== bloque.solicitud) {
          huboCambios = true;
          return { ...bloque, solicitud: nuevoValor };
        }
        return bloque;
      });

      return huboCambios ? { ...prev, bloques: nuevosBloques } : prev;
    });
  }, [formData.bloques]);

  const hayCambios = JSON.stringify(formData) !== snapshotInicialRef.current;

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hayCambios) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hayCambios]);

    const handleSubmit = (e) => {
    if (e && e.preventDefault) e.preventDefault();

    let formDataParaGuardar = formData;

    if (cargasTabRef.current) {
      const resultado = cargasTabRef.current.confirmarItemPendiente();

      if (resultado.status === 'incompleto') {
        return;
      }

      if (resultado.status === 'solo-total') {
        const nuevosBloques = [...formData.bloques];
        const bloque = nuevosBloques[bloqueActivoIndex];

        if (bloque?.cotizaciones?.length > 0) {
          const cotActual = bloque.cotizaciones[0];
          const cotActualizada = {
            ...cotActual,
            totalCotizacion: resultado.totalCotizacion,
            numCotizacion: resultado.numCotizacion || cotActual.numCotizacion
          };

          nuevosBloques[bloqueActivoIndex] = {
            ...bloque,
            cotizaciones: [cotActualizada, ...bloque.cotizaciones.slice(1)],
            costo: resultado.totalCotizacion
          };

          formDataParaGuardar = { ...formData, bloques: nuevosBloques };
          setFormData(formDataParaGuardar);
        }
      }

      if (resultado.status === 'ok' && resultado.items?.length > 0) {
        const nuevosBloques = [...formData.bloques];
        let bloqueActualizado = nuevosBloques[bloqueActivoIndex];
        resultado.items.forEach(itemData => {
          bloqueActualizado = aplicarNuevoItemABloque(bloqueActualizado, itemData);
        });
        nuevosBloques[bloqueActivoIndex] = bloqueActualizado;
        formDataParaGuardar = { ...formData, bloques: nuevosBloques };
        setFormData(formDataParaGuardar);
      }
    }

    const nuevosErrores = {};
    let hayError = false;

    formDataParaGuardar.bloques.forEach((bloque, idx) => {
      if (!bloque.fecha || String(bloque.fecha).trim() === '') {
        nuevosErrores[idx] = true;
        hayError = true;
      }
    });

    if (hayError) {
      setErroresFecha(nuevosErrores);
      const primerIndexConError = Number(Object.keys(nuevosErrores)[0]);
      setBloqueActivoIndex(primerIndexConError);
      setActiveTab('informacion');
      return;
    }

    const payload = {
      admisionId: formDataParaGuardar.gestionId,
      paciente: {
        nombre: formDataParaGuardar.nombre,
        convenio: formDataParaGuardar.convenio,
        prevision: formDataParaGuardar.prevision,
        medico: formDataParaGuardar.medico,
        informe: formDataParaGuardar.informe,
        atributo: formDataParaGuardar.atributo,
        centro: formDataParaGuardar.centro,
        descripcion: formDataParaGuardar.descripcion,
        observacion: formDataParaGuardar.observacion
      },
      registrosActualizados: formDataParaGuardar.bloques.map((b, idx) => {
        const idsOriginales = idsItemsOriginalesRef.current[idx] || [];
        const idsActuales = new Set((b.cotizaciones?.[0]?.items || []).map(it => it.id));
        const itemsEliminados = idsOriginales.filter(orig => !idsActuales.has(orig.id));

        return {
          id: b.idOriginal,
          gestionId: formDataParaGuardar.gestionId,
          empresa: b.empresa,
          fecha: b.fecha,
          fechaAgenda: b.fecha,
          costo: b.costo,
          cotizaciones: b.cotizaciones || [],
          solicitud: b.solicitud || 'PENDIENTE',
          estado: b.estado || 'AGENDADO',
          itemsEliminados,
          nombre: formDataParaGuardar.nombre,
          medico: formDataParaGuardar.medico,
          centro: formDataParaGuardar.centro
        };
      })
    };

    onGuardar(payload);
  };
  useImperativeHandle(ref, () => ({
    guardarTodo: handleSubmit,
    hayCambiosSinGuardar: () => hayCambios
  }));

  const estadoResumenAdmision = useMemo(() => {
    if (!formData.bloques || formData.bloques.length === 0) return 'AGENDADO';
    const estadosUnicos = [...new Set(formData.bloques.map(b => b.estado || 'AGENDADO'))];
    return estadosUnicos.length === 1 ? estadosUnicos[0] : 'INCOMPLETO';
  }, [formData.bloques]);

  const refPathBloqueActivo = formData.bloques[bloqueActivoIndex]?.refPath;

  useEffect(() => {
    if (activeTab !== 'logs' || !refPathBloqueActivo || !cargarLogsDeImplante) return;
    cargarLogsDeImplante({
      refPath: refPathBloqueActivo,
      nombre: formData.nombre,
      gestionId: formData.gestionId
    });
  }, [activeTab, refPathBloqueActivo]);

  return (
    <div className="flex-grow flex flex-col bg-slate-50/50 dark:bg-gray-900 overflow-hidden text-[10px]">

      {!cargandoPeriodo && (
        periodoActivo ? (
          <div className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 text-[10px] text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border-b border-emerald-100 dark:border-emerald-900/40">
            <Unlock size={11} className="shrink-0" />
            Período abierto para Implantes: <strong>{nombrePeriodoActivo}</strong>
          </div>
        ) : (
          <div className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 text-[10px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-100 dark:border-amber-900/40">
            <Lock size={11} className="shrink-0" />
            No hay un período abierto para Implantes.
          </div>
        )
      )}

      <div className="flex-grow flex overflow-hidden">

        <div className="w-40 shrink-0 bg-white dark:bg-gray-800 border-r border-slate-200 dark:border-gray-700 flex flex-col">
          <div className="p-2 border-b border-slate-200 dark:border-gray-700">
            <h2 className="text-[10px] font-bold text-slate-700 dark:text-gray-200 uppercase tracking-wide">
              Menú de Opción
            </h2>
          </div>

          <div className="p-1.5 space-y-1">
            <button
              type="button"
              onClick={() => setActiveTab('detalles')}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md font-medium transition text-left ${activeTab === 'detalles'
                ? 'bg-[#2383C2]/10 text-[#2383C2] dark:bg-blue-950/50 dark:text-blue-400 font-semibold'
                : 'text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-700/50'
                }`}
            >
              <ListFilter size={13} />
              <span className="truncate">Detalles</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('informacion')}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md font-medium transition text-left ${activeTab === 'informacion'
                ? 'bg-[#2383C2]/10 text-[#2383C2] dark:bg-blue-950/50 dark:text-blue-400 font-semibold'
                : 'text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-700/50'
                }`}
            >
              <Info size={13} />
              <span className="truncate">Información</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('cargas')}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md font-medium transition text-left ${activeTab === 'cargas'
                ? 'bg-[#2383C2]/10 text-[#2383C2] dark:bg-blue-950/50 dark:text-blue-400 font-semibold'
                : 'text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-700/50'
                }`}
            >
              <UploadCloud size={13} />
              <span className="truncate">Cargas</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('logs')}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md font-medium transition text-left ${activeTab === 'logs'
                ? 'bg-[#2383C2]/10 text-[#2383C2] dark:bg-blue-950/50 dark:text-blue-400 font-semibold'
                : 'text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-700/50'
                }`}
            >
              <History size={13} />
              <span className="truncate">Logs</span>
            </button>
          </div>
        </div>

        {(activeTab === 'informacion' || activeTab === 'cargas' || activeTab === 'logs') && (
          <EmpresasFechasPanel
            bloques={formData.bloques}
            bloqueActivoIndex={bloqueActivoIndex}
            setBloqueActivoIndex={setBloqueActivoIndex}
            erroresFecha={erroresFecha}
          />
        )}

        <div className="flex-grow flex flex-col overflow-auto">

          {activeTab === 'informacion' && (
            <InformacionTab
              formData={formData}
              handleGeneralChange={handleGeneralChange}
              handleBloqueChange={handleBloqueChange}
              bloqueActivoIndex={bloqueActivoIndex}
              erroresFecha={erroresFecha}
            />
          )}

          {activeTab === 'detalles' && (
            <DetallesTab formData={formData} />
          )}

          {activeTab === 'cargas' && (
            <CargasTab
              ref={cargasTabRef}
              formData={formData}
              bloqueActivoIndex={bloqueActivoIndex}
              onAgregarItem={handleAgregarItemCotizacion}
              onEliminarItem={handleEliminarItem}
              onEliminarCotizacion={handleEliminarCotizacion}
              onActualizarEstadoItem={handleActualizarEstadoItem}
              onEditarItem={handleEditarItem}
              periodoAbierto={periodoActivo}
              cargandoPeriodo={cargandoPeriodo}
            />
          )}

          {activeTab === 'logs' && (
            <div className="flex-grow overflow-y-auto p-3">
              {refPathBloqueActivo ? (
                <HistorialLogsContenido
                  logsList={logsList}
                  loadingLogs={loadingLogs}
                  formatearFecha={formatearFecha}
                />
              ) : (
                <div className="text-center py-12 text-gray-400 dark:text-gray-500 text-[10px]">
                  Este bloque aún no se ha guardado — guarda primero para ver su historial.
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
});

export default GestionesImplantesDetalleView;