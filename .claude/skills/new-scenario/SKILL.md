---
name: new-scenario
description: Crear un escenario BDD nuevo (feature, pasos, Tasks/Questions/Page Objects y documentación) siguiendo el estándar del proyecto. Usar cuando se pida añadir o automatizar un escenario, un caso de prueba o una cobertura nueva.
---

# Crear un escenario nuevo

Sigue los pasos en orden. Las reglas de cada capa están en `.claude/rules/`; aquí solo está el procedimiento.

## 1. Explorar (solo lectura)
- Lee el requisito o el caso pedido y busca si ya está cubierto en `features/` y en `docs/test-strategy.md` §12.
- Busca pasos reutilizables: `grep -rn "<frase del paso>" steps/`.
- Si hace falta comportamiento nuevo de la aplicación, compruébalo antes en la app real o en `docs/known-defects.md` y `docs/test-strategy.md` §2.

## 2. Plan y aprobación
Presenta al usuario, antes de escribir nada:
- El Gherkin propuesto (en español, con etiquetas) y el archivo `features/<dominio>/` donde va.
- Los pasos reutilizados y los nuevos, con su capa: Task, Question, Interaction o Page Object.
- Los datos (`syntheticData`) y las cuentas (`accounts` o `@shared-session`).
- El oráculo de cada `Entonces` y la sincronización de red.
- Los documentos que se actualizarán.

No implementes sin aprobación explícita.

## 3. Implementar, de abajo arriba
1. Page Object: localizadores nuevos en `src/pages/` (registrar la página en `app.ts` si es nueva).
2. Questions y Tasks en `src/questions/` y `src/tasks/`.
3. Claves nuevas en `ScenarioMemory` si los pasos comparten datos.
4. Pasos en `steps/common/<dominio>.steps.ts`.
5. Feature en `features/<dominio>/`.

## 4. Verificar
- `npm run validate`.
- Ejecuta solo el escenario nuevo: `npx playwright test --project=functional --grep "<título>"`. Si no es `@shared-session`, repítelo con `--repeat-each=3` para detectar inestabilidad.
- Si es `@negative`, comprueba que fallaría ante el defecto: invierte temporalmente la condición o el dato y confirma que el escenario falla; luego restaura y verifica con `git diff`.
- Avisa de que ejecutar tests vacía `allure-results/` y reemplaza los reportes locales.

## 5. Documentar
- `docs/test-strategy.md`: Gherkin idéntico en §3 y fila en la matriz §12.
- `docs/requirements-analysis.md` §6: trazabilidad del requisito.
- README: solo si cambia el número de escenarios o un comando.

## 6. Cierre
Ejecuta `/review-scenario` sobre el cambio y presenta el resultado. No hagas commit ni push sin autorización explícita.
