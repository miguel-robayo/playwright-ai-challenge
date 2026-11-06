# playwright-ai-challenge

Reto técnico de QA Automation: framework E2E con Playwright, TypeScript y Gherkin ejecutable (`playwright-bdd`) sobre [Automation Exercise](https://automationexercise.com), con integración de IA mediante Anthropic.

> **Estado:** foundation técnica (Fase 2), arquitectura BDD + Screenplay (Fase 3) y Fase 4 en curso: checkout de un usuario anónimo y registro y autenticación con ciclo de vida completo de cuentas (Iteración 1), productos y carrito con sesión compartida reutilizable (Iteración 2). Checkout autenticado, pago seguro, limpieza, resiliencia y la integración de IA llegan en las siguientes iteraciones y fases.

## Documentación

| Documento | Contenido |
|---|---|
| [docs/requirements-analysis.md](docs/requirements-analysis.md) | Requisitos del enunciado, obstáculos, desafíos de IA seleccionados y trazabilidad |
| [docs/architecture.md](docs/architecture.md) | Capas, proyectos y entornos, fixtures, guards de red, IA y reportes |
| [docs/test-strategy.md](docs/test-strategy.md) | Alcance, escenarios Gherkin, oráculos, datos, limpieza y riesgos |
| [docs/known-defects.md](docs/known-defects.md) | Defectos de Automation Exercise detectados durante el análisis |

## Stack

| Herramienta | Versión | Uso |
|---|---|---|
| Node.js | ≥ 22.18 (`.nvmrc`: 22.23.2) | Runtime |
| TypeScript | 6.0 | Comprobación de tipos en modo estricto |
| Playwright Test | 1.65.0 | Runner y navegador |
| playwright-bdd | 9.2 | Gherkin ejecutable (`# language: es`) |
| Zod | 4 | Validación de la configuración y de los datos sintéticos |
| Faker | 10 | Datos sintéticos deterministas con semilla |
| ESLint + typescript-eslint + eslint-plugin-playwright | 10 / 8 / 2 | Calidad de código |
| Prettier | 3 | Formato |
| Allure (allure-playwright + CLI 3) | 3 | Reporte de ejecución, sin Java |

## Requisitos previos

- **Node.js 22.18 o superior.** Con nvm: `nvm install 22.23.2` y `nvm use 22.23.2`. El archivo `.npmrc` activa `engine-strict`, así que `npm` rechaza la instalación con una versión anterior.
- **npm** 10 o superior (incluido con Node).
- **Anthropic API key**: solo para el proyecto `ai`. La suite funcional no la necesita.

## Instalación

```bash
git clone https://github.com/miguel-robayo/playwright-ai-challenge.git
cd playwright-ai-challenge
npm ci
npx playwright install --with-deps chromium
```

La suite solo usa Chromium. `npx playwright install --with-deps`, el comando del enunciado, también funciona, pero descarga todos los navegadores.

## Configuración

```bash
cp .env.example .env              # PowerShell: Copy-Item .env.example .env
```

| Variable | Valor por defecto | Descripción |
|---|---|---|
| `TEST_ENV` | `ci` si existe `CI`; si no, `local` | Perfil de ejecución: `local` o `ci` |
| `TEST_RUN_ID` | uno nuevo por ejecución | Parte de la semilla de los datos sintéticos; fijarlo reproduce los mismos datos (salvo contraseñas) |
| `BASE_URL` | `https://automationexercise.com` | URL de la aplicación bajo prueba |
| `AI_PROVIDER` | `anthropic` | Único proveedor admitido |
| `AI_API_KEY` | vacía | Sin ella, los escenarios `@ai` se omiten con el motivo "AI_API_KEY no configurada" |
| `AI_MODEL` | vacía | Modelo de Claude; se definirá en la fase de IA |

Las variables del entorno del proceso tienen prioridad sobre `.env`. La configuración se valida con Zod al arrancar: un valor inválido (por ejemplo `TEST_ENV=foo`) detiene la ejecución con un mensaje que indica la variable y el problema.

## Proyectos y entornos

Son dos dimensiones independientes.

| Proyecto (`--project`) | Qué ejecuta |
|---|---|
| `setup` / `cleanup` | Crean y eliminan la cuenta de la sesión compartida (`.auth/`) para los escenarios `@shared-session`. Se ejecutan solos como dependencia de `functional` |
| `functional` | Todos los escenarios sin la etiqueta `@ai`. No usa Anthropic ni carga código de IA |
| `ai` | Solo los escenarios `@ai`. Sin reintentos, para que la variabilidad del modelo sea visible |

| Entorno (`TEST_ENV`) | Workers | Reintentos (`functional`) | `forbidOnly` |
|---|---|---|---|
| `local` | 2 | 0 | No |
| `ci` | 2 | 1 | Sí |

```bash
TEST_ENV=ci npm test              # PowerShell: $env:TEST_ENV='ci'; npm test
```

## Comandos

Los tests de Playwright se generan a partir de los `.feature` al cargar `playwright.config.ts`, así que todos los comandos de Playwright funcionan sin un paso previo.

| Comando | Qué hace |
|---|---|
| `npm test` (o `npx playwright test`) | Ejecuta todos los proyectos sin interfaz gráfica |
| `npm run test:functional` | Solo el proyecto `functional` |
| `npm run test:ai` | Solo el proyecto `ai` |
| `npm run test:headed` | `functional` con el navegador visible |
| `npm run test:ui` | Modo UI de Playwright |
| `npm run test:debug` | `functional` con el inspector de Playwright, en pausa |
| `npm run test:list` | Lista los tests descubiertos por proyecto |
| `npm run bddgen` | Solo genera los tests en `.features-gen/` |
| `npm run report` | Abre el último reporte HTML de Playwright |
| `npm run report:allure` | Genera el reporte de Allure en `allure-report/` |
| `npm run report:allure:open` | Sirve y abre el reporte de Allure |
| `npm run typecheck` | `tsc --noEmit` en modo estricto |
| `npm run lint` | ESLint con reglas basadas en tipos y de Playwright |
| `npm run format` / `npm run format:check` | Aplica o comprueba el formato de Prettier |
| `npm run validate` | Typecheck, lint, formato y descubrimiento de tests |

## Estructura

```
features/            escenarios Gherkin (.feature)
  auth/              registro y autenticación
  checkout/          checkout de un usuario anónimo
  ai/                verificación provisional del proyecto ai
steps/
  common/            step definitions de todos los proyectos
  ai/                step definitions que solo carga el proyecto ai
src/
  config/            entorno validado con Zod y nombres de proyecto
  data/              generación de datos sintéticos (Faker con semilla + Zod)
  fixtures/          test base: guards de red, Page Objects, contexto de escenario,
                     sesiones adicionales, datos sintéticos y ciclo de vida de cuentas
  pages/             Page Objects y componentes
  tasks/             objetivos de negocio que coordinan acciones
  questions/         consultas que convierten el estado de la página en datos tipados
  interactions/      operaciones transversales: sincronización HTTP, guards y campos secretos
  setup/             proyectos setup/cleanup de la sesión compartida
  support/           global setup (limpieza de resultados de Allure)
docs/                documentación del reto
playwright.config.ts
```

La estructura completa prevista (Page Objects, Tasks, Questions, Interactions, datos e IA) está en [docs/architecture.md](docs/architecture.md), sección 2.

## Reportes y evidencias

- **Playwright HTML Report:** `playwright-report/`, abierto con `npm run report`.
- **Allure:** `allure-results/` se vacía al inicio de cada ejecución; `npm run report:allure` genera `allure-report/`.
- **En fallos:** se conservan trace, captura de pantalla y video en `test-results/`.

> **Artefactos sensibles.** Las trazas de un test fallido contienen contraseñas sintéticas (instantáneas del DOM, parámetros de llamadas y cuerpos HTTP), y se copian al reporte HTML y al de Allure. Trata `test-results/`, `playwright-report/`, `allure-results/` y `allure-report/` como locales: están ignorados por Git, se reemplazan en cada ejecución y no deben publicarse. Para borrarlos tras revisar un fallo:
>
> ```bash
> rm -rf test-results playwright-report allure-results allure-report
> # PowerShell: Remove-Item -Recurse -Force test-results, playwright-report, allure-results, allure-report -ErrorAction SilentlyContinue
> ```
>
> Política completa en [docs/architecture.md](docs/architecture.md), sección 10.1.
- **Por escenario:** inventario de cuentas creadas con su estado de limpieza, perfiles sintéticos con la contraseña censurada y resumen de los guards de red.

## Desafíos de IA

El enunciado exige al menos dos de tres desafíos. Se seleccionaron:

| Opción | Desafío | Estado |
|---|---|---|
| B | Aserciones semánticas: `expectAI(actualText, expectedIntent)` | Planificada para la fase de IA |
| C | Generación de datos sintéticos con Anthropic, validados con Zod | Planificada para la fase de IA |
| A | Selectores auto-reparables (self-healing) | Opcional; fuera de la primera implementación |

La justificación está en [docs/requirements-analysis.md](docs/requirements-analysis.md), sección 4, y la estrategia de validación en [docs/test-strategy.md](docs/test-strategy.md), sección 7.

## Herramientas de apoyo

Claude Code se usó como asistente de ingeniería durante el análisis, la implementación, la revisión y la documentación. No forma parte del framework ni de su ejecución.
