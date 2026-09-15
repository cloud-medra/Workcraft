export const maestrosComponentMaps = {
  '/maestros/empresasMaestros': {
    label: 'Registro de Empresas (EmpresasMaestros.jsx)',
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
          input_nombre: { label: 'Campo: Nombre Empresa' },
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
          col_rut: { label: 'Columna: RUT (incluye botón copiar)' },
          col_estado: { label: 'Columna: Estado' },
          col_registrador: { label: 'Columna: Registrado Por' },
          col_fecha: { label: 'Columna: Fecha Registro' },
          action_log: { label: 'Operación: Ver Historial (Logs)' },
          action_editar: { label: 'Operación: Editar' },
          action_eliminar: { label: 'Operación: Eliminar' },
        },
      },
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

  '/maestros/prestadoresMaestros': {
    label: 'Registro de Prestadores (PrestadoresMaestros.jsx)',
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
          input_nombre: { label: 'Campo: Nombre Prestador' },
          input_especialidad: { label: 'Campo: Especialidad' },
          input_comentario: { label: 'Campo: Comentario' },
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
          col_especialidad: { label: 'Columna: Especialidad' },
          col_comentario: { label: 'Columna: Comentario' },
          col_estado: { label: 'Columna: Estado' },
          col_registrador: { label: 'Columna: Registrado Por' },
          col_fecha: { label: 'Columna: Fecha Registro' },
          action_log: { label: 'Operación: Ver Historial (Logs)' },
          action_editar: { label: 'Operación: Editar' },
          action_eliminar: { label: 'Operación: Eliminar' },
        },
      },
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

  '/maestros/centrosMaestros': {
    label: 'Registro de Centros (CentrosMaestros.jsx)',
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
          input_nombre: { label: 'Campo: Nombre del Centro / Área' },
          input_comentario: { label: 'Campo: Comentario' },
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
          col_nombre: { label: 'Columna: Nombre del Centro' },
          col_comentario: { label: 'Columna: Comentario' },
          col_estado: { label: 'Columna: Estado' },
          col_registrador: { label: 'Columna: Registrado Por' },
          col_fecha: { label: 'Columna: Fecha Registro' },
          action_log: { label: 'Operación: Ver Historial (Logs)' },
          action_editar: { label: 'Operación: Editar' },
          action_eliminar: { label: 'Operación: Eliminar' },
        },
      },
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

  '/maestros/previsionesMaestros': {
    label: 'Registro de Previsiones (PrevisionesMaestros.jsx)',
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
          input_nombre: { label: 'Campo: Nombre de la Previsión' },
          input_comentario: { label: 'Campo: Comentario' },
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
          col_nombre: { label: 'Columna: Nombre de la Previsión' },
          col_comentario: { label: 'Columna: Comentario' },
          col_estado: { label: 'Columna: Estado' },
          col_registrador: { label: 'Columna: Registrado Por' },
          col_fecha: { label: 'Columna: Fecha Registro' },
          action_log: { label: 'Operación: Ver Historial (Logs)' },
          action_editar: { label: 'Operación: Editar' },
          action_eliminar: { label: 'Operación: Eliminar' },
        },
      },
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

  '/maestros/conveniosMaestros': {
    label: 'Registro de Convenios (ConveniosMaestros.jsx)',
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
          input_nombre: { label: 'Campo: Nombre del Convenio' },
          input_comentario: { label: 'Campo: Comentario' },
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
          col_nombre: { label: 'Columna: Nombre del Convenio' },
          col_comentario: { label: 'Columna: Comentario' },
          col_estado: { label: 'Columna: Estado' },
          col_registrador: { label: 'Columna: Registrado Por' },
          col_fecha: { label: 'Columna: Fecha Registro' },
          action_log: { label: 'Operación: Ver Historial (Logs)' },
          action_editar: { label: 'Operación: Editar' },
          action_eliminar: { label: 'Operación: Eliminar' },
        },
      },
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

  '/maestros/recargosMaestros': {
    label: 'Recargos Maestros / Veces Costo (RecargosMaestros.jsx)',
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
          input_desde: { label: 'Campo: Rango Desde ($)' },
          input_hasta: { label: 'Campo: Rango Hasta ($)' },
          input_veces_costo: { label: 'Campo: Veces Costo (Factor)' },
          input_comentario: { label: 'Campo: Comentario' },
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
          col_desde: { label: 'Columna: Desde ($)' },
          col_hasta: { label: 'Columna: Hasta ($)' },
          col_veces_costo: { label: 'Columna: Veces Costo' },
          col_comentario: { label: 'Columna: Comentario' },
          col_estado: { label: 'Columna: Estado' },
          col_registrador: { label: 'Columna: Registrado Por' },
          col_fecha: { label: 'Columna: Fecha Registro' },
          action_log: { label: 'Operación: Ver Historial (Logs)' },
          action_editar: { label: 'Operación: Editar' },
          action_eliminar: { label: 'Operación: Eliminar' },
        },
      },
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

  // NOTA: CalculadorMaestros.jsx declara `hasPermission` pero no lo invoca
  // en ningún elemento todavía — nada de lo de abajo está realmente
  // gateado hoy. Se documenta la estructura visual como referencia para
  // cuando se cablee la granularidad.
  '/maestros/calculadorMaestros': {
    label: 'Calculador de Recargos Maestros (CalculadorMaestros.jsx) — sin granularidad cableada aún',
    sections: {
      header: {
        label: 'Sección: Encabezado',
        elements: {},
      },
      panel_calculo: {
        label: 'Sección: Panel de Cálculo',
        elements: {
          input_precio: { label: 'Campo: Precio Base ($)' },
          resumen_regla: { label: 'Bloque: Resumen de Regla Detectada' },
          card_precio_base: { label: 'Tarjeta: Precio Ingresado' },
          card_factor: { label: 'Tarjeta: Factor Multiplicador' },
          card_precio_final: { label: 'Tarjeta: Precio Final' },
        },
      },
    },
  },

  '/maestros/padMaestros': {
    label: 'Gestión de PADs (PadMaestros.jsx) — solo gate de página completa',
    sections: {
      navegacion: {
        label: 'Sección: Acceso a la Vista',
        elements: {
          ver_pad_maestros: { label: 'Permiso: Ver / Acceder a Gestión de PADs' },
        },
      },
    },
  },

  // Orquestador de pestañas de Códigos Maestros. Cada pestaña vive en su
  // propio archivo con su propio PATH_VISTA (formato
  // "/maestros/codigosMaestros/<proceso>") y se declara en `procesos` en
  // vez de como entrada plana de COMPONENT_MAPS, para no aparecer como
  // ítems de menú independientes (no son rutas, son pestañas internas
  // controladas por estado de React en CodigosMaestros.jsx). El editor de
  // permisos (CrearUsuario.jsx / EditarPermisosUsuarioDrawer.jsx) expande
  // `procesos` automáticamente como sub-ítems configurables cuando se
  // selecciona esta pantalla.
  //
  // Bug corregido (v2): la visibilidad de las 3 pestañas usaba una
  // sección "navegacion" con checkbox maestro compartido — se reemplazó
  // por hasAccesoProceso(path) sobre cada `proceso` (ver nota en
  // useGranularPermission.js).
  '/maestros/codigosMaestros': {
    label: 'Gestión de Códigos Maestros (CodigosMaestros.jsx) — orquestador de pestañas',
    sections: {},
    procesos: {
      '/maestros/codigosMaestros/pendientes': {
        label: 'Pestaña: Sin Código / Pendientes (TabPendientes.jsx)',
        sections: {
          btn_configuracion: { label: 'Sección: Botón Configuración (Importar/Exportar)', elements: {} },
          formulario_registro: { label: 'Sección: Formulario de Registro Manual', elements: {} },
          barra_busqueda: { label: 'Sección: Barra de Búsqueda', elements: {} },
          tabla_datos: { label: 'Sección: Tabla de Pendientes', elements: {} },
          btn_log: { label: 'Sección: Botón Ver Historial / Logs (por fila)', elements: {} },
        },
      },
      '/maestros/codigosMaestros/conCodigo': {
        label: 'Pestaña: Con Código (TabConCodigo.jsx)',
        sections: {
          btn_configuracion: { label: 'Sección: Botón Configuración (Importar/Exportar)', elements: {} },
          formulario_registro: { label: 'Sección: Formulario de Registro/Edición', elements: {} },
          barra_busqueda: { label: 'Sección: Barra de Búsqueda (con selector de campo)', elements: {} },
          tabla_datos: { label: 'Sección: Tabla de Resultados y Paginación', elements: {} },
          btn_log: { label: 'Sección: Botón Ver Historial / Logs (por fila)', elements: {} },
        },
      },
      // TabVistaGeneral.jsx declara `hasPermission` pero no lo invoca en
      // ningún elemento todavía — sin granularidad cableada aún.
      '/maestros/codigosMaestros/vistaGeneral': {
        label: 'Pestaña: Vista General (TabVistaGeneral.jsx) — sin granularidad cableada aún',
        sections: {},
      },
    },
  },

  // '/maestros/listadoMaestros': vista placeholder "en desarrollo", no usa
  // hasPermission todavía — sin entrada por ahora.
};
