---
name: review-scenario
description: Revisar un cambio de features, pasos, Tasks, Questions o Page Objects contra el estándar del proyecto, con comprobaciones automáticas y revisión manual. Usar al terminar un escenario, antes de un commit o cuando se pida revisar escenarios o pasos.
---

# Revisar escenarios y pasos

Es una revisión de solo lectura: no corrijas nada sin autorización.

## 1. Alcance
- Por defecto, el diff contra `main`: `git diff --name-only main...HEAD` más los cambios sin commit (`git status --porcelain`).
- Si el usuario indica archivos o un PR, revisa esos.

## 2. Comprobaciones automáticas
Ejecuta y anota cada coincidencia con `archivo:línea`:

```bash
# Aserciones fuera de los pasos (solo se permiten en steps/ y src/setup/)
grep -rnE "expect\(|expect\.poll" src --include=*.ts | grep -v "^src/setup/" | grep -v "^\S*:\s*\*"
# Localizadores en los pasos (excepción: la máscara de contraseñas de evidence.hooks.ts)
grep -rnE "page\.(locator|getBy)|\.locator\(" steps --include=*.ts
# Esperas fijas, force, XPath, only
grep -rnE "waitForTimeout|networkidle|force: ?true|xpath=|//\*|\.only\(" src steps tests --include=*.ts | grep -v "rmSync("
# Questions que actúan
grep -rnE "\.(goto|click|fill|reload|check|selectOption)\(" src/questions
# Contraseñas escritas con fill
grep -rnE "fill\([^)]*[Pp]assword" src steps
# Literales de datos personales o de tarjeta
grep -rnE "@(gmail|hotmail|yahoo|outlook)\.|\b[0-9]{16}\b" features steps src
# Features sin cabecera de idioma
grep -rL "^# language: es" features
```

Después ejecuta `npm run validate`.

## 3. Revisión manual
Para cada escenario y paso tocado, contrasta con `.claude/rules/`:
- Gherkin: comportamiento observable, un comportamiento por escenario, etiquetas correctas, sin datos literales.
- `Entonces` sin acciones ni navegación; `Cuando` sin aserciones.
- Las aserciones negativas van después de un punto de sincronización y tienen su contraparte positiva.
- Oráculo fuerte: compara contra datos del escenario (perfil, listado, respuesta), no contra constantes copiadas de la UI.
- Estado solo en `ScenarioMemory`; cuentas registradas en el ledger; `@shared-session` de solo lectura.
- Seguridad: nada sensible en adjuntos, anotaciones, logs ni mensajes; pago abortado.
- Documentación: §3 y §12 de `test-strategy.md` y §6 de `requirements-analysis.md` coherentes con el cambio.

## 4. Informe
Tabla `| Hallazgo | Severidad (BLOCKER/HIGH/MEDIUM/LOW) | Evidencia (archivo:línea) | Acción recomendada |`. Las desviaciones ya conocidas y documentadas como deuda se marcan como tales y no como hallazgo nuevo. Termina con APROBADO, APROBADO CON OBSERVACIONES o CAMBIOS REQUERIDOS.
