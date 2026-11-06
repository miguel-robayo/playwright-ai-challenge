---
paths:
  - "src/ai/**/*.ts"
  - "steps/ai/**/*.ts"
  - "features/ai/**/*.feature"
  - "tests/ai-unit/**/*.ts"
---

# IA (Anthropic)

- La IA complementa los oráculos deterministas y no los sustituye: un `Entonces` con `expectAI` comprueba antes de forma determinista que el elemento existe.
- El SDK se importa de forma dinámica solo en el proyecto `ai` y solo si hay clave (fixture `ai`). El proyecto `functional` no carga código de IA ni necesita clave.
- Toda respuesta del modelo se valida con Zod (`strictObject`) y, en los datos generados, con las reglas de negocio de `src/data/`. Una salida inválida es un `AiError`, nunca un resultado positivo.
- El framework, no la IA, genera correo, contraseña y datos de pago.
- Límite de llamadas por test (`AI_MAX_CALLS_PER_TEST`) y timeout de `src/config/timeouts.ts`. El proyecto `ai` no tiene reintentos.
- Cada cambio del cliente, del prompt o del esquema lleva su prueba en `tests/ai-unit/` con `fetch` simulado y clave ficticia. Si cambia un prompt, se incrementa su versión (por ejemplo, `EXPECT_AI_PROMPT_VERSION`).
- No se ejecuta `npm run test:ai` ni se llama a Anthropic: la validación real la hace el usuario. Nunca se documenta la IA como validada sin evidencia de una ejecución real.
