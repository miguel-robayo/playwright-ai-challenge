# language: es
Característica: Limpieza de la cuenta
  Escenario: La cuenta se elimina y ya no puede iniciar sesión
    Dado un usuario autenticado con una cuenta aislada
    Cuando el usuario elimina la cuenta
    Entonces la confirmación de cuenta eliminada es visible
    Y el inicio de sesión con las mismas credenciales falla
