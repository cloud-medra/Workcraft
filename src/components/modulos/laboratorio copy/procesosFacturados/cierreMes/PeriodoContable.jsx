// src/components/facturas/cierreMes/PeriodoContable.jsx
import React, { useState } from 'react';
import {
  CalendarCheck,
  Lock,
  Unlock,
  AlertTriangle,
  History,
  CheckCircle2,
  Clock,
  UserCheck,
  RotateCcw,
  ShieldCheck,
  FileText
} from 'lucide-react';
import { useToast } from '../../../../../context/ToastContext';
import { useGranularPermission } from '../../../../../hooks/useGranularPermission';

const PATH_VISTA = "/laboratorio/controlFactura";

// Datos de demostración iniciales
const INITIAL_PERIODOS = [
  {
    periodoId: '2026-08',
    nombre: 'Agosto 2026',
    anio: 2026,
    mes: 8,
    estado: 'ABIERTO',
    esActivo: true,
    fechaCierre: null,
    cerradoPor: null,
    historial: []
  },
  {
    periodoId: '2026-07',
    nombre: 'Julio 2026',
    anio: 2026,
    mes: 7,
    estado: 'CERRADO',
    esActivo: false,
    fechaCierre: '2026-07-31T18:30:00Z',
    cerradoPor: 'admin@medra.cl',
    historial: [
      {
        fecha: '2026-08-02T10:15:00Z',
        usuario: 'soporte@medra.cl',
        accion: 'REAPERTURA',
        motivo: 'Ajuste extraordinario por facturas pendientes de proveedor crítico.'
      },
      {
        fecha: '2026-08-03T09:00:00Z',
        usuario: 'admin@medra.cl',
        accion: 'CIERRE',
        motivo: 'Cierre definitivo posterior a corrección.'
      }
    ]
  },
  {
    periodoId: '2026-06',
    nombre: 'Junio 2026',
    anio: 2026,
    mes: 6,
    estado: 'CERRADO',
    esActivo: false,
    fechaCierre: '2026-06-30T20:00:00Z',
    cerradoPor: 'admin@medra.cl',
    historial: []
  }
];

const PeriodoContable = () => {
  const { showToast } = useToast();
  const { hasPermission } = useGranularPermission();

  const [periodos, setPeriodos] = useState(INITIAL_PERIODOS);
  const [modalReapertura, setModalReapertura] = useState({ open: false, periodo: null });
  const [motivoReapertura, setMotivoReapertura] = useState('');

  // Validaciones de permisos granulares
  const puedeCerrar = hasPermission(PATH_VISTA, 'cierre_mes', 'cerrar_periodo');
  const puedeReabrir = hasPermission(PATH_VISTA, 'cierre_mes', 'reabrir_periodo');

  // Obtener el período activo actual
  const periodoActivo = periodos.find((p) => p.esActivo);

  // Generar nombre de mes siguiente dinámicamente
  const obtenerSiguientePeriodo = (p) => {
    let nuevoMes = p.mes + 1;
    let nuevoAnio = p.anio;
    if (nuevoMes > 12) {
      nuevoMes = 1;
      nuevoAnio += 1;
    }
    const mesStr = String(nuevoMes).padStart(2, '0');
    const nombresMeses = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return {
      periodoId: `${nuevoAnio}-${mesStr}`,
      nombre: `${nombresMeses[nuevoMes - 1]} ${nuevoAnio}`,
      anio: nuevoAnio,
      mes: nuevoMes
    };
  };

  // Función para cerrar el período actual y abrir el siguiente
  const handleCerrarMes = () => {
    if (!periodoActivo) return;

    const siguiente = obtenerSiguientePeriodo(periodoActivo);
    const ahora = new Date().toISOString();

    const periodosActualizados = periodos.map((p) => {
      if (p.periodoId === periodoActivo.periodoId) {
        return {
          ...p,
          estado: 'CERRADO',
          esActivo: false,
          fechaCierre: ahora,
          cerradoPor: 'usuario.actual@medra.cl'
        };
      }
      return p;
    });

    const nuevoPeriodoObj = {
      periodoId: siguiente.periodoId,
      nombre: siguiente.nombre,
      anio: siguiente.anio,
      mes: siguiente.mes,
      estado: 'ABIERTO',
      esActivo: true,
      fechaCierre: null,
      cerradoPor: null,
      historial: []
    };

    setPeriodos([nuevoPeriodoObj, ...periodosActualizados]);
    showToast(`Mes de ${periodoActivo.nombre} cerrado. ${siguiente.nombre} es ahora el mes activo.`, 'success');
  };

  // Confirmar reapertura de un período cerrado
  const handleConfirmarReapertura = () => {
    if (!motivoReapertura.trim()) {
      showToast('Debe ingresar un motivo para la reapertura', 'error');
      return;
    }

    const target = modalReapertura.periodo;
    const ahora = new Date().toISOString();

    const periodosActualizados = periodos.map((p) => {
      // El período seleccionado vuelve a estar ABIERTO y ACTIVO
      if (p.periodoId === target.periodoId) {
        const nuevoHistorial = [
          {
            fecha: ahora,
            usuario: 'usuario.actual@medra.cl',
            accion: 'REAPERTURA',
            motivo: motivoReapertura
          },
          ...(p.historial || [])
        ];
        return {
          ...p,
          estado: 'ABIERTO',
          esActivo: true,
          historial: nuevoHistorial
        };
      }
      // Los demás pasan a no ser el activo
      return { ...p, esActivo: false };
    });

    setPeriodos(periodosActualizados);
    setModalReapertura({ open: false, periodo: null });
    setMotivoReapertura('');
    showToast(`Período ${target.nombre} reabierto exitosamente`, 'info');
  };

  return (
    <div className="w-full h-full flex flex-col space-y-4 font-sans text-xs">
      {/* TARJETA DE ESTADO ACTUAL */}
      <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl p-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 dark:bg-blue-950/60 text-[#2383C2] dark:text-[#369BCE] rounded-lg border border-blue-100 dark:border-blue-900/40">
              <CalendarCheck size={24} />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-gray-500">
                Período de Imputación Activo
              </span>
              <h2 className="text-base font-bold text-slate-800 dark:text-gray-100 flex items-center gap-2">
                {periodoActivo ? periodoActivo.nombre : 'Sin período activo'}
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  ABIERTO
                </span>
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-gray-400 mt-0.5">
                Todas las facturas ingresadas actualmente quedarán imputadas en este período.
              </p>
            </div>
          </div>

          {puedeCerrar && periodoActivo && (
            <button
              onClick={handleCerrarMes}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg shadow-xs flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Lock size={15} />
              <span>Cerrar Mes de {periodoActivo.nombre}</span>
            </button>
          )}
        </div>
      </div>

      {/* GRILLA DE PERÍODOS CONTABLES */}
      <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-xs flex-1 flex flex-col">
        <div className="px-4 py-3 bg-slate-50 dark:bg-gray-900/50 border-b border-slate-200 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History size={16} className="text-[#2383C2]" />
            <h3 className="font-bold text-slate-800 dark:text-gray-200 uppercase text-[11px] tracking-wider">
              Historial de Períodos Contables
            </h3>
          </div>
          <span className="text-[10px] font-semibold text-slate-400">
            Total Períodos: {periodos.length}
          </span>
        </div>

        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-slate-100/70 dark:bg-gray-900 text-slate-600 dark:text-gray-400 uppercase font-bold text-[10px] border-b border-slate-200 dark:border-gray-700">
                <th className="py-2.5 px-3">Período</th>
                <th className="py-2.5 px-3">Estado</th>
                <th className="py-2.5 px-3">Fecha Cierre</th>
                <th className="py-2.5 px-3">Responsable Cierre</th>
                <th className="py-2.5 px-3 text-center">Auditoría / Historial</th>
                <th className="py-2.5 px-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-gray-700/60">
              {periodos.map((p) => (
                <tr
                  key={p.periodoId}
                  className={`hover:bg-slate-50 dark:hover:bg-gray-700/30 transition-colors ${
                    p.esActivo ? 'bg-blue-50/20 dark:bg-blue-950/10' : ''
                  }`}
                >
                  <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-gray-200">
                    <div className="flex items-center gap-2">
                      <span>{p.nombre}</span>
                      {p.esActivo && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-100 text-[#2383C2] dark:bg-blue-950 dark:text-blue-300">
                          ACTIVO
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="py-2.5 px-3">
                    {p.estado === 'ABIERTO' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        <Unlock size={11} /> ABIERTO
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-gray-700 dark:text-gray-300">
                        <Lock size={11} /> CERRADO
                      </span>
                    )}
                  </td>

                  <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-gray-400">
                    {p.fechaCierre ? new Date(p.fechaCierre).toLocaleString('es-CL') : '-'}
                  </td>

                  <td className="py-2.5 px-3 text-slate-600 dark:text-gray-400">
                    {p.cerradoPor || '-'}
                  </td>

                  <td className="py-2.5 px-3 text-center">
                    {p.historial && p.historial.length > 0 ? (
                      <span
                        className="inline-flex items-center gap-1 text-[10px] text-amber-700 dark:text-amber-400 font-semibold cursor-help"
                        title={p.historial.map((h) => `[${new Date(h.fecha).toLocaleDateString()}] ${h.accion}: ${h.motivo}`).join('\n')}
                      >
                        <AlertTriangle size={12} />
                        {p.historial.length} evento(s)
                      </span>
                    ) : (
                      <span className="text-slate-400 dark:text-gray-500 text-[10px]">Sin eventos</span>
                    )}
                  </td>

                  <td className="py-2.5 px-3 text-right">
                    {p.estado === 'CERRADO' && puedeReabrir && (
                      <button
                        onClick={() => setModalReapertura({ open: true, periodo: p })}
                        className="px-2.5 py-1 text-[11px] bg-slate-100 hover:bg-amber-50 dark:bg-gray-700 dark:hover:bg-amber-950/50 text-slate-700 dark:text-gray-200 hover:text-amber-700 dark:hover:text-amber-300 border border-slate-200 dark:border-gray-600 hover:border-amber-300 rounded font-medium transition-colors flex items-center gap-1.5 ml-auto cursor-pointer"
                      >
                        <RotateCcw size={12} />
                        <span>Reabrir Mes</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE JUSTIFICACIÓN DE REAPERTURA */}
      {modalReapertura.open && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl max-w-md w-full p-4 shadow-xl space-y-3">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 border-b border-slate-200 dark:border-gray-700 pb-2">
              <RotateCcw size={18} />
              <h3 className="font-bold text-sm text-slate-800 dark:text-gray-100">
                Reapertura de Período — {modalReapertura.periodo?.nombre}
              </h3>
            </div>

            <p className="text-slate-600 dark:text-gray-300 leading-relaxed text-[11px]">
              Al reabrir este mes, las facturas ingresadas volverán a imputarse en el período{' '}
              <strong className="text-slate-800 dark:text-gray-100">{modalReapertura.periodo?.nombre}</strong>. Esta acción quedará registrada en la bitácora de auditoría.
            </p>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 dark:text-gray-400 uppercase mb-1">
                Motivo / Justificación Obligatoria <span className="text-red-500">*</span>
              </label>
              <textarea
                value={motivoReapertura}
                onChange={(e) => setMotivoReapertura(e.target.value)}
                rows={3}
                placeholder="Ej. Ingreso de facturas pendientes de cierre mensual autorizadas por jefatura..."
                className="w-full p-2 bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded text-slate-800 dark:text-gray-100 text-xs focus:ring-1 focus:ring-[#2383C2] outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-gray-700">
              <button
                onClick={() => {
                  setModalReapertura({ open: false, periodo: null });
                  setMotivoReapertura('');
                }}
                className="px-3 py-1.5 text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-700 rounded font-medium cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmarReapertura}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded font-semibold cursor-pointer transition-colors"
              >
                Confirmar Reapertura
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PeriodoContable;