# language: es
@security
Característica: Interceptación segura del pago
  El POST /payment se captura y se aborta siempre antes de llegar al servidor.
  Estos escenarios no validan una compra, una transacción ni una confirmación de pedido.

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
