import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import playwright from 'eslint-plugin-playwright';
import tseslint from 'typescript-eslint';

export default defineConfig(
  {
    ignores: [
      'node_modules/',
      '.features-gen/',
      'test-results/',
      'playwright-report/',
      'allure-results/',
      'allure-report/',
    ],
  },
  js.configs.recommended,
  tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
  },
  {
    files: ['steps/**/*.ts', 'src/**/*.ts'],
    extends: [playwright.configs['flat/recommended']],
    rules: {
      // Las aserciones de playwright-bdd viven en step definitions, fuera de bloques test().
      'playwright/no-standalone-expect': 'off',
    },
  },
  {
    // Setup y teardown de la sesión compartida: son ciclo de vida, no escenarios de negocio.
    // Necesitan ramas de recuperación y el teardown no tiene aserciones de negocio.
    files: ['src/setup/**/*.ts'],
    rules: {
      'playwright/no-conditional-in-test': 'off',
      'playwright/expect-expect': 'off',
    },
  },
  {
    files: ['**/*.mjs'],
    extends: [tseslint.configs.disableTypeChecked],
  },
);
