export function Handle() {
  return (target: undefined, context: ClassFieldDecoratorContext) => {
    context.metadata.classMetadata ??= {};
    
    if (context.kind !== 'field') {
      throw new Error('@Handle() can only be used as a field decorator');
    }

    if (context.name === 'system') {
      throw new Error(`Field key "system" is reserved and cannot be used. Use a different property name.`);
    }

    if (context.metadata.classMetadata.handle) {
      throw new Error(`Only one field can be marked as @Handle()`);
    }

    context.metadata.classMetadata.handle = { propertyName: context.name as string };
  }
}