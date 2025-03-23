export function camelToSnake(value: string): string {
  return value.replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase();
}

export function capitalizeField(value: string): string {
  return value
    .replace(/([A-Z])/g, ' $1')  // Add space before uppercase letters
    .replace(/^./, match => match.toUpperCase()) // Capitalize the first letter
    .trim();
}