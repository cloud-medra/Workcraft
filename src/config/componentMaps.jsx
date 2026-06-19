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