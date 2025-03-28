Symbol.metadata ??= Symbol('Symbol.metadata'); // Shim metadata

type DecoratorEmbeddableOptions = {
  schema?: object
}

export function Embeddable(options: DecoratorEmbeddableOptions = {}) { 
  return (target: new (...args: any[]) => any, context: ClassDecoratorContext) => {
    if (context.kind !== 'class') {
      throw new Error('@Embeddable() can only be used as a class decorator');
    }

    context.metadata.classMetadata = {
      kind: 'embeddable',
      schema: options.schema
    }
  }
}