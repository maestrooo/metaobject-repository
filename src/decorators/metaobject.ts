import { MetaobjectAccess, MetaobjectAdminAccess, MetaobjectCapabilities, MetaobjectStorefrontAccess } from "~/types/admin.types";
import { classMetadataFactory } from "../class-metadata-factory";
import { MetaobjectClassMetadata } from "../types";

type DecoratorMetaobjectOptions = {
  type: string;
  name: string;
  description?: string;
  capabilities?: MetaobjectCapabilities;
  access?: MetaobjectAccess;
}

export function Metaobject(options: DecoratorMetaobjectOptions) { 
  return (target: Function, context: ClassDecoratorContext) => {
    if (context.kind !== 'class') {
      throw new Error('@Metaobject() can only be used as a class decorator');
    }

    const metaobjectClassMetadata = classMetadataFactory.upsertMetadataFor(context.metadata) as MetaobjectClassMetadata;

    metaobjectClassMetadata.kind = 'metaobject';
    metaobjectClassMetadata.fieldDefinitions ??= [];
    metaobjectClassMetadata.definition = {
      type: options.type,
      name: options.name ?? '',
      displayNameKey: options.displayNameKey ?? '',
      description: options.description ?? '',
      access: options.access ?? {
        admin: MetaobjectAdminAccess.MerchantRead,
        storefront: MetaobjectStorefrontAccess.PublicRead
      },
      capabilities: options.capabilities ?? {
        publishable: {
          enabled: true
        },
        translatable: {
          enabled: false
        }
      }
    }
  }
}