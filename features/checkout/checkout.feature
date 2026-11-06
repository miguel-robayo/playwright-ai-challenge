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
