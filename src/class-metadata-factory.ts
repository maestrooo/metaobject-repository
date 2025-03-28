import { ClassMetadata } from "./types";

/**
 * Factory to create class metadata. Class metadata holds all the mapping (fields, references...) used to interact
 * with the metaobject API.
 */
class ClassMetadataFactory {
  private classMetadataMap = new WeakMap<DecoratorMetadata, ClassMetadata>();

  /**
   * This get a metadata (if it exists) or create a new one. Please note that due to how decorators work, this
   * return a resolver AND a promise that resolve to a class metadata
   */
  getMetadataFor<T>(entityOrMetadata: (new (...args: any[]) => T) | DecoratorMetadata): ClassMetadata {
    const metadata = this.resolveMetadata(entityOrMetadata);

    if (!metadata.classMetadata) {
      throw new Error(`No class metadata could be found for "${entityOrMetadata.name}". Decorate the class with @Metaobject.`);
    }

    return metadata.classMetadata as ClassMetadata;
  }

  /**
   * Resolve a class or name to a decorator metadata
   */
  private resolveMetadata<T>(entityOrMetadata: (new (...args: any[]) => T) | DecoratorMetadata): DecoratorMetadata {
    return (typeof entityOrMetadata === 'function' ? entityOrMetadata[Symbol.metadata] : entityOrMetadata) as DecoratorMetadata;
  }
}

export const classMetadataFactory = new ClassMetadataFactory();