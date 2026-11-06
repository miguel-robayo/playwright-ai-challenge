# language: es
@resilience
Característica: Resiliencia de localizadores
  Las variantes del DOM son una simulación controlada servida con route.fulfill.

  Escenario: Los localizadores toleran cambios cosméticos del DOM
    Dado la página de login servida con ids, clases y contenedores modificados
    Cuando el usuario rellena el formulario de login
    Entonces la interacción se completa

  Escenario: Los localizadores fallan de forma explícita cuando se elimina su contrato
    Dado la página de login servida sin atributos data-qa y con los botones renombrados
    Cuando el usuario intenta rellenar el formulario de login
    Entonces el paso falla por timeout del localizador
