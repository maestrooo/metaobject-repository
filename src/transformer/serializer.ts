import { toSnake, snake } from 'snake-camel';
import { MetaobjectFieldInput } from '~/types/admin.types';

/**
 * Serialize a single value to the format suitable for Shopify
 */
export function serializeValue(value: any): string {
  if ((value === null || value === undefined || (Array.isArray(value) && value.length === 0))) {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  // Otherwise, we make sure that we snakeCase
  if (Array.isArray(value)) {
    return JSON.stringify(value.map(toSnake));
  }

  return JSON.stringify(toSnake(value));
}

/**
 * Serialize a list of fields to a format suitable for Shopify. It expects fields to be formatted like { name: "Value" }. The serializer
 * will convert this to a list of object with the format { key: "name", value: "Value" }
 *
 * Null or undefined values are always converted to an empty string, allowing to remove the value from the object
 */
export function serializeFields(data: object): MetaobjectFieldInput[] {
  return Object.entries(data).map(([key, value]) => {
    return {
      key: snake(key),
      value: serializeValue(value),
    };
  });
}