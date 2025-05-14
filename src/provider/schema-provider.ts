import type { MetafieldDefinitionSchema } from '~/types/metafield-definitions';
import type { MetaobjectDefinitionSchema } from '~/types/metaobject-definitions';

/**
 * Make the schema provider available globally to the different repositories
 */
export class SchemaProvider {
  static metafieldDefinitions?: MetafieldDefinitionSchema;
  static metaobjectDefinitions?: MetaobjectDefinitionSchema;
}