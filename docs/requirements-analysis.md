# Análisis de requisitos

Fuente principal: el enunciado del reto, `prueba_t_cnica_playwright_e_ia.md`. Las referencias "§" remiten a sus secciones.

Documentos relacionados:

- [architecture.md](architecture.md): cómo se construye el framework.
- [test-strategy.md](test-strategy.md): qué se prueba y cómo se valida.
- [known-defects.md](known-defects.md): comportamientos de la aplicación detectados durante el análisis.

## 1. Contexto y decisiones de base

| Tema | Decisión | Base |
|---|---|---|
| Aplicación bajo prueba | Automation Exercise (`https://automationexercise.com`) | §1 ofrece SauceDemo, Automation Exercise o Restful-Booker |
| Lenguaje y runner | TypeScript con Playwright Test | §2 y §4 |
| Especificación ejecutable | Gherkin con `playwright-bdd` | Decisión del proyecto |
| Validación de esquemas | Zod | Decisión del proyecto |
| Proveedor de IA | Anthropic | §3 permite OpenAI, Anthropic o un modelo local |
| Reportes | Playwright HTML Report y Allure | §2 y Entregables |

**Ambigüedad resuelta.** El encabezado del enunciado pide Java 21, JUnit/TestNG y Maven/Gradle, y los Entregables mencionan "Java 21, Maven" como prerrequisitos. En cambio, §2 exige TypeScript y §4 da todos los comandos con `npm` y `npx`. La decisión definitiva es **TypeScript**, alineada con los requisitos técnicos detallados.

## 2. Requisitos del enunciado

Estado de cobertura: **Cubierto**, **Parcial** (con justificación en la sección 5), **Opcional** (el enunciado lo ofrece como alternativa) o **Entregable** (se verifica en la entrega, no con tests).

| ID | Requisito | Fuente | Cobertura |
|---|---|---|---|
| R-01 | Usar una de las aplicaciones propuestas | §1 | Cubierto: Automation Exercise |
| R-02 | Automatizar un flujo completo de compra de principio a fin | §1 | **Parcial**: hasta la interceptación del pago |
| R-03 | Superar cambios deliberados en los selectores del DOM | §1, obstáculo 1 | Cubierto |
| R-04 | Validar textos que varían manteniendo una intención o un sentimiento | §1, obstáculo 2 | Cubierto (Opción B) |
| R-05 | Generar en tiempo real datos sintéticos válidos para registro o pago, sin valores *hardcoded* | §1, obstáculo 3 | Cubierto |
| R-06 | Proyecto en TypeScript | §2 | Cubierto |
| R-07 | Custom fixtures que extiendan `test` | §2 | Cubierto |
| R-08 | Interceptación de red: capturar y modificar respuestas, simular respuestas, inyectar errores | §2 | Cubierto |
| R-09 | Global setup/teardown con `storageState.json` para omitir logins repetidos | §2 | Cubierto |
| R-10 | `trace: 'retain-on-failure'` | §2 | Cubierto |
| R-11 | `screenshot: 'only-on-failure'` | §2 | Cubierto |
| R-12 | `video: 'retain-on-failure'` | §2 | Cubierto |
| R-13 | Reporte HTML detallado | §2 | Cubierto |
| R-14 | Integrar la API de un LLM mediante REST o SDK | §3 | Cubierto: Anthropic |
| R-15 | Resolver al menos dos de las opciones A, B y C | §3 | Cubierto: B y C |
| R-16 | Opción A: selectores auto-reparables | §3 | **Opcional**: fuera de la primera implementación |
| R-17 | Opción B: `expectAI(actualText, expectedIntent)` | §3 | Cubierto |
| R-18 | Opción C: utilidad de IA que genere datos válidos y no deterministas | §3 | Cubierto |
| R-19 | Node.js 18 LTS o superior | §4 | Cubierto: el proyecto exige Node ≥ 22.18 (`.nvmrc` 22.23.2), que cumple el mínimo del enunciado. Lo imponen ESLint 10 y el CLI de Allure 3 |
| R-20 | Gestor de paquetes npm, pnpm o yarn | §4 | Cubierto: npm |
| R-21 | Comandos operativos: `npm install`, `npx playwright install --with-deps`, `npx playwright test`, `--ui`, `show-report` | §4 | Cubierto: los comandos funcionan sin pasos previos (Q-05) |
| R-22 | `.env.example` con `AI_PROVIDER`, `AI_API_KEY`, `AI_MODEL` y `BASE_URL`, sin secretos | §4, Entregables | Cubierto |
| R-23 | El proyecto se llama `playwright-ai-challenge` | §4 | Entregable |
| R-24 | Repositorio público con historial de commits limpio | Entregables | Entregable |
| R-25 | Reporte de ejecución (Allure u otro) con peticiones y respuestas adjuntas | Entregables | Cubierto |
| R-26 | README con prerrequisitos, comandos por entorno, `.env.example` documentado y resumen de las opciones de IA | Entregables | Entregable (Fase 2) |

## 3. Obstáculos del reto

| Obstáculo (§1) | Situación en Automation Exercise | Cómo se aborda |
|---|---|---|
| 1. Cambios deliberados en los selectores | La aplicación no cambia sus selectores. Hay que simular los cambios | Política de localizadores basada en contratos estables (rol, nombre accesible, `data-qa`) y pruebas con variantes del DOM servidas mediante `route.fulfill`. Unas variantes deben tolerarse y otras deben fallar de forma explícita. La Opción A sería una capa adicional opcional |
| 2. Texto variable con intención constante | No hay contenido dinámico natural: descripciones, mensajes y productos son estáticos | Opción B sobre texto real de la interfaz y sobre **contenido controlado**, inyectado con `route.fulfill` y etiquetado como simulación |
| 3. Datos sintéticos en tiempo real sin valores *hardcoded* | Registro con 12 campos de cuenta y dirección; pago con 5 campos sin validación de formato | Generador local con semilla por ejecución para la suite funcional, y Opción C para generar perfiles con IA. Los dos se validan con el mismo esquema Zod |

## 4. Desafíos de IA seleccionados

El enunciado exige al menos dos de las tres opciones (R-15). Las tres se evaluaron con los mismos criterios:

| Criterio | A. Selectores auto-reparables | B. Aserciones semánticas | C. Datos sintéticos |
|---|---|---|---|
| Valor funcional | Medio: la aplicación no cambia sus selectores, así que solo actúa sobre roturas simuladas | Alto: es la única forma de cubrir el obstáculo 2 | Alto: alimenta el registro real y cubre el obstáculo 3 |
| Testabilidad | Baja: una reparación correcta es difícil de distinguir de una que oculta un defecto | Alta: hay casos que deben pasar y casos que deben fallar | Alta: esquema Zod, reglas de negocio y uso real en el registro |
| Reproducibilidad | Baja: el selector propuesto puede variar entre ejecuciones | Media: temperatura baja, salida estructurada y umbral de confianza | Media: la salida varía por diseño ("no deterministas"), pero se adjunta y se valida |
| Manejo de errores | Complejo: el fallo ocurre en mitad de una interacción | Simple: cualquier error del proveedor hace fallar la aserción | Simple: una respuesta inválida se rechaza |
| Control de falsos positivos | Débil: puede convertir una regresión real en un pase | Fuerte: casos negativos y de inyección de prompt obligatorios | Fuerte: los datos se verifican después con aserciones deterministas en la aplicación |

**Selección:**

- **B y C**, que cumplen R-15 con mejor testabilidad y control de falsos positivos.
- **A queda opcional** y fuera de la primera implementación. El obstáculo 1 se cubre igualmente con la estrategia determinista descrita en la sección 3.

## 5. Requisitos cubiertos parcialmente

**R-02, flujo completo de compra.** El flujo se automatiza de principio a fin hasta el envío del pago. El `POST /payment` se captura, se inspecciona y **se aborta antes de llegar al servidor**, de modo que no se valida ninguna compra ni confirmación de pedido.

Justificación:

- Es una restricción de seguridad del proyecto: no se envían datos de pago a un sistema externo, aunque sean sintéticos.
- No es una simplificación. El único indicador de compra en la página, `#success_message`, se muestra en el cliente al enviar el formulario, sin esperar respuesta del servidor, por lo que no serviría como prueba de una compra (KD-09 en [known-defects.md](known-defects.md)).

Queda abierta la pregunta Q-01.

**R-16, Opción A.** El enunciado la ofrece como una de tres alternativas. No implementarla no incumple R-15.

## 6. Trazabilidad

Los escenarios están definidos en [test-strategy.md](test-strategy.md).

| Requisito | Escenarios | Evidencia esperada |
|---|---|---|
| R-01, R-02 | Registrar una cuenta sintética en dos pasos · La cuenta creada inicia sesión desde una sesión nueva · El detalle del producto coincide con el listado · Añadir productos y verificar los totales por fila · Añadir de nuevo el mismo producto incrementa su cantidad · El carrito persiste en la cuenta · El checkout muestra las direcciones del registro y el total · Se pide a un usuario anónimo que se registre o inicie sesión · Los campos de pago vacíos bloquean el envío · La petición de pago se captura, se inspecciona y se aborta · La cuenta se elimina y ya no puede iniciar sesión | Respuestas HTTP, navegación, elementos visibles y petición de pago interceptada |
| R-03 | Los localizadores toleran cambios cosméticos del DOM · Los localizadores fallan de forma explícita cuando se elimina su contrato | Variante aplicada y resultado esperado (éxito o `TimeoutError`) |
| R-04, R-17 | Una redacción equivalente cumple la intención esperada · Una redacción contraria, neutra o manipuladora no cumple la intención esperada · Registrarse con un perfil generado por IA | Veredicto estructurado, umbral y adjuntos de la interacción |
| R-05 | Registrar una cuenta sintética en dos pasos · La petición de pago se captura, se inspecciona y se aborta | Semilla y datos generados adjuntos; validación Zod |
| R-07 | Todos (fixtures de cuenta, guards, datos, IA y evidencias) | Uso de los fixtures en los step definitions |
| R-08 | Una petición fallida de añadir al carrito no muestra confirmación · La petición de pago se captura, se inspecciona y se aborta · Resiliencia de localizadores · Aserciones semánticas | Respuesta simulada, petición capturada o abortada y variantes servidas |
| R-09 | La sesión compartida se reutiliza sin iniciar sesión · El detalle del producto coincide con el listado | Ningún login por interfaz en esos escenarios |
| R-10 a R-13 | Configuración de Playwright | Trace, captura y video en fallos; reporte HTML |
| R-14, R-15, R-18 | El perfil generado es válido para el registro · Registrarse con un perfil generado por IA · Los errores del proveedor nunca producen una aserción semántica superada · Los perfiles generados inválidos se rechazan | Respuesta validada con Zod, uso real en la aplicación y fallos explícitos con mocks |
| R-19 a R-22 | Configuración y `.env.example` | Ejecución desde un clon limpio; configuración validada con Zod |
| R-23, R-24, R-26 | — | Revisión del entregable |
| R-25 | Todos | Adjuntos de Allure: peticiones clave e interacciones de IA |

## 7. Ambigüedades y pendientes del enunciado

| ID | Pregunta | Tratamiento actual |
|---|---|---|
| Q-01 | ¿Se acepta un flujo que termina en la interceptación del pago, sin compra real? | Se documenta como cobertura parcial de R-02 (sección 5) |
| Q-02 | ¿Los "cambios deliberados en los selectores" los introduce el candidato o el evaluador? | Los simulamos nosotros con variantes del DOM |
| Q-03 | ¿Se acepta contenido controlado para la Opción B, dado que la aplicación no tiene textos variables? | Se usa y se etiqueta como simulación |
| Q-04 | ¿Qué significa "comandos por entorno"? | Entornos `local` y `ci` ([architecture.md](architecture.md)) |
| Q-05 | `npx playwright test` debe funcionar directamente, pero `playwright-bdd` necesita generar antes los tests (`bddgen`) | Resuelta: `playwright.config.ts` ejecuta `bddgen` antes del descubrimiento de tests ([architecture.md](architecture.md), sección 3) |
| Q-06 | Los Entregables piden Allure; el CLI clásico de Allure necesita Java | Resuelta: se usa el CLI de Allure 3, distribuido por npm, que no requiere Java. Su prerrequisito real es Node ≥ 22.18 |
| Q-07 | El ejemplo de `.env` usa OpenAI, `gpt-4o-mini` y SauceDemo | Se adapta a Anthropic, un modelo Claude configurable y Automation Exercise |
| Q-08 | No se documenta qué debe hacer la interfaz ante un error de red | Solo se verifica lo observable: la confirmación no aparece |
| Q-09 | El enunciado no exige integración continua | Se considerará opcional en la Fase 2 |

## 8. Restricciones propias del proyecto

No proceden del enunciado. Son decisiones de seguridad y calidad del proyecto, obligatorias dentro de él:

- El `POST /payment` se intercepta y se aborta siempre. No se envían datos de tarjeta a ningún servidor ni a un proveedor de pagos.
- Solo se usan datos sintéticos: nombres ficticios, correos en `example.com` y tarjetas generadas que fallan la comprobación de Luhn.
- Toda cuenta creada se elimina al terminar, con verificación.
- Los anuncios y la telemetría de terceros se bloquean durante las pruebas.
- La regresión funcional no depende de Anthropic.
