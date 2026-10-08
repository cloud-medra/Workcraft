# Pendiente: cierre de períodos (Cloud Function `cerrarPeriodoImputacion`)

Informe del 2026-09-29. Aún no se implementa nada.

## Diagnóstico

El cierre manual de períodos (Administración → Control Mensual) no funciona
desde el commit `692a361` ("Cambios varios", 2026-09-23).

### Qué ve el usuario

En el modal de cierre (`ModalCierreMes.jsx`) el usuario escribe el año y el
mes y presiona "Confirmar cierre". `ejecutarCierre` (en
`src/components/modulos/administracion/controlMensual/useControlMensualData.js`)
llama al callable `cerrarPeriodoImputacion`, que **no existe en producción**
(`firebase functions:list` solo muestra `extraerGuiaDespacho`). Como ese error
no está en `CODIGOS_ERROR_CIERRE`, el modal muestra en rojo el mensaje
genérico:

> No se pudo cerrar el mes. Revisa tu conexión e intenta nuevamente.

El período sigue abierto. El mensaje engaña: sugiere un problema de conexión
que no existe. Afecta tanto al cierre individual como a "Cerrar todos".

### Historial de git

`git log -S "cerrarPeriodoImputacion" --all` solo encuentra `692a361`. En ese
commit:

- El cliente dejó de escribir `estado: 'CERRADO'` directamente y pasó a llamar
  a la Cloud Function.
- `firestore.rules` pasó a prohibir que el cliente escriba `CERRADO`, salvo en
  el cierre automático al abrir otro período (`esCierreAutomaticoPorApertura`).
- Se agregó `validarCierreMes.test.js`, que importa `functions/validarCierreMes.js`.

Ni la función ni `functions/validarCierreMes.js` se commitearon nunca, ni en
`main` ni en `origin/optimizacion-firestore`.

### Tests afectados

- `validarCierreMes.test.js` falla: `Cannot find module '../../../../../functions/validarCierreMes.js'`.
- `ModalCierreMes.test.js` falla por otra razón: tiene JSX en un archivo `.js`
  (el parser de vite/oxc no lo acepta).

### Qué esperan las reglas de la función

- Que escriba en `cierres_periodos/{anio}_{mes}_{modulo}` con el Admin SDK, que
  no pasa por las reglas.
- Que valide en el servidor el año y el mes que escribió el usuario, con la
  misma lógica de `validarCierreMes.js`.
- Campos (según el código del cliente anterior): `estado: 'CERRADO'`,
  `fechaCierre`, `usuarioCierre`; por el `merge` se mantienen `anio`, `mes`
  y `modulo`.
- Que devuelva `HttpsError` con los códigos `unauthenticated`,
  `invalid-argument`, `permission-denied` o `failed-precondition`, que son los
  que el modal sabe mostrar.

### Cómo se abren hoy los períodos

Desde el cliente (`handleAbrirMes`), en un solo batch:

- Crea el período en `ABIERTO`.
- Actualiza `configuracion_periodos/periodo_activo_{modulo}`.
- Deja en `CERRADO` cualquier otro período del módulo que estuviera en
  `ABIERTO` o `REABIERTO` (`cierreAutomatico: true`, `cerradoPorApertura`).
  Las reglas permiten ese cierre automático.

La reapertura (`ejecutarReapertura`) también se hace desde el cliente.

### Cómo se han cerrado los períodos

- Hasta el 2026-09-23, el cliente escribía `CERRADO` directamente.
- Después de esa fecha, la única vía que funciona es abrir el mes siguiente
  del mismo módulo, que cierra el anterior de forma automática. El botón
  "Cerrar período" no ha funcionado nunca en esta versión.
- Para comprobarlo: en Firestore, los cierres posteriores a esa fecha en
  `cierres_periodos` deberían tener `cierreAutomatico: true` (sin verificar;
  no hubo acceso a los datos).

### Dónde se bloquea la edición por período cerrado

El bloqueo existe **solo en la interfaz**. Los `Cargastab`, `Informaciontab`
y `verificacionPeriodoBloque` de Implantes, Hemodinamia y Consignación revisan
`estado === 'CERRADO'` en el navegador. Las reglas de `*_imputadas`,
`*_gestiones` y `detalles` no miran el período.

## Propuesta para `cerrarPeriodoImputacion`

Callable v2, región `us-central1`, igual que `extraerGuiaDespacho`.

1. Exigir que el usuario haya iniciado sesión (`request.auth`); si no, error
   `unauthenticated`.
2. Validar `{anio, mes, modulos, anioIngresado, mesIngresado}` con un nuevo
   `functions/validarCierreMes.js`, copia del validador del frontend. Esto
   también arregla `validarCierreMes.test.js`. Si el mes o el año no
   coinciden, error `invalid-argument` con el mismo mensaje que muestra el
   frontend.
3. Leer `usuarios/{uid}`: admin o dev pueden cerrar cualquier módulo; los demás
   necesitan `permisos[modulo]` en cada módulo que cierran. Si no, error
   `permission-denied`. Es el mismo criterio que usan hoy las reglas.
4. Dentro de una transacción, exigir que cada
   `cierres_periodos/{anio}_{mes}_{modulo}` exista y esté en `ABIERTO` o
   `REABIERTO`. Si no, error `failed-precondition`. Si se cierran varios
   módulos, se cierran todos o ninguno.
5. Escribir `estado: 'CERRADO'`, `fechaCierre` y `usuarioCierre`
   (`{uid, nombre, email}`, sacado del perfil en el servidor), con
   `cierreAutomatico: false`.
6. No tocar `periodo_activo_*` (el cierre anterior tampoco lo hacía) ni el
   snapshot mensual, que el cliente ya calcula después del cierre.

## Decisiones pendientes

- **a.** ¿Sirve el criterio de permisos del punto 3, o cerrar un período
  debería quedar solo para admin y dev?
- **b.** ¿Las reglas de Firestore deberían además bloquear la escritura de
  imputaciones en períodos cerrados? Hoy solo lo bloquea la interfaz. Sería
  un cambio aparte y más delicado.
- **c.** ¿Se corrige también el mensaje genérico, para que no diga "Revisa tu
  conexión" cuando el error no es de conexión, y el test de `ModalCierreMes`
  que falla por el JSX en un archivo `.js`?

## Contexto adicional

- `firebase deploy` completo requiere `npm install` en `functions/`; ya se hizo
  el 2026-09-29, y `package-lock.json` no cambió.
- `firebase deploy --only functions` del 2026-09-29 confirmó que producción
  era idéntica al repo (`extraerGuiaDespacho: Skipped (No changes detected)`).
