import { MetaobjectCapabilities, MetaobjectAdminAccess, MetaobjectStorefrontAccess } from "../types/admin.types";
import { Constructor, EmbeddableClassMetadata, FieldDefinition, FieldEmbeddedDefinition, MetaobjectClassMetadata } from "../types";
import { ObjectRepository } from "../persistence/object-repository";

Symbol.metadata ??= Symbol('Symbol.metadata'); // Shim metadata

type DecoratorMetaobjectOptions = {
  type: string;
  name: string;
  description?: string;
  capabilities?: Partial<MetaobjectCapabilities>;
  access?: {
    admin?: MetaobjectAdminAccess | `${MetaobjectAdminAccess}`;
    storefront?: MetaobjectStorefrontAccess | `${MetaobjectStorefrontAccess}`
  }
  repositoryClass?: Constructor<ObjectRepository<any>>;
}

export function Metaobject(options: DecoratorMetaobjectOptions) { 
  return (target: new (...args: any[]) => any, context: ClassDecoratorContext) => {
    if (context.kind !== 'class') {
      throw new Error('@Metaobject() can only be used as a class decorator');
    }

    if (!context.metadata.classMetadata.handle || !context.metadata.classMetadata.id) {
      throw new Error(`@Metaobject() requires a @Handle() and an @Id() field decorator`);
    }

    context.addInitializer(function() {
      // We have to post-process some fields pointing to embedded, to eventually use the schema of the embeddable class
      (context.metadata.classMetadata as MetaobjectClassMetadata).fields.forEach((field: FieldDefinition) => {
        if (isEmbeddedField(field)) {
          const embeddedClassMetadata = field.embedded[Symbol.metadata]?.classMetadata as EmbeddableClassMetadata;

          embeddedClassMetadata.strict = embeddedClassMetadata.strict;
          
          if (embeddedClassMetadata.schema) {
            field.validations = { schema: embeddedClassMetadata.schema };
          }
        }
      });
    })

    context.metadata.classMetadata.kind = 'metaobject';
    context.metadata.classMetadata.repositoryClass = options.repositoryClass;
    context.metadata.classMetadata.definition = {
      type: options.type,
      name: options.name,
      description: options.description ?? '',
      access: { admin: MetaobjectAdminAccess.MerchantRead, storefront: MetaobjectStorefrontAccess.PublicRead, ...options.access },
      capabilities: { publishable: { enabled: true }, translatable: { enabled: false }, ...options.capabilities }
    }
  }
}

function isEmbeddedField(field: FieldDefinition): field is FieldEmbeddedDefinition {
  return 'embedded' in field;
}