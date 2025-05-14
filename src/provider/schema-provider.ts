import { MetafieldDefinitionIdentifier } from '~/types/admin.types';
import type { MetafieldDefinition, MetafieldDefinitionSchema } from '~/types/metafield-definitions';
import type { MetaobjectDefinitionSchema, MetaobjectDefinitionSchemaEntry } from '~/types/metaobject-definitions';
import { AllowRawEnum } from '~/types/utils';

/**
 * Make the schema provider available globally to the different repositories
 */
export class SchemaProvider {
  static metafieldDefinitions?: MetafieldDefinitionSchema;
  static metaobjectDefinitions?: MetaobjectDefinitionSchema;

  static hasMetafieldDefinition(identifier: AllowRawEnum<MetafieldDefinitionIdentifier>): boolean {
    return !!SchemaProvider.metafieldDefinitions?.some(
      (entry) => entry.ownerType === identifier.ownerType && entry.namespace === identifier.namespace && entry.key === identifier.key
    );
  }

  static getMetafieldDefinitionEntry(identifier: AllowRawEnum<MetafieldDefinitionIdentifier>): MetafieldDefinition {
    const definition = SchemaProvider.metafieldDefinitions?.find(
      (entry) => entry.ownerType === identifier.ownerType && entry.namespace === identifier.namespace && entry.key === identifier.key
    );

    if (!definition) {
      throw new Error(`Metafield definition for namespace "${identifier.namespace}" and key "${identifier.key}" not found`);
    }

    return definition;
  }

  static hasMetaobjectDefinition(type: string): boolean {
    return !!SchemaProvider.metaobjectDefinitions?.some((entry) => entry.type === type);
  }
  
  static getMetaobjectDefinitionEntry(type: string): MetaobjectDefinitionSchemaEntry {
    const definition = SchemaProvider.metaobjectDefinitions?.find((entry) => entry.type === type);

    if (!definition) {
      throw new Error(`Metaobject definition for type "${type}" not found`);
    }

    return definition;
  }
}