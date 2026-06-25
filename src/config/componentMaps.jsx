export const COMPONENT_MAPS = {
  "/maestros/empresas": {
    label: "Maestro de Empresas (Empresas.jsx)",
    sections: {
      "formulario_registro": {
        label: "Sección: Formulario de Registro",
        elements: {
          "input_nombre": { label: "Campo: Nombre de Empresa" },
          "input_rut": { label: "Campo: RUT Empresa" },
          "select_estado": { label: "Campo: Selector de Estado (Al Editar)" },
          "btn_registrar": { label: "Acción: Botón Registrar" },
          "btn_actualizar": { label: "Acción: Botón Actualizar" }
        }
      },
      "barra_busqueda": {
        label: "Sección: Filtro y Búsqueda",
        elements: {
          "input_buscar": { label: "Barra de Búsqueda de Texto" }
        }
      },
      "tabla_datos": {
        label: "Sección: Tabla de Resultados",
        elements: {
          "col_nombre": { label: "Columna: Nombre" },
          "col_rut": { label: "Columna: RUT" },
          "col_estado": { label: "Columna: Estado" },
          "col_registrador": { label: "Columna: Registrado Por" },
          "col_fecha": { label: "Columna: Fecha Registro" },
          "action_editar": { label: "Operación: Acción Editar (Lápiz)" },
          "action_eliminar": { label: "Operación: Acción Eliminar (Basurero)" }
        }
      }
    }
  },

  "/maestros/medicos": {
    label: "Maestro de Médicos (Medicos.jsx)",
    sections: {
      "formulario_registro": {
        label: "Sección: Formulario de Registro",
        elements: {
          "input_nombre": { label: "Campo: Nombre Completo" },
          "input_especialidad": { label: "Campo: Especialidad" },
          "select_estado": { label: "Campo: Selector de Estado (Al Editar)" },
          "btn_registrar": { label: "Acción: Botón Registrar" },
          "btn_actualizar": { label: "Acción: Botón Actualizar" }
        }
      },
      "barra_busqueda": {
        label: "Sección: Filtro y Búsqueda",
        elements: {
          "input_buscar": { label: "Barra de Búsqueda de Texto" }
        }
      },
      "tabla_datos": {
        label: "Sección: Tabla de Resultados",
        elements: {
          "col_nombre": { label: "Columna: Nombre" },
          "col_especialidad": { label: "Columna: Especialidad" },
          "col_estado": { label: "Columna: Estado" },
          "col_registrador": { label: "Columna: Registrado por" },
          "col_fecha": { label: "Columna: Fecha Registro" },
          "action_editar": { label: "Operación: Acción Editar (Lápiz)" },
          "action_eliminar": { label: "Operación: Acción Eliminar (Basurero)" }
        }
      }
    }
  },

  "/maestros/previsiones": {
    label: "Maestro de Previsiones (Previsiones.jsx)",
    sections: {
      "formulario_registro": {
        label: "Sección: Formulario de Registro",
        elements: {
          "input_nombre": { label: "Campo: Nombre de Previsión" },
          "select_estado": { label: "Campo: Selector de Estado (Al Editar)" },
          "btn_registrar": { label: "Acción: Botón Registrar" },
          "btn_actualizar": { label: "Acción: Botón Actualizar" }
        }
      },
      "barra_busqueda": {
        label: "Sección: Filtro y Búsqueda",
        elements: {
          "input_buscar": { label: "Barra de Búsqueda de Texto" }
        }
      },
      "tabla_datos": {
        label: "Sección: Tabla de Resultados",
        elements: {
          "col_nombre": { label: "Columna: Nombre" },
          "col_estado": { label: "Columna: Estado" },
          "col_registrador": { label: "Columna: Registrado por" },
          "col_fecha": { label: "Columna: Fecha Registro" },
          "action_editar": { label: "Operación: Acción Editar (Lápiz)" },
          "action_eliminar": { label: "Operación: Acción Eliminar (Basurero)" }
        }
      }
    }
  },

  "/maestros/convenios": {
    label: "Maestro de Convenios (Convenios.jsx)",
    sections: {
      "formulario_registro": {
        label: "Sección: Formulario de Registro",
        elements: {
          "input_nombre": { label: "Campo: Nombre de Convenio" },
          "select_estado": { label: "Campo: Selector de Estado (Al Editar)" },
          "btn_registrar": { label: "Acción: Botón Registrar" },
          "btn_actualizar": { label: "Acción: Botón Actualizar" }
        }
      },
      "barra_busqueda": {
        label: "Sección: Filtro y Búsqueda",
        elements: {
          "input_buscar": { label: "Barra de Búsqueda de Texto" }
        }
      },
      "tabla_datos": {
        label: "Sección: Tabla de Resultados",
        elements: {
          "col_nombre": { label: "Columna: Nombre" },
          "col_estado": { label: "Columna: Estado" },
          "col_registrador": { label: "Columna: Registrado por" },
          "col_fecha": { label: "Columna: Fecha Registro" },
          "action_editar": { label: "Operación: Acción Editar (Lápiz)" },
          "action_eliminar": { label: "Operación: Acción Eliminar (Basurero)" }
        }
      }
    }
  },

  "/maestros/margenes": {
    label: "Configuración de Márgenes (Margen.jsx)",
    sections: {
      "panel_superior": {
        label: "Sección: Barra Superior de Acciones",
        elements: {
          "btn_guardar": { label: "Acción: Botón Guardar Cambios" }
        }
      },
      "seccion_consignacion": {
        label: "Sección: Consignación (Rangos Precio)",
        elements: {
          "inputs_rangos": { label: "Control: Modificación de Rangos e Inputs" }
        }
      },
      "seccion_implantes": {
        label: "Sección: Implantes (Por Previsión)",
        elements: {
          "inputs_previsiones": { label: "Control: Modificación de Márgenes por Previsión" }
        }
      }
    }
  },

  "/maestros/calculadora-margen": {
    label: "Calculadora de Márgenes (CalculadoraMargen.jsx)",
    sections: {
      "zona_ingreso": {
        label: "Sección: Entrada de Precio Base",
        elements: {
          "input_precio": { label: "Control: Input de Precio Base" }
        }
      },
      "tabla_simulacion": {
        label: "Sección: Tabla de Resultados Simulados",
        elements: {
          "fila_consignacion": { label: "Fila: Fila de Consignación" },
          "filas_implantes": { label: "Filas: Desglose de Implantes por Previsión" }
        }
      }
    }
  },

  "/maestros/codigos": {
    label: "Maestro de Códigos (Codigos.jsx)",
    sections: {
      "formulario_registro": {
        label: "Sección: Formulario de Registro / Edición",
        elements: {
          "input_referencia": { label: "Campo: Referencia" },
          "input_detalle": { label: "Campo: Detalle" },
          "input_precio": { label: "Campo: Precio Costo" },
          "select_empresa": { label: "Campo: Selector de Empresa" },
          "input_codigo": { label: "Campo: Código" },
          "input_descripcion": { label: "Campo: Descripción de Producto" },
          "select_tipo": { label: "Campo: Selector de Tipo" },
          "select_atributo": { label: "Campo: Selector de Atributo" },
          "btn_registrar": { label: "Acción: Botón Registrar" },
          "btn_actualizar": { label: "Acción: Botón Actualizar" }
        }
      },
      "barra_filtros": {
        label: "Sección: Barra de Filtros y Búsqueda",
        elements: {
          "select_empresa_filtro": { label: "Filtro: Selector de Empresa Origen" },
          "input_buscar": { label: "Filtro: Barra de Búsqueda Libre" },
          "btn_toggle_sin_codigo": { label: "Filtro: Botón Alternar Sin Código" }
        }
      },
      "tabla_datos": {
        label: "Sección: Tabla de Resultados",
        elements: {
          "col_referencia": { label: "Columna: Referencia" },
          "col_detalle": { label: "Columna: Detalle" },
          "col_precio": { label: "Columna: Precio Actual" },
          "col_empresa": { label: "Columna: Empresa" },
          "col_codigo": { label: "Columna: Código" },
          "col_descripcion": { label: "Columna: Descripción" },
          "col_tipo_atributo": { label: "Columnas: Tipo y Atributo" },
          "col_historial": { label: "Columna: Último Historial de Precios" },
          "action_editar": { label: "Operación: Acción Editar (Lápiz)" }
        }
      }
    }
  },

  "/laboratorio/empresas": {
    label: "Laboratorio de Empresas (Laboratorios.jsx)",
    sections: {
      "formulario_registro": {
        label: "Sección: Formulario de Registro",
        elements: {
          "input_nombre": { label: "Campo: Nombre de Laboratorio" },
          "input_rut": { label: "Campo: RUT Laboratorio" },
          "select_estado": { label: "Campo: Selector de Estado (Al Editar)" },
          "btn_registrar": { label: "Acción: Botón Registrar" },
          "btn_actualizar": { label: "Acción: Botón Actualizar" }
        }
      },
      "barra_busqueda": {
        label: "Sección: Filtro y Búsqueda",
        elements: {
          "input_buscar": { label: "Barra de Búsqueda de Texto" }
        }
      },
      "tabla_datos": {
        label: "Sección: Tabla de Resultados",
        elements: {
          "col_nombre": { label: "Columna: Nombre" },
          "col_rut": { label: "Columna: RUT" },
          "col_estado": { label: "Columna: Estado" },
          "col_registrador": { label: "Columna: Registrado Por" },
          "col_fecha": { label: "Columna: Fecha Registro" },
          "action_editar": { label: "Operación: Acción Editar (Lápiz)" },
          "action_eliminar": { label: "Operación: Acción Eliminar (Basurero)" }
        }
      }
    }
  },

  "/laboratorio/facturas": {
    label: "Importación de Facturas",
    sections: {
      "cabecera_acciones": {
        elements: { "btn_importar_xml": { label: "Botón: Importar XML" } }
      },
      "filtros_busqueda": {
        elements: {
          "select_anio": { label: "Filtro: Año" },
          "select_mes": { label: "Filtro: Mes" },
          "input_busqueda": { label: "Input: Búsqueda" }
        }
      },
      "tabla_facturas": {
        elements: {
          "col_folio": { label: "Col: Folio" },
          "col_emision": { label: "Col: Emisión" },
          "col_ref": { label: "Col: Ref" },
          "col_razon": { label: "Col: Razón Social" },
          "col_total": { label: "Col: Total" },
          "col_estado": { label: "Col: Estado" },
          "col_f_ingreso": { label: "Col: F. Ingreso" },
          "col_oc_ingresada": { label: "Col: OC Ingresada" },
          "col_acciones": { label: "Col: Acciones" },
          "btn_ver": { label: "Botón: Ver detalle" },
          "btn_eliminar": { label: "Botón: Eliminar" }
        }
      }
    }
  },

  "/laboratorio/importarOrden": {
    label: "Importar Ordenes (ImportarOrden.jsx)",
    sections: {
      "cabecera_acciones": {
        label: "Sección: Cabecera y Acciones",
        elements: {
          "btn_importar": { label: "Acción: Botón Importar Excel" }
        }
      },
      "filtros_busqueda": {
        label: "Sección: Filtros y Búsqueda",
        elements: {
          "filtro_anio": { label: "Selector: Año" },
          "filtro_mes": { label: "Selector: Mes" },
          "input_buscar": { label: "Barra de Búsqueda" }
        }
      },
      "tabla_ordenes": {
        label: "Sección: Tabla Principal (Lista de Órdenes)",
        elements: {
          "col_nro_orden": { label: "Columna: Nro. Orden" },
          "col_fecha": { label: "Columna: Fecha Orden" },
          "col_rut": { label: "Columna: Rut Proveedor" },
          "col_proveedor": { label: "Columna: Proveedor" },
          "col_items": { label: "Columna: Items" },
          "col_total": { label: "Columna: Total" },
          "action_ver_detalle": { label: "Operación: Acción Ver (Ojo)" }
        }
      },
      "tabla_detalles": {
        label: "Sección: Tabla de Detalles (Detalle de Orden)",
        elements: {
          "col_articulo": { label: "Columna Detalle: Artículo" },
          "col_cantidad": { label: "Columna Detalle: Cantidad" },
          "col_precio": { label: "Columna Detalle: Precio" }
        }
      }
    }
  },

  "/laboratorio/ingresoFacturas": {
    label: "Ingreso de Facturas",
    sections: {
      "formulario_ingreso": {
        label: "Sección: Formulario",
        "elements": {
          "folio": { label: "Input: Folio" },
          "orden": { label: "Input: Orden" },
          "acta": { label: "Input: Acta" },
          "salida": { label: "Input: Salida" },
          "fechaActa": { label: "Input: F. Acta" }, // Cambiado de f_acta
          "fechaSalida": { label: "Input: F. Salida" }, // Cambiado de f_salida
          "montoFactura": { label: "Input: Monto" }, // Cambiado de monto
          "ocFactura": { label: "Input: OC" }, // Cambiado de oc
          "empresa": { label: "Input: Empresa" },
          "btn_accion": { label: "Botón: Registrar/Actualizar" }
        }
      },
      "tabla_facturas": {
        label: "Sección: Tabla",
        elements: {
          "col_folio": { label: "Col: Folio" },
          "col_orden": { label: "Col: Orden" },
          "col_acta": { label: "Col: Acta" },
          "col_salida": { label: "Col: Salida" },
          "col_f_acta": { label: "Col: F. Acta" },
          "col_f_salida": { label: "Col: F. Salida" },
          "col_monto": { label: "Col: Monto" },
          "col_oc": { label: "Col: OC" },
          "col_empresa": { label: "Col: Empresa" },
          "col_accion": { label: "Col: Acción" }
        }
      }
    }
  },

  "/laboratorio/resumenLaboratorio": {
    label: "Resumen Laboratorio",
    sections: {
      "filtros": {
        label: "Sección: Filtros",
        elements: {
          "select_anio": { label: "Selector: Año" }
        }
      },
      "tabla": {
        label: "Sección: Tabla",
        elements: {
          "col_mes": { label: "Col: Mes" },
          "col_total_acta": { label: "Col: Total Acta" },
          "col_total_salida": { label: "Col: Total Salida" },
          "col_fecha_actualizacion": { label: "Col: Última Actualización" }
        }
      }
    }
  },

  "/laboratorio/codigoLaboratorio": {
    label: "Maestro Códigos",
    sections: {
      "formulario": {
        label: "Formulario de Registro",
        elements: {
          "ver_seccion": { label: "Visible: Sección completa" },
          "input_referencia": { label: "Input: Referencia" },
          "input_codigo": { label: "Input: Código" },
          "input_precio": { label: "Input: Precio" },
          "input_descripcion": { label: "Input: Descripción" },
          "btn_registrar": { label: "Acción: Registrar / Actualizar" },
          "btn_cancelar": { label: "Acción: Cancelar edición" }
        }
      },
      "busqueda": { // Nueva sección separada
        label: "Buscador",
        elements: {
          "barra_busqueda": { label: "Visible: Contenedor buscador" },
          "input_busqueda": { label: "Input: Campo búsqueda" }
        }
      },
      "tabla": {
        label: "Tabla de Datos",
        elements: {
          "ver_tabla": { label: "Visible: Tabla completa" },
          "col_referencia": { label: "Columna: Referencia" },
          "col_codigo": { label: "Columna: Código" },
          "col_descripcion": { label: "Columna: Descripción" },
          "col_precio": { label: "Columna: Precio" },
          "col_acciones": { label: "Columna: Acciones" },
          "btn_editar": { label: "Acción: Botón Editar" },
          "btn_eliminar": { label: "Acción: Botón Eliminar" }
        }
      }
    }
  },








  "/consignacion/guias": {
    label: "Gestión de Guías (Consignación)",
    sections: {
      "cabecera_acciones": {
        label: "Sección: Cabecera y Cargas",
        elements: {
          "btn_importar_xml": { label: "Acción: Botón Importar XML (Abrir Modal)" }
        }
      },
      "filtros_busqueda": {
        label: "Sección: Filtros de Visualización",
        elements: {
          "select_anio": { label: "Filtro: Selector de Año" },
          "select_mes": { label: "Filtro: Selector de Mes" },
          "input_buscar": { label: "Filtro: Barra de Búsqueda" }
        }
      },
      "tabla_guias": {
        label: "Sección: Tabla Principal de Guías",
        elements: {
          "action_copiar": { label: "Operación: Copiar y Registrar en Portapapeles" },
          "action_ver_detalle": { label: "Operación: Ver Detalle Guía (Ojo)" },
          "action_eliminar": { label: "Operación: Eliminar Guía (Basurero)" }
        }
      },
      "modal_detalles": {
        label: "Sub-Modal: Visualizador de Detalles Internos",
        elements: {
          "btn_exportar_excel": { label: "Acción: Descargar reporte en Excel" },
          "btn_exportar_pdf": { label: "Acción: Generar y ver archivo PDF" }
        }
      },
      "visualizador_temporal": {
        label: "Pestaña: Visualizador de XML en Memoria (No Guardado)",
        elements: {
          "zona_dropzone": { label: "Componente: Zona de arrastre de archivos XML" },
          "btn_limpiar": { label: "Acción: Botón Limpiar registros de la tabla" }
        }
      }
    }
  },

  "/consignacion/vistaRapida": {
    label: "Visualizador Temporal de Guías",
    sections: {
      "visualizador_temporal": {
        label: "Sección: Buffer de Carga XML",
        elements: {
          "zona_dropzone": { label: "Componente: Zona de arrastre de archivos XML" },
          "btn_limpiar": { label: "Acción: Botón Limpiar registros de la tabla" }
        }
      },
      "tabla_datos": {
        label: "Sección: Tabla de Resultados",
        elements: {
          "col_folio": { label: "Columna: Folio" },
          "col_fecha": { label: "Columna: Fch. Emisión" },
          "col_ref": { label: "Columna: Folio Ref" },
          "col_item": { label: "Columna: Primer Ítem" }
        }
      }
    }
  },

















  "/documentos/carga": {
    label: "Gestión de Carga de Datos (CargaDatos.jsx)",
    sections: {
      "filtros_barra": {
        label: "Sección: Barra de Filtros y Alertas OC",
        elements: {
          "cargaDatos_filtros_anio": { label: "Filtro: Selector de Año" },
          "cargaDatos_filtros_mes": { label: "Filtro: Selector de Mes" },
          "cargaDatos_filtros_dia": { label: "Filtro: Campo de Día" },
          "cargaDatos_filtros_estadoOC": { label: "Filtro: Selector Estado de OC" },
          "cargaDatos_filtros_busqueda": { label: "Filtro: Caja de Búsqueda General" }
        }
      },
      "tabla_admisiones": {
        label: "Sección: Tabla Principal de Admisiones",
        elements: {
          "cargaDatos_tabla_colEstadoOC": { label: "Columna: Ver Estado OC (Multi-Proveedor)" },
          "cargaDatos_tabla_colTotal": { label: "Columna: Ver Monto Total CLP" },
          "cargaDatos_tabla_colEstadoGral": { label: "Columna: Ver Estado General" },
          "cargaDatos_tabla_btnVer": { label: "Operación: Botón Inspección de Expediente" }
        }
      },
      "resumen_financiero": {
        label: "Sección: Bloque de Analítica y Finanzas",
        elements: {
          "cargaDatos_resumen_totales": { label: "Control: Tarjetas de Totales (Gral, Facturado, Pendiente)" },
          "cargaDatos_resumen_estados": { label: "Control: Ver Desglose de Todos los Estados" },
          "cargaDatos_resumen_tablaProveedores": { label: "Tabla: Ver Montos por Proveedor" }
        }
      },
      "tabla_detalle_paciente": {
        label: "Sección: Tabla de Desglose de Insumos",
        elements: {
          "cargaDatos_detalle_precios": { label: "Control: Ver Precios Unitarios y Montos OC" },
          "cargaDatos_detalle_logistica": { label: "Control: Ver Factura, Guía, Lote y Vencimiento" }
        }
      },
      "gestor_documentos": {
        label: "Sección: Panel de Expediente Centralizado",
        elements: {
          "cargaDatos_gestor_upload": { label: "Componente: Subir Archivos (Arrastrar o Clic)" },
          "cargaDatos_gestor_verClinicos": { label: "Control: Ver e Inspeccionar Informes Clínicos" },
          "cargaDatos_gestor_verOC": { label: "Control: Ver e Inspeccionar Órdenes de Compra" },
          "cargaDatos_gestor_eliminar": { label: "Operación: Eliminar Documentos del Expediente" }
        }
      },
      "acciones_principales": {
        label: "Sección: Acciones de Nivel Superior",
        elements: {
          "cargaDatos_btnImportar": { label: "Acción: Botón Importar Excel" }
        }
      }
    }
  },

  '/finanzas/dashboard': {
    label: 'Dashboard Financiero',
    sections: {
      kpis: {
        label: 'Indicadores Clave (KPIs)',
        elements: {
          totalGeneral: { label: 'Total General Bruto' },
          montoFacturado: { label: 'Monto Facturado' },
          montoPendiente: { label: 'Monto Pendiente' }
        }
      },
      tablas: {
        label: 'Tablas de Detalle',
        elements: {
          evolucionMensual: { label: 'Tabla: Evolución Mensual' },
          resumenProveedores: { label: 'Tabla: Resumen por Proveedor' }
        }
      }
    }
  }


};