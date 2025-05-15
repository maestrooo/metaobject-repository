import { toCamel, camel } from "snake-camel";
import type { Metafield, Metaobject } from "~/types/admin.types";

function deserializeReference(valueForKey: any): any {
  if (valueForKey?.['__typename'] === 'Metaobject') {
    return deserializeMetaobject(valueForKey);
  } else {
    return valueForKey;
  }
}

/**
 * Deserialize a metafield. It will convert jsonValue to camelCase and resolve the references
 */
export function deserializeMetafield(metafield: Metafield): any {
  const data: any = metafield;

  if (Array.isArray(data.jsonValue)) {
    data.jsonValue = data.jsonValue.map(toCamel);
  } else if (typeof data.jsonValue === 'object') {
    data.jsonValue = toCamel(data.jsonValue);
  }
  
  // Handle the references
  if (data.hasOwnProperty('reference') && data['reference'] !== null) {
    data['reference'] = deserializeReference(data['reference']);
  } else if (data.hasOwnProperty('references') && data['references'] !== null) {
    data['references'] = data?.['references']?.['nodes']?.map(deserializeReference) ?? [];
  }

  return data;
}

/**
 * Deserialize a metaobject. This automatically camelCase all keys and fill the references
 */
export function deserializeMetaobject<T>(metaobject: Metaobject): T {
  let data: { [key: string]: any } = {
    system: {
      id: metaobject.id,
      type: metaobject.type,
      handle: metaobject.handle,
      displayName: metaobject.displayName,
      /*createdAt: new Date(metaobject.createdAt),*/
      updatedAt: new Date(metaobject.updatedAt),
      capabilities: metaobject.capabilities ?? {},
      thumbnailField: metaobject?.thumbnailField?.thumbnail ?? null
    }
  }

  metaobject.fields?.forEach((field) => {
    const key = camel(field.key);

    if (field.type.startsWith('list.')) {
      data[key] = field.jsonValue ?? [];
    } else if (field.type === 'json') {
      if (Array.isArray(field.jsonValue)) {
        data[key] = field.jsonValue.map(toCamel);
      } else {
        data[key] = toCamel(field.jsonValue);
      }
    } else if (field.type === 'boolean') {
      // By default Shopify saves booleans as strings, so we need to convert them to boolean
      data[key] = field.jsonValue === 'true' || field.jsonValue === true;
    } else {
      data[key] = field.jsonValue;
    }
  });

  for (const key in metaobject) {
    if (!key.startsWith('_') || key === '__typename') {
      continue;
    }

    // Fields that start with _ are references and must be populated
    const keyName = key.substring(1);
    const valueForKey = metaobject[key];

    if (valueForKey === null) {
      // In case of mixed references some references might not exist on a given type, so we simply ignore
    } else if (valueForKey.hasOwnProperty('reference')) {
      data[keyName] = deserializeReference(valueForKey['reference']);
    } else if (valueForKey.hasOwnProperty('references')) {
      data[keyName] = valueForKey['references']?.['nodes'].map(deserializeReference) ?? [];
    }
  }

  return data as any;
}