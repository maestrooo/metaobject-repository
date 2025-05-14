export { ClientProvider } from './provider/client-provider';
export { SchemaProvider } from './provider/schema-provider';

export type { MetaobjectFieldDefinition, MetaobjectDefinitionSchemaEntry, MetaobjectDefinitionSchema } from './types/metaobject-definitions';
export type { InferObjectType, OnPopulateFunc } from './types/metaobject-repository';
export { metaobjectDefinitionManager, MetaobjectDefinitionManager } from './metaobjects/metaobject-definition-manager';
export { MetaobjectRepository } from './metaobjects/metaobject-repository';

export type { MetafieldDefinition as MetafieldDefinitionSchemaEntry, MetafieldDefinitionSchema } from './types/metafield-definitions';
export { metafieldDefinitionManager, MetafieldDefinitionManager } from './metafields/metafield-definition-manager';
export { metafieldRepository, MetafieldRepository } from './metafields/metafield-repository';

export { storefrontTokenRepository, StorefrontTokenRepository } from './storefront-tokens/storefront-token-repository';

export { NotFoundException, UserErrorsException, DefinitionTakenException } from './exception';

export { flattenFields } from './utils/flatten';
export { fieldsDifference } from './utils/difference';
export { extractFindParams } from './utils/params';