import { Constructor, MetaobjectAccess, MetaobjectCapabilities, MetaobjectClassMetadata } from "../types";
import { classMetadataFactory } from "../class-metadata-factory";
import { ObjectRepository } from "../persistence/object-repository";

type DecoratorMetaobjectOptions = {
  type: string;
  name: string;
  description?: string;
  capabilities?: MetaobjectCapabilities;
  access?: MetaobjectAccess;
  repositoryClass?: Constructor<ObjectRepository<any>>;
}

export function Metaobject(options: DecoratorMetaobjectOptions) { 
  return (target: Function, context: ClassDecoratorContext) => {
    if (context.kind !== 'class') {
      throw new Error('@Metaobject() can only be used as a class decorator');
    }

    const { resolve } = classMetadataFactory.getMetadataFor(context.metadata);

    const metaobjectClassMetadata: MetaobjectClassMetadata = {
      kind: 'metaobject',
      type: options.type,
      name: options.name,
      description: options.description ?? '',
      access: { admin: 'MERCHANT_READ', storefront: 'PUBLIC_READ', ...options.access },
      capabilities: { publishable: { enabled: true }, translatable: { enabled: false }, ...options.capabilities },
      repositoryClass: options.repositoryClass,
      fields: []
    };

    resolve(metaobjectClassMetadata);
  }
}