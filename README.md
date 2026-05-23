# TECTRA

## Setup local
```bash
npm install
npm run dev          # localhost:5173/tectra/
```

## Deploy a GitHub Pages
1. Crear repositorio `tectra` en GitHub
2. Push del código
3. En Settings → Pages → Source: GitHub Actions
4. El workflow `.github/workflows/deploy.yml` se ejecuta en cada push a `main`
5. URL final: `https://[usuario].github.io/tectra/`

## Cambiar la base URL
Si el repo se llama diferente, editar `vite.config.js`:
```js
base: '/nombre-del-repo/',
```
Y en `manifest.webmanifest` (generado automáticamente por el plugin).

## localStorage
Las claves `tc_v1_*` no cambian entre versiones del Sistema 1.
Si se migra a Sistema 2, se añaden funciones de migración en `shared/storage.js`.

## Estructura
```
src/
  shared/
    tokens.js     ← T, SK, CATS — fuente única de verdad
    storage.js    ← rd(), wr(), backup, import
    utils.js      ← uid, hoy, semanaISO, parseCoord, fmtCoord
    ui.jsx        ← Btn, TInput, Topbar, Nav, ConfirmBarra...
  modules/
    Inicio.jsx
    Proyectos.jsx
    Topografia.jsx
    Aprendizaje.jsx
    Evolucion.jsx
  App.jsx         ← router, lazy loading
  main.jsx        ← entry point
```
