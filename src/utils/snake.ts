import { isPlainObject } from "~/utils/is-plain-object";

export function toSnakeCaseKey(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1_$2")
    .toLowerCase();
}

export function snakeKeysDeep<T extends unknown>(input: T): T {
  if (Array.isArray(input)) {
    return input.map(snakeKeysDeep) as T;
  }

  if (isPlainObject(input)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input)) {
      out[toSnakeCaseKey(k)] = snakeKeysDeep(v);
    }

    return out as T;
  }

  // Primitives, Date, Map, Set, etc. – leave as is (JSON.stringify will handle or fail accordingly)
  return input;
}