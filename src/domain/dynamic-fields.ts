import { MetaobjectFieldSchema } from "./types";

type FieldEntry = {
  value: unknown;
  schema?: MetaobjectFieldSchema;
}

/**
 * The DynamicFields class is a dynamic field storage system that allows for storing a set of dynamic fields
 * into a metaobject. This is useful for semi-dynamic metaobject definition, where we want to allow merchants to
 * potentially add their own custom fields.
 */
class DynamicFields implements Iterable<[string, unknown]> {
  private fields = new Map<string, FieldEntry>();

  constructor(initialFields?: { [key: string]: FieldEntry }) {
    if (initialFields) {
      for (const key in initialFields) {
        this.fields.set(key, initialFields[key]);
      }
    }

    // Return a Proxy that intercepts property gets and sets.
    return new Proxy(this, {
      get: (target, prop, receiver) => {
        if (typeof prop === 'string') {
          // If the property exists on the class (methods, etc.), return it.
          if (prop in target && typeof (target as any)[prop] === 'function') {
            return Reflect.get(target, prop, receiver);
          }

          // Otherwise, if it's a dynamic field, return its value.
          if (target.fields.has(prop)) {
            return target.fields.get(prop)!.value;
          }
        }
        return Reflect.get(target, prop, receiver);
      },

      set: (target, prop, value, receiver) => {
        if (typeof prop === 'string') {
          // If the property is defined on the instance (like methods), don't override it.
          if (prop in target && typeof (target as any)[prop] !== 'undefined') {
            return Reflect.set(target, prop, value, receiver);
          }

          // Otherwise, update or create the dynamic field.
          if (target.fields.has(prop)) {
            const entry = target.fields.get(prop)!;
            target.fields.set(prop, { ...entry, value });
          } else {
            // Create new dynamic field with no schema.
            target.fields.set(prop, { value });
          }
          return true;
        }

        return Reflect.set(target, prop, value, receiver);
      },

      ownKeys: (target) => {
        // Combine class own keys with dynamic field keys.
        const instanceKeys = Reflect.ownKeys(target);
        const fieldKeys = Array.from(target.fields.keys());
        return [...new Set([...instanceKeys, ...fieldKeys])];
      },

      getOwnPropertyDescriptor: (target, prop) => {
        if (typeof prop === 'string' && target.fields.has(prop)) {
          return {
            enumerable: true,
            configurable: true
          };
        }
        return Object.getOwnPropertyDescriptor(target, prop);
      }
    });
  }

  /**
   * Check if a dynamic field exists in the bag, by its key
   */
  has(key: string): boolean {
    return this.fields.has(key);
  }

  /**
   * Get the value of a specific dynamic field by its key
   */
  get<T = unknown>(key: string): T | undefined {
    return this.fields.get(key)?.value as T | undefined;
  }

  /** 
   * Set or update a dynamic field by its key
   */
  set(key: string, value: unknown): void {
    const existing = this.fields.get(key);

    if (existing) {
      this.fields.set(key, { value, schema: existing.schema });
    } else {
      this.fields.set(key, { value });
    }
  }

  /**
   * Get the schema of the field. For now, it only returns the `type`, `key`, `description` and `required` properties
   */
  getSchema(key: string): MetaobjectFieldSchema | undefined {
    return this.fields.get(key)?.schema;
  }

  /** 
   * Implement the iterable protocol to support for...of.
   */
  [Symbol.iterator](): Iterator<[string, unknown]> {
    const entries = this.fields.entries();
    return {
      next(): IteratorResult<[string, unknown]> {
        const result = entries.next();
        if (result.done) {
          return { done: true, value: undefined as any };
        }
        const [key, { value }] = result.value;
        return { done: false, value: [key, value] };
      }
    };
  }
}