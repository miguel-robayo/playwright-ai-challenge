# language: es
@network
Característica: Manejo de errores de red
  El error se simula en el navegador: la petición de añadir al carrito no llega al servidor.

  Escenario: Una petición fallida de añadir al carrito no muestra confirmación
    Dado un usuario anónimo en la página de productos
    Y el endpoint de añadir al carrito responde con un error del servidor
    Cuando el usuario añade un producto al carrito
    Entonces la confirmación de producto añadido no se muestra
