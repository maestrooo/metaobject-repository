import { QueryBuilder } from "raku-ql";
import type { 
  MetafieldAccessInput, MetafieldDefinitionCreatePayload, MetafieldDefinitionDeletePayload, MetafieldDefinitionIdentifier, 
  MetafieldDefinitionInput, MetafieldDefinitionPinPayload, MetafieldDefinitionUnpinPayload, MetafieldDefinitionUpdateInput, 
  MetafieldDefinitionUpdatePayload, MetafieldOwnerType 
} from "~/types/admin.types";
import { DefinitionTakenException } from "~/exception";
import { convertValidations } from "~/utils/metafield-validations";
import { type ConnectionOptions, doRequest } from "~/utils/request";
import { MetaobjectDefinitionManager } from "~/metaobjects/metaobject-definition-manager";
import type { MetafieldDefinitionSchema } from "~/types/metafield-definitions";

type ConstructorOptions = {
  connection: ConnectionOptions;
  metafieldDefinitions: MetafieldDefinitionSchema;
  metaobjectDefinitionManager: MetaobjectDefinitionManager;
}

export class MetafieldDefinitionManager {
  private readonly connection: ConnectionOptions;
  private readonly metafieldDefinitions: MetafieldDefinitionSchema;
  private readonly metaobjectDefinitionManager: MetaobjectDefinitionManager;

  constructor({ connection, metafieldDefinitions, metaobjectDefinitionManager }: ConstructorOptions) {
    this.connection = connection;
    this.metafieldDefinitions = metafieldDefinitions;
    this.metaobjectDefinitionManager = metaobjectDefinitionManager;
  }

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
    // 1) Pre-scan all validations that refer to other metaobject types, so we can resolve their IDs in one batch.
    const referencedTypes = new Set<string>();

    this.metafieldDefinitions.forEach((def) => {
      convertValidations(def).forEach(({ name, value }) => {
        if (name === 'metaobject_definition_type') {
          referencedTypes.add(value);
        } else if (name === 'metaobject_definition_types') {
          JSON.parse(value).forEach((t: string) => referencedTypes.add(t));
        }
      });
    });

    // 2) Lookup each referenced type exactly once
    const idCache: Record<string, string> = {};

    await Promise.all(
      Array.from(referencedTypes).map(async (type) => {
        const id = await this.metaobjectDefinitionManager.findDefinitionIdByType(type);

        if (!id) {
          throw new Error(
            `Cannot resolve metaobject definition "${type}" (not found)`
          );
        }
        idCache[type] = id;
      })
    );

    // 3) Now build the "create" inputs, swapping out `metaobject_definition_*` names for the `*_id` versions
    const inputs: MetafieldDefinitionInput[] = this.metafieldDefinitions.map((def) => {
      const raw = convertValidations(def);
      const validations = raw.map(({ name, value }) => {
        if (name === 'metaobject_definition_type') {
          return { name: 'metaobject_definition_id', value: idCache[value] };
        }

        if (name === 'metaobject_definition_types') {
          const types: string[] = JSON.parse(value);
          const ids = types.map((t) => idCache[t]);

          return { name: 'metaobject_definition_ids', value: JSON.stringify(ids) };
        }
        return { name, value };
      });

      return {
        name: def.name,
        key: def.key,
        namespace: def.namespace,
        type: def.type,
        ownerType: def.ownerType as MetafieldOwnerType,
        description: def.description,
        access: def.access as MetafieldAccessInput,
        pin: def.pin,
        capabilities: def.capabilities,
        constraints: def.constraints,
        validations,
      };
    });

    // 4) Fire off all creations in parallel, swallowing only “TAKEN” errors
    const results = await Promise.allSettled(
      inputs.map((input) => this.createDefinition(input))
    );

    for (const res of results) {
      if (res.status === "rejected" && !(res.reason instanceof DefinitionTakenException)) {
        throw res.reason;
      }
    }
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
    const { createdDefinition, userErrors } = (await (await doRequest({ connection: this.connection, builder, variables: { definition } })).json()).data.metafieldDefinitionCreate;

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
    const { userErrors } = (await (await doRequest({ connection: this.connection, builder, variables: { definition } })).json()).data.metafieldDefinitionUpdate;

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
    const { deletedDefinitionId, userErrors } = (await (await doRequest({ connection: this.connection, builder, variables })).json()).data.metafieldDefinitionDelete;

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
    const { userErrors } = (await (await doRequest({ connection: this.connection, builder, variables })).json()).data.metafieldDefinitionPin;

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
    const { userErrors } = (await (await doRequest({ connection: this.connection, builder, variables })).json()).data.metafieldDefinitionUnpin;

    if (userErrors.length > 0) {
      console.warn(userErrors);
      throw new Error(`Cannot unpin the metafield definition. Reason: ${userErrors[0].message}`);
    }
  }
}