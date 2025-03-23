import { classMetadataFactory } from "../class-metadata-factory";
import { EmbeddableClassMetadata } from "../types";

type DecoratorEmbeddableOptions = {
  schema?: object
}

export function Embeddable(options: DecoratorEmbeddableOptions = {}) { 
  return (target: Function, context: ClassDecoratorContext) => {
    if (context.kind !== 'class') {
      throw new Error('@Embeddable() can only be used as a class decorator');
    }

    const embeddableClassMetadata = classMetadataFactory.upsertMetadataFor(context.metadata) as EmbeddableClassMetadata;

    embeddableClassMetadata.kind = 'embeddable';
    embeddableClassMetadata.fieldDefinitions ??= [];
    embeddableClassMetadata.schema = options.schema;
  }
}