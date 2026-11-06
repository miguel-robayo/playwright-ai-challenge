# Defectos conocidos

Comportamientos de Automation Exercise detectados durante el análisis. La aplicación no tiene una especificación formal: estos hallazgos se presentan como **comportamientos observados con impacto potencial**, no como incumplimientos de un requisito documentado.

## Origen de la evidencia

- **Exploración técnica:** solo lectura, con Playwright 1.62.1 y Microsoft Edge en modo headless, viewport 1366×768, desde Colombia.
- **Validación funcional controlada:** 2026-11-06, con una cuenta sintética en `example.com` que se eliminó al terminar (verificado con un login fallido). El `POST /payment` se interceptó y se abortó.
- **Conservación de la evidencia:** las capturas y los registros de red originales no se conservan en el repositorio, porque incluyen valores de cookies de sesión y tokens CSRF. Cada hallazgo incluye los pasos para reproducirlo.

Estados de verificación:

- **Reproducido:** observado en ejecución.
- **Inspección de código:** deducido del código JavaScript o HTML de la página, sin observarlo en ejecución.

## Reproducidos mediante ejecución

### KD-01 · `/checkout` y `/payment` son accesibles sin sesión

| Campo | Detalle |
|---|---|
| Comportamiento | Las URL directas `/checkout` y `/payment` responden 200 sin sesión. El checkout se muestra con las direcciones vacías y el enlace "Place Order" activo; el formulario de pago está completo y habilitado |
| Pasos | 1. Abrir un contexto sin cookies. 2. Navegar a `/checkout`. 3. Navegar a `/payment` |
| Impacto | El aviso de "Register / Login" del carrito se puede saltar. El formulario de pago está disponible para un usuario no autenticado |
| Limitaciones | No se envió el formulario sin sesión, así que se desconoce cómo respondería el servidor |

### KD-02 · `GET /delete_account` elimina la cuenta sin confirmación ni token CSRF

| Campo | Detalle |
|---|---|
| Comportamiento | Una petición GET a `/delete_account` con sesión elimina la cuenta de inmediato y muestra "Account Deleted!" |
| Pasos | 1. Iniciar sesión. 2. Pulsar "Delete Account" (`<a href="/delete_account">`) o navegar a la URL |
| Impacto | Un enlace o una precarga externa podría eliminar la cuenta de un usuario con la sesión abierta. Es una operación destructiva expuesta en un método que debería ser seguro |
| Limitaciones | No se probó ningún ataque desde otro origen; el impacto se deduce del método y de la ausencia de token |

### KD-03 · `GET /add_to_cart/{id}` modifica el carrito sin token CSRF

| Campo | Detalle |
|---|---|
| Comportamiento | Añadir un producto es `GET /add_to_cart/{id}[?quantity=N]`. Responde 200 con el cuerpo `"Added To Cart"` y modifica el carrito en el servidor |
| Pasos | Iniciar sesión, pulsar "Add to cart" y revisar la petición en la red |
| Impacto | Precargas, rastreadores o reintentos automáticos pueden alterar el carrito. Un tercero podría añadir productos al carrito de un usuario autenticado |
| Limitaciones | No se probaron precargas ni peticiones desde otro origen |

### KD-04 · Los campos de tarjeta no validan el formato en el cliente

| Campo | Detalle |
|---|---|
| Comportamiento | Los 5 campos de pago son `type="text"` con `required`, sin `pattern`, `maxlength` ni `min`/`max`. El navegador da por válidos `abcd` como número de tarjeta, `zz` como CVC, `99` como mes y `1` como año |
| Pasos | En `/payment`, introducir esos valores y comprobar `checkValidity()` en cada campo, sin enviar el formulario |
| Impacto | El usuario no recibe ningún aviso de formato antes de enviar |
| Limitaciones | Se desconoce si el servidor valida: comprobarlo requiere enviar el pago, que está fuera de alcance |

### KD-05 · El comentario del pedido no se envía

| Campo | Detalle |
|---|---|
| Comportamiento | El `textarea[name="message"]` del checkout no pertenece a ningún formulario. "Place Order" es un enlace (`<a href="/payment">`) que navega con un GET sin cuerpo |
| Pasos | En `/checkout` con sesión, escribir un comentario, pulsar "Place Order" y revisar la petición |
| Impacto | El texto que escribe el usuario se pierde sin aviso |
| Limitaciones | Solo se observó esa navegación. No se comprobó si la página guarda el comentario por otro medio en pasos posteriores |

### KD-06 · Las etiquetas de los formularios no están asociadas a sus campos

| Campo | Detalle |
|---|---|
| Comportamiento | Los `<label>` de login, pago y cantidad no están vinculados a sus campos (`for`/`id`). `getByLabel` no encuentra ningún campo |
| Pasos | En `/login`, `/payment` o `/product_details/1`, buscar los campos por su etiqueta accesible |
| Impacto | Accesibilidad: los lectores de pantalla no anuncian el nombre del campo |
| Limitaciones | No se hizo una auditoría de accesibilidad completa |

### KD-07 · El título de `/view_cart` es "Checkout"

| Campo | Detalle |
|---|---|
| Comportamiento | La página del carrito tiene el título "Automation Exercise - Checkout" |
| Pasos | Navegar a `/view_cart` y leer `document.title` |
| Impacto | Bajo: confunde la navegación por pestañas y el historial |
| Limitaciones | — |

### KD-08 · Errores de recursos en consola

| Campo | Detalle |
|---|---|
| Comportamiento | Se bloquean peticiones de fuentes por `http://` (contenido mixto) y se aborta `/static/css/cart_checkout.css` por su tipo MIME |
| Pasos | Abrir `/checkout` y las páginas principales con la consola o el registro de red abiertos |
| Impacto | Bajo: posibles estilos o fuentes que no se aplican |
| Limitaciones | No se evaluó el efecto visual. La consola incluye además errores de terceros (anuncios) que no se atribuyen a la aplicación |

## Detectados por inspección de código

### KD-09 · El mensaje de pedido realizado se muestra antes de la respuesta del servidor

| Campo | Detalle |
|---|---|
| Comportamiento | `/payment` contiene `#success_message` oculto, con el texto "Your order has been placed successfully!", y un script en línea que lo hace visible en el evento `submit` del formulario: `$("#payment-form").on("submit", …removeClass("hide"))`. No depende de la respuesta del servidor |
| Evidencia | Código HTML y JavaScript de `/payment` |
| Impacto | La interfaz puede comunicar éxito aunque el pedido falle. Para la automatización, es un oráculo que produciría falsos positivos |
| Limitaciones | No se observó en ejecución: el envío se abortó y el navegador mostró una página de error antes de poder comprobar si el mensaje llegó a verse |

### KD-10 · Un fallo al añadir al carrito no muestra ningún aviso

| Campo | Detalle |
|---|---|
| Comportamiento | `static/js/cart.js` solo maneja la respuesta correcta de `/add_to_cart`. No hay manejo de error, así que ante un fallo no aparecería ni el modal ni ningún mensaje |
| Evidencia | Código de `cart.js` |
| Impacto | El usuario no sabe que el producto no se añadió |
| Limitaciones | Ejecutado de forma segura en la Fase 4 con un 500 servido en local (`route.fulfill`): el modal no aparece. El escenario no comprueba si hay algún otro aviso de error, porque la estrategia no lo exige |

### KD-11 · `GET /delete_cart/{id}` modifica el carrito

| Campo | Detalle |
|---|---|
| Comportamiento | `cart.js` elimina productos del carrito con `GET /delete_cart/{id}` |
| Evidencia | Código de `cart.js` |
| Impacto | El mismo patrón que KD-03: una operación que cambia estado expuesta en GET |
| Limitaciones | Sin ejecutar; está en la lista de pendientes de [test-strategy.md](test-strategy.md), sección 11 |

## Fuera de esta lista

Hay comportamientos que condicionan las pruebas pero no se consideran defectos: los mensajes de éxito presentes en el HTML aunque ocultos, las direcciones de facturación idénticas a las de entrega y la ausencia de un total en `/view_cart`. Su tratamiento está en [test-strategy.md](test-strategy.md), secciones 2 y 4.
