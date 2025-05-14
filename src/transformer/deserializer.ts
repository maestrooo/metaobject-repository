import { toCamel, camel } from "snake-camel";
import { Metaobject } from "~/types/admin.types";

export function deserialize<T>(metaobject: Metaobject): T {
  let data: { [key: string]: any } = {
    system: {
      id: metaobject.id,
      type: metaobject.type,
      handle: metaobject.handle,
      displayName: metaobject.displayName,
      /*createdAt: new Date(metaobject.createdAt),*/
      updatedAt: new Date(metaobject.updatedAt),
      capabilities: metaobject.capabilities ?? {},
      thumbnailField: metaobject.thumbnailField?.thumbnail ?? null
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

    const serializeReference = (valueForKey: any) => {
      if (valueForKey?.['__typename'] === 'Metaobject') {
        return deserialize(valueForKey);
      } else {
        return valueForKey;
      }
    }

    if (valueForKey === null) {
      // In case of mixed references some references might not exist on a given type, so we simply ignore
    } else if (valueForKey.hasOwnProperty('reference')) {
      data[keyName] = serializeReference(valueForKey['reference']);
    } else if (valueForKey.hasOwnProperty('references')) {
      data[keyName] = valueForKey['references']?.['nodes'].map(serializeReference) ?? [];
    }
  }

  return data as any;
}