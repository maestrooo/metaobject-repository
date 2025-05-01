import { toSnake } from 'snake-camel';
import { MetaobjectFieldInput } from '~/types/admin.types';

/**
 * Serialize a list of fields to a format suitable for Shopify. It expects fields to be formatted like { name: "Value" }. The serializer
 * will convert this to a list of object with the format { key: "name", value: "Value" }
 *
 * Null or undefined values are always converted to an empty string, allowing to remove the value from the object
 */
export function serializeFields(data: object): MetaobjectFieldInput[] {
  return Object.entries(toSnake(data)).map(([key, value]) => {
    return {
      key,
      value: (value === null || value === undefined) ? '' : (typeof value === 'string' ? value : JSON.stringify(value))
    };
  });
}