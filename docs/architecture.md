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
| Questions | Derivan información del estado observable: convierten el texto de la página en datos tipados (filas del carrito, producto listado, precios) | No hacen aserciones, no navegan ni modifican estado: leen la página en la que ya está la sesión. Si hace falta abrir otra página, lo hace antes una Task o el paso de forma explícita. Si basta un localizador de un Page Object, no se crea Question (sería una capa que solo delega) |
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

`setup` y `cleanup` son tests de Playwright normales (`src/setup/`), no escenarios BDD. `functional` depende de `setup`, y `cleanup` es su teardown: se ejecuta al terminar aunque fallen los escenarios. `ai` no depende de ellos.

**Entornos (`TEST_ENV=local|ci`): cómo se ejecuta.**

| Parámetro | `local` | `ci` |
|---|---|---|
| Workers | 2 | 2 |
| Reintentos en `functional` | 0 | 1. Cada intento crea y limpia su propia cuenta |
| Reintentos en `ai` | 0 | 0, para que la variabilidad del modelo no quede oculta |
| `forbidOnly` | No | Sí |
| Navegador | Sin interfaz gráfica (headless) por defecto; con ventana opcional | Sin interfaz gráfica (headless) |

Si `TEST_ENV` no está definido, se usa `ci` cuando existe la variable `CI` y `local` en otro caso.

En ambos entornos se limitan los workers a 2: con 4 en paralelo la aplicación pública respondió 503 y "queue full". Cada test tiene un límite de 60 s, cada acción de 15 s y cada navegación de 30 s (`src/config/timeouts.ts`). Se aplican también a los contextos de `browserSessions`, que no heredan la configuración de `use`.

La configuración (`BASE_URL`, `AI_PROVIDER`, `AI_API_KEY`, `AI_MODEL` y los parámetros de entorno) se carga de `.env`, con `process.loadEnvFile` de Node, y del entorno del proceso, que tiene prioridad. Se valida con Zod al arrancar. Una configuración inválida detiene la ejecución con un error claro. `AI_PROVIDER` solo admite `anthropic`.

## 5. Fixtures y ciclo de vida

| Fixture | Alcance | Crea | Libera |
|---|---|---|---|
| Guards de red (`networkGuards`, automático) | Test | Instala los guards de la sección 7 en el contexto de navegador del test antes de cualquier navegación y anota en el reporte lo bloqueado | Playwright cierra el contexto |
| Page Objects (`app`) | Test | `App`: los Page Objects del escenario sobre su `page` | — |
| Contexto de escenario (`scenario`) | Test | `ScenarioContext` vacío | — |
| Contextos adicionales (`browserSessions`) | Test | `BrowserSessions.open()`: contexto nuevo con los mismos guards de red instalados antes de navegar y su propia `App`. Lo usan el login desde otra sesión y la limpieza | Cierra todos sus contextos |
| Datos sintéticos (`syntheticData`) | Test | Perfiles del generador local (sección 6). Adjunta al reporte la semilla y los perfiles con la contraseña censurada | — |
| Cuentas (`accounts`) | Test | `AccountLedger`: registra el ciclo de vida de cada cuenta que crea el test | Elimina y verifica cada cuenta (sección 6); adjunta el inventario |
| Sesión compartida | Proyectos `setup` / `cleanup` | Cuenta, credenciales de recuperación y `storageState` en `.auth/` (sección 6) | El proyecto `cleanup` elimina y verifica la cuenta; borra `.auth/` solo si lo consigue |
| `storageState` (sobrescrito) | Test | En escenarios `@shared-session`, la sesión de `.auth/shared-session.json`; en el resto, ninguna | — |
| `sharedAccount` | Test | Nombre y correo de la cuenta compartida (nunca la contraseña) | — |
| Cliente de IA | Test | Mock en `functional`; cliente de Anthropic real solo en `ai` | — |
| Evidencias | Test | Registro de peticiones clave, interacciones de IA e inventario de cuentas | Adjunta todo al reporte |

## 6. Aislamiento y autenticación

- El carrito vive en el servidor y está ligado a la cuenta ([test-strategy.md](test-strategy.md), sección 2). Por eso todo escenario que modifica la cuenta, la sesión o el carrito registra su propia cuenta y la gestiona con el fixture `accounts`.
- La sesión sobre la que actúan los pasos es la del test (`app`) salvo que un paso abra otra con `browserSessions` y la registre como `activeSession` en el contexto de escenario. No se sustituye `page` ni hay estado global.
- Los escenarios `@shared-session` reutilizan el `storageState` del proyecto `setup` (R-09). Solo pueden leer: un guard aborta las rutas que modifican estado, `/add_to_cart`, `/delete_cart` y `/delete_account`, que son peticiones GET, también en sus contextos adicionales. Si se intenta alguna, el test falla aunque sus aserciones hayan pasado.
- **Ciclo de vida de la sesión compartida (`src/setup/`):**
  1. `setup` se niega a empezar si ya hay una cuenta compartida pendiente de limpieza (nunca sobrescribe credenciales de recuperación).
  2. Guarda las credenciales en `.auth/shared-account.json` **antes** de enviar el registro (`creation_attempted`) y las actualiza tras crearla (`created`).
  3. Solo guarda `.auth/shared-session.json` después de confirmar "Logged in as {nombre}".
  4. Si algo falla, intenta limpiar lo creado con el mismo `AccountLedger`, conserva las credenciales con el último estado confirmado y relanza el error original.
  5. `cleanup` reconstruye el ledger desde ese estado, elimina y verifica la cuenta y adjunta el inventario. Solo borra `.auth/` si la cuenta queda `verified` (o `not_created`); si no, conserva los archivos con el último estado y falla indicando el correo.
- `.auth/` está ignorado por Git y contiene una contraseña sintética: es un artefacto local sensible (sección 10.1). Con `--repeat-each` el proyecto `setup` también se repetiría; la comprobación del punto 1 lo detiene en lugar de perder una cuenta.
- Las cuentas se crean y se eliminan **por la interfaz**, que es el mecanismo verificado durante el análisis. Las APIs `createAccount` y `deleteAccount` de la aplicación no se usan mientras no se verifiquen.
- **Ciclo de vida (`AccountLedger`).** Estados: `creation_attempted` (se registra **antes** de enviar el segundo paso del registro), `created` (el servidor respondió 302 a `/account_created`), `deletion_attempted`, `deleted`, `verified` (un login posterior fue rechazado), `not_created` y `cleanup_failed`.
- **Limpieza (teardown del fixture `accounts`, con semántica `finally`):**
  1. Se ejecuta aunque el escenario falle, con un margen de tiempo propio (90 s).
  2. En un contexto nuevo y protegido, inicia sesión con las credenciales sintéticas. Si el login se acepta, elimina la cuenta con "Delete Account" (`GET /delete_account` → 200) y espera "Account Deleted!".
  3. En otro contexto nuevo, intenta de nuevo el login: debe responder 200 (sin redirección) y mostrar "Your email or password is incorrect!". Solo entonces la cuenta pasa a `verified`.
  4. Un login rechazado **no** se interpreta como eliminación: si la cuenta constaba como creada, el estado es `cleanup_failed`; si solo constaba el intento de creación, es `not_created`.
  5. Adjunta el inventario (correo, nombre y estado; nunca la contraseña).
  6. Si el escenario falló, un fallo de limpieza se añade como anotación `cleanup-error` y **no sustituye** al error original. Si el escenario pasó, un fallo de limpieza **hace fallar** el test.
- **Datos sintéticos.** El perfil de registro se genera con Faker en una instancia propia con semilla y se valida con Zod (`RegistrationProfileSchema`) antes de entregarse.
  - Semilla = `TEST_RUN_ID` + `testId` + `retry` + `repeatEachIndex` + índice del dato dentro del test. La misma combinación produce el mismo perfil; cambiar cualquier componente produce otro.
  - `TEST_RUN_ID` lo fija `playwright.config.ts` una vez por ejecución (los workers lo heredan). Definirlo a mano reproduce los mismos datos.
  - Correo `qa.<huella de la semilla>@example.com`, en un dominio reservado. País siempre entre los 7 del formulario.
  - **La contraseña es la excepción al determinismo:** se genera con aleatoriedad criptográfica, para que la semilla pueda adjuntarse al reporte sin permitir reconstruir credenciales.

## 7. Guards de red y seguridad

Los instala el fixture automático `networkGuards` (`src/interactions/network-guards.ts`) en el contexto de cada test.

| Guard | Regla | Motivo |
|---|---|---|
| Pago | Todo `POST` a `/payment` del origen de la aplicación se aborta (`blockedbyclient`), en todos los proyectos y escenarios. No se puede desactivar. Las peticiones abortadas quedan registradas (`paymentRequests`) para que el escenario de pago las inspeccione. Otros métodos a `/payment` (el `GET` de la página) siguen su curso | Restricción de seguridad del proyecto. Si en el futuro se necesita un pago simulado, se resolverá en local desde este guard (`route.fulfill`), de modo que la petición siga sin salir del navegador |
| Anuncios | Se abortan las peticiones cuyo host es, o termina en, `googlesyndication.com`, `doubleclick.net`, `googleadservices.com`, `adtrafficquality.google` o `fundingchoicesmessages.google.com` | Los anuncios bloquean clics y cambian la URL a `#google_vignette`. Las redes publicitarias secundarias solo las cargan estos scripts, así que no necesitan regla propia |
| Telemetría | Se abortan `cloudflareinsights.com` y, en el origen de la aplicación, las rutas que empiezan por `/cdn-cgi/rum` | Ruido en la red y en la consola |
| Estado en sesión compartida | En `@shared-session` (contexto del test y contextos adicionales) se abortan `/add_to_cart`, `/delete_cart` y `/delete_account`; el intento queda registrado y el test falla. Verificado con una prueba negativa | Proteger la sesión compartida |

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
- **Contraseñas en reportes.** `locator.fill(valor)` aparece como `Fill "valor"` en el reporte HTML y en Allure. Los campos de contraseña se rellenan con la Interaction `fillSecret`, que aparece como `Evaluate` sin el valor. Verificado con una contraseña centinela: 0 apariciones en consola, `allure-results`, reporte HTML y adjuntos.

### 10.1 Política de trazas y artefactos sensibles

**Decisión aprobada:** se mantiene `trace: 'retain-on-failure'` en todos los escenarios, incluidos los que manejan credenciales, para cumplir R-10. Las trazas y los reportes que las contienen se tratan como **artefactos locales sensibles**.

**Qué contienen.** Las trazas de un test fallido incluyen contraseñas sintéticas en tres lugares, y Playwright no ofrece forma de censurarlos:

- Instantáneas del DOM (valor de los campos de contraseña).
- Parámetros de las llamadas (incluido el argumento de `fillSecret`).
- Cuerpos de las peticiones HTTP (`POST /signup`, `POST /login` y el `POST /payment` interceptado, que incluye el token CSRF de la página y los datos de la tarjeta sintética).

**Token CSRF del pago.** El adjunto `pago-interceptado.json` es una representación saneada: incluye método, URL, `Content-Type`, los campos de la tarjeta, `csrfTokenPresent` (true/false) y el resultado del aborto, **nunca el valor del token ni el cuerpo original**. Las aserciones comparan esa misma representación, de modo que un error tampoco puede mostrar el token. Verificado en la Fase 4 capturando el token real de la página: 0 apariciones en consola, `allure-results`, reporte HTML y adjuntos, tanto en una ejecución correcta como en una fallida; solo aparece dentro de las trazas de la ejecución fallida.

**Dónde aparecen.** Verificado con una contraseña centinela y un test fallido: la traza está en `test-results/` y se copia automáticamente a `playwright-report/data/` (reporte HTML) y a `allure-results/` (adjunto `application/vnd.allure.playwright-trace` de `allure-playwright`, sin opción para excluirlo); `npm run report:allure` la incluye en `allure-report/`. En archivos de texto plano, consola, títulos de pasos y adjuntos JSON hay 0 apariciones. Por tanto, **el reporte HTML y el reporte de Allure de una ejecución con fallos son tan sensibles como las trazas**.

**Publicación.** Hoy no existe ningún mecanismo que publique artefactos: no hay CI, y `test-results/`, `playwright-report/`, `allure-results/` y `allure-report/` están ignorados por Git (comprobado con `git check-ignore`; ninguno está versionado). Los comandos `report` y `report:allure:open` solo sirven los reportes en la máquina local. Condición para la fase de CI: ningún workflow podrá publicar trazas ni reportes HTML/Allure de ejecuciones con fallos como artefactos públicos sin retirar antes los adjuntos de traza.

**Retención y eliminación.** Cada artefacto vive hasta la siguiente ejecución:

| Directorio | Se elimina |
|---|---|
| `test-results/` | Playwright lo vacía al empezar cada ejecución |
| `playwright-report/` | Se reemplaza al terminar cada ejecución |
| `allure-results/` | Lo vacía el global setup al empezar cada ejecución |
| `allure-report/` | Se regenera con `--clean` en cada `npm run report:allure` |

Tras revisar un fallo, o antes de compartir la máquina o el directorio, se eliminan manualmente:

```bash
rm -rf test-results playwright-report allure-results allure-report
# PowerShell: Remove-Item -Recurse -Force test-results, playwright-report, allure-results, allure-report -ErrorAction SilentlyContinue
```

**Contraseñas.** Se generan con aleatoriedad criptográfica, una distinta por cuenta, y nunca se reutilizan ni se derivan de la semilla. No se escriben en consola, errores, títulos de pasos ni adjuntos.

**Limpieza fallida.** Si una cuenta termina en `cleanup_failed` (o queda en `creation_attempted` sin resolver), **no se asume que su credencial quedó invalidada**. El inventario registra el correo, el último estado alcanzado y el error, y el test falla si el escenario había pasado. La contraseña no se guarda en ningún sitio salvo, si el test falló, en su traza: en ese caso la traza es la única vía para completar la limpieza manualmente y debe eliminarse después.
