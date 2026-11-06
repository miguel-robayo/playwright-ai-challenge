/** Nombres de los proyectos de Playwright. Se comparten entre la configuración y los fixtures. */
export const PROJECTS = {
  setup: 'setup',
  cleanup: 'cleanup',
  functional: 'functional',
  ai: 'ai',
  aiUnit: 'ai-unit',
} as const;

export type ProjectName = (typeof PROJECTS)[keyof typeof PROJECTS];
