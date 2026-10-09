import { Lock, ExternalLink } from 'lucide-react';
import { ESTADOS_ADMISION, ETIQUETAS_ESTADO, CLASE_GESTION, estadoDe, tooltipMarca } from './gestionImplante';

// Badge de la columna "Gestión implante" de Reporte Info: Pendiente (gris),
// Gestionada (azul), Cargada (verde), Imputada (verde oscuro, con candado).
// `onAbrir` (solo si puede ver Gestiones) abre la gestión en Implantes.

const BadgeGestionImplante = ({ marca, onAbrir }) => {
  const estado = estadoDe(marca);
  return (
    <span className="inline-flex items-center gap-1 max-w-full">
      <span title={tooltipMarca(marca)} data-estado={estado}
        className={`inline-flex items-center gap-0.5 h-5 px-1.5 rounded-full border text-[10px] font-semibold truncate ${CLASE_GESTION[estado]}`}>
        {estado === ESTADOS_ADMISION.IMPUTADA && <Lock size={9} aria-hidden="true" />}
        {ETIQUETAS_ESTADO[estado]}
      </span>
      {marca && onAbrir && (
        <button type="button" onClick={onAbrir} title="Abrir la gestión en Implantes" aria-label="Abrir la gestión en Implantes"
          className="shrink-0 p-0.5 rounded text-[#2383C2] hover:bg-blue-50 dark:hover:bg-blue-950/40">
          <ExternalLink size={11} />
        </button>
      )}
    </span>
  );
};

export default BadgeGestionImplante;
