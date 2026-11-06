# language: es
@ai
Característica: Foundation del proyecto de IA
  Comprueba que el proyecto "ai" se selecciona por etiqueta y que sus escenarios
  se omiten cuando no hay AI_API_KEY. No implementa ninguna integración de IA:
  los escenarios de los desafíos de IA llegarán en su fase.

  Escenario: El proyecto de IA usa el proveedor configurado
    Entonces el proveedor de IA configurado es "anthropic"
