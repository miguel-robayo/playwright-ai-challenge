import { expect } from '@playwright/test';
import { loadEnv } from '../../src/config/env';
import { Then } from '../../src/fixtures/index';

// playwright-bdd pasa los fixtures como primer argumento; este paso no necesita ninguno.
Then('el proveedor de IA configurado es {string}', ({}, provider: string) => {
  expect(loadEnv().ai.provider).toBe(provider);
});
