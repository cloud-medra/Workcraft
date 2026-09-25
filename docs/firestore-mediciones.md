# Mediciones de lecturas de Firestore

Medidor: `src/dev/firestoreMeter.js` (solo `npm run dev`). En consola:
`__FS_METER__.report()`, `__FS_METER__.reset()`, `await __FS_METER__.tamanos()`.

Recorrido de referencia: Códigos Maestros, Reportes Info, Gestión Implantes y Laboratorio.

## Línea base ("antes") — ~15 min

Medida con el código de la **copia de prueba** conectada a la base real; algunos
archivos/líneas no coinciden con este repositorio (p. ej. `ReportesInfo.jsx:288`
corresponde aquí al control de duplicados de la importación).

### Tamaños de colecciones

| Colección | Docs |
|---|---|
| maestros_codigos | 2915 |
| implantes_imputadas/**/documentos | 342 |
| laboratorio_codigos | 233 |
| implantes_gestiones/**/detalles | 91 |
| maestros_prestadores | 82 |
| maestros_empresas | 43 |
| laboratorio_imputadas/**/documentos | 33 |
| consignacion_imputadas/**/documentos | 26 |
| consignacion_registros/**/detalles | 26 |
| hemodinamia_imputadas/**/documentos | 19 |
| maestros_recargos | 15 |
| cierres_periodos | 10 |
| vacunatorio_codigos | 9 |
| vacunatorio_imputadas/**/documentos | 8 |
| maestros_centros | 7 |
| hemodinamia_gestiones/**/detalles | 3 |
| maestros_pad, usuarios | 1 |
| inventario_general, inventario_transito, inventario_egresos, administracion_notas, maestros_convenios, maestros_previsiones | 0 |

### Resumen: 19.494 lecturas · 5.967 desde caché · 1 listener activo

| Pantalla | Lecturas | Desde caché | Consultas |
|---|---|---|---|
| /maestros/codigosMaestros | 17.680 | 43 | 7 |
| /documentos/reportesInfo | 1.302 | 0 | 6 |
| /laboratorio/archivosControlLaboratorio | 345 | 2 | 25 |
| /implantes/gestionImplantes | 161 | 5.922 | 9 |
| /laboratorio/xmlDocLaboratorio | 3 | 0 | 4 |
| dashboard | 2 | 0 | 2 |
| inicio | 1 | 0 | 2 |

### Consultas principales

| Pantalla | Tipo | Origen | Consulta | Llamadas | Lecturas | Caché | Docs máx |
|---|---|---|---|---|---|---|---|
| codigosMaestros | getDocs | hooks/useCollectionCache.js:13 | maestros_codigos orderBy fechaRegistro desc | 6 | 17.476 | 0 | 2915 |
| reportesInfo | getDocs | ReportesInfo.jsx:177 | …/2026/septiembre/registros orderBy Fecha | 2 | 838 | 0 | 419 |
| reportesInfo | getDocs | ReportesInfo.jsx:288 | …/septiembre/registros where __name__ in | 14 | 419 | 0 | 30 |
| archivosControlLaboratorio | getDocs | LaboratorioDataContext.jsx:39 | laboratorio_codigos | 1 | 233 | 0 | 233 |
| codigosMaestros | getDocs | TabConCodigo.jsx:184 | maestros_empresas orderBy nombre | 4 | 172 | 0 | 43 |
| gestionImplantes | onSnapshot | useGestionesImplantesData.js:107 | cg detalles … limit 150 | 2 | 92 | 91 | 91 |
| gestionImplantes | getDocs | useRecargosActivos.js:12 | maestros_recargos where estado | 4 | 60 | 0 | 15 |
| reportesInfo | getDocs | EmpresaSelect.jsx:20 | maestros_empresas orderBy nombre | 1 | 43 | 0 | 43 |
| codigosMaestros | getDocs | useFirestorePagination.js:17 | maestros_codigos where tieneCodigo … limit 51 | 8 | 31 | 0 | 8 |
| archivosControlLaboratorio | getDocs | IniciarProceso.jsx:65 | laboratorio_documentos/2026/{agosto,septiembre,julio} | 3 | 49 | 0 | 22 |
| archivosControlLaboratorio | onSnapshot | DocRecibidos.jsx:81 | laboratorio_documentos/2026/septiembre | 1 | 13 | 1 | 14 |
| archivosControlLaboratorio | getDocs | LaboratorioDataContext.jsx:44 | laboratorio_ordenes/2026/{agosto,septiembre} | 2 | 18 | 0 | 9 |
| gestionImplantes | getDocs | CentroSelect.jsx:19 | maestros_centros orderBy nombre | 1 | 7 | 0 | 7 |

Error observado: `useFirestorePagination.js:35 The query requires an index` para
`maestros_codigos (tieneCodigo, fechaRegistro desc)` (índice en construcción).

## Medición final (rama `optimizacion-firestore`, ~8 min)

Recorrido: Códigos Maestros, Gestión Implantes, Laboratorio, Control Mensual y
Resumen Periodo Abierto. **No incluyó Reportes Info** (en la línea base aportó
1.302 lecturas; su listado no cambió en esta rama: sigue leyendo el mes completo).
Con la migración de `total` (pasos 1 y 2) ya aplicada y `compararTotales(2026)`
coincidiendo en 7 de 7 meses.

**Total: 242 lecturas · 3.051 desde caché · 2 listeners activos** (línea base:
19.494 lecturas y 5.967 desde caché en ~15 min).

### Por pantalla

| Pantalla | Lecturas | Desde caché | Consultas |
|---|---|---|---|
| /implantes/gestionImplantes | 168 | 3.007 | 7 |
| /laboratorio/xmlDocLaboratorio | 48 | 14 | 4 |
| /administracion/controlMensual | 15 | 5 | 7 |
| /laboratorio/archivosControlLaboratorio | 5 | 15 | 4 |
| inicio | 2 | 0 | 3 |
| /consignacion/cargasConsignacion | 2 | 0 | 1 |
| dashboard | 1 | 0 | 1 |
| /maestros/codigosMaestros | 1 | 0 | 1 |
| /administracion/ResumenPeriodoAbierto | 0 | 10 | 1 |

### Consultas principales

| Origen | Consulta | Lecturas | Desde caché |
|---|---|---|---|
| useVisibleSnapshot.js (Gestión Implantes) | cg detalles, limit 150 | 94 | 92 |
| catalogosStore.js (lectura única) | maestros_empresas / maestros_recargos / maestros_centros | 43 / 15 / 7 | — |
| XmlDocLaboratorio.jsx | laboratorio_documentos agosto / septiembre | 22 / 14 | 14 |
| XmlDocLaboratorio.jsx | laboratorio_documentos/2026/meses | 8 | — |
| XmlDocLaboratorio.jsx | laboratorio_documentos (años), 4 llamadas | 4 | — |
| resumenImputacionesStore.js | imputaciones_periodos where anio | 5 | — |
| resumenImputacionesStore.js | 5 agregaciones count/sum (septiembre, una por módulo) | 5 | — |
| catalogosStore.js (listener) | maestros_codigos | **0** | **2.915** |

Las 4 llamadas de años en XML Laboratorio eran StrictMode (x2) por 2 entradas;
después de esta medición pasaron a la caché del módulo (commit "XML
Laboratorio/Vacunatorio: años/meses desde la caché del módulo").

### Comparación con la línea base

| Pantalla | Línea base | Final |
|---|---|---|
| Códigos Maestros | 17.680 | **1** (`maestros_codigos` completo desde la caché persistente) |
| Control Mensual | 962 (+482 anotadas en `dashboard` por el error del medidor) | **15** |
| Resumen Periodo Abierto | 1.506 | **0** (reutilizó lo calculado por Control Mensual) |
| Gestión Implantes | 161 | 168 (incluye la 1ª lectura de empresas/recargos/centros de la sesión: 65) |
| Laboratorio (Archivos de Control) | 345 | **5** |
| Reportes Info | 1.302 | no incluido en el recorrido |
| **Total del recorrido** | **19.494** (~15 min, con Reportes Info) | **242** (~8 min, sin Reportes Info) |

### Pendiente de verificar en producción

No se probaron manualmente antes del merge:

- Cerrar un mes desde otra pestaña y comprobar que se bloquean las Cargas.
- Inventario con dos pestañas descontando de la misma caja (la segunda debe fallar).
- Importar un XML (Laboratorio / Vacunatorio): `total` y montos de `detalles` como número.
- Finalizar un acta (imputación con `total` numérico).
- Cambio de usuario en el mismo navegador (cubierto por tests automáticos:
  `firebaseConfig.test.js` y `UserContext.test.jsx`).

Costo pendiente más grande: la carga inicial de los ~2.915 documentos de
`maestros_codigos` por usuario (cada día / después de cerrar sesión). Ver
"Próxima optimización a evaluar" en
[firestore-buenas-practicas.md](firestore-buenas-practicas.md).

## Estimaciones previas (antes de la medición final)

Mediciones parciales de la segunda ronda (con el código de esta rama):

- Códigos Maestros: **33 lecturas** y 2.915 desde caché (antes 17.680).
- ControlMensual, antes de su cambio: 962 lecturas en `/administracion/controlMensual`,
  1.506 en `/administracion/ResumenPeriodoAbierto` y 482 anotadas en `dashboard`
  (eran de ControlMensual: el medidor anotaba en la pantalla anterior las lecturas
  del primer montaje; corregido).

### Antes / después por pantalla

"Medido" = medidor en `npm run dev`. "Estimado" = calculado a partir de las
consultas y los tamaños de colección; **falta confirmarlo con el medidor**.
En dev, StrictMode puede duplicar lecturas al montar.

| Pantalla | Antes (medido) | Después, 1ª entrada | Después, 2ª entrada en la sesión |
|---|---|---|---|
| Códigos Maestros (Vista General) | 17.680 | ~2.960 una vez por sesión (listener de códigos + empresas) — medido: 33 + 2.915 desde caché | ≈ 0 (solo cambios) |
| Códigos Maestros > Pendientes | ~2.958 por entrada | 0 extra (usa el mismo listener) | 0 |
| Reportes Info (mes de 419) | 1.302 | ≈ 419 + años/meses (estimado; el listado no cambió) | ≈ 419 (getDocs siempre va al servidor) |
| Reportes Info: importar el mes en pantalla | 419 | 0 | 0 |
| Gestión Implantes | 161 | ≈ 150 + catálogos si no estaban (estimado) | ≈ cambios (caché persistente, < 30 min) |
| Laboratorio (Archivos de Control) | 345 | ≈ igual en la 1ª (estimado) | menor: años/meses/códigos cacheados 5 min |
| Control Mensual | 962 (+482 en "dashboard") | ≈ 15–25 (estimado): cierres del año (≤ 10) + 1 consulta de snapshots + 1 por módulo con mes abierto | ≈ 0 (resumen cacheado; meses abiertos se recalculan tras 5 min, ~5 lecturas) |
| Resumen Periodo Abierto | 1.506 | ≈ 15–20 (estimado): cierres (compartido) + ≤ 5 agregaciones + snapshots del mes anterior | ≈ 0 |
| Cargas Consolidado | (no medido) | 1 lectura por documento del año de la pestaña abierta | 0 al volver a la pestaña (caché de sesión) |

Si un mes cerrado no tiene snapshot en `imputaciones_periodos` (meses cerrados
antes de ese mecanismo), la primera vez se calcula leyendo sus documentos y
se guarda; desde ahí cuesta 0.

_Las filas medidas en la medición final (arriba) reemplazan a estas
estimaciones. Reportes Info, Cargas Consolidado y la 2ª entrada a cada
pantalla siguen sin medir._
