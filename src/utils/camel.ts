import { isPlainObject } from "~/utils/is-plain-object";

export function toCamelCaseKey(key: string): string {
  return key
    .trim()
    .replace(/[\s._-]+(.)/g, (_, c) => c.toUpperCase())
    .replace(/^[^a-zA-Z_]+/, "_$&")
    .replace(/^[A-Z]/, (m) => m.toLowerCase());
}

export function camelKeysDeep<T>(input: T): T {
  if (Array.isArray(input)) {
    return input.map(camelKeysDeep) as T;
  }
  
  if (isPlainObject(input)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input)) {
      out[toCamelCaseKey(k)] = camelKeysDeep(v);
    }

    return out as T;
  }
  
  return input;
}