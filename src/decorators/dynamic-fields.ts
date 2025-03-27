import { classMetadataFactory } from "../class-metadata-factory";
import { MetaobjectClassMetadata } from "../old_types";

type DecoratorDynamicFieldsOptions = {
  keyPrefix: string
}

export function DynamicFields(options: DecoratorDynamicFieldsOptions) {
  return (target: undefined, context: ClassFieldDecoratorContext) => {
    if (context.kind !== 'field') {
      throw new Error('@DynamicFields() can only be used as a field decorator');
    }
    
    const classMetadata = classMetadataFactory.upsertMetadataFor(context.metadata);

    setTimeout(() => {
      if (classMetadata.kind === 'embeddable') {
        throw new Error('@DynamicFields() can only be used in metaobjects, not in embeddable.');
      }

      const metaobjectClassMetadata = classMetadata as MetaobjectClassMetadata;

      if (metaobjectClassMetadata.dynamicFieldsDefinition) {
        throw new Error('Only one @DynamicFields() decorator is allowed per class');
      }

      metaobjectClassMetadata.dynamicFieldsDefinition = {
        propertyName: context.name as string,
        keyPrefix: options.keyPrefix
      };
    }, 0);
  }
}