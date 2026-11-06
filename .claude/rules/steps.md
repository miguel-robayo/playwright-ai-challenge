---
paths:
  - "steps/**/*.ts"
---

# Step definitions

- Reutilizar un paso existente antes de crear uno (buscar el texto en `steps/`). Los pasos nuevos van en `steps/common/<dominio>.steps.ts`, o en `steps/ai/` si dependen del fixture `ai`.
- Importar `Given`, `When`, `Then` desde `src/fixtures/index`; desestructurar los fixtures en la firma (playwright-bdd lo exige).
- Los pasos solo orquestan Tasks, Questions e Interactions. Sin localizadores (`page.locator`, `getBy*`) ni lógica de negocio.
- `Dado`: prepara el estado (precondiciones compartidas en `steps/support/preconditions.ts`). Puede comprobar una precondición con `expect`.
- `Cuando`: ejecuta la acción. Sin aserciones. Si el fallo es el resultado esperado, se captura el error tipado y se guarda en `scenario` para que lo compruebe `Entonces`.
- `Entonces`: solo comprueba, sin acciones ni navegación. Si hace falta abrir otra página, eso es un `Cuando` o forma parte del `Dado`. Deuda conocida: algunos `Entonces` de `steps/common/cart.steps.ts` abren el carrito; no se replican y se corrigen solo con un cambio aprobado.
- Aserciones web-first (`await expect(locator)...`) o `expect.poll(() => question(app))` sobre datos de Questions. Mensaje en aserciones dentro de bucles.
- Las aserciones negativas (`toBeHidden`, `not.*`) van después de un punto de sincronización (respuesta de red esperada) y se emparejan con un escenario positivo que comprueba el mismo localizador.
- Estado entre pasos solo con `scenario.remember` / `recall`; si falta una clave, se añade a `ScenarioMemory`. Nunca variables de módulo.
- Sincronizar las acciones de red con `performAndAwaitResponse` / `performAndCaptureResponse` (`src/interactions/network.ts`).
- Prohibido: `waitForTimeout`, `networkidle`, `force: true`, XPath, `test.only`, `if` para decidir el resultado esperado.
