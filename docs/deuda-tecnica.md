# Deuda técnica conocida

Pendientes detectados que **no** se corrigen en la rama `optimizacion-firestore`
(se anotan para no mezclarlos con la optimización de lecturas). Regla vigente:
no agregar errores nuevos en los archivos que se modifiquen.

## Lint (`npm run lint`)

Línea base al 2026-09-25 (rama `main`, commit `a9b3458`): **541 problemas — 499 errores y 42 advertencias**.

| Regla | Cantidad aprox. |
|---|---|
| `no-unused-vars` | 292 |
| `react-hooks/set-state-in-effect` | 124 |
| `react-hooks/exhaustive-deps` | 39 |
| `react-hooks/rules-of-hooks` | 29 |
| `react-hooks/static-components` | 17 |
| `no-undef` | 14 |
| `react-refresh/only-export-components` | 9 |

## Tests (`npm test`)

2 archivos fallan también en `main` (los 230 tests restantes pasan):

- `src/components/modulos/administracion/controlMensual/ModalCierreMes.test.js`:
  contiene JSX en un archivo `.js` (`PARSE_ERROR Unexpected JSX expression`, línea 12).
  Renombrar a `.test.jsx` o configurar el loader.
- `src/components/modulos/administracion/controlMensual/validarCierreMes.test.js`:
  importa `functions/validarCierreMes.js`, que no existe en el repositorio.

## Otros

- `src/components/modulos/privado/respaldo/*`: código que no se importa desde ninguna parte
  (lee `maestros_codigos` / `maestros_empresas` completos). Candidato a eliminar.
- `firestore.indexes.json` puede no estar sincronizado con los índices desplegados
  (el índice `maestros_codigos: tieneCodigo + fechaRegistro` faltaba en el archivo).
