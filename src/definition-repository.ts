import { MetaobjectDefinition, MetaobjectDefinitionCreateInput, MetaobjectDefinitionUpdateInput, MetaobjectDefinitionUpdatePayload } from "~/types/admin.types";
import { ClientAware } from "./client-aware";
import { QueryBuilder } from "raku-ql";

/**
 * Manage the schema definitions
 */
export class DefinitionRepository extends ClientAware {
  /**
   * --------------------------------------------------------------------------------------------------------
   * QUERIES
   * --------------------------------------------------------------------------------------------------------
   */

  /**
   * Find a definition by type. This get most of the information (if you need only the ID, use the `getIdByType` method instead)
   */
  async findByType(type: string): Promise<Omit<MetaobjectDefinition, 'createdByApp' | 'createdByStaff' | 'metaobjects' | 'standardTemplate'> | null> {
    const builder = QueryBuilder.query('GetMetaobjectDefinitionByType')
      .variables({ type: 'String!' })
      .operation<MetaobjectDefinition>('metaobjectDefinitionByType', { type: '$type' }, metaobjectDefinition => {
        metaobjectDefinition
          .fields('id', 'type', 'name', 'description', 'createdAt', 'updatedAt', 'displayNameKey', 'hasThumbnailField', 'metaobjectsCount')
          .object('access', access => {
            access.fields('admin', 'storefront');
          })
          .object('capabilities', capabilities => {
            capabilities.object('onlineStore', onlineStore => {
              onlineStore.fields('enabled');
              onlineStore.object('data', data => {
                data.fields('urlHandle', 'canCreateRedirects');
              });
            });
            capabilities.object('publishable', publishable => {
              publishable.fields('enabled');
            });
            capabilities.object('translatable', translatable => {
              translatable.fields('enabled');
            });
            capabilities.object('renderable', renderable => {
              renderable.fields('enabled');
              renderable.object('data', data => {
                data.fields('metaTitleKey', 'metaDescriptionKey');
              });
            });
          })
          .object('fieldDefinitions', fieldDefinitions => {
            fieldDefinitions.fields('description', 'key', 'name', 'required');
            fieldDefinitions.object('type', type => {
              type.fields('category', 'name');
            });
            fieldDefinitions.object('validations', validations => {
              validations.fields('name', 'type', 'value');
            });
          });
      });

    const { metaobjectDefinitionByType } = (await (await this.doRequest({ builder, variables: { type } })).json()).data;

    return metaobjectDefinitionByType;
  }

  /**
   * Find a definition by type, or throw an error if it does not exist.
   */
  async findByTypeOrFail(type: string): Promise<Omit<MetaobjectDefinition, 'createdByApp' | 'createdByStaff' | 'metaobjects' | 'standardTemplate'>> {
    const definition = await this.findByType(type);

    if (!definition) {
      throw new Error(`Metaobject definition with type "${type}" not found`);
    }

    return definition;
  }

  /**
   * Find the definition ID by its type.
   */
  async findIdByType(type: string): Promise<string | null> {
    const builder = QueryBuilder.query('GetMetaobjectDefinitionByType')
      .variables({ type: 'String!' })
      .operation<MetaobjectDefinition>('metaobjectDefinitionByType', { type: '$type' }, metaobjectDefinition => {
        metaobjectDefinition.fields('id');
      });

    const { data } = await (await this.doRequest({ builder, variables: { type } })).json();

    return data.metaobjectDefinitionByType?.id ?? null;
  }

  /**
   * --------------------------------------------------------------------------------------------------------
   * MUTATIONS
   * --------------------------------------------------------------------------------------------------------
   */

  /**
   * Create a new definition and return the ID of the generated definition. To create all the definitions from
   * a schema, use the `createFromSchema` method of the definition manager instead.
   */
  async create(definition: MetaobjectDefinitionCreateInput): Promise<string> {
    const builder = QueryBuilder.mutation('CreateMetaobjectDefinition')
      .variables({ definition: 'MetaobjectDefinitionCreateInput!' })
      .operation<MetaobjectDefinitionUpdatePayload>('metaobjectDefinitionCreate', { definition: '$definition' }, metaobjectDefinition => {
        metaobjectDefinition
          .object('metaobjectDefinition', def => {
            def.fields('id');
          })
          .object('userErrors', error => {
            error.fields('field', 'message', 'code');
          });
      });

    // Perform the request
    const { metaobjectDefinition, userErrors } = (await (await this.doRequest({ builder, variables: { definition } })).json()).data.metaobjectDefinitionCreate;

    if (userErrors.length > 0) {
      console.warn(userErrors);
      throw new Error(`Cannot create the metaobject definition. Reason: ${userErrors[0].message}`);
    }

    return metaobjectDefinition.id;
  }

  /**
   * Update an existing definition. This is useful when you need to customize a given definition beyond the original schema, or
   * dynamically change the definition.
   */
  async update(options: { type: string, definition: MetaobjectDefinitionUpdateInput }): Promise<void> {
    const id = await this.findIdByType(options.type);

    const builder = QueryBuilder.mutation('UpdateMetaobjectDefinition')
      .variables({ id: 'ID!', definition: 'MetaobjectDefinitionUpdateInput!' })
      .operation<MetaobjectDefinitionUpdatePayload>('metaobjectDefinitionUpdate', { id: '$id', definition: '$definition' }, metaobjectDefinition => {
        metaobjectDefinition
          .object('metaobjectDefinition', def => {
            def.fields('id', 'name', 'type');
          })
          .object('userErrors', error => {
            error.fields('field', 'message', 'code');
          });
      });

    const { userErrors } = (await (await this.doRequest({ builder, variables: { id, definition: options.definition } })).json()).data.metaobjectDefinitionUpdate;

    if (userErrors.length > 0) {
      console.warn(userErrors);
      throw new Error(`Cannot create the metaobject definition. Reason: ${userErrors[0].message}`);
    }
  }
}

export const definitionRepository = new DefinitionRepository();