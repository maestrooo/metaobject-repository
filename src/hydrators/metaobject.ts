import { Metaobject } from "../types/admin.types";
import { classMetadataFactory } from "../class-metadata-factory";
import { EmbeddableClassMetadata, FieldDefinition, FieldEmbeddedDefinition, FieldMetaobjectReferenceDefinition, MetaobjectClassMetadata } from "../types";
import { ManagedMetaobject, MetaobjectSystemData } from "../persistence/types";
import { toCamel } from "snake-camel";

/**
 * This function hydrate a Shopify metaobject, to an actual entity
 */
export function hydrateMetaobject<T>(ctor: { new (...args: any[]): T }, object: T, metaobject: Metaobject): ManagedMetaobject<T> {
  const classMetadata = classMetadataFactory.getMetadataFor(ctor) as MetaobjectClassMetadata;

  const system: MetaobjectSystemData = {
    createdAt: new Date(metaobject.createdAt),
    updatedAt: new Date(metaobject.updatedAt),
    displayName: metaobject.displayName,
    thumbnail: {
      hex: metaobject.thumbnailField?.thumbnail?.hex,
      image: metaobject.thumbnailField?.thumbnail?.file?.preview?.image ? {
        id: metaobject.thumbnailField?.thumbnail?.file?.preview?.image.id,
        altText: metaobject.thumbnailField?.thumbnail?.file?.preview?.image.altText,
        url: metaobject.thumbnailField?.thumbnail?.file?.preview?.image.url,
        width: metaobject.thumbnailField?.thumbnail?.file?.preview?.image.width,
        height: metaobject.thumbnailField?.thumbnail?.file?.preview?.image.height,
      } : null
    }
  }

  object.system = system;

  object[classMetadata.id.propertyName] = metaobject.id;
  object[classMetadata.handle.propertyName] = metaobject.handle;

  classMetadata.capabilities?.forEach(capability => {
    if (capability.capability === 'onlineStore') {
      object[capability.propertyName] = metaobject.capabilities.onlineStore;
    }

    if (capability.capability === 'publishable') {
      object[capability.propertyName] = metaobject.capabilities.publishable?.status;
    }
  });

  classMetadata.fields.forEach(fieldDefinition => {
    if (fieldDefinition.isReference) {
      if (`_${fieldDefinition.propertyName}` in metaobject) {
        const metaobjectField = metaobject[`_${fieldDefinition.propertyName}`];
        object[fieldDefinition.propertyName] = hydrateReference(fieldDefinition, metaobjectField);
      } else {
        const metaobjectField = metaobject.fields.find(f => f.key === fieldDefinition.key);
        object[fieldDefinition.propertyName] = metaobjectField?.jsonValue;
      }
    } else {
      const metaobjectField = metaobject.fields.find(f => f.key === fieldDefinition.key);

      if (isEmbeddedField(fieldDefinition)) {
        object[fieldDefinition.propertyName] = hydrateEmbeddable(fieldDefinition, metaobjectField);
      } else {
        object[fieldDefinition.propertyName] = metaobjectField?.jsonValue;
      }
    }
  });

  return object;
}

function hydrateReference(fieldDefinition: FieldDefinition, metaobjectField: any): object | null {
  if (fieldDefinition.list) {
    return isMetaobjectField(fieldDefinition)
      ? metaobjectField?.references?.nodes.map((reference: Metaobject) => {
        return hydrateMetaobject(fieldDefinition.metaobject, new fieldDefinition.metaobject(), reference);
      }) ?? []
      : metaobjectField?.references?.nodes ?? [];
  } else {
    return isMetaobjectField(fieldDefinition)
      ? metaobjectField.reference ? hydrateMetaobject(fieldDefinition.metaobject, new fieldDefinition.metaobject(), metaobjectField.reference) : null
      : metaobjectField?.reference ? metaobjectField.reference : metaobjectField.jsonValue;
  }
}

function hydrateEmbeddable(fieldDefinition: FieldEmbeddedDefinition, metaobjectField: any): object {
  const embeddableClassMetadata = classMetadataFactory.getMetadataFor(fieldDefinition.embedded) as EmbeddableClassMetadata;
  const embeddableObject = new fieldDefinition.embedded() as object;
  const formattedJson = toCamel(metaobjectField?.jsonValue || {});

  if (embeddableClassMetadata.strict) {
    // When strict, we only assign the properties that exist in the object
    const allowedKeys = Object.keys(embeddableObject);

    const filteredJson = Object.fromEntries(
      Object.entries(formattedJson).filter(([key]) =>
        allowedKeys.includes(key)
      )
    );

    return Object.assign(embeddableObject, filteredJson);
  } else {
    // When not strict, we directly assign the metafield value, meaning that properties that don't exist in the object are added
    return Object.assign(embeddableObject, formattedJson);
  }
}

function isEmbeddedField(field: FieldDefinition): field is FieldEmbeddedDefinition {
  return 'embedded' in field;
}

function isMetaobjectField(field: FieldDefinition): field is FieldMetaobjectReferenceDefinition {
  return 'metaobject' in field;
}