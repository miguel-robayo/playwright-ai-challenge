# Arquitectura del framework

Diseño técnico del framework. Los requisitos están en [requirements-analysis.md](requirements-analysis.md) y la estrategia de validación en [test-strategy.md](test-strategy.md).

## 1. Capas

```
Feature (.feature, Gherkin)
  → Step Definitions
    → Tasks · Questions · Interactions
      → Page Objects · Fixtures
  → Aserciones y evidencias (pasos Entonces)
```

| Capa | Responsabilidad | Límites |
|---|---|---|
| Feature | Comportamiento esperado en lenguaje de negocio, en español (`# language: es`) | Sin detalles técnicos: ni selectores, ni URLs internas, ni datos concretos |
| Step Definitions | Traducen cada paso a llamadas a Tasks, Questions o Interactions. Los pasos `Entonces` hacen las aserciones | Sin localizadores ni lógica de negocio. Un paso no llama directamente a Playwright |
| Tasks | Acciones de negocio compuestas: registrar una cuenta, añadir un producto al carrito, ir al checkout, rellenar el pago, eliminar la cuenta | No hacen aserciones; las únicas esperas son las necesarias para completar la acción |
| Questions | Leen el estado y devuelven datos tipados: filas del carrito, direcciones del checkout, total, usuario autenticado | No hacen aserciones. Devuelven datos y el paso decide |
| Interactions | Acciones técnicas que no pertenecen a una página: capturar el pago, inyectar errores, servir variantes del DOM, esperar respuestas | Solo red y protocolo. Las acciones de interfaz son métodos de los Page Objects |
| Page Objects | Localizadores y acciones atómicas de una página o componente (cabecera, modal del carrito) | No conocen Gherkin, ni datos de negocio, ni otras páginas |
| Fixtures | Ciclo de vida: contextos con guards, cuentas, datos, cliente de IA, evidencias | Toda creación de recursos tiene su liberación |
| Aserciones y evidencias | `expect` sobre lo que devuelven las Questions o sobre la red; adjuntos a los reportes | Solo en pasos `Entonces` o en guards de seguridad |

**Screenplay sin abstracciones innecesarias.** Se adoptan Tasks, Questions e Interactions porque separan las acciones de las lecturas y hacen los pasos legibles. No se introducen `Actor` ni `Ability`: en una suite de un solo usuario por escenario, ese papel lo cumplen los fixtures de Playwright. Tasks y Questions son funciones que reciben los fixtures que necesitan, no jerarquías de clases.

## 2. Estructura de directorios propuesta

Se confirmará al crear el esqueleto en la Fase 2.

```
features/              escenarios .feature por capacidad
steps/                 step definitions
src/
  config/              configuración de entorno validada con Zod
  fixtures/            test.extend: contextos, guards, cuentas, datos, IA, evidencias
  pages/               Page Objects
  tasks/               acciones de negocio
  questions/           lecturas de estado
  interactions/        red: pago, inyección de errores, variantes del DOM
  data/                generadores locales y esquemas Zod
  ai/                  cliente de IA (interfaz, Anthropic, mock), expectAI, generador con IA
  evidence/            adjuntos y censura de datos sensibles
playwright.config.ts
```

## 3. Playwright y playwright-bdd

- `defineBddConfig` declara las rutas de features y steps. `playwright-bdd` genera los tests de Playwright a partir de los `.feature` (`bddgen`).
- `createBdd(test)` recibe el `test` extendido con los fixtures propios, de modo que los step definitions usan los mismos fixtures que un test de Playwright.
- Las etiquetas de Gherkin (`@ai`, `@mock`, `@shared-session`, `@security`…) se convierten en etiquetas de Playwright y se usan para filtrar proyectos y activar fixtures.
- El paso de generación se integra en los scripts de npm. Así los comandos del enunciado (`npx playwright test`, `--ui`, `show-report`) siguen funcionando (Q-05).

## 4. Proyectos y entornos

Son dos dimensiones independientes.

**Proyectos de Playwright (`--project`): qué se ejecuta.**

| Proyecto | Contenido | Dependencias |
|---|---|---|
| `setup` | Crea la cuenta de sesión compartida y guarda el `storageState` | — |
| `functional` | Todos los escenarios sin `@ai`, incluidos los `@mock` | `setup` |
| `ai` | Solo escenarios `@ai`; usan Anthropic real | — |
| `cleanup` | Elimina la cuenta de sesión compartida (teardown de `setup`) | — |

**Entornos (`TEST_ENV=local|ci`): cómo se ejecuta.**

| Parámetro | `local` | `ci` |
|---|---|---|
| Workers | Por defecto | Limitados (2), por tratarse de una aplicación pública protegida por Cloudflare |
| Reintentos en `functional` | 0 | 1. Cada intento crea y limpia su propia cuenta |
| Reintentos en `ai` | 0 | 0, para que la variabilidad del modelo no quede oculta |
| `forbidOnly` | No | Sí |
| Navegador | Sin interfaz gráfica (headless) por defecto; con ventana opcional | Sin interfaz gráfica (headless) |

La configuración (`BASE_URL`, `AI_PROVIDER`, `AI_API_KEY`, `AI_MODEL` y los parámetros de entorno) se carga del entorno y se valida con Zod al arrancar. Una configuración inválida detiene la ejecución con un error claro. `AI_PROVIDER` solo admite `anthropic`.

## 5. Fixtures y ciclo de vida

| Fixture | Alcance | Crea | Libera |
|---|---|---|---|
| Contexto protegido | Test | Contexto de navegador con los guards de red (sección 7). Los contextos adicionales, como un login desde una sesión nueva, se crean también con este fixture | Cierra los contextos |
| Datos sintéticos | Test | Perfil y tarjeta del generador local con una semilla derivada del ID de ejecución y del escenario; la semilla se adjunta | — |
| Cuenta aislada | Test | Registro por interfaz con los datos sintéticos | Elimina la cuenta y la verifica (sección 6) |
| Sesión compartida | Proyecto `setup` | Cuenta y `storageState` para escenarios `@shared-session` | Proyecto `cleanup` |
| Cliente de IA | Test | Mock en `functional`; cliente de Anthropic real solo en `ai` | — |
| Evidencias | Test | Registro de peticiones clave, interacciones de IA e inventario de cuentas | Adjunta todo al reporte |

## 6. Aislamiento y autenticación

- El carrito vive en el servidor y está ligado a la cuenta ([test-strategy.md](test-strategy.md), sección 2). Por eso todo escenario que modifica la cuenta, la sesión o el carrito usa el fixture **Cuenta aislada**.
- Los escenarios `@shared-session` reutilizan el `storageState` del proyecto `setup` (R-09). Solo pueden leer: un guard aborta las rutas que modifican estado, `/add_to_cart`, `/delete_cart` y `/delete_account`, que son peticiones GET, y si se intenta alguna el escenario falla.
- Las cuentas se crean y se eliminan **por la interfaz**, que es el mecanismo verificado durante el análisis. Las APIs `createAccount` y `deleteAccount` de la aplicación no se usan mientras no se verifiquen.
- **Limpieza (teardown del fixture, con semántica `finally`):**
  1. Se ejecuta aunque el escenario falle.
  2. Abre `/delete_account` con la sesión de la cuenta y espera "Account Deleted!" visible.
  3. En un contexto nuevo, intenta el login con las mismas credenciales y espera "Your email or password is incorrect!".
  4. Registra el resultado en el inventario de cuentas. Un fallo de limpieza se informa como advertencia y no sustituye al error original del escenario.

## 7. Guards de red y seguridad

Se aplican en cada contexto creado por el fixture de contexto protegido.

| Guard | Regla | Motivo |
|---|---|---|
| Pago | Todo `POST` a `/payment` se aborta, en todos los proyectos y escenarios. No se puede desactivar. El escenario de pago puede observar la petición antes del aborto | Restricción de seguridad del proyecto |
| Anuncios y telemetría | Se abortan las peticiones a los dominios de una lista documentada (AdSense, DoubleClick, Funding Choices, adtech y telemetría) | Los anuncios bloquean clics y cambian la URL a `#google_vignette` |
| Estado en sesión compartida | En `@shared-session` se abortan `/add_to_cart`, `/delete_cart` y `/delete_account` y el escenario falla | Proteger la sesión compartida |

El cliente de Anthropic se ejecuta en Node, no en el navegador, por lo que `page.route` no lo intercepta. Su aislamiento se garantiza en el fixture del cliente de IA (sección 8).

## 8. Integración de IA

```
src/ai/
  AiClient           interfaz: envía una petición y devuelve el contenido de la respuesta
  AnthropicClient    implementación real con el SDK de Anthropic
  MockAiClient       respuestas programadas: válida, JSON inválido, esquema incorrecto, timeout, error HTTP
  expectAI           Opción B: prompt, llamada, validación con Zod, umbral, evidencia y resultado
  profileGenerator   Opción C: prompt, llamada, Zod, reglas de negocio y perfil sin correo ni tarjeta
  schemas            esquemas Zod de las respuestas
```

- El fixture del cliente de IA entrega `MockAiClient` en `functional` y `AnthropicClient` en `ai`. Pedir el cliente real fuera del proyecto `ai` es un error de configuración.
- Sin `AI_API_KEY`, los escenarios `@ai` se omiten con el motivo "AI_API_KEY no configurada" visible en los reportes.
- `expectAI` y `profileGenerator` dependen solo de la interfaz `AiClient`. Por eso el mismo código se prueba con mocks y se usa con el proveedor real.
- El texto que se evalúa se envía como dato delimitado dentro del prompt, nunca como instrucción.
- Al LLM solo se envían datos sintéticos o textos de la aplicación; nunca credenciales, cookies ni datos de tarjeta.
- **Selectores auto-reparables (Opción A, self-healing):** no forma parte de la primera implementación. Si se incorpora, será un envoltorio opcional de la resolución de localizadores de los Page Objects con estos controles:
  - Desactivado por defecto.
  - Solo para interacciones, nunca para aserciones.
  - El selector propuesto debe coincidir con un único elemento visible.
  - Cada reparación se registra y el escenario queda marcado como `healed`.
  - Existe un modo *fail-on-heal* que hace fallar el escenario si hubo reparación.

## 9. Política de localizadores

1. `getByRole` con nombre accesible.
2. `getByTestId` sobre `data-qa`, con `testIdAttribute: 'data-qa'`. Existe en login, registro, checkout y pago.
3. `getByPlaceholder`, siempre acotado a su formulario: "Email Address" aparece en tres formularios.
4. CSS acotado a un contenedor (`.productinfo`, `#cartModal`) como último recurso. "Add to cart" aparece 68 veces en `/products`.
5. XPath solo con justificación escrita.

`getByLabel` no sirve en esta aplicación porque los `<label>` no están asociados a sus campos (KD-06). Los localizadores solo existen en los Page Objects.

## 10. Reportes y evidencias

- **Playwright:** `trace: 'retain-on-failure'`, `screenshot: 'only-on-failure'`, `video: 'retain-on-failure'`, reporte HTML.
- **Allure:** los mismos artefactos y estos adjuntos:
  - Peticiones clave: `POST /signup` de los dos pasos, `GET /add_to_cart`, `POST /login` y el `POST /payment` interceptado, con la marca de aborto.
  - Interacciones de IA: prompt, respuesta sin procesar, resultado validado, modelo y latencia.
  - Semilla y datos sintéticos de cada escenario.
  - Inventario de cuentas creadas con su estado de limpieza.
- **Censura:** los adjuntos nunca incluyen cookies, tokens CSRF ni contraseñas. Los datos de tarjeta son sintéticos y se adjuntan para inspeccionar la petición interceptada.
