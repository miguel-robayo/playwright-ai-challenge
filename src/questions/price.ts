/** Convierte un precio mostrado por la aplicación ("Rs. 1000") en número de rupias. */
export function parsePrice(text: string): number {
  const match = /^Rs\.\s*(\d+)$/.exec(text.trim());
  if (!match?.[1]) throw new Error(`Formato de precio no reconocido: "${text}"`);
  return Number(match[1]);
}
