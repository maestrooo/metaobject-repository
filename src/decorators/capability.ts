type DecoratorCapabilityOptions = 'publishable' | 'onlineStore';

export function Capability(options: DecoratorCapabilityOptions) {
  return (target: undefined, context: ClassFieldDecoratorContext) => {
    context.metadata.classMetadata ??= {};

    if (context.kind !== 'field') {
      throw new Error('@Capability() can only be used as a field decorator');
    }

    if (context.name === 'system') {
      throw new Error(`Field key "system" is reserved and cannot be used. Use a different property name.`);
    }

    context.metadata.classMetadata.capabilities ??= []; // Ensure that the metadata has a pending fields array
    context.metadata.classMetadata.capabilities.push({
      propertyName: context.name as string,
      capability: options
    });
  }
}