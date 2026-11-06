# Evidencias de ejecución

`reporte-allure.html` es el reporte de Allure de una ejecución completa de la suite, en un único archivo HTML autocontenido.

## Cómo abrirlo

Descárgalo y ábrelo con doble clic en cualquier navegador; no necesita servidor ni instalar nada. GitHub no renderiza HTML desde el repositorio, así que la vista previa en la web muestra el código fuente.

## Ejecución

| Dato | Valor |
|---|---|
| Código | `main` en `7f7f005` |
| Fecha | 2026-11-06 |
| Comando | `npx playwright test` (perfil `local`, 2 workers, sin API key) |
| Resultado | 40 tests: 36 aprobados, 4 omitidos, 0 fallidos |
| Duración | 3,0 min |

- **Aprobados:** `setup` y `cleanup` de la sesión compartida, los 15 escenarios funcionales y las 19 pruebas `ai-unit` con respuestas simuladas.
- **Omitidos:** los 4 escenarios `@ai`, porque la ejecución no tenía `ANTHROPIC_API_KEY`. La validación contra Anthropic real sigue **pendiente**; este reporte no la demuestra.

## Qué contiene

- Los pasos Gherkin de cada escenario, con una captura de pantalla después de cada paso (`Pantalla: <paso>`), 54 en total.
- Adjuntos por escenario: datos sintéticos (`datos-sinteticos.json`), inventario de cuentas creadas y su limpieza, y el `POST /payment` interceptado y abortado (`pago-interceptado.json`).
- La captura de peticiones y respuestas es **parcial** (R-25): solo se adjunta el `POST /payment`; las peticiones de registro, login y carrito se comprueban en los pasos, pero no se adjuntan.

## Datos sensibles

El reporte solo es publicable porque procede de una ejecución sin fallos: Playwright solo conserva trazas y videos en los fallos (`retain-on-failure`), y esos artefactos contienen contraseñas sintéticas y el token CSRF (ver `docs/architecture.md` §10.1). Antes de versionarlo se comprobó que:

- No contiene trazas ni videos.
- Las contraseñas aparecen como `[REDACTED]` en los adjuntos, están enmascaradas en las capturas y no figuran en los títulos de los pasos (se escriben con `fillSecret`).
- El token CSRF no aparece; solo `csrfTokenPresent: true`.
- Los correos son `@example.com` y las tarjetas son sintéticas y no superan la validación de Luhn.
- No hay claves de API.

## Regenerarlo

Solo a partir de una ejecución **sin fallos**, y repitiendo las comprobaciones anteriores antes de versionarlo:

```bash
npx playwright test
npx allure generate allure-results --config <allurerc con singleFile> --output <carpeta temporal> --clean
```

La configuración usada fue el plugin `awesome` con `singleFile: true` y `reportLanguage: 'es'`; el `index.html` generado se copia aquí como `reporte-allure.html`.
