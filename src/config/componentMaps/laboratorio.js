export const laboratorioComponentMaps = {
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

  // Gemelo estructural de "/vacunatorio/archivosControlVacunatorio" — mismo
  // orquestador de 8 fases, mismas claves de sección/elemento compartidas
  // para el CONTENIDO (filtros_busqueda, tabla_documentos), y la
  // visibilidad de cada pestaña como `proceso` independiente, chequeada
  // por existencia con hasAccesoProceso(path). Ver nota en
  // useGranularPermission.js.
  '/laboratorio/archivosControlLaboratorio': {
    label: 'Control de Procesos de Documentos (ArchivosControlLaboratorio.jsx) — orquestador de 8 fases con permisos de contenido compartidos',
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
      '/laboratorio/archivosControlLaboratorio/documentosRecibidos': { label: 'Pestaña: Documentos Recibidos', sections: {} },
      '/laboratorio/archivosControlLaboratorio/iniciarProcesos': { label: 'Pestaña: Ingreso de Folios', sections: {} },
      '/laboratorio/archivosControlLaboratorio/vinculacionCodigos': { label: 'Pestaña: Vinculación de Códigos', sections: {} },
      '/laboratorio/archivosControlLaboratorio/vinculacionOrdenes': { label: 'Pestaña: Vinculación de Órdenes', sections: {} },
      '/laboratorio/archivosControlLaboratorio/solicitudDiferencias': { label: 'Pestaña: Solicitud Diferencias', sections: {} },
      '/laboratorio/archivosControlLaboratorio/documentosListos': { label: 'Pestaña: Documentos Listos', sections: {} },
      '/laboratorio/archivosControlLaboratorio/documentosImputados': { label: 'Pestaña: Documentos Imputados', sections: {} },
      '/laboratorio/archivosControlLaboratorio/documentosEdicion': { label: 'Pestaña: Edición', sections: {} },
    },
  },

};
