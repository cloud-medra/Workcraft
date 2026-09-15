export const inventarioComponentMaps = {
  // GeneralInventario.jsx declara `hasPermission` pero no lo invoca en
  // ningún elemento todavía — sin granularidad cableada aún.
  '/inventario/generalInventario': {
    label: 'Inventario General por Cajas (GeneralInventario.jsx) — sin granularidad cableada aún',
    sections: {
      header: {
        label: 'Sección: Encabezado',
        elements: {
          btn_configuracion: { label: 'Acción: Botón Configuración (Importar/Exportar)' },
        },
      },
      formulario_caja: {
        label: 'Sección: Formulario de Registro de Caja',
        elements: {
          input_nombre_caja: { label: 'Campo: Nombre / Código de Caja' },
          input_ubicacion: { label: 'Campo: Ubicación (Estante/Bodega)' },
          input_buscar_item: { label: 'Campo: Buscador de Ítem (Referencia/Código/Descriptor/Empresa)' },
          input_cantidad_item: { label: 'Campo: Cantidad del Ítem' },
          input_lote_item: { label: 'Campo: Lote del Ítem' },
          input_vencimiento_item: { label: 'Campo: Vencimiento del Ítem' },
          btn_agregar_item: { label: 'Acción: Agregar Otro Ítem' },
          action_eliminar_item: { label: 'Operación: Eliminar Línea de Ítem' },
          btn_registrar_actualizar: { label: 'Acción: Registrar/Actualizar Caja' },
          btn_cancelar: { label: 'Acción: Cancelar Edición' },
        },
      },
      filtros_tabla: {
        label: 'Sección: Filtros de la Tabla',
        elements: {
          input_filtro_caja: { label: 'Campo: Filtrar por Caja' },
          input_filtro_ubicacion: { label: 'Campo: Filtrar por Ubicación' },
          input_filtro_contenido: { label: 'Campo: Filtrar por Contenido/Ítem' },
        },
      },
      tabla_datos: {
        label: 'Sección: Tabla de Cajas',
        elements: {
          col_caja_ubicacion: { label: 'Columna: Caja / Ubicación' },
          col_contenido: { label: 'Columna: Contenido Detallado' },
          action_historial: { label: 'Operación: Ver Historial (Logs)' },
          action_editar: { label: 'Operación: Editar Caja' },
          action_eliminar: { label: 'Operación: Eliminar Caja' },
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

  '/inventario/existenciasInventario': {
    label: 'Existencias de Inventario (ExistenciasInventario.jsx)',
    sections: {
      barra_busqueda: {
        label: 'Sección: Filtro y Búsqueda',
        elements: {
          input_buscar: { label: 'Barra de Búsqueda por Ref/Código/Descripción' },
        },
      },
      tabla_datos: {
        label: 'Sección: Tabla de Existencias (columna "Estado/Vencimiento" no gateada, siempre visible)',
        elements: {
          col_referencia: { label: 'Columna: Referencia' },
          col_codigo: { label: 'Columna: Código' },
          col_descripcion: { label: 'Columna: Descripción / Tipo' },
          col_ubicacion: { label: 'Columna: Ubicación' },
          col_entradas: { label: 'Columna: N° Entradas' },
          col_precio: { label: 'Columna: Precio Unitario' },
          col_cantidad: { label: 'Columna: Cantidad' },
          col_total: { label: 'Columna: Total Valor' },
          col_acciones: { label: 'Columna: Acciones' },
          btn_info: { label: 'Operación: Ver Detalle de Lotes' },
        },
      },
    },
  },

  '/inventario/ingresosInventario': {
    label: 'Registro de Ingreso de Stock (IngresosInventario.jsx) — sin granularidad cableada aún',
    sections: {
      formulario_cabecera: {
        label: 'Sección: Datos del Documento de Ingreso',
        elements: {
          input_num_guia_factura: { label: 'Campo: N° Guía / Factura' },
          input_num_orden: { label: 'Campo: N° Orden de Compra' },
          select_empresa: { label: 'Campo: Empresa (autocompletado)' },
          input_nombre_caja: { label: 'Campo: Nombre Caja Destino (autocompletado)' },
          input_ubicacion: { label: 'Campo: Ubicación' },
          input_observaciones: { label: 'Campo: Observaciones' },
        },
      },
      tabla_items_ingreso: {
        label: 'Sección: Tabla de Ítems a Ingresar',
        elements: {
          input_buscar_referencia: { label: 'Campo: Buscar Referencia / Descripción (autocompletado)' },
          col_codigo: { label: 'Columna: Código' },
          input_cantidad: { label: 'Campo: Cantidad' },
          input_lote: { label: 'Campo: Lote' },
          input_vencimiento: { label: 'Campo: Vencimiento' },
          col_precio_unit: { label: 'Columna: Precio Unitario' },
          action_eliminar_linea: { label: 'Operación: Eliminar Línea' },
          btn_agregar_linea: { label: 'Acción: Agregar Línea' },
        },
      },
      btn_guardar_ingreso: {
        label: 'Sección: Acciones Finales',
        elements: {
          btn_guardar: { label: 'Acción: Guardar Ingreso de Stock' },
          btn_limpiar: { label: 'Acción: Limpiar Formulario' },
        },
      },
    },
  },

  '/inventario/egresosInventario': {
    label: 'Egreso y Traspaso a Tránsito (EgresosInventario.jsx) — sin granularidad cableada aún',
    sections: {
      panel_seleccion_caja: {
        label: 'Sección: 1. Seleccionar Caja',
        elements: {
          input_buscar_caja: { label: 'Campo: Buscar Caja, Ítem o Lote' },
        },
      },
      panel_seleccion_item: {
        label: 'Sección: 2. Seleccionar Ítem y Lote',
        elements: {
          select_item_lote: { label: 'Campo: Ítem / Lote Disponible' },
          input_cantidad_traspasar: { label: 'Campo: Cantidad a Traspasar' },
          btn_agregar_a_lista: { label: 'Acción: Agregar a Lista de Tránsito' },
        },
      },
      panel_resumen_traspaso: {
        label: 'Sección: 3. Resumen y Confirmación de Traspaso',
        elements: {
          action_quitar_item: { label: 'Operación: Quitar Ítem de la Lista' },
          btn_vaciar_lista: { label: 'Acción: Vaciar Lista' },
          input_solicitante: { label: 'Campo: Solicitante / Destino' },
          input_observaciones: { label: 'Campo: Observaciones' },
          radio_destino: { label: 'Campo: Destino del Tránsito (Stock General / Cliente Específico)' },
          btn_confirmar_traspaso: { label: 'Acción: Confirmar y Dejar en Tránsito' },
        },
      },
    },
  },

  '/inventario/transitoInventario': {
    label: 'Insumos en Tránsito (TransitoInventario.jsx) — sin granularidad cableada aún',
    sections: {
      header: {
        label: 'Sección: Encabezado',
        elements: {
          input_buscar: { label: 'Campo: Búsqueda por N° Doc/Solicitante/Lote' },
        },
      },
      listado_tarjetas: {
        label: 'Sección: Listado de Documentos en Tránsito (tarjetas)',
        elements: {
          btn_gestionar: { label: 'Acción: Gestión de Devolución / Uso (abre modal)' },
        },
      },
      modal_gestion_transito: {
        label: 'Sección: Modal de Gestión de Devolución/Uso',
        elements: {
          input_cantidad_egreso: { label: 'Campo: Cantidad a Egresar (por línea)' },
          input_cantidad_devolver: { label: 'Campo: Cantidad a Devolver a Stock' },
          input_destino_final: { label: 'Campo: Destino Final' },
          input_observacion_global: { label: 'Campo: Observación de Cierre' },
          btn_confirmar_procesamiento: { label: 'Acción: Confirmar Procesamiento' },
        },
      },
    },
  },

  '/inventario/historialInventario': {
    label: 'Historial de Insumos (HistorialInventario.jsx) — solo lectura, sin granularidad cableada aún',
    sections: {
      filtros: {
        label: 'Sección: Filtros',
        elements: {
          input_buscar: { label: 'Campo: Búsqueda por Código/Referencia/Descripción' },
          input_fecha_desde: { label: 'Campo: Fecha Desde' },
          input_fecha_hasta: { label: 'Campo: Fecha Hasta' },
          btn_limpiar_filtros: { label: 'Acción: Limpiar Filtros' },
        },
      },
      tabla_historial: {
        label: 'Sección: Tabla de Historial de Egresos',
        elements: {
          col_doc_num: { label: 'Columna: Doc N°' },
          col_referencia: { label: 'Columna: Referencia' },
          col_codigo: { label: 'Columna: Código' },
          col_descripcion: { label: 'Columna: Descripción' },
          col_cantidad_egresada: { label: 'Columna: Cantidad Egresada' },
          col_lote: { label: 'Columna: Lote' },
          col_vencimiento: { label: 'Columna: Vencimiento' },
          col_destino: { label: 'Columna: Destino' },
          col_observacion: { label: 'Columna: Observación Insumo' },
          col_procesado_por: { label: 'Columna: Procesado Por' },
          col_solicitante: { label: 'Columna: Solicitante' },
          col_cierre: { label: 'Columna: Fecha de Cierre' },
        },
      },
    },
  },

  '/inventario/unidadInventario': {
    label: 'Stock por Unidad / En Tránsito (UnidadInventario.jsx) — solo lectura, sin granularidad cableada aún',
    sections: {
      filtros: {
        label: 'Sección: Filtros',
        elements: {
          input_buscar: { label: 'Campo: Búsqueda por Código/Referencia/Descripción' },
          input_fecha_desde: { label: 'Campo: Fecha Desde' },
          input_fecha_hasta: { label: 'Campo: Fecha Hasta' },
          btn_limpiar_filtros: { label: 'Acción: Limpiar Filtros' },
        },
      },
      tabla_unidad: {
        label: 'Sección: Tabla de Stock en Tránsito',
        elements: {
          col_doc_num: { label: 'Columna: Doc N°' },
          col_referencia: { label: 'Columna: Referencia' },
          col_codigo: { label: 'Columna: Código' },
          col_descripcion: { label: 'Columna: Descripción' },
          col_cantidad_stock: { label: 'Columna: Cantidad Stock' },
          col_lote: { label: 'Columna: Lote' },
          col_vencimiento: { label: 'Columna: Vencimiento' },
          col_destino: { label: 'Columna: Destino' },
          col_observacion: { label: 'Columna: Observación Insumo' },
          col_procesado_por: { label: 'Columna: Procesado Por' },
          col_solicitante: { label: 'Columna: Solicitante' },
          col_cierre: { label: 'Columna: Fecha de Cierre' },
        },
      },
    },
  },
};
