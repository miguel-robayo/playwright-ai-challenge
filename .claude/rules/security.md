# Seguridad

Se aplica a todo el repositorio.

- El `POST /payment` se intercepta y se aborta siempre (`src/interactions/network-guards.ts`). No se elimina, desactiva ni relaja ese guard, y ningún escenario afirma una compra o un pedido completados.
- Solo datos sintéticos: correos `@example.com` generados por `syntheticData`, contraseñas aleatorias y tarjetas de 16 dígitos que no pasan Luhn. Nunca datos personales ni tarjetas reales.
- Las contraseñas se escriben con `fillSecret` (`src/interactions/secret-input.ts`), nunca con `fill`, para que no aparezcan en los títulos de los pasos de Playwright y Allure.
- Ningún adjunto, anotación, log, mensaje de error o `console.*` contiene contraseñas, semillas que permitan reconstruirlas ni el token CSRF. Los adjuntos de pago y de datos se sanean (ver `docs/architecture.md` §10).
- Las trazas, el reporte HTML y Allure de un fallo contienen datos sensibles sintéticos: son locales, están en `.gitignore` y CI no los publica (no añadir `upload-artifact`). Única excepción: `docs/evidencias/reporte-allure.html`, que solo se regenera desde una ejecución sin fallos y tras las comprobaciones de `docs/evidencias/README.md`.
- `ANTHROPIC_API_KEY` / `AI_API_KEY`: nunca se solicitan, generan, leen, imprimen, copian ni almacenan. La validación real contra Anthropic la ejecuta el usuario con su propia clave.
- `.env` y `.auth/` nunca se versionan. En las pruebas simuladas, las claves son literales marcados como ficticios.
- Los escenarios `@shared-session` son de solo lectura: el guard aborta `/add_to_cart`, `/delete_cart` y `/delete_account` y hace fallar el test.
