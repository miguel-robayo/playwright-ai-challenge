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
