import { useState } from 'react';
import { ChevronDown, ChevronRight, Columns3 } from 'lucide-react';
import MarcarTodaLaVista from './MarcarTodaLaVista';
import { estadoMarcadoVista, esColumna } from './permisosGranularesUtils';

// Permisos de UNA vista o pestaña: "Marcar/desmarcar todo" y, por sección,
// su casilla de visibilidad, las acciones en grilla y —si es una tabla— las
// columnas (elementos col_*) en un sub-bloque aparte, cerrado por defecto.
// Lo usa EditorPermisos (Crear Usuario y Editar usuario).

const Casilla = ({ checked, disabled, onChange, children }) => (
  <label
    className={`flex items-start gap-2 text-[11px] leading-snug px-2 py-1.5 rounded-md border transition-colors ${
      disabled
        ? 'border-transparent text-gray-300 dark:text-gray-600 cursor-not-allowed'
        : checked
          ? 'border-[#2383C2]/20 bg-[#2383C2]/5 dark:bg-blue-950/30 text-gray-700 dark:text-gray-200 cursor-pointer'
          : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer'
    }`}
  >
    <input type="checkbox" disabled={disabled} checked={checked} onChange={onChange} className="accent-[#2383C2] mt-0.5 shrink-0" />
    <span className="min-w-0">{children}</span>
  </label>
);

const BotonTexto = ({ onClick, disabled, children }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className="text-[10.5px] font-semibold text-[#2383C2] hover:underline disabled:text-gray-300 dark:disabled:text-gray-600 disabled:no-underline disabled:cursor-default"
  >
    {children}
  </button>
);

// Quita el prefijo "Operación: / Acción: / Campo: / Columna:" de los labels
// del mapa: el bloque ya dice qué es.
const limpiarLabel = (label) => String(label || '').replace(/^(Operaci[oó]n|Acci[oó]n|Campo|Columna|Permiso|Bloque):\s*/i, '');

const BloqueColumnas = ({ columnas, seccionEstado, deshabilitada, onAlternar, onEstablecer }) => {
  const [abierto, setAbierto] = useState(false);
  const visibles = columnas.filter(([k]) => seccionEstado.elements[k] !== false).length;
  return (
    <div className="mt-3 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-900/40">
      <div className="flex items-center gap-2 px-2.5 py-1.5">
        <button
          type="button"
          onClick={() => setAbierto((v) => !v)}
          className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-600 dark:text-gray-300 hover:text-[#2383C2] mr-auto"
        >
          {abierto ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          <Columns3 size={13} className="text-gray-400" />
          Columnas de la tabla
          <span className={`ml-1 text-[10px] font-bold px-1.5 rounded-full ${visibles === columnas.length ? 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'}`}>
            {visibles}/{columnas.length}
          </span>
        </button>
        <BotonTexto disabled={deshabilitada || visibles === columnas.length} onClick={() => onEstablecer(columnas.map(([k]) => k), true)}>
          Todas
        </BotonTexto>
        <span className="text-gray-300 dark:text-gray-600 text-[10px]">·</span>
        <BotonTexto disabled={deshabilitada || visibles === 0} onClick={() => onEstablecer(columnas.map(([k]) => k), false)}>
          Ninguna
        </BotonTexto>
      </div>
      {abierto && (
        <div className="grid grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-1.5 px-2.5 pb-2.5">
          {columnas.map(([elKey, el]) => (
            <Casilla key={elKey} disabled={deshabilitada} checked={!!seccionEstado.elements[elKey]} onChange={() => onAlternar(elKey)}>
              {limpiarLabel(el.label)}
            </Casilla>
          ))}
        </div>
      )}
    </div>
  );
};

const PanelPermisosVista = ({
  config,
  vistaPermisos,
  onAlternarSeccion,
  onAlternarElemento,
  onEstablecerElementos,
  onMarcarTodo,
}) => {
  if (!config || !vistaPermisos) return null;
  const secciones = Object.entries(config.sections || {});
  if (secciones.length === 0) {
    return <p className="text-[11px] text-gray-400 dark:text-gray-500">Esta vista no tiene opciones adicionales: basta con habilitarla.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <MarcarTodaLaVista estado={estadoMarcadoVista(vistaPermisos, config)} onMarcar={onMarcarTodo} />
      <div className="flex flex-col gap-2.5">
        {secciones.map(([sectionKey, section]) => {
          const seccionEstado = vistaPermisos[sectionKey];
          if (!seccionEstado) return null;
          const elementos = Object.entries(section.elements || {});
          const acciones = elementos.filter(([k]) => !esColumna(k));
          const columnas = elementos.filter(([k]) => esColumna(k));
          const deshabilitada = !seccionEstado.visible;

          return (
            <div key={sectionKey} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3">
              <label className="flex items-center gap-2 text-[12px] font-semibold text-gray-800 dark:text-gray-100 cursor-pointer">
                <input
                  type="checkbox"
                  checked={seccionEstado.visible}
                  onChange={() => onAlternarSeccion(sectionKey)}
                  className="accent-[#2383C2]"
                />
                {limpiarLabel(section.label).replace(/^Secci[oó]n:\s*/i, '')}
                {deshabilitada && <span className="text-[10px] font-normal text-gray-400 dark:text-gray-500">(oculta)</span>}
              </label>

              {acciones.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-1.5 mt-2.5">
                  {acciones.map(([elKey, el]) => (
                    <Casilla
                      key={elKey}
                      disabled={deshabilitada}
                      checked={!!seccionEstado.elements[elKey]}
                      onChange={() => onAlternarElemento(sectionKey, elKey)}
                    >
                      {limpiarLabel(el.label)}
                    </Casilla>
                  ))}
                </div>
              )}

              {columnas.length > 0 && (
                <BloqueColumnas
                  columnas={columnas}
                  seccionEstado={seccionEstado}
                  deshabilitada={deshabilitada}
                  onAlternar={(elKey) => onAlternarElemento(sectionKey, elKey)}
                  onEstablecer={(keys, valor) => onEstablecerElementos(sectionKey, keys, valor)}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PanelPermisosVista;
