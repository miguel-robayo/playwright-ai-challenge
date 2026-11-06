---
paths:
  - "src/pages/**/*.ts"
---

# Page Objects

- Único lugar con localizadores. Se exponen como propiedades `Locator` o métodos de acción; nunca devuelven aserciones.
- Prioridad de localizadores: `getByTestId` (atributo `data-qa`) → rol accesible con nombre → texto visible → CSS estructural acotado a un contenedor estable de la página (`#cart_info_table`, `form[action="/login"]`, `.productinfo`). Sin XPath ni selectores que dependan del estilo visual.
- `nth()` solo para recorrer listados por posición; nunca para localizar un elemento concreto.
- Los componentes reutilizables (modales, filas, cabecera) van en `src/pages/components/`.
- Cada página nueva se registra en `src/pages/app.ts`.
- Sin `expect`, sin esperas fijas, sin lógica de negocio ni de datos. La espera de respuestas de red pertenece a las Tasks/Interactions.
- Los campos de contraseña se rellenan con `fillSecret`, no con `fill`.
