# language: es
@ai
Característica: Aserciones semánticas con IA
  expectAI evalúa el texto real que muestra la aplicación frente a un criterio de aceptación.
  Complementa las aserciones deterministas del escenario de checkout anónimo; no las sustituye.
  Sin "Antecedentes": así la omisión sin API key ocurre en el propio escenario y no en un
  hook, que allure-playwright registraría como error global.

  Escenario: El aviso de checkout cumple la intención esperada
    Dado un usuario anónimo con un producto en el carrito
    Cuando el usuario continúa al checkout
    Entonces el aviso de checkout cumple la intención "pide al usuario registrarse o iniciar sesión para poder continuar con la compra"

  Escenario: El aviso de checkout no cumple una intención contraria
    Dado un usuario anónimo con un producto en el carrito
    Cuando el usuario continúa al checkout
    Entonces el aviso de checkout no cumple la intención "confirma que el pedido se ha realizado correctamente"
