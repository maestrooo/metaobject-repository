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

    const { resolve } = classMetadataFactory.getMetadataFor(context.metadata);

    const embeddableClassMetadata: EmbeddableClassMetadata = {
      kind: 'embeddable',
      schema: options.schema
    };

    resolve(embeddableClassMetadata);
  }
}