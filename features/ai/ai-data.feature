# language: es
@ai
Característica: Datos sintéticos generados con IA
  La IA propone el perfil; el framework lo valida con Zod y con las reglas de negocio
  antes de usarlo. El correo y la contraseña los pone siempre el framework.

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
