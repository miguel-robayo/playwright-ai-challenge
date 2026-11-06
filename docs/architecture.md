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
| Step Definitions | Traducen cada paso a llamadas a Tasks, Questions o, si la acción es atómica, directamente a un método de Page Object. Los pasos `Entonces` hacen las aserciones; un `Dado` solo comprueba que la preparación se cumplió | Sin localizadores ni lógica de negocio. Usan `page` solo para aserciones de navegación (`toHaveURL`) |
| Tasks | Objetivos de negocio que coordinan varias acciones: añadir un producto al carrito, registrar una cuenta, rellenar el pago, eliminar la cuenta | No hacen aserciones; las únicas esperas son las necesarias para completar la acción. No existen Tasks que envuelvan una sola acción |
| Questions | Derivan información del estado observable: convierten el texto de la página en datos tipados (filas del carrito, producto listado, precios) | No hacen aserciones. Si basta un localizador de un Page Object, no se crea Question (sería una capa que solo delega) |
| Interactions | Operaciones transversales que no pertenecen a una página: sincronización HTTP, guards de red y, más adelante, inyección de errores, variantes del DOM e interceptación del pago | Solo red y protocolo. Las acciones de interfaz son métodos de los Page Objects y no se duplican aquí |
| Page Objects | Localizadores y acciones atómicas de una página o componente (listado, carrito, modal "Added!"). Exponen como propiedades de solo lectura los localizadores que los pasos necesitan comprobar | No conocen Gherkin, ni datos de negocio, ni otras páginas. No hacen aserciones; solo esperan estados para completar una acción |
| Fixtures | Ciclo de vida: contextos con guards, cuentas, datos, cliente de IA, evidencias | Toda creación de recursos tiene su liberación |
| Aserciones y evidencias | `expect` sobre lo que devuelven las Questions o sobre la red; adjuntos a los reportes | Solo en pasos `Entonces` o en guards de seguridad |

**Screenplay sin abstracciones innecesarias.** Se adoptan Tasks, Questions e Interactions porque separan las acciones de las lecturas y hacen los pasos legibles. No se introducen `Actor` ni `Ability`: en una suite de un solo usuario por escenario, ese papel lo cumplen los fixtures de Playwright. Tasks y Questions son funciones que reciben los fixtures que necesitan, no jerarquías de clases.

**Convenciones para conservar el reintento automático de Playwright:**

- Cuando la respuesta es un **estado de interfaz** (un aviso visible, una fila presente), el paso comprueba un `Locator` del Page Object con `expect(...).toBeVisible()`, que reintenta solo.
- Cuando la respuesta es un **valor** derivado (contenido del carrito, precios), la Question devuelve datos tipados y el paso la consulta con `expect.poll(...)`, que también reintenta. Nunca se usan booleanos de `isVisible()` como oráculo.
- No se usan esperas fijas (`waitForTimeout`). Las acciones se sincronizan por respuesta HTTP (`performAndAwaitResponse`) o por estado de un elemento (`waitFor`).

**Contexto de escenario.** Los pasos de un escenario comparten datos mediante el fixture `scenario` (`ScenarioContext`): `remember(clave, valor)` y `recall(clave)` con claves y tipos declarados en la interfaz `ScenarioMemory`. `recall` falla con un mensaje claro si un paso anterior no registró el dato. Se crea una instancia por test, así que no hay estado compartido entre escenarios.

## 2. Estructura de directorios propuesta

Es la estructura objetivo. La foundation (Fase 2) creó `features/`, `steps/common`, `steps/ai`, `src/config`, `src/fixtures` y `src/support`. La Fase 3 añadió `src/pages` (con `app.ts` y `components/`), `src/tasks`, `src/questions` e `src/interactions`. El resto de carpetas se crean en la fase que las necesita. No hay carpeta `api/`: las APIs de la aplicación no están verificadas y ningún escenario las necesita.

```
features/              escenarios .feature por capacidad
steps/
  common/              step definitions de todos los proyectos
  ai/                  step definitions que solo carga el proyecto ai
src/
  config/              configuración de entorno validada con Zod y nombres de proyecto
  support/             global setup de la ejecución (limpieza de resultados de Allure)
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

- Cada proyecto se declara con `defineBddProject`, a partir de unas opciones comunes (rutas de features, idioma `es`, fallo en la generación si falta un paso). Cada proyecto define sus propios pasos y su expresión de etiquetas, y genera sus tests en `.features-gen/<proyecto>`. `playwright-bdd` genera los tests de Playwright a partir de los `.feature` (`bddgen`).
- `createBdd(test)` recibe el `test` extendido con los fixtures propios, de modo que los step definitions usan los mismos fixtures que un test de Playwright.
- Las etiquetas de Gherkin (`@ai`, `@mock`, `@shared-session`, `@security`…) se convierten en etiquetas de Playwright y se usan para filtrar proyectos y activar fixtures.
- `playwright.config.ts` ejecuta `bddgen` en el proceso principal antes de que Playwright busque los tests: no lo hace en los workers (`TEST_WORKER_INDEX`) ni durante el propio `bddgen` (`PLAYWRIGHT_BDD_GEN`). Así los comandos del enunciado (`npx playwright test`, `--ui`, `show-report`) funcionan sin un paso previo (Q-05). `npm run bddgen` queda disponible para generar sin ejecutar.
- Los step definitions de `steps/ai` solo forman parte del proyecto `ai`. Se verificó en la foundation que los workers de `functional` no los importan.

## 4. Proyectos y entornos

Son dos dimensiones independientes.

**Proyectos de Playwright (`--project`): qué se ejecuta.**

| Proyecto | Contenido | Dependencias |
|---|---|---|
| `setup` | Crea la cuenta de sesión compartida y guarda el `storageState` | — |
| `functional` | Todos los escenarios sin `@ai`, incluidos los `@mock` | `setup` |
| `ai` | Solo escenarios `@ai`; usan Anthropic real | — |
| `cleanup` | Elimina la cuenta de sesión compartida (teardown de `setup`) | — |

En la foundation solo existen `functional` y `ai`. `setup` y `cleanup`, y la dependencia de `functional` respecto de `setup`, se añaden en la fase de fixtures y ciclo de vida.

**Entornos (`TEST_ENV=local|ci`): cómo se ejecuta.**

| Parámetro | `local` | `ci` |
|---|---|---|
| Workers | Por defecto de Playwright | Limitados (2), por tratarse de una aplicación pública protegida por Cloudflare |
| Reintentos en `functional` | 0 | 1. Cada intento crea y limpia su propia cuenta |
| Reintentos en `ai` | 0 | 0, para que la variabilidad del modelo no quede oculta |
| `forbidOnly` | No | Sí |
| Navegador | Sin interfaz gráfica (headless) por defecto; con ventana opcional | Sin interfaz gráfica (headless) |

Si `TEST_ENV` no está definido, se usa `ci` cuando existe la variable `CI` y `local` en otro caso.

La configuración (`BASE_URL`, `AI_PROVIDER`, `AI_API_KEY`, `AI_MODEL` y los parámetros de entorno) se carga de `.env`, con `process.loadEnvFile` de Node, y del entorno del proceso, que tiene prioridad. Se valida con Zod al arrancar. Una configuración inválida detiene la ejecución con un error claro. `AI_PROVIDER` solo admite `anthropic`.

## 5. Fixtures y ciclo de vida

| Fixture | Alcance | Crea | Libera |
|---|---|---|---|
| Guards de red (`networkGuards`, automático) | Test | Instala los guards de la sección 7 en el contexto de navegador del test antes de cualquier navegación y anota en el reporte lo bloqueado | Playwright cierra el contexto |
| Page Objects (`app`) | Test | `App`: los Page Objects del escenario sobre su `page` | — |
| Contexto de escenario (`scenario`) | Test | `ScenarioContext` vacío | — |
| Contexto adicional protegido | Test | Contextos nuevos, como un login desde otra sesión, con los mismos guards. **Pendiente**: llega con la primera vertical que lo necesite | Cierra los contextos |
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

Los instala el fixture automático `networkGuards` (`src/interactions/network-guards.ts`) en el contexto de cada test.

| Guard | Regla | Motivo |
|---|---|---|
| Pago | Todo `POST` a `/payment` del origen de la aplicación se aborta (`blockedbyclient`), en todos los proyectos y escenarios. No se puede desactivar. Las peticiones abortadas quedan registradas (`paymentRequests`) para que el escenario de pago las inspeccione. Otros métodos a `/payment` (el `GET` de la página) siguen su curso | Restricción de seguridad del proyecto. Si en el futuro se necesita un pago simulado, se resolverá en local desde este guard (`route.fulfill`), de modo que la petición siga sin salir del navegador |
| Anuncios | Se abortan las peticiones cuyo host es, o termina en, `googlesyndication.com`, `doubleclick.net`, `googleadservices.com`, `adtrafficquality.google` o `fundingchoicesmessages.google.com` | Los anuncios bloquean clics y cambian la URL a `#google_vignette`. Las redes publicitarias secundarias solo las cargan estos scripts, así que no necesitan regla propia |
| Telemetría | Se abortan `cloudflareinsights.com` y, en el origen de la aplicación, las rutas que empiezan por `/cdn-cgi/rum` | Ruido en la red y en la consola |
| Estado en sesión compartida | En `@shared-session` se abortan `/add_to_cart`, `/delete_cart` y `/delete_account` y el escenario falla. **Pendiente**: llega con la sesión compartida | Proteger la sesión compartida |

Las reglas comparan host y ruta exactos, no subcadenas, así que no pueden bloquear recursos de la aplicación. En la verificación de la Fase 3 solo se bloquearon `pagead2.googlesyndication.com` y `static.cloudflareinsights.com`, y ninguna petición a `automationexercise.com` falló. Cada test anota en el reporte cuántas peticiones se bloquearon, en qué hosts, y cuántos `POST /payment` se abortaron.

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
- **Allure:** `allure-playwright` escribe `allure-results`. Un global setup vacía ese directorio al inicio de cada ejecución, porque el reporter no lo limpia y el reporte mezclaría ejecuciones. El reporte se genera con el CLI de Allure 3, que es un paquete de npm y no requiere Java. Además de los artefactos de Playwright, incluirá estos adjuntos, que se implementan en las fases siguientes:
  - Peticiones clave: `POST /signup` de los dos pasos, `GET /add_to_cart`, `POST /login` y el `POST /payment` interceptado, con la marca de aborto.
  - Interacciones de IA: prompt, respuesta sin procesar, resultado validado, modelo y latencia.
  - Semilla y datos sintéticos de cada escenario.
  - Inventario de cuentas creadas con su estado de limpieza.
- **Censura:** los adjuntos nunca incluyen cookies, tokens CSRF ni contraseñas. Los datos de tarjeta son sintéticos y se adjuntan para inspeccionar la petición interceptada.
