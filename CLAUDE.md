# playwright-ai-challenge

Framework E2E sobre https://automationexercise.com: Playwright + TypeScript estricto +
playwright-bdd (Gherkin en español) + Screenplay ligero + Zod + Allure + IA con Anthropic
(opciones B `expectAI` y C datos generados). El detalle vive en `docs/`; este archivo solo
fija las reglas de trabajo.

## Documentación de referencia

- `docs/requirements-analysis.md`: requisitos R-01..R-26, cobertura parcial (§5) y trazabilidad (§6).
- `docs/architecture.md`: capas, fixtures, aislamiento, guards de red, IA y política de artefactos sensibles (§10.1).
- `docs/test-strategy.md`: oráculos, datos, aislamiento, riesgos y matriz de escenarios (§12).
- `docs/known-defects.md`: defectos KD-xx de la aplicación bajo prueba.

## Comandos

- `npm run validate`: typecheck + lint + formato + descubrimiento de tests. Obligatorio antes de entregar cualquier cambio.
- `npm run test:functional`: escenarios sin `@ai` contra la app real (crea y elimina cuentas sintéticas).
- `npm run test:ai-unit`: cliente de IA con respuestas simuladas, sin red ni clave.
- `npm run test:ai`: escenarios `@ai` contra Anthropic real. Solo lo ejecuta el usuario con su propia clave.
- Cualquier ejecución de tests vacía `allure-results/` (global setup) y reemplaza `test-results/` y `playwright-report/`.

## Arquitectura (resumen)

Feature → Steps → Tasks / Questions / Interactions → Page Objects, con fixtures propios
(`src/fixtures/index.ts`). Las reglas detalladas por capa están en `.claude/rules/` y se
aplican al tocar los archivos de cada ruta.

- Aserciones solo en pasos `Entonces` (y precondiciones en `Dado`); nunca en `src/` salvo `src/setup`.
- Localizadores solo en `src/pages`. Questions de solo lectura; Tasks sin aserciones.
- Datos solo desde el fixture `syntheticData`; cuentas solo mediante el fixture `accounts`.
- Estado entre pasos solo en `ScenarioMemory` (`src/fixtures/scenario-context.ts`).

## Seguridad (no negociable)

Ver `.claude/rules/security.md`. En resumen: el `POST /payment` se aborta siempre, no se
usan datos reales, las contraseñas no aparecen en logs, títulos ni adjuntos, y nunca se
solicita, genera, lee, imprime ni almacena `ANTHROPIC_API_KEY` / `AI_API_KEY`.

## Flujo de trabajo con el usuario

- Trabajo por fases: explorar → planificar → aprobación → implementar → verificar → revisar.
- Si el usuario pide una fase de solo lectura, no se modifica, crea ni elimina nada (tampoco artefactos locales ejecutando tests que los borren).
- Sin aprobación explícita: ningún commit, push, PR, merge, rebase ni cambio de configuración del repositorio o de GitHub. Una aprobación vale solo para la acción indicada.
- No trabajar directamente sobre `main`: rama nueva y PR. Fusionar con merge commit (no squash) para conservar el historial.
- No presentar como validado lo que no se ejecutó: la IA real sigue pendiente de validación y R-02/R-25 son parciales; mantener esos estados en la documentación hasta que haya evidencia.
- Al cambiar escenarios o requisitos, actualizar la trazabilidad (`requirements-analysis.md` §6, `test-strategy.md` §3 y §12).

## Idioma y estilo

- Documentación, Gherkin, comentarios, mensajes de error y commits en español; identificadores de código en inglés.
- Commits convencionales (`feat:`, `fix:`, `docs:`, `ci:`, `chore:`).
- TypeScript estricto con `noUncheckedIndexedAccess`; ESLint `strictTypeChecked` + plugin de Playwright; Prettier (los `.md` se formatean a mano).

## Skills del proyecto

- `/new-scenario`: crear un escenario nuevo siguiendo el estándar.
- `/review-scenario`: revisar un cambio de escenarios o pasos contra el estándar.
