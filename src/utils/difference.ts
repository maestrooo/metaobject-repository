/**
 * Returns a difference between two objects, useful to create a diff for fields (as metaobject fields only have
 * one level, this simple check is enough).
 */
export function fieldsDifference<T extends Record<string, any>>(obj1: T, obj2: T): Partial<T> {
  const result: Partial<T> = {};

  (Object.keys(obj2) as Array<keyof T>).forEach((key) => {
    if (JSON.stringify(obj1[key]) !== JSON.stringify(obj2[key])) {
      result[key] = obj2[key];
    }
  });

  return result;
}