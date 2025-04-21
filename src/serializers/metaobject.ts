import { classMetadataFactory } from "../class-metadata-factory";
import { Constructor, MetaobjectClassMetadata } from "../types";
import { MetaobjectFieldInput } from "../types/admin.types";

export function serializeMetaobjectFields<T>(ctor: Constructor<T>, metaobject: T): MetaobjectFieldInput[] {
  const classMetadata = classMetadataFactory.getMetadataFor(ctor) as MetaobjectClassMetadata;

  return classMetadata.fields.map(fieldDefinition => {
    let value;
    
    const fieldValue = metaobject[fieldDefinition.propertyName];

    if (fieldDefinition.isReference) {
      if (fieldDefinition.list) {
        value = fieldValue?.map((reference: any) => {
          return typeof reference === 'string' ? reference : reference?.id;
        }) ?? [];
      } else {
        // If the reference is encodded as a string, it is already the ID, otherwise we need to get the ID from the reference
        value = typeof fieldValue === 'string' ? fieldValue : fieldValue?.id;
      }
    } else {
      value = fieldValue;
    }

    return {
      key: fieldDefinition.key,
      value: (typeof value === 'string' ? value : JSON.stringify(value)) ?? ''
    } as MetaobjectFieldInput;
  });
}