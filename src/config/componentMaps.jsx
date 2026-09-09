// COMPONENT_MAPS
// -----------------------------------------------------------------------
// Define, para cada vista (path) que usa el hook useGranularPermission,
// qué secciones y elementos existen dentro de ese componente.
//
// La estructura DEBE reflejar exactamente las llamadas a hasPermission(...)
// que hiciste dentro del componente:
//
//   hasPermission(PATH_VISTA, "seccionKey")                -> sections.seccionKey
//   hasPermission(PATH_VISTA, "seccionKey", "elementoKey") -> sections.seccionKey.elements.elementoKey
//
// La KEY de cada entrada de COMPONENT_MAPS debe ser IDÉNTICA al PATH_VISTA
// usado dentro del componente, y también idéntica al "path" que le pusiste
// a ese ítem en modulesConfig.jsx (MODULES[...].subItems[...].path), porque
// es la única forma de que CrearUsuario.jsx pueda cruzar automáticamente
// "a qué ítems tiene acceso el usuario" -> "qué configuración granular
// debe generársele".
//
// "label" es solo texto de apoyo para la UI de CrearUsuario (no lo lee
// useGranularPermission), para que el admin entienda qué está marcando.
// -----------------------------------------------------------------------

export const COMPONENT_MAPS = {
  '/laboratorio/empresasLaboratorio': {
    label: 'Registro de Laboratorios (EmpresasLaboratorio.jsx)',
    sections: {
      header: {
        label: 'Sección: Encabezado',
        elements: {
          btn_configuracion: { label: 'Acción: Botón Configuración (Importar/Exportar)' },
        },
      },
      formulario_registro: {
        label: 'Sección: Formulario de Registro',
        elements: {
          input_nombre: { label: 'Campo: Nombre de Laboratorio' },
          input_rut: { label: 'Campo: RUT' },
          select_estado: { label: 'Campo: Selector de Estado (al editar)' },
          btn_registrar: { label: 'Acción: Botón Registrar' },
          btn_actualizar: { label: 'Acción: Botón Actualizar' },
        },
      },
      barra_busqueda: {
        label: 'Sección: Filtro y Búsqueda',
        elements: {
          input_buscar: { label: 'Barra de Búsqueda de Texto' },
        },
      },
      tabla_datos: {
        label: 'Sección: Tabla de Resultados',
        elements: {
          col_nombre: { label: 'Columna: Nombre' },
          col_rut: { label: 'Columna: RUT' },
          btn_copiar_rut: { label: 'Acción: Copiar RUT' },
          col_estado: { label: 'Columna: Estado' },
          col_registrador: { label: 'Columna: Registrado Por' },
          col_fecha: { label: 'Columna: Fecha Registro' },
          action_log: { label: 'Operación: Ver Historial (Logs)' },
          action_editar: { label: 'Operación: Editar' },
          action_eliminar: { label: 'Operación: Eliminar' },
        },
      },
      // Contenido del Drawer que se abre con header.btn_configuracion.
      // Se accede al drawer si btn_configuracion está permitido; esta sección
      // controla, DENTRO de ese drawer, qué puede hacer el usuario.
      drawer_configuracion: {
        label: 'Sección: Drawer de Configuración (Importar/Exportar)',
        elements: {
          btn_exportar: { label: 'Acción: Exportar a Excel/CSV' },
          btn_descargar_plantilla: { label: 'Acción: Descargar Plantilla CSV' },
          input_archivo: { label: 'Campo: Selector de Archivo a Importar' },
          btn_importar: { label: 'Acción: Botón Cargar Registro (ejecutar importación)' },
        },
      },
    },
  },

  // Ejemplo que ya tenías — mantenlo como referencia de formato.
  '/maestros/empresas': {
    label: 'Maestro de Empresas (Empresas.jsx)',
    sections: {
      formulario_registro: {
        label: 'Sección: Formulario de Registro',
        elements: {
          input_nombre: { label: 'Campo: Nombre de Empresa' },
          input_rut: { label: 'Campo: RUT Empresa' },
          select_estado: { label: 'Campo: Selector de Estado (Al Editar)' },
          btn_registrar: { label: 'Acción: Botón Registrar' },
          btn_actualizar: { label: 'Acción: Botón Actualizar' },
        },
      },
      barra_busqueda: {
        label: 'Sección: Filtro y Búsqueda',
        elements: {
          input_buscar: { label: 'Barra de Búsqueda de Texto' },
        },
      },
      tabla_datos: {
        label: 'Sección: Tabla de Resultados',
        elements: {
          col_nombre: { label: 'Columna: Nombre' },
          col_rut: { label: 'Columna: RUT' },
          col_estado: { label: 'Columna: Estado' },
          col_registrador: { label: 'Columna: Registrado Por' },
          col_fecha: { label: 'Columna: Fecha Registro' },
          action_editar: { label: 'Operación: Acción Editar (Lápiz)' },
          action_eliminar: { label: 'Operación: Acción Eliminar (Basurero)' },
        },
      },
    },
  },

  // TODO: agrega aquí una entrada por cada vista que use useGranularPermission
  // (CodigoLaboratorio, OrdenLaboratorio, XmlDocLaboratorio,
  // ArchivosControlLaboratorio, y sus equivalentes en Vacunatorio, etc.)
  // Las vistas "generales" (Perfil, Cambiar Contraseña, Ajustes...) que NO
  // usan hasPermission() no necesitan entrada aquí — no se les exige
  // configuración granular.
};