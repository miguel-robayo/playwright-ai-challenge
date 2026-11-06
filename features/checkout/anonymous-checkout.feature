# language: es
Característica: Checkout
  @negative
  Escenario: Se pide a un usuario anónimo que se registre o inicie sesión
    Dado un usuario anónimo con un producto en el carrito
    Cuando el usuario continúa al checkout
    Entonces se muestra un aviso para registrarse o iniciar sesión y el usuario permanece en el carrito
