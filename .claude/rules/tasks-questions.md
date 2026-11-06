---
paths:
  - "src/tasks/**/*.ts"
  - "src/questions/**/*.ts"
  - "src/interactions/**/*.ts"
---

# Tasks, Questions e Interactions

Screenplay ligero: funciones que reciben `App` (y fixtures si hacen falta). Sin clases Actor ni Ability.

## Tasks (`src/tasks/`)
- Ejecutan acciones de negocio componiendo Page Objects y sincronizan con la respuesta de red esperada (`performAndAwaitResponse` / `performAndCaptureResponse`).
- Sin `expect`. Si el servidor responde algo inesperado, lanzan un `Error` descriptivo (sin secretos en el mensaje).
- Las que crean o eliminan cuentas registran cada transición en `AccountLedger` antes de actuar.

## Questions (`src/questions/`)
- Solo lectura: no navegan, no hacen clic, no rellenan ni recargan.
- Devuelven datos planos (normalizados y tipados) para usarlos con `expect.poll`, o el `Locator` cuando la comprobación es web-first.
- Los datos sensibles se sanean antes de devolverlos si van a adjuntarse.

## Interactions (`src/interactions/`)
- Solo comportamiento transversal: sincronización de red, guards, `fillSecret`, fallos de red simulados y variantes del DOM.
- Los fallos simulados se resuelven en el navegador con `route` y no llegan al servidor real.
