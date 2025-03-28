import { Constructor, EmbeddableClassMetadata, FieldDefinition, FieldEmbeddedDefinition, MetaobjectAccess, MetaobjectCapabilities, MetaobjectClassMetadata } from "../types";
import { ObjectRepository } from "../persistence/object-repository";

Symbol.metadata ??= Symbol('Symbol.metadata'); // Shim metadata

type DecoratorMetaobjectOptions = {
  type: string;
  name: string;
  description?: string;
  capabilities?: MetaobjectCapabilities;
  access?: MetaobjectAccess;
  repositoryClass?: Constructor<ObjectRepository<any>>;
}

export function Metaobject(options: DecoratorMetaobjectOptions) { 
  return (target: new (...args: any[]) => any, context: ClassDecoratorContext) => {
    if (context.kind !== 'class') {
      throw new Error('@Metaobject() can only be used as a class decorator');
    }

    context.addInitializer(function() {
      // We have to post-process some fields pointing to embedded, to eventually use the schema of the embeddable class
      (context.metadata.classMetadata as MetaobjectClassMetadata).fields.forEach((field: FieldDefinition) => {
        if (isEmbeddedField(field)) {
          const embeddedClassMetadata = field.embedded[Symbol.metadata]?.classMetadata as EmbeddableClassMetadata;
          
          if (embeddedClassMetadata.schema) {
            field.validations = { schema: embeddedClassMetadata.schema };
          }
        }
      });
    })

    let classMetadata: MetaobjectClassMetadata = {
      kind: 'metaobject',
      type: options.type,
      name: options.name,
      description: options.description ?? '',
      access: { admin: 'MERCHANT_READ', storefront: 'PUBLIC_READ', ...options.access },
      capabilities: { publishable: { enabled: true }, translatable: { enabled: false }, ...options.capabilities },
      repositoryClass: options.repositoryClass,
      fields: context.metadata.parsedFields as FieldDefinition[]
    }

    context.metadata.classMetadata = classMetadata;
    delete context.metadata.parsedFields; // It's already processed and incorporated into the metadata
  }
}

function isEmbeddedField(field: FieldDefinition): field is FieldEmbeddedDefinition {
  return 'embedded' in field;
}