# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Firebase Storage: CORS

Los PDF (Documentos de implantes y órdenes de compra) se abren desde el navegador con `getBlob`, que necesita que el bucket de Storage permita los orígenes de la app. La configuración está en [`cors.json`](cors.json) (solo `GET`, para los dominios de Hosting, `localhost:5173` y el Codespace).

Para aplicarla (o volver a aplicarla después de cambiar `cors.json`, por ejemplo si cambia la URL del Codespace):

```bash
gcloud storage buckets update gs://workcraft-491b7.firebasestorage.app --cors-file=cors.json
```

Requiere `gcloud` autenticado con una cuenta con permisos sobre el bucket. No se aplica con `firebase deploy`.
