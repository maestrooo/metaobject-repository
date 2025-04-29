import { camel } from "snake-camel";
import { Metaobject } from "~/types/admin.types";

export function deserialize<T>(metaobject: Metaobject): T {
  let data: { [key: string]: any } = {
    system: {
      id: metaobject.id,
      handle: metaobject.handle,
      displayName: metaobject.displayName,
      createdAt: new Date(metaobject.createdAt),
      updatedAt: new Date(metaobject.updatedAt),
      capabilities: metaobject.capabilities ?? [],
      thumbnailField: metaobject.thumbnailField?.thumbnail ?? null
    }
  }

  metaobject.fields?.forEach((field) => {
    data[camel(field.key)] = field.jsonValue;
  });

  for (const key in metaobject) {
    if (!key.startsWith('_') || key === '__typename') {
      continue;
    }

    // Fields that start with _ are references and must be populated
    const keyName = key.substring(1);
    const valueForKey = metaobject[key];

    const serializeReference = (valueForKey: any) => {
      if (valueForKey['__typename'] === 'Metaobject') {
        return deserialize(valueForKey);
      } else {
        return valueForKey;
      }
    }

    if (valueForKey.hasOwnProperty('reference')) {
      data[keyName] = serializeReference(valueForKey['reference']);
    } else if (valueForKey.hasOwnProperty('references')) {
      data[keyName] = valueForKey['references']?.['nodes'].map(serializeReference) ?? [];
    }
  }

  return data as any;
}