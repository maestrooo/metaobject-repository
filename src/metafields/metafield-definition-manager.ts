import { QueryBuilder } from "raku-ql";
import { MetafieldAccessInput, MetafieldDefinitionCreatePayload, MetafieldDefinitionDeletePayload, MetafieldDefinitionIdentifier, 
  MetafieldDefinitionInput, MetafieldDefinitionPinPayload, MetafieldDefinitionUnpinPayload, MetafieldDefinitionUpdateInput, 
  MetafieldDefinitionUpdatePayload, MetafieldDefinitionValidationInput, MetafieldOwnerType, MetaobjectDefinition 
} from "~/types/admin.types";
import { DefinitionTakenException } from "~/exception";
import { convertValidations } from "~/utils/metafield-validations";
import { doRequest } from "~/utils/request";
import { SchemaProvider } from "~/provider/schema-provider";

export class MetafieldDefinitionManager {
  private metaobjectDefinitionIdCache = new Map<string, string>();

  /**
   * --------------------------------------------------------------------------------------------------------
   * HIGHER-LEVEL METHODS
   * --------------------------------------------------------------------------------------------------------
   */
  
  /**
   * Create a list of metafield definitions from a schema. To make it easier and reduce the query cost, the
   * manager will attempt to create all definitions and simply fail if any of them already exist.
   */
  async createFromSchema(): Promise<void> {
    const definitions = SchemaProvider.metafieldDefinitions;

    if (!definitions) {
      throw new Error('Metafield definitions schema is not set. Call SchemaProvider.setMetafieldDefinitions() first.');
    }

    const definitionsInput = await Promise.all(
      definitions.map(async (definition): Promise<MetafieldDefinitionInput> => {
        const rawValidations = convertValidations(definition);

        // We resolve the metaobject and mixed references types to their ID
        const validations = await Promise.all(
          rawValidations.map(async ({ name, value }): Promise<MetafieldDefinitionValidationInput> => {
            // We resolve the metaobject type to their definitions

            if (name === 'metaobject_definition_type') {
              const id = await this.getCachedMetaobjectDefinitionId(value);

              return { name: 'metaobject_definition_id', value: id as string };
            } else if (name === 'metaobject_definition_types') {
              const types: string[] = JSON.parse(value as string);
              const ids = await Promise.all(types.map((v) => this.getCachedMetaobjectDefinitionId(v)));

              return { name: 'metaobject_definition_ids', value: JSON.stringify(ids) };
            }

            // default: leave untouched
            return { name, value };
          })
        );

        return {
          name: definition.name,
          key: definition.key,
          namespace: definition.namespace,
          type: definition.type,
          ownerType: definition.ownerType as MetafieldOwnerType,
          description: definition.description,
          access: definition.access as MetafieldAccessInput,
          pin: definition.pin,
          capabilities: definition.capabilities,
          constraints: definition.constraints,
          validations,
        };
      })
    );

    const settles = await Promise.allSettled(definitionsInput.map(definition => this.createDefinition(definition)));

    // If any non-DefinitionTaken rejection happened, re-throw the first one:
    for (const settle of settles) {
      if (settle.status === 'rejected' && !(settle.reason instanceof DefinitionTakenException)) {
        throw settle.reason;
      }
    }

    // Otherwise, we either have created all definitions, or some of them already existed, so we're done with the process
  };

  /**
   * --------------------------------------------------------------------------------------------------------
   * MUTATIONS
   * --------------------------------------------------------------------------------------------------------
   */

  /**
   * Create a metafield definition and return the ID of the created definition or throw an error if it already exists.
   */
  async createDefinition(definition: MetafieldDefinitionInput): Promise<string> {
    const builder = QueryBuilder.mutation('CreateMetafieldDefinition')
      .variables({ definition: 'MetafieldDefinitionInput!' })
      .operation<MetafieldDefinitionCreatePayload>('metafieldDefinitionCreate', { definition: '$definition' }, metafieldDefinition => {
        metafieldDefinition
          .object('createdDefinition', def => {
            def.fields('id');
          })
          .object('userErrors', error => {
            error.fields('field', 'message', 'code');
          });
      });

    // Perform the request
    const { createdDefinition, userErrors } = (await (await doRequest({ builder, variables: { definition } })).json()).data.metafieldDefinitionCreate;

    if (userErrors.length > 0) {
      console.warn(userErrors);

      if (userErrors[0].code === 'TAKEN') {
        throw new DefinitionTakenException(`Metafield definition with key "${definition.key}" and type "${definition.type}" already exists`);
      }

      throw new Error(`Cannot create the metafield definition. Reason: ${userErrors[0].message}`);
    }

    return createdDefinition.id;
  }

  /**
   * Update a metafield definition
   */
  async updateDefinition(definition: MetafieldDefinitionUpdateInput): Promise<void> {
    const builder = QueryBuilder.mutation('UpdateMetafieldDefinition')
      .variables({ definition: 'MetafieldDefinitionUpdateInput!' })
      .operation<MetafieldDefinitionUpdatePayload>('metafieldDefinitionUpdate', { definition: '$definition' }, metafieldDefinition => {
        metafieldDefinition
          .object('updatedDefinition', def => {
            def.fields('id');
          })
          .object('userErrors', error => {
            error.fields('field', 'message', 'code');
          });
      });

    // Perform the request
    const { userErrors } = (await (await doRequest({ builder, variables: { definition } })).json()).data.metafieldDefinitionUpdate;

    if (userErrors.length > 0) {
      console.warn(userErrors);
      throw new Error(`Cannot update the metafield definition. Reason: ${userErrors[0].message}`);
    }
  }

  /**
   * Delete a metafield definition by key, namespace and owner type and return the deleted definition ID.
   */
  async deleteDefinition(opts: MetafieldDefinitionIdentifier & { deleteAllAssociatedMetafields?: boolean }): Promise<string> {
    const { deleteAllAssociatedMetafields = false, ...identifier } = opts;

    const builder = QueryBuilder.mutation('DeleteMetafieldDefinition')
      .variables({ identifier: 'MetafieldDefinitionIdentifierInput', deleteAllAssociatedMetafields: 'Boolean' })
      .operation<MetafieldDefinitionDeletePayload>('metafieldDefinitionDelete', { identifier: '$identifier', deleteAllAssociatedMetafields: '$deleteAllAssociatedMetafields' }, metafieldDefinition => {
        metafieldDefinition
          .fields('deletedDefinitionId')
          .object('userErrors', error => {
            error.fields('field', 'message', 'code');
          });
      });

    // Perform the request
    const variables = { deleteAllAssociatedMetafields, identifier };
    const { deletedDefinitionId, userErrors } = (await (await doRequest({ builder, variables })).json()).data.metafieldDefinitionDelete;

    if (userErrors.length > 0) {
      console.warn(userErrors);
      throw new Error(`Cannot delete the metafield definition. Reason: ${userErrors[0].message}`);
    }

    return deletedDefinitionId;
  }

  /**
   * Pin a definition
   */
  async pinDefinition(identifier: MetafieldDefinitionIdentifier): Promise<void> {
    const builder = QueryBuilder.mutation('PinMetafieldDefinition')
      .variables({ identifier: 'MetafieldDefinitionIdentifierInput' })
      .operation<MetafieldDefinitionPinPayload>('metafieldDefinitionPin', { identifier: '$identifier' }, metafieldDefinition => {
        metafieldDefinition
          .object('userErrors', error => {
            error.fields('field', 'message', 'code');
          });
      });

    // Perform the request
    const variables = { identifier };
    const { userErrors } = (await (await doRequest({ builder, variables })).json()).data.metafieldDefinitionPin;

    if (userErrors.length > 0) {
      console.warn(userErrors);
      throw new Error(`Cannot pin the metafield definition. Reason: ${userErrors[0].message}`);
    }
  }

  /**
   * Unpin a definition
   */
  async unpinDefinition(identifier: MetafieldDefinitionIdentifier): Promise<void> {
    const builder = QueryBuilder.mutation('UnpinMetafieldDefinition')
      .variables({ identifier: 'MetafieldDefinitionIdentifierInput' })
      .operation<MetafieldDefinitionUnpinPayload>('metafieldDefinitionUnpin', { identifier: '$identifier' }, metafieldDefinition => {
        metafieldDefinition
          .object('userErrors', error => {
            error.fields('field', 'message', 'code');
          });
      });

    // Perform the request
    const variables = { identifier };
    const { userErrors } = (await (await doRequest({ builder, variables })).json()).data.metafieldDefinitionUnpin;

    if (userErrors.length > 0) {
      console.warn(userErrors);
      throw new Error(`Cannot unpin the metafield definition. Reason: ${userErrors[0].message}`);
    }
  }

  /**
   * --------------------------------------------------------------------------------------------------------------------------------
   * PRIVATE METHODS
   * --------------------------------------------------------------------------------------------------------------------------------
   */
  
  /**
   * Get the metaobject definition ID from the type, or null if it doesn't exist. This is a private method that is used to resolve
   * metafield definitions whose type is a metaobject reference or mixed reference.
   */
  private async getCachedMetaobjectDefinitionId(type: string): Promise<string | null> {
    if (this.metaobjectDefinitionIdCache.has(type)) {
      return this.metaobjectDefinitionIdCache.get(type)!;
    }

    const builder = QueryBuilder.query('GetMetaobjectDefinitionByType')
      .variables({ type: 'String!' })
      .operation<MetaobjectDefinition>('metaobjectDefinitionByType', { type: '$type' }, metaobjectDefinition => {
        metaobjectDefinition.fields('id');
      });

    const { data } = await (await doRequest({ builder, variables: { type } })).json();

    const id = data.metaobjectDefinitionByType?.id ?? null;

    // If we have resolved that ID already we cache it
    if (id) {
      this.metaobjectDefinitionIdCache.set(type, id);
    }

    return id;
  }
}

export const metafieldDefinitionManager = new MetafieldDefinitionManager();