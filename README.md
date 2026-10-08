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

El dominio principal de la app es **https://app.medra.cl** (también responde en `workcraft-491b7.web.app` y `workcraft-491b7.firebaseapp.com`; el dominio anterior `workcraft.medra.cl` se mantiene durante la transición). El código no tiene el dominio escrito: la configuración de Firebase sale de las variables `VITE_*` de `.env` y los enlaces se arman con `window.location.origin`.

Los PDF (Documentos de implantes y órdenes de compra) se suben y se abren desde el navegador directo contra Storage (`uploadBytesResumable`, `getBlob`), así que el bucket debe permitir esos orígenes. La configuración activa está en [`cors.json`](cors.json): el dominio principal (y el anterior, mientras dure la transición), los dos de Hosting y `http://localhost:5173`. No incluye la URL del Codespace porque cambia.

Para aplicarla después de cambiar `cors.json`:

```bash
gcloud storage buckets update gs://workcraft-491b7.firebasestorage.app --cors-file=cors.json
```

Para revisar lo que está aplicado en el bucket:

```bash
gcloud storage buckets describe gs://workcraft-491b7.firebasestorage.app --format="default(cors_config)"
```

Requiere `gcloud` autenticado con una cuenta con permisos sobre el bucket (por ejemplo, desde Cloud Shell). No se aplica con `firebase deploy`.
