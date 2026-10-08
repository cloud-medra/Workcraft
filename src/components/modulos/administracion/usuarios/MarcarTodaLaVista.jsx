// Fila "Marcar todo / Desmarcar todo" de una vista o pestaña en el árbol de
// permisos granulares (PanelPermisosVista, en Crear y Editar usuario).
// estado: 'todo' | 'nada' | 'parcial' (ver estadoMarcadoVista).
const MarcarTodaLaVista = ({ estado, onMarcar }) => (
  <div className="flex items-center justify-end gap-2 text-[10px]">
    <span className="text-gray-400 dark:text-gray-500 mr-auto">
      {estado === 'todo' ? 'Todas las secciones y acciones permitidas' : estado === 'nada' ? 'Sin secciones ni acciones' : 'Permisos parciales'}
    </span>
    <button
      type="button"
      onClick={() => onMarcar(true)}
      disabled={estado === 'todo'}
      className="font-semibold text-[#2383C2] hover:underline disabled:text-gray-300 dark:disabled:text-gray-600 disabled:no-underline disabled:cursor-default"
    >
      Marcar todo
    </button>
    <span className="text-gray-300 dark:text-gray-600">·</span>
    <button
      type="button"
      onClick={() => onMarcar(false)}
      disabled={estado === 'nada'}
      className="font-semibold text-red-500 hover:underline disabled:text-gray-300 dark:disabled:text-gray-600 disabled:no-underline disabled:cursor-default"
    >
      Desmarcar todo
    </button>
  </div>
);

export default MarcarTodaLaVista;
