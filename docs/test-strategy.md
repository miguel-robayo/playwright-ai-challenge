# Estrategia de pruebas

Qué se prueba en [Automation Exercise](https://automationexercise.com) y cómo se valida.

Documentos relacionados:

- [requirements-analysis.md](requirements-analysis.md): requisitos y trazabilidad.
- [architecture.md](architecture.md): capas, fixtures, proyectos y guards.
- [known-defects.md](known-defects.md): defectos de la aplicación.

## 1. Alcance

Flujo principal:

1. Acceder a Automation Exercise.
2. Registrar una cuenta sintética en dos pasos.
3. Verificar el registro y la autenticación.
4. Navegar por productos y detalles.
5. Agregar productos al carrito.
6. Verificar cantidades y totales por producto.
7. Comprobar la persistencia del carrito.
8. Acceder al checkout.
9. Verificar las direcciones de entrega y facturación.
10. Verificar el total del checkout.
11. Completar los campos de pago con datos sintéticos.
12. Interceptar el `POST /payment`.
13. Inspeccionar la petición.
14. Abortarla antes de que llegue al servidor.
15. Eliminar la cuenta.
16. Verificar que la cuenta ya no existe.

> **Límite del alcance.** El flujo termina en la interceptación del pago. **No valida una compra, una transacción ni una confirmación de pedido en el servidor**, porque la petición nunca llega a él. Ningún escenario, reporte o documento debe afirmar lo contrario. La justificación está en [requirements-analysis.md](requirements-analysis.md), sección 5.

**Fuera de alcance:** confirmación del pedido, descarga de la factura, validación del pago en el servidor, reseñas, suscripción y formulario de contacto.

## 2. Comportamiento de la aplicación relevante para las pruebas

Observado durante el análisis, en una exploración con navegador real y una ejecución controlada con una cuenta sintética que después se eliminó. Condiciona el diseño de los escenarios:

- **Registro:** tiene dos pasos. En el segundo, el nombre y el correo vienen rellenados y el correo está deshabilitado. El país admite 7 opciones: India, United States, Canada, Australia, Israel, New Zealand y Singapore.
- **Carrito:**
  - Añadir un producto es `GET /add_to_cart/{id}[?quantity=N]`, que responde 200 con `"Added To Cart"`.
  - Añadir el mismo producto otra vez suma la cantidad.
  - El carrito vive en el servidor, ligado a la cuenta, y persiste entre recargas y contextos nuevos.
  - `/view_cart` no muestra un total global; solo `/checkout` muestra "Total Amount".
- **Checkout:**
  - Las direcciones de entrega y de facturación son idénticas, salen del registro y no se pueden editar.
  - El comentario del pedido no se envía (KD-05).
  - Desde el carrito, un usuario anónimo ve un aviso de "Register / Login"; sin embargo, `/checkout` y `/payment` responden también sin sesión (KD-01).
- **Pago:**
  - Los 5 campos son `required` y no tienen validación de formato (KD-04).
  - El mensaje "Your order has been placed successfully!" se muestra al enviar el formulario, sin esperar al servidor (KD-09).
- **Mensajes:** los de éxito (pedido, reseña, suscripción, "Added!") ya están en el HTML, ocultos.
- **Validación nativa:** el texto del mensaje del navegador depende del idioma del sistema operativo.
- **Anuncios:** los de terceros bloquean clics. Con sus dominios bloqueados, la navegación es estable.

## 3. Escenarios

Escenarios en español, ejecutables con `playwright-bdd` mediante la directiva `# language: es` de Gherkin. Los textos de la aplicación (por ejemplo "Account Created!") se mantienen en su idioma original porque son los que se comprueban. Etiquetas usadas:

| Etiqueta | Significado |
|---|---|
| `@shared-session` | Usa la sesión compartida; solo lectura |
| `@negative` | Escenario negativo |
| `@network` | Red simulada o interceptada |
| `@resilience` | Variantes del DOM |
| `@security` | Interceptación del pago |
| `@ai` | Usa Anthropic real; proyecto `ai` |

Las etiquetas son identificadores técnicos que usa la configuración de Playwright para filtrar proyectos y activar fixtures; por eso conservan su forma original.

### 3.1 Funcionales

```gherkin
# language: es
Característica: Registro y autenticación
  Escenario: Registrar una cuenta sintética en dos pasos
    Dado un perfil de usuario sintético único
    Cuando el usuario inicia el registro con nombre y correo
    Entonces se muestra el formulario de información de la cuenta con el nombre y el correo rellenados
    Cuando el usuario completa los campos obligatorios de la cuenta y la dirección
    Entonces la cuenta queda creada
    Cuando el usuario continúa desde la confirmación
    Entonces el usuario ha iniciado sesión con el nombre generado

  Escenario: La cuenta creada inicia sesión desde una sesión nueva
    Dado una cuenta sintética registrada
    Cuando el usuario inicia sesión desde un contexto de navegador nuevo
    Entonces el usuario ha iniciado sesión con el nombre generado

  @shared-session
  Escenario: La sesión compartida se reutiliza sin iniciar sesión
    Dado la sesión autenticada compartida
    Cuando el usuario abre la página de inicio
    Entonces el usuario está autenticado sin enviar el formulario de login
```

```gherkin
# language: es
Característica: Productos y carrito
  @shared-session
  Escenario: El detalle del producto coincide con el listado
    Dado la sesión autenticada compartida
    Cuando el usuario abre el detalle de un producto desde el listado
    Entonces el nombre y el precio coinciden con la tarjeta del listado

  Escenario: Añadir productos y verificar los totales por fila
    Dado un usuario autenticado con una cuenta aislada
    Cuando el usuario añade un producto desde el listado
    Entonces la petición de añadir al carrito es correcta
    Y la confirmación de producto añadido es visible
    Cuando el usuario añade otro producto con cantidad 3 desde su página de detalle
    Entonces el total de cada fila del carrito es el precio multiplicado por la cantidad

  Escenario: Añadir de nuevo el mismo producto incrementa su cantidad
    Dado un usuario autenticado con una cuenta aislada
    Cuando el usuario añade dos veces el mismo producto
    Entonces el carrito contiene una sola fila de ese producto con cantidad 2

  Escenario: El carrito persiste en la cuenta
    Dado un usuario autenticado con productos en el carrito
    Cuando el usuario navega a otra página y recarga el carrito
    Entonces las filas del carrito no cambian
    Cuando el usuario inicia sesión con la misma cuenta desde un contexto de navegador nuevo
    Entonces las filas del carrito no cambian
```

```gherkin
# language: es
Característica: Checkout
  Escenario: El checkout muestra las direcciones del registro y el total
    Dado un usuario autenticado con productos en el carrito
    Cuando el usuario continúa al checkout
    Entonces las direcciones de entrega y facturación coinciden con los datos del registro
    Y el importe total es la suma de los totales de las filas del carrito

  @negative
  Escenario: Se pide a un usuario anónimo que se registre o inicie sesión
    Dado un usuario anónimo con un producto en el carrito
    Cuando el usuario continúa al checkout
    Entonces se muestra un aviso para registrarse o iniciar sesión y el usuario permanece en el carrito
```

```gherkin
# language: es
@security
Característica: Interceptación segura del pago
  Antecedentes:
    Dado un usuario autenticado en la página de pago

  @negative
  Escenario: Los campos de pago vacíos bloquean el envío
    Cuando el usuario envía el formulario de pago sin datos
    Entonces todos los campos de pago indican que falta un valor
    Y no se envía ninguna petición de pago

  Escenario: La petición de pago se captura, se inspecciona y se aborta
    Cuando el usuario envía el formulario de pago con datos de tarjeta sintéticos
    Entonces se intercepta exactamente una petición POST de pago
    Y contiene los campos de pago introducidos y un token CSRF
    Y la petición se aborta antes de llegar al servidor
```

```gherkin
# language: es
Característica: Limpieza de la cuenta
  Escenario: La cuenta se elimina y ya no puede iniciar sesión
    Dado un usuario autenticado con una cuenta aislada
    Cuando el usuario elimina la cuenta
    Entonces la confirmación de cuenta eliminada es visible
    Y el inicio de sesión con las mismas credenciales falla
```

```gherkin
# language: es
@network
Característica: Manejo de errores de red
  Escenario: Una petición fallida de añadir al carrito no muestra confirmación
    Dado un usuario anónimo en la página de productos
    Y el endpoint de añadir al carrito responde con un error del servidor
    Cuando el usuario añade un producto al carrito
    Entonces la confirmación de producto añadido no se muestra
```

```gherkin
# language: es
@resilience
Característica: Resiliencia de localizadores
  Escenario: Los localizadores toleran cambios cosméticos del DOM
    Dado la página de login servida con ids, clases y contenedores modificados
    Cuando el usuario rellena el formulario de login
    Entonces la interacción se completa

  Escenario: Los localizadores fallan de forma explícita cuando se elimina su contrato
    Dado la página de login servida sin atributos data-qa y con los botones renombrados
    Cuando el usuario intenta rellenar el formulario de login
    Entonces el paso falla por timeout del localizador
```

### 3.2 IA

Escenarios reales contra Anthropic (proyecto `ai`, etiqueta `@ai`; se omiten sin `ANTHROPIC_API_KEY`). El texto evaluado es el **texto real** de la aplicación, no contenido inyectado.

```gherkin
# language: es
@ai
Característica: Aserciones semánticas con IA
  Escenario: El aviso de checkout cumple la intención esperada
    Dado un usuario anónimo con un producto en el carrito
    Cuando el usuario continúa al checkout
    Entonces el aviso de checkout cumple la intención "pide al usuario registrarse o iniciar sesión para poder continuar con la compra"

  Escenario: El aviso de checkout no cumple una intención contraria
    Dado un usuario anónimo con un producto en el carrito
    Cuando el usuario continúa al checkout
    Entonces el aviso de checkout no cumple la intención "confirma que el pedido se ha realizado correctamente"
```

```gherkin
# language: es
@ai
Característica: Datos sintéticos generados con IA
  Escenario: Registrarse con un perfil generado por IA
    Dado un perfil de usuario generado por IA y validado
    Cuando el usuario inicia el registro con nombre y correo
    Entonces se muestra el formulario de información de la cuenta con el nombre y el correo rellenados
    Cuando el usuario completa los campos obligatorios de la cuenta y la dirección
    Entonces la cuenta queda creada

  @negative
  Escenario: Un perfil de IA para un país no admitido se rechaza
    Cuando se solicita a la IA un perfil para el país "Germany"
    Entonces el perfil se rechaza por las reglas de negocio
```

Las respuestas simuladas del proveedor (errores, salidas inválidas, reglas de negocio) se prueban sin red ni clave en el proyecto `ai-unit` (`tests/ai-unit/ai.spec.ts`), sobre el cliente real con un transporte HTTP falso (sección 7).

## 4. Oráculos

Cada paso `Entonces` se apoya en una de estas evidencias: respuesta HTTP, navegación (URL), elemento **visible**, persistencia comprobada en otra sesión o evidencia de red (petición capturada o abortada).

**Prohibidos como evidencia de éxito:**

- `#success_message` ("Your order has been placed successfully!"), porque se muestra en el cliente antes de que responda el servidor (KD-09).
- Cualquier texto que esté en el HTML pero oculto.
- Cambios del DOM que no estén respaldados por el comportamiento que se comprueba. Esto incluye el contenido servido con `route.fulfill`, que solo vale como entrada controlada, nunca como prueba de comportamiento de la aplicación.
- El texto de `validationMessage`, que cambia con el idioma del sistema. Se usa `validity.valueMissing`.
- Un veredicto de IA como única evidencia de una regla de negocio. La IA complementa, no sustituye: en "Registrarse con un perfil generado por IA", la creación de la cuenta se comprueba de forma determinista; en las aserciones semánticas, el aviso se comprueba visible antes de evaluarlo.

## 5. Checkout y pago

| Comportamiento | Validación |
|---|---|
| Direcciones | Entrega y facturación contienen tratamiento, nombre, apellido, empresa, dirección 1 y 2, "ciudad estado código postal", país y teléfono del perfil usado en el registro |
| Total | "Total Amount" = suma de los totales de fila; cada total de fila = precio × cantidad, con comparación numérica de "Rs. N" |
| Acceso anónimo | El aviso de registro aparece desde el carrito. El acceso directo por URL no se usa como negativo, porque la aplicación lo permite (KD-01) |
| Campos vacíos | Los 5 campos tienen `validity.valueMissing`, `checkValidity()` es falso y no se emite ninguna petición de pago |
| Interceptación | Se captura exactamente un `POST /payment`. Se comprueban el método, la URL, los cinco campos con los valores introducidos y la presencia del token CSRF (su valor no se registra). La petición se aborta, se registra el evento `requestfailed` y no hay respuesta |

**Evidencia de la interceptación.** El guard registra la petición, el error con el que terminó (`net::ERR_BLOCKED_BY_CLIENT`) y cuántas respuestas de `/payment` llegaron (deben ser 0). El reporte recibe un adjunto saneado (`pago-interceptado.json`) sin el valor del token CSRF.

**Qué no se afirma.** La interceptación demuestra únicamente que la petición se capturó, se inspeccionó y se abortó. No se verifica el estado del servidor ni la existencia o ausencia de pedidos: la petición nunca llegó a él.

No hay escenarios negativos de formato de tarjeta. El cliente no valida el formato y la validación del servidor no puede observarse sin enviar el pago.

## 6. Datos de prueba

| Dato | Origen | Reglas |
|---|---|---|
| Perfil de registro (funcional) | Generador local (Faker con semilla). Semilla = `TEST_RUN_ID` + `testId` + `retry` + `repeatEachIndex` + índice del dato; se adjunta al reporte. Determinista salvo la contraseña, que es aleatoria para no poder reconstruirla desde la semilla ([architecture.md](architecture.md), sección 6) | Esquema Zod; nombre y dirección ficticios; país entre los 7 admitidos; contraseña de al menos 12 caracteres con minúscula, mayúscula y dígito |
| Perfil de registro (`@ai`) | Opción C, Anthropic (propuesta); correo y contraseña los pone el framework | `RegistrationProfileSchema` completo (sección 7) |
| Correo | Siempre local | Único por cuenta, en el dominio reservado `example.com` |
| Tarjeta | Siempre local, determinista con semilla | 16 dígitos que fallan Luhn, CVC y vencimiento sintéticos. Fallar Luhn reduce la probabilidad de coincidir con una tarjeta real, pero la protección efectiva es la interceptación del pago |

Ningún dato se escribe como literal en los escenarios. Los valores concretos solo existen en los generadores (local o propuesto por la IA y validado por el framework).

## 7. Validación de IA

### Opción B: aserciones semánticas (`expectAI`)

- **Entrada:** el texto observado y un criterio de aceptación. **Salida:** `{ passed: boolean, reason: string }`, validado con un esquema Zod estricto (campos de más, ausentes o de otro tipo → error).
- `expectAI` falla con el motivo del evaluador si `passed` es `false`. Un texto vacío no se envía al proveedor: no cumple ningún criterio.
- **El texto evaluado es un dato, no una instrucción:** va entre `<texto>` y `</texto>` con `<` y `>` escapados, y el prompt de sistema (versión `expect-ai/v1`) prohíbe seguir órdenes del texto y usar conocimiento externo; ante la duda, `passed = false`.
- Un positivo y un negativo sobre el mismo texto real demuestran que el evaluador discrimina. Complementa, no sustituye, la aserción determinista del aviso (escenario anónimo de checkout).

### Opción C: datos sintéticos

- **La IA propone; el framework decide.** El modelo devuelve un `ProfileProposal` (esquema estricto, sin correo, contraseña ni datos de pago). El framework añade el correo único (`qa.ai.<semilla>@example.com`) y la contraseña aleatoria y valida el resultado con `RegistrationProfileSchema`: países admitidos, formatos, correo en `example.com`.
- Una propuesta que no cumple se reintenta **una vez**; si vuelve a fallar, se lanza un `AiError('rejected')` con las reglas incumplidas (nunca la contraseña).
- El perfil solo llega al escenario si es válido, y la validez final la confirma la aplicación: el registro real con ese perfil.

### Errores e impredecibilidad

- Ningún error del proveedor se convierte en resultado: `auth` (401), `rate_limit` (429), `server` (5xx), `timeout`, `max_tokens`, `refusal`, `invalid_output` y `call_limit` se lanzan siempre como `AiError`. `stop_reason` se comprueba antes de interpretar la respuesta.
- Límites: 30 s por llamada, 1 reintento del SDK (429/5xx/timeout), máximo 4 llamadas por escenario, `max_tokens` acotado y esfuerzo `low`.
- Sin reintentos en el proyecto `ai`: una respuesta inestable queda visible.
- **Pruebas con respuestas simuladas (`ai-unit`):** 19 pruebas sin red ni clave cubren los positivos y negativos de `expectAI`, el escapado del texto, cada tipo de error, el límite de llamadas y las reglas de negocio del generador.
- **Evidencia:** `ia-interacciones.json` por escenario (operación, modelo, latencia, tokens, `stop_reason`, resultado validado). Nunca la API key; las llamadas ocurren en Node y no forman parte de las trazas del navegador.

### Estado de la validación de IA

- Integración con Anthropic: implementada.
- Pruebas con respuestas simuladas (`ai-unit`): 19/19.
- Escenarios `@ai` reales: 4, omitidos por ausencia de credenciales.
- Validación contra el proveedor real: **pendiente** por decisión de seguridad y de gestión de credenciales. No debe considerarse validada.

### Selectores auto-reparables (self-healing)

Fuera de la primera implementación (Opción A, opcional). Sus controles están descritos en [architecture.md](architecture.md), sección 8. No sustituye a las pruebas de resiliencia de la sección 9.

## 8. Aislamiento y limpieza

| Tipo de escenario | Cuenta |
|---|---|
| Modifica la cuenta, la sesión o el carrito | Cuenta aislada, propia del escenario |
| Solo lectura autenticada (`@shared-session`) | Sesión compartida del proyecto `setup`, con guard contra cambios de estado |
| Anónimo | Sin cuenta; el carrito anónimo se descarta con el contexto |
| Variantes del DOM, error de red simulado y escenarios de IA sin registro | Sin cuenta |

**Limpieza y recuperación:**

- Toda cuenta aislada se elimina en el teardown, incluso si el escenario falla.
- La eliminación se verifica en dos pasos: el mensaje "Account Deleted!" visible y un login posterior fallido.
- Un fallo de limpieza se registra como advertencia y no oculta el error original.
- El reporte incluye un inventario de las cuentas creadas con su estado: eliminada y verificada, fallida o no intentada.

**La limpieza no es infalible.** Una caída de red, la interrupción del proceso o un cambio en la aplicación pueden dejar cuentas residuales. Son cuentas sintéticas en `example.com`, identificables en el inventario. No está verificado si al eliminar una cuenta se elimina también su carrito.

Si una cuenta no puede eliminarse o verificarse, queda registrada como `cleanup_failed` con su último estado alcanzado (por ejemplo, `deleted` si solo falló la verificación), y **no se asume que su credencial quedó invalidada**. Ocurrió una vez en la Fase 4: la aplicación devolvió su página de sobrecarga durante la verificación; la eliminación sí constaba ("Account Deleted!") y el test falló de forma visible.

El mecanismo de fixtures está descrito en [architecture.md](architecture.md), secciones 5 y 6.

## 9. Resiliencia

Las variantes del DOM se sirven con `route.fulfill` sobre `/login`:

| Variante | Cambia | Se mantiene | Resultado esperado |
|---|---|---|---|
| Cosmética | `id`, `class` y contenedores intermedios | Roles, nombres accesibles y `data-qa` | Los localizadores de la política funcionan |
| Ruptura de contrato | Desaparecen `data-qa` y cambian los nombres de los botones | La estructura visual | Fallo explícito con `TimeoutError`. El escenario está diseñado para comprobar ese fallo |

Las variantes solo cubren los cambios que definimos nosotros: no garantizan resistencia ante cualquier cambio real de la aplicación. La política de localizadores está en [architecture.md](architecture.md), sección 9.

## 10. Riesgos técnicos

| Riesgo | Mitigación |
|---|---|
| Anuncios de terceros (vignette a pantalla completa, anuncio fijo inferior) bloquean clics y cambian la URL | Guard de anuncios en todos los contextos |
| La telemetría (`/cdn-cgi/rum`, beacons) añade ruido a la red y a la consola | Bloqueo explícito; las aserciones no dependen de errores de consola |
| `add_to_cart`, `delete_cart` y `delete_account` son GET que modifican estado | Guard en la sesión compartida; sin reintentos automáticos de esas peticiones |
| El mensaje de pago optimista produce falsos positivos de compra | Prohibido como oráculo; se verifica la petición interceptada |
| No hay validación de formato de tarjeta en el cliente | Sin negativos de formato; solo campos vacíos |
| Cuentas y carritos persistentes contaminan escenarios en paralelo | Cuenta aislada por escenario que modifica estado |
| Fallos de limpieza dejan cuentas residuales | Teardown con verificación e inventario |
| Contenido estático: la Opción B podría no demostrar nada | Contenido controlado con casos positivos, negativos y de límite |
| Dependencia de Anthropic: disponibilidad, latencia, cuota y coste | Proyecto `ai` separado; timeouts; mocks en `functional`; omisión sin key |
| Falsos positivos de la IA | Umbral, `inconclusive` cuenta como fallo, casos negativos e inyección de prompt obligatorios, aserciones deterministas en paralelo |
| Un cambio de modelo altera el comportamiento de las aserciones | Modelo configurable con `AI_MODEL`; los casos negativos y de límite detectan que la aserción ha dejado de discriminar |
| La aplicación es pública: cambios sin aviso, caídas o desafíos de Cloudflare con mucha carga. **Observado en la Fase 4:** `/login` devolvió una vez la página "This website is under heavy load (queue full)" en lugar del formulario, y con 4 workers `POST /login` respondió 503 | 2 workers en todos los entornos; timeout de 60 s por test; límites de espera por acción (15 s) y navegación (30 s) para fallar rápido y con un mensaje claro; el comportamiento observado se usa como oráculo asumiendo este riesgo |
| Paralelismo: más cuentas implican más carga y más duración | Límite de workers en `ci` |
| Las trazas de un test fallido contienen contraseñas sintéticas y se copian al reporte HTML y al de Allure | Trazas y reportes tratados como artefactos locales sensibles: ignorados por Git, reemplazados en cada ejecución, sin publicación automática; contraseñas aleatorias por cuenta y cuenta eliminada al terminar ([architecture.md](architecture.md), sección 10.1) |

## 11. Pendientes de verificación en la aplicación

No se han ejecutado y no se usan como hechos:

- Registro con un correo existente ("Email Address already exist!").
- Comportamiento de `GET /delete_cart/{id}` (KD-11).
- Si al eliminar la cuenta se elimina su carrito.
- APIs `createAccount` y `deleteAccount`.
- Validación del pago en el servidor. Fuera de alcance: requiere enviar el pago.
- Confirmación del pedido y factura. Fuera de alcance por la misma razón.

## 12. Matriz de cobertura

| Escenario | Tipo | Proyecto | Cuenta | Evidencia principal |
|---|---|---|---|---|
| Registrar una cuenta sintética en dos pasos | E2E | functional | Aislada | `POST /signup` (paso 1: 200 y formulario con datos rellenados; paso 2: 302 a `/account_created`); "Account Created!" visible; "Logged in as {nombre}" |
| La cuenta creada inicia sesión desde una sesión nueva | E2E | functional | Aislada | `POST /login` 302 a `/`; "Logged in as {nombre}" |
| La sesión compartida se reutiliza sin iniciar sesión | Infraestructura | functional | Compartida | Sin `POST /login`; "Logged in as" visible |
| El detalle del producto coincide con el listado | E2E | functional | Compartida | Nombre y precio iguales en listado y detalle |
| Añadir productos y verificar los totales por fila | E2E y red | functional | Aislada | `GET /add_to_cart` 200 `"Added To Cart"`; modal visible; precio × cantidad |
| Añadir de nuevo el mismo producto incrementa su cantidad | E2E | functional | Aislada | Una fila con cantidad 2 |
| El carrito persiste en la cuenta | E2E | functional | Aislada | Mismas filas tras recargar y en un contexto nuevo |
| El checkout muestra las direcciones del registro y el total | E2E | functional | Aislada | Direcciones = perfil; total = suma de filas |
| Se pide a un usuario anónimo que se registre o inicie sesión | Negativo | functional | Anónima | Aviso visible; URL `/view_cart` |
| Los campos de pago vacíos bloquean el envío | Negativo | functional | Aislada | `validity.valueMissing` en 5 campos; ninguna petición de pago |
| La petición de pago se captura, se inspecciona y se aborta | Seguridad | functional | Aislada | Petición capturada (método, URL, campos), aborto y `requestfailed` adjuntos |
| La cuenta se elimina y ya no puede iniciar sesión | E2E | functional | Aislada | "Account Deleted!" visible; el login posterior falla |
| Una petición fallida de añadir al carrito no muestra confirmación | Red | functional | Anónima | 500 simulado; modal no visible |
| Los localizadores toleran cambios cosméticos del DOM | Resiliencia | functional | — | Variante adjunta; interacción completada |
| Los localizadores fallan de forma explícita cuando se elimina su contrato | Resiliencia | functional | — | `TimeoutError` esperado |
| Pruebas del cliente de IA con respuestas simuladas (19) | Unitaria | ai-unit | — | Errores del proveedor siempre como `AiError`; reglas de negocio del generador |
| El aviso de checkout cumple la intención esperada | IA | ai | Anónima | `passed: true` validado con Zod; `ia-interacciones.json` |
| El aviso de checkout no cumple una intención contraria | IA | ai | Anónima | `passed: false` con su motivo |
| Registrarse con un perfil generado por IA | IA y E2E | ai | Aislada | Perfil validado; cuenta creada (determinista) |
| Un perfil de IA para un país no admitido se rechaza | IA | ai | — | `AiError(rejected)` por la regla de países |
