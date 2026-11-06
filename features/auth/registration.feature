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
