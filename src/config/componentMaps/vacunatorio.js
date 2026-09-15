export const vacunatorioComponentMaps = {
  '/vacunatorio/empresasVacunatorio': {
    label: 'Registro de Vacunatorio (EmpresasVacunatorio.jsx)',
    sections: {
      formulario_registro: {
        label: 'Sección: Formulario de Registro',
        elements: {
          input_nombre: { label: 'Campo: Nombre Vacunatorio' },
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
    },
  },

  // Convención de nombres distinta al resto del módulo (header/formulario/
  // busqueda/tabla en vez de header/formulario_registro/barra_busqueda/
  // tabla_datos) — se documenta tal cual está en el código real, no se
  // normaliza para no desincronizar las claves de los hasPermission().
  '/vacunatorio/codigoVacunatorio': {
    label: 'Gestión de Códigos (CodigoVacunatorio.jsx)',
    sections: {
      header: {
        label: 'Sección: Encabezado',
        elements: {
          btn_configuracion: { label: 'Acción: Botón Configuración (Importar/Exportar)' },
        },
      },
      formulario: {
        label: 'Sección: Formulario de Registro',
        elements: {
          ver_seccion: { label: 'Visibilidad general del formulario' },
          input_referencia: { label: 'Campo: Referencia' },
          input_codigo: { label: 'Campo: Código' },
          input_precio: { label: 'Campo: Precio' },
          input_descripcion: { label: 'Campo: Descripción' },
          btn_registrar: { label: 'Acción: Botón Registrar/Actualizar' },
          btn_cancelar: { label: 'Acción: Botón Cancelar' },
        },
      },
      busqueda: {
        label: 'Sección: Filtro y Búsqueda',
        elements: {
          barra_busqueda: { label: 'Visibilidad general de la barra de búsqueda' },
          input_busqueda: { label: 'Campo: Búsqueda de Texto' },
        },
      },
      tabla: {
        label: 'Sección: Tabla de Resultados',
        elements: {
          ver_tabla: { label: 'Visibilidad general de la tabla' },
          col_referencia: { label: 'Columna: Referencia' },
          col_codigo: { label: 'Columna: Código' },
          col_descripcion: { label: 'Columna: Descripción' },
          col_precio: { label: 'Columna: Precio' },
          col_acciones: { label: 'Columna: Acciones (contenedor de botones)' },
          btn_log: { label: 'Operación: Ver Historial (Logs)' },
          btn_editar: { label: 'Operación: Editar' },
          btn_eliminar: { label: 'Operación: Eliminar' },
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

  // Solo el botón de importar está realmente cableado con hasPermission
  // hoy; el resto de la pantalla (filtros, tabla, detalle, modal) se
  // documenta como referencia visual, sin granularidad cableada aún.
  '/vacunatorio/ordenVacunatorio': {
    label: 'Órdenes de Compra (OrdenVacunatorio.jsx) — mayormente sin granularidad cableada aún',
    sections: {
      cabecera_acciones: {
        label: 'Sección: Encabezado',
        elements: {
          btn_importar: { label: 'Acción: Importar Orden desde Excel' },
        },
      },
      listado: {
        label: 'Sección: Listado de Órdenes (sin granularidad cableada)',
        elements: {
          input_buscar: { label: 'Campo: Búsqueda por N°, RUT o Proveedor' },
          select_anio: { label: 'Campo: Filtro por Año' },
          select_mes: { label: 'Campo: Filtro por Mes' },
          col_num_orden: { label: 'Columna: N° Orden' },
          col_fecha_orden: { label: 'Columna: Fecha Orden' },
          col_rut_proveedor: { label: 'Columna: RUT Proveedor' },
          col_proveedor: { label: 'Columna: Proveedor' },
          col_items: { label: 'Columna: Ítems' },
          col_total: { label: 'Columna: Total' },
          action_ver_detalle: { label: 'Operación: Ver Detalle' },
        },
      },
      detalle_orden: {
        label: 'Sección: Detalle de la Orden (sin granularidad cableada)',
        elements: {
          col_codigo: { label: 'Columna: Código' },
          col_descripcion: { label: 'Columna: Descripción del Artículo' },
          col_cantidad: { label: 'Columna: Cantidad' },
          col_precio_unit: { label: 'Columna: Precio Unitario' },
          col_subtotal: { label: 'Columna: Subtotal' },
        },
      },
      modal_importar: {
        label: 'Sección: Modal de Importación de Excel (sin granularidad cableada)',
        elements: {},
      },
    },
  },

  '/vacunatorio/xmlDocVacunatorio': {
    label: 'Documentos XML (XmlDocVacunatorio.jsx)',
    sections: {
      cabecera_acciones: {
        label: 'Sección: Encabezado',
        elements: {
          btn_importar_xml: { label: 'Acción: Importar XML' },
        },
      },
      filtros_busqueda: {
        label: 'Sección: Filtros y Búsqueda',
        elements: {
          input_busqueda: { label: 'Campo: Búsqueda por Folio/Ref/Razón Social/Estado' },
          select_anio: { label: 'Campo: Filtro por Año' },
          select_mes: { label: 'Campo: Filtro por Mes' },
        },
      },
      tabla_documentos: {
        label: 'Sección: Tabla de Documentos (columnas no gateadas individualmente: Folio, Emisión, Ref., Razón Social, Total, Estado)',
        elements: {
          btn_ver: { label: 'Operación: Ver Detalle' },
          btn_eliminar: { label: 'Operación: Eliminar' },
        },
      },
    },
  },

  // Orquestador "Control de Procesos" + sus 8 fases internas
  // (documentos_recibidos, iniciar_procesos, vinculacion_codigos,
  // vinculacion_ordenes, solicitud_diferencias, documentos_listos,
  // documentos_imputados, documentos_edicion).
  //
  // Las 8 fases NO tienen cada una su propio PATH_VISTA para su CONTENIDO
  // interno — comparten literalmente el mismo `/vacunatorio/archivosControlVacunatorio`
  // y las mismas claves de sección/elemento (filtros_busqueda,
  // tabla_documentos), por diseño: es un solo set de permisos genérico
  // aplicado a las 8 pantallas a la vez para SU CONTENIDO. Eso no cambió.
  //
  // Lo que sí cambió (bug corregido v2): la VISIBILIDAD de cada pestaña
  // (si aparece o no en el menú) ahora es un `proceso` independiente por
  // pestaña, chequeado por existencia con hasAccesoProceso(path) — ya no
  // una sección "navegacion" con checkbox maestro compartido entre las 8.
  // Ver nota en useGranularPermission.js.
  '/vacunatorio/archivosControlVacunatorio': {
    label: 'Control de Procesos de Documentos (ArchivosControlVacunatorio.jsx) — orquestador de 8 fases con permisos de contenido compartidos',
    sections: {
      filtros_busqueda: {
        label: 'Sección: Filtros y Búsqueda (compartida por las 8 fases)',
        elements: {
          input_busqueda: { label: 'Campo: Búsqueda de Texto' },
          select_anio: { label: 'Campo: Filtro por Año' },
          select_mes: { label: 'Campo: Filtro por Mes (usado por Documentos Recibidos, Imputados y Edición)' },
        },
      },
      tabla_documentos: {
        label: 'Sección: Tabla de Documentos (compartida por las 8 fases; el toggle general aplica a todas)',
        elements: {
          btn_configurar: { label: 'Operación: Configurar (usado por Documentos Recibidos, Imputados y Edición)' },
          btn_eliminar: { label: 'Operación: Eliminar (usado por Documentos Recibidos, Imputados y Edición)' },
          btn_log: { label: 'Operación: Ver Historial / Logs (usado por Documentos Recibidos, Imputados y Edición)' },
          btn_ver: { label: 'Operación: Ver Detalle (usado por Documentos Recibidos, Imputados y Edición)' },
        },
      },
      acciones_detalle: {
        label: 'Sección: Acciones de Detalle (usada solo por Vinculación de Códigos)',
        elements: {
          btn_vincular: { label: 'Acción: Vincular Código' },
        },
      },
    },
    procesos: {
      '/vacunatorio/archivosControlVacunatorio/documentosRecibidos': { label: 'Pestaña: Documentos Recibidos', sections: {} },
      '/vacunatorio/archivosControlVacunatorio/iniciarProcesos': { label: 'Pestaña: Ingreso de Folios', sections: {} },
      '/vacunatorio/archivosControlVacunatorio/vinculacionCodigos': { label: 'Pestaña: Vinculación de Códigos', sections: {} },
      '/vacunatorio/archivosControlVacunatorio/vinculacionOrdenes': { label: 'Pestaña: Vinculación de Órdenes', sections: {} },
      '/vacunatorio/archivosControlVacunatorio/solicitudDiferencias': { label: 'Pestaña: Solicitud Diferencias', sections: {} },
      '/vacunatorio/archivosControlVacunatorio/documentosListos': { label: 'Pestaña: Documentos Listos', sections: {} },
      '/vacunatorio/archivosControlVacunatorio/documentosImputados': { label: 'Pestaña: Documentos Imputados', sections: {} },
      '/vacunatorio/archivosControlVacunatorio/documentosEdicion': { label: 'Pestaña: Edición', sections: {} },
    },
  },
};
