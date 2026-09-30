import { useState, useMemo } from 'react';
import { FileText, UploadCloud, Eye, Download, Loader2, AlertCircle, RefreshCw, FolderOpen, CheckCircle2, XCircle, HelpCircle } from 'lucide-react';
import { useToast } from '../../../../../../../context/ToastContext';
import {
  TIPOS_DOCUMENTO,
  TAMANO_MAXIMO_MB,
  clasificarArchivos,
  superaTamanoMaximo,
  mensajeErrorStorage,
  ordenarDocumentos
} from '../../../shared/documentosAdmision/documentosHelpers';
import { subirTandaAdmision, obtenerBlobDocumento } from '../../../shared/documentosAdmision/documentosStorage';
import { ZonaSubidaPdf } from '../../../shared/documentosAdmision/ZonaSubidaPdf';

const SIN_TIPO = 'SIN_TIPO';


// Pestaña Documentos: PDF de la admisión en Storage. Los archivos se suben
// con su nombre original; id y tipo se leen del nombre, con las mismas reglas
// que Carga masiva de documentos (shared/documentosAdmision).
// El listado vive en el padre (GestionesImplantesDetalleView) para que
// cambiar de pestaña no lo vuelva a pedir; acá solo se muestra y, al terminar
// una tanda de subida, se le entrega el listado actualizado en memoria.
export const DocumentosTab = ({
  idAdmision,
  documentos,
  onRecargar,
  onDocumentosSubidos
}) => {
  const { showToast } = useToast();
  const [progreso, setProgreso] = useState(null); // { actual, total, porcentaje }
  const [resumen, setResumen] = useState(null);   // { subidos: [], rechazados: [] }
  const [abriendoRuta, setAbriendoRuta] = useState(null);

  const sinAdmision = !idAdmision;
  const { lista = [], cargando, error: errorListado } = documentos || {};

  const grupos = useMemo(() => {
    const porTipo = new Map();
    ordenarDocumentos(lista).forEach(d => {
      const clave = d.tipo || SIN_TIPO;
      if (!porTipo.has(clave)) porTipo.set(clave, []);
      porTipo.get(clave).push(d);
    });
    return [...porTipo.entries()];
  }, [lista]);

  // Clic (selector múltiple) y arrastrar/soltar entran por aquí. Lo que
  // react-dropzone rechaza por tipo (`accept`) se suma a lo aceptado para que
  // pase por la misma validación y quede en el resumen con su motivo.
  const handleSubir = async (archivos) => {
    if (archivos.length === 0 || cargando || errorListado) return;
    setResumen(null);

    // 1) Validación en el navegador, sin Firebase: PDF + id del nombre.
    const { validos, rechazados: rechazadosIniciales } = clasificarArchivos(archivos, idAdmision);
    const rechazados = [...rechazadosIniciales];
    const aSubir = validos.filter(file => {
      if (!superaTamanoMaximo(file)) return true;
      rechazados.push({ nombre: file.name, motivo: `Supera el máximo de ${TAMANO_MAXIMO_MB} MB. No se subió.` });
      return false;
    });

    // 2) Subida de a uno (sufijos "(2)" considerando también esta tanda); el
    // listado se arma en memoria.
    const { lista: listaTrabajo, subidos, fallidos } = await subirTandaAdmision({
      idAdmision,
      archivos: aSubir,
      listaInicial: lista,
      onProgreso: (indice, porcentaje) => setProgreso({ actual: indice + 1, total: aSubir.length, porcentaje })
    });
    rechazados.push(...fallidos);
    setProgreso(null);

    // 3) Una sola actualización del listado en memoria (sin volver a listar).
    if (subidos.length > 0) onDocumentosSubidos(listaTrabajo);

    setResumen({ subidos, rechazados });

    const sinTipo = subidos.filter(d => !d.tipo);
    if (subidos.length > 0) showToast(`${subidos.length} documento(s) subido(s).`, 'success');
    if (rechazados.length > 0) {
      showToast(rechazados.length === 1 ? rechazados[0].motivo : `${rechazados.length} archivo(s) no se subieron. Revisa el resumen.`, 'error');
    }
    if (sinTipo.length > 0) {
      showToast(`${sinTipo.length} archivo(s) subido(s) sin tipo reconocido (DP, RP, INF o COT). Revisa el resumen.`, 'warning');
    }
  };

  const conBlob = async (docObj, accion) => {
    setAbriendoRuta(docObj.ruta);
    try {
      const blob = await obtenerBlobDocumento(docObj.ruta);
      const url = URL.createObjectURL(blob);
      accion(url);
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      console.error('Error al abrir documento de implantes:', err);
      showToast(mensajeErrorStorage(err), 'error');
    } finally {
      setAbriendoRuta(null);
    }
  };

  const handleVer = (docObj) => conBlob(docObj, (url) => window.open(url, '_blank'));

  const handleDescargar = (docObj) => conBlob(docObj, (url) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = docObj.nombre;
    a.click();
  });

  const sinTipoSubidos = resumen?.subidos.filter(d => !d.tipo) || [];

  return (
    <div className="flex-grow overflow-y-auto p-3 space-y-3">

      {sinAdmision && (
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg text-[11px] text-amber-700 dark:text-amber-400">
          <AlertCircle size={14} className="shrink-0" />
          Guarda primero el ID de admisión en Información para ver y subir documentos.
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700/80 rounded-lg shadow-xs overflow-hidden">
        <div className="px-3 py-1.5 bg-slate-50/80 dark:bg-gray-800/80 border-b border-slate-200 dark:border-gray-700 flex items-center gap-1.5">
          <UploadCloud size={13} className="text-[#2383C2]" />
          <h3 className="text-[11px] font-bold text-slate-700 dark:text-gray-200 uppercase tracking-wide">
            Subir Documentos
          </h3>
        </div>

        <div className="p-3 flex flex-col gap-2">
          <p className="text-[10px] text-slate-500 dark:text-gray-400">
            PDF ya nombrados, por ejemplo{' '}
            <strong className="text-slate-700 dark:text-gray-200">{idAdmision || '102030'} - JOSE PEREZ - DP.pdf</strong> o{' '}
            <strong className="text-slate-700 dark:text-gray-200">{idAdmision || '102030'} - JOSE PEREZ - COT 12345678 - EMPRESA.pdf</strong>.
            Solo se suben los que comienzan con el id de esta admisión.
          </p>

          <ZonaSubidaPdf
            onArchivos={handleSubir}
            deshabilitada={sinAdmision || cargando || Boolean(errorListado)}
            progreso={progreso}
          />
        </div>

        {resumen && (resumen.subidos.length > 0 || resumen.rechazados.length > 0) && (
          <div className="mx-3 mb-3 space-y-2 text-[10px]">
            {resumen.subidos.length > 0 && (
              <div className="px-3 py-2 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg text-emerald-800 dark:text-emerald-300">
                <div className="flex items-center gap-1.5 font-semibold mb-1">
                  <CheckCircle2 size={13} className="shrink-0" /> Subidos ({resumen.subidos.length})
                </div>
                <ul className="space-y-0.5 pl-5 list-disc">
                  {resumen.subidos.map(d => (
                    <li key={d.ruta} className="break-all">
                      {d.nombre}
                      {d.nombre !== d.nombreOriginal && <span className="text-emerald-700/80 dark:text-emerald-400/80"> (original: {d.nombreOriginal})</span>}
                      {!d.tipo && <span className="font-semibold text-amber-700 dark:text-amber-400"> — Sin tipo</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {sinTipoSubidos.length > 0 && (
              <div className="flex items-start gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg text-amber-700 dark:text-amber-400">
                <HelpCircle size={13} className="shrink-0 mt-0.5" />
                <span>
                  No se reconoció el tipo (DP, RP, INF o COT) de {sinTipoSubidos.length} archivo(s): se subieron igual y quedan en "Sin tipo".
                  Revisa que el nombre siga el formato "{idAdmision} - PACIENTE - TIPO".
                </span>
              </div>
            )}

            {resumen.rechazados.length > 0 && (
              <div className="px-3 py-2 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
                <div className="flex items-center gap-1.5 font-semibold mb-1">
                  <XCircle size={13} className="shrink-0" /> No subidos ({resumen.rechazados.length})
                </div>
                <ul className="space-y-0.5 pl-5 list-disc">
                  {resumen.rechazados.map((r, idx) => (
                    <li key={`${r.nombre}_${idx}`} className="break-all">
                      <strong>{r.nombre}</strong>: {r.motivo}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700/80 rounded-lg shadow-xs overflow-hidden">
        <div className="px-3 py-1.5 bg-slate-50/80 dark:bg-gray-800/80 border-b border-slate-200 dark:border-gray-700 flex items-center gap-1.5">
          <FolderOpen size={13} className="text-[#2383C2]" />
          <h3 className="text-[11px] font-bold text-slate-700 dark:text-gray-200 uppercase tracking-wide">
            Documentos de la Admisión {!sinAdmision && !cargando && !errorListado ? `(${lista.length})` : ''}
          </h3>
        </div>

        <div className="p-3">
          {sinAdmision ? (
            <p className="text-center py-6 text-gray-400 dark:text-gray-500 text-[10px]">Sin ID de admisión.</p>
          ) : cargando ? (
            <div className="flex items-center justify-center gap-2 py-6 text-slate-400 dark:text-gray-500 text-[10px]">
              <Loader2 size={13} className="animate-spin" /> Cargando documentos...
            </div>
          ) : errorListado ? (
            <div className="flex flex-col items-center gap-2 py-6 text-[10px] text-red-600 dark:text-red-400">
              <span className="flex items-center gap-1.5"><AlertCircle size={13} /> {errorListado}</span>
              <button
                type="button"
                onClick={onRecargar}
                className="flex items-center gap-1 px-2 py-1 rounded border border-slate-300 dark:border-gray-600 text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-700/50"
              >
                <RefreshCw size={11} /> Reintentar
              </button>
            </div>
          ) : lista.length === 0 ? (
            <p className="text-center py-6 text-gray-400 dark:text-gray-500 text-[10px]">Esta admisión aún no tiene documentos.</p>
          ) : (
            <div className="space-y-3">
              {grupos.map(([clave, docs]) => {
                const tipoInfo = TIPOS_DOCUMENTO.find(t => t.id === clave);
                return (
                  <div key={clave}>
                    <h4 className="text-[10px] font-bold text-slate-600 dark:text-gray-300 uppercase tracking-wide mb-1">
                      {tipoInfo ? `${tipoInfo.id} — ${tipoInfo.label}` : 'Sin tipo'} ({docs.length})
                    </h4>
                    <div className="space-y-1">
                      {docs.map(d => {
                        const abriendo = abriendoRuta === d.ruta;
                        return (
                          <div
                            key={d.ruta}
                            className="flex items-center justify-between gap-2 px-2 py-1 rounded border border-slate-100 dark:border-gray-700/60 hover:bg-slate-50 dark:hover:bg-gray-700/40"
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              <FileText size={12} className="shrink-0 text-red-500 dark:text-red-400" />
                              <span className="truncate text-slate-700 dark:text-gray-200" title={d.nombre}>{d.nombre}</span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleVer(d)}
                                disabled={abriendo}
                                title="Ver"
                                className="p-1 rounded text-slate-500 dark:text-gray-400 hover:text-[#2383C2] hover:bg-slate-100 dark:hover:bg-gray-700 disabled:opacity-50"
                              >
                                {abriendo ? <Loader2 size={12} className="animate-spin" /> : <Eye size={12} />}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDescargar(d)}
                                disabled={abriendo}
                                title="Descargar"
                                className="p-1 rounded text-slate-500 dark:text-gray-400 hover:text-[#2383C2] hover:bg-slate-100 dark:hover:bg-gray-700 disabled:opacity-50"
                              >
                                <Download size={12} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentosTab;
