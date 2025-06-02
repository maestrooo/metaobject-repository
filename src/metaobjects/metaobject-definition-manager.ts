import type { MetaobjectAccessInput, MetaobjectDefinition, MetaobjectDefinitionCreateInput, MetaobjectDefinitionCreatePayload, MetaobjectDefinitionDeletePayload, MetaobjectDefinitionUpdateInput, MetaobjectDefinitionUpdatePayload } from "~/types/admin.types";
import { QueryBuilder } from "raku-ql";
import { DefinitionTakenException } from "~/exception/definition-taken-exception";
import { convertValidations } from "~/utils/metafield-validations";
import { type ConnectionOptions, doRequest } from "~/utils/request";
import type { MetaobjectDefinitionSchema } from "~/types/metaobject-definitions";

type ConstructorOptions = {
  connection: ConnectionOptions;
  metaobjectDefinitions: MetaobjectDefinitionSchema;
}

/**
 * Manage the schema definitions
 */
export class MetaobjectDefinitionManager {
  private readonly connection: ConnectionOptions;
  private readonly metaobjectDefinitions: MetaobjectDefinitionSchema;
  
  constructor({ connection, metaobjectDefinitions }: ConstructorOptions) {
    this.connection = connection;
    this.metaobjectDefinitions = metaobjectDefinitions;
  }

  /**
   * --------------------------------------------------------------------------------------------------------
   * HIGHER-LEVEL METHODS
   * --------------------------------------------------------------------------------------------------------
   */

  /**
   * Create a list of definitions from the schema. Definitions are created in dependency order:
   * deeper definitions (no cross-deps) first, then dependent ones, so that validations can be
   * resolved directly at creation time.
   */
  async createFromSchema(): Promise<void> {
    // 1) Build GraphQL inputs from in-memory schema
    const createInputs: Record<string, MetaobjectDefinitionCreateInput> = {};
    this.metaobjectDefinitions.forEach((def) => {
      createInputs[def.type] = {
        type: def.type,
        name: def.name,
        description: def.description,
        displayNameKey: def.displayNameKey,
        access: def.access as MetaobjectAccessInput,
        capabilities: def.capabilities,
        fieldDefinitions: def.fields.map((field) => ({
          name:        field.name,
          key:         field.key,
          type:        field.type,
          description: field.description ?? '',
          required:    field.required ?? false,
          validations: convertValidations(field),
        })),
      };
    });

    // 2) Seed existing definitions cache
    const existingIds: Record<string, string> = {};

    await Promise.all(
      this.metaobjectDefinitions.map(async (def) => {
        const id = await this.findDefinitionIdByType(def.type);

        if (id) {
          existingIds[def.type] = id;
        }
      })
    );

    // 3) Determine which types still need creation
    const toCreate = this.metaobjectDefinitions.map(d => d.type).filter(type => !existingIds[type]);
    
    if (toCreate.length === 0) {
      return;
    }

    // 4) Build dependency graph among missing types
    const deps: Record<string, Set<string>> = {};
    toCreate.forEach((type) => {
      const inp = createInputs[type]!;
      const set = new Set<string>();
      inp.fieldDefinitions!.forEach((fd) => {
        fd.validations!.forEach((v) => {
          if (v.name === 'metaobject_definition_type' && toCreate.includes(v.value)) {
            set.add(v.value);
          }
          if (v.name === 'metaobject_definition_types' && toCreate.includes(v.value)) {
            try {
              JSON.parse(v.value).forEach((t: string) => {
                if (toCreate.includes(t)) {
                  set.add(t);
                }
              });
            } catch {}
          }
        });
      });
      deps[type] = set;
    });

    // 5) Topologically sort into batches with no intra-batch dependencies
    const batches = this.topoSort(toCreate, deps);

    // 6) Create definitions in order, resolving validations at creation
    const createdIds: Record<string, string> = { ...existingIds };
    for (const batch of batches) {
      await Promise.all(
        batch.map(async (type) => {
          const original = createInputs[type]!;
          // Clone and resolve validation references to IDs
          const resolvedInput: MetaobjectDefinitionCreateInput = {
            ...original,
            fieldDefinitions: original.fieldDefinitions!.map((fd) => ({
              ...fd,
              validations: fd.validations!.flatMap((v) => {
                if (v.name === 'metaobject_definition_type') {
                  return [{
                    name:  'metaobject_definition_id',
                    value: createdIds[v.value]!,
                  }];
                }
                if (v.name === 'metaobject_definition_types') {
                  const types: string[] = JSON.parse(v.value as string);
                  const ids = types.map((t) => createdIds[t]!);
                  return [{
                    name:  'metaobject_definition_ids',
                    value: JSON.stringify(ids),
                  }];
                }
                return [v];
              }),
            })),
          };

          // Create and cache the new ID
          const newId = await this.createDefinition(resolvedInput);
          createdIds[type] = newId;
        })
      );
    }
  }

  /**
   * --------------------------------------------------------------------------------------------------------
   * QUERIES
   * --------------------------------------------------------------------------------------------------------
   */

  /**
   * Find a definition ID by type. This is a simple query that returns the ID of the definition. It is useful to
   * create various definitions
   */
  async findDefinitionIdByType(type: string): Promise<string | null> {
    const builder = QueryBuilder.query('GetMetaobjectDefinitionByType')
      .variables({ type: 'String!' })
      .operation<MetaobjectDefinition>('metaobjectDefinitionByType', { type: '$type' }, metaobjectDefinition => {
        metaobjectDefinition.fields('id')
      });

    const { metaobjectDefinitionByType } = (await doRequest({ connection: this.connection, builder, variables: { type } })).data;

    return metaobjectDefinitionByType?.id ?? null;
  }

  /**
   * Find a definition by type. This get most of the information (if you need only the ID, use the `getIdByType` method instead)
   */
  async findDefinitionByType(type: string): Promise<Omit<MetaobjectDefinition, 'createdByApp' | 'createdByStaff' | 'metaobjects' | 'standardTemplate'> | null> {
    const builder = QueryBuilder.query('GetMetaobjectDefinitionByType')
      .variables({ type: 'String!' })
      .operation<MetaobjectDefinition>('metaobjectDefinitionByType', { type: '$type' }, metaobjectDefinition => {
        metaobjectDefinition
          .fields('id', 'type', 'name', 'description', /*'createdAt', 'updatedAt',*/ 'displayNameKey', 'hasThumbnailField', 'metaobjectsCount')
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

    const { metaobjectDefinitionByType } = (await doRequest({ connection: this.connection, builder, variables: { type } })).data;

    return metaobjectDefinitionByType;
  }

  /**
   * Find a definition by type, or throw an error if it does not exist.
   */
  async findDefinitionByTypeOrFail(type: string): Promise<Omit<MetaobjectDefinition, 'createdByApp' | 'createdByStaff' | 'metaobjects' | 'standardTemplate'>> {
    const definition = await this.findDefinitionByType(type);

    if (!definition) {
      throw new Error(`Metaobject definition with type "${type}" not found`);
    }

    return definition;
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
  async createDefinition(definition: MetaobjectDefinitionCreateInput): Promise<string> {
    const builder = QueryBuilder.mutation('CreateMetaobjectDefinition')
      .variables({ definition: 'MetaobjectDefinitionCreateInput!' })
      .operation<MetaobjectDefinitionCreatePayload>('metaobjectDefinitionCreate', { definition: '$definition' }, metaobjectDefinition => {
        metaobjectDefinition
          .object('metaobjectDefinition', def => {
            def.fields('id');
          })
          .object('userErrors', error => {
            error.fields('field', 'message', 'code');
          });
      });

    // Perform the request
    const { metaobjectDefinition, userErrors } = (await doRequest({ connection: this.connection, builder, variables: { definition } })).data.metaobjectDefinitionCreate;

    if (userErrors.length > 0) {
      console.warn(userErrors);

      if (userErrors[0].code === 'TAKEN') {
        throw new DefinitionTakenException(`Metaobject definition with type "${definition.type}" already exists`);
      }

      throw new Error(`Cannot create the metaobject definition. Reason: ${userErrors[0].message}`);
    }

    return metaobjectDefinition.id;
  }

  /**
   * Update an existing definition. This is useful when you need to customize a given definition beyond the original schema, or
   * dynamically change the definition.
   */
  async updateDefinition(options: { type: string, definition: MetaobjectDefinitionUpdateInput }): Promise<void> {
    const id = await this.findDefinitionIdByType(options.type);

    if (!id) {
      throw new Error(`Metaobject definition with type "${options.type}" does not exist and cannot be updated.`);
    }

    const builder = QueryBuilder.mutation('UpdateMetaobjectDefinition')
      .variables({ id: 'ID!', definition: 'MetaobjectDefinitionUpdateInput!' })
      .operation<MetaobjectDefinitionUpdatePayload>('metaobjectDefinitionUpdate', { id: '$id', definition: '$definition' }, metaobjectDefinition => {
        metaobjectDefinition
          .object('metaobjectDefinition', def => {
            def.fields('id');
          })
          .object('userErrors', error => {
            error.fields('field', 'message', 'code');
          });
      });

    const { userErrors } = (await doRequest({ connection: this.connection, builder, variables: { id, definition: options.definition } })).data.metaobjectDefinitionUpdate;

    if (userErrors.length > 0) {
      console.warn(userErrors);
      throw new Error(`Cannot create the metaobject definition. Reason: ${userErrors[0].message}`);
    }
  }
  
  /**
   * Delete a definition. The deleted definition ID will be returned. This will delete the definition and all its fields so you have to be careful.
   */
  async deleteDefinition(type: string): Promise<string> {
    const id = await this.findDefinitionIdByType(type);

    if (!id) {
      throw new Error(`Metaobject definition with type "${type}" does not exist and cannot be deleted.`);
    }

    const builder = QueryBuilder.mutation('DeleteMetaobjectDefinition')
      .variables({ id: 'ID!' })
      .operation<MetaobjectDefinitionDeletePayload>('metaobjectDefinitionDelete', { id: '$id' }, metaobjectDefinition => {
        metaobjectDefinition
          .fields('deletedId')
          .object('userErrors', error => {
            error.fields('field', 'message', 'code');
          });
      });

    const { deletedId, userErrors } = (await doRequest({ connection: this.connection, builder, variables: { id } })).data.metaobjectDefinitionDelete;

    if (userErrors.length > 0) {
      console.warn(userErrors);
      throw new Error(`Cannot delete the metaobject definition. Reason: ${userErrors[0].message}`);
    }

    return deletedId;
  }

  /**
   * --------------------------------------------------------------------------------------------------------------------------------
   * PRIVATE METHODS
   * --------------------------------------------------------------------------------------------------------------------------------
   */

  /** 
   * Simple Kahn’s‐algorithm topological sort into batches 
   */
  private topoSort(keys: string[], deps: Record<string, Set<string>>): string[][] {
    const inDegree: Record<string, number> = {};
    keys.forEach((k) => (inDegree[k] = deps[k].size));

    const batches: string[][] = [];
    let batch = keys.filter((k) => inDegree[k] === 0);

    while (batch.length) {
      batches.push(batch);
      const next: string[] = [];
      for (const k of batch) {
        for (const node of keys) {
          if (deps[node].has(k) && --inDegree[node] === 0) {
            next.push(node);
          }
        }
      }
      batch = next;
    }

    if (batches.flat().length !== keys.length) {
      throw new Error("Circular dependency detected among definitions");
    }
    return batches;
  }
}