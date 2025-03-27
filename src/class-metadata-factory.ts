import { ClassMetadata } from "./types";

Symbol.metadata ??= Symbol('Symbol.metadata'); // Shim metadata

/**
 * Factory to create class metadata. Class metadata holds all the mapping (fields, references...) used to interact
 * with the metaobject API.
 */
class ClassMetadataFactory {
  private classMetadataMap = new WeakMap<DecoratorMetadata, PromiseWithResolvers<ClassMetadata>>();

  /**
   * Check if a metadata for a given class exists already
   */
  hasMetadataFor<T>(entityOrMetadata: (new (...args: any[]) => T) | DecoratorMetadata): boolean {
    return this.classMetadataMap.has(this.resolveMetadata(entityOrMetadata));
  }

  /**
   * This get a metadata (if it exists) or create a new one. Please note that due to how decorators work, this
   * return a resolver AND a promise that resolve to a class metadata
   */
  getMetadataFor<T>(entityOrMetadata: (new (...args: any[]) => T) | DecoratorMetadata): PromiseWithResolvers<ClassMetadata> {
    const resolvedMetadata = this.resolveMetadata(entityOrMetadata);

    if (!this.classMetadataMap.has(resolvedMetadata)) {
      // If it does not exist yet, we create a new entry with a resolver
      this.classMetadataMap.set(resolvedMetadata, Promise.withResolvers());
    }

    return this.classMetadataMap.get(resolvedMetadata)!;
  }

  /**
   * Resolve a class or name to a decorator metadata
   */
  private resolveMetadata<T>(entityOrMetadata: (new (...args: any[]) => T) | DecoratorMetadata): DecoratorMetadata {
    return (typeof entityOrMetadata === 'function' ? entityOrMetadata[Symbol.metadata] : entityOrMetadata) as DecoratorMetadata;
  }
}

export const classMetadataFactory = new ClassMetadataFactory();