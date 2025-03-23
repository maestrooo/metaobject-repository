import { ClassMetadata } from "./types";

Symbol.metadata ??= Symbol('Symbol.metadata'); // Shim metadata

class ClassMetadataFactory {
  private classMetadataMap = new WeakMap<DecoratorMetadata, ClassMetadata>();

  hasMetadataFor<T>(entityOrMetadata: (new (...args: any[]) => T) | DecoratorMetadata): boolean {
    return this.classMetadataMap.has(this.resolveMetadata(entityOrMetadata));
  }

  getMetadataFor<T>(entityOrMetadata: (new (...args: any[]) => T) | DecoratorMetadata): ClassMetadata {
    const resolvedMetadata = this.resolveMetadata(entityOrMetadata);

    if (!this.classMetadataMap.has(resolvedMetadata)) {
      throw new Error(`Metadata does not exist for the entity. Make sure to add the @Metaobject or @Embeddable decorator to the entity class.`);
    }

    return this.classMetadataMap.get(resolvedMetadata)!;
  }

  upsertMetadataFor<T>(entityOrMetadata: (new (...args: any[]) => T) | DecoratorMetadata): ClassMetadata {
    if (this.hasMetadataFor(entityOrMetadata)) {
      return this.getMetadataFor(entityOrMetadata)!;
    }

    this.classMetadataMap.set(this.resolveMetadata(entityOrMetadata), {});

    return this.getMetadataFor(entityOrMetadata)!;
  }

  private resolveMetadata<T>(entityOrMetadata: (new (...args: any[]) => T) | DecoratorMetadata): DecoratorMetadata {
    return (typeof entityOrMetadata === 'function' ? entityOrMetadata[Symbol.metadata] : entityOrMetadata) as DecoratorMetadata;
  }
}

export const classMetadataFactory = new ClassMetadataFactory();