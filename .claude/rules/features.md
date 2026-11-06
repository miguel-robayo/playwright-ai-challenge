---
paths:
  - "features/**/*.feature"
---

# Features (Gherkin)

- Primera línea `# language: es`; palabras clave en español (`Característica`, `Escenario`, `Dado`, `Cuando`, `Entonces`, `Y`).
- Un archivo por dominio en `features/<dominio>/`; reutilizar el dominio existente antes de crear uno.
- El título del escenario describe un comportamiento observable, no la implementación.
- Un comportamiento por escenario, en orden Dado → Cuando → Entonces. Se admite más de un ciclo Cuando/Entonces solo si es el mismo flujo (por ejemplo, el registro en dos pasos).
- Sin datos literales de usuario, correo, contraseña ni tarjeta: los genera `syntheticData`. Los parámetros literales solo para valores de negocio (cantidades, países, intenciones).
- Sin `Antecedentes` en features `@ai`: la omisión sin API key debe ocurrir en el propio escenario (allure-playwright registra un skip en un hook como error global).
- Etiquetas con semántica fija:
  - `@negative`: el resultado esperado es un rechazo o un fallo controlado.
  - `@network`: error de red simulado con `route`.
  - `@security`: pago interceptado.
  - `@resilience`: variantes del DOM.
  - `@ai`: usa el proveedor de IA; solo corre en el proyecto `ai`.
  - `@shared-session`: usa el storageState compartido y es de solo lectura.
- Al añadir o cambiar un escenario, actualizar `docs/test-strategy.md` (§3 con el Gherkin idéntico y §12) y `docs/requirements-analysis.md` §6.
