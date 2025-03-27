/**
 * Transform a camelCase string into a human-readable sentence (eg. 'participationPrice' -> 'Participation price').
 */
export function wordify(value: string): string {
  const words = value
    .replace(/([a-z])([A-Z])/g, '$1 $2') // insert space before capital letters
    .toLowerCase();

  return words.charAt(0).toUpperCase() + words.slice(1); // capitalize first letter
}