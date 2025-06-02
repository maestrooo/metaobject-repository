import { ApiVersion } from "@shopify/shopify-api";
import { QueryBuilder } from "raku-ql";
import type { MetaobjectDefinition, Job, Metaobject, MetaobjectBulkDeletePayload, MetaobjectCreatePayload, MetaobjectDeletePayload, MetaobjectsCreatePayload, MetaobjectUpdatePayload, MetaobjectUpsertPayload } from "~/types/admin.types";
import type { MetaobjectDefinitionSchema, FromDefinitionWithSystemData, ValidPopulatePaths } from "~/types/metaobject-definitions";
import type { CreateInput, FindOptions, PaginatedMetaobjects, PopulateOptions, SortKey, UpdateInput, UpsertInput } from "~/types/metaobject-repository";
import { UserErrorsException } from "~/exception/user-errors-exception";
import { deserialize, serializeFields } from "~/transformer";
import { NotFoundException } from "~/exception";
import { populateMetaobjectQuery } from "~/utils/builder";
import { type ConnectionOptions, doRequest } from "~/utils/request";

type ConstructorOptions<T> = {
  type: T;
  connection: ConnectionOptions;
  metaobjectDefinitions: MetaobjectDefinitionSchema;
}
/**
 * Object repository
 */
export class MetaobjectRepository<D extends MetaobjectDefinitionSchema, T extends D[number]["type"]> {
  private readonly type: T;
  private readonly connection: ConnectionOptions;
  private readonly metaobjectDefinitions: MetaobjectDefinitionSchema;
  
  constructor({ type, connection, metaobjectDefinitions }: ConstructorOptions<T>) {
    this.type = type;
    this.connection = connection;
    this.metaobjectDefinitions = metaobjectDefinitions;
  }

  /**
   * --------------------------------------------------------------------------------------------------------
   * QUERIES
   * --------------------------------------------------------------------------------------------------------
   */

  /**
   * Get the count of metaobjects for this given type
   */
  async count(): Promise<number> {
    const builder = QueryBuilder.query('GetCount')
      .variables({ type: 'String!' })
      .operation<MetaobjectDefinition>('metaobjectDefinitionByType', { type: '$type' }, (metaobjectDefinition) => {
        metaobjectDefinition.fields('metaobjectsCount')
      });

    const variables = { type: this.type };
    const { metaobjectDefinitionByType } = (await doRequest({ connection: this.connection, builder, variables })).data;

    return metaobjectDefinitionByType?.metaobjectsCount || 0;
  }

  /**
   * Find a metaobject by its ID
   */
  async findById<P extends ValidPopulatePaths<D, T> = never, C extends boolean = false, Th extends boolean = false>(
    id: string,
    opts?: PopulateOptions<P, C, Th>
  ): Promise<FromDefinitionWithSystemData<D, T, P, C, Th> | null> {
    const builder = QueryBuilder.query('GetMetaobject')
      .variables({ id: 'ID!' })
      .operation<Metaobject>('metaobject', { 'id': '$id' }, (metaobjectBuilder) => {
        populateMetaobjectQuery({ 
          metaobjectDefinitions: this.metaobjectDefinitions, 
          metaobjectType: this.type, 
          fieldBuilder: metaobjectBuilder, 
          includeCapabilities: opts?.includeCapabilities,
          includeThumbnail: opts?.includeThumbnail,
          populate: opts?.populate || [], 
          onPopulate: opts?.onPopulate
        });
      });
    
    const variables = { id: this.transformId(id) };
    const { metaobject } = (await doRequest({ connection: this.connection, builder, variables })).data;

    return metaobject ? deserialize(metaobject) : null;
  }

  /**
   * Find a metaobject by its ID or throw an error if not found
   */
  async findByIdOrFail<P extends ValidPopulatePaths<D, T> = never, C extends boolean = false, Th extends boolean = false>(
    id: string,
    opts?: PopulateOptions<P, C, Th>
  ): Promise<FromDefinitionWithSystemData<D, T, P, C, Th>> {
    const metaobject = await this.findById(id, opts);

    if (!metaobject) {
      throw new NotFoundException(`Metaobject with ID ${id} not found`);
    }

    return metaobject;
  }

  /**
   * Find a metaobject by handle
   */
  async findByHandle<P extends ValidPopulatePaths<D, T> = never, C extends boolean = false, Th extends boolean = false>(
    handle: string,
    opts?: PopulateOptions<P, C, Th>
  ): Promise<FromDefinitionWithSystemData<D, T, P, C, Th> | null> {
    const builder = QueryBuilder.query('GetMetaobjectByHandle')
      .variables({ handle: 'MetaobjectHandleInput!' })
      .operation<Metaobject>('metaobjectByHandle', { 'handle': '$handle' }, (metaobjectBuilder) => {
        populateMetaobjectQuery({ 
          metaobjectDefinitions: this.metaobjectDefinitions, 
          metaobjectType: this.type, 
          fieldBuilder: metaobjectBuilder, 
          includeCapabilities: opts?.includeCapabilities,
          includeThumbnail: opts?.includeThumbnail,
          populate: opts?.populate || [], 
          onPopulate: opts?.onPopulate
        });
      });

    const variables = { handle: { handle, type: this.type } };
    const { metaobjectByHandle } = (await doRequest({ connection: this.connection, builder, variables })).data;

    return metaobjectByHandle ? deserialize(metaobjectByHandle) : null;
  }

  /**
   * Find a metaobject by its handle or throw an error if not found
   */
  async findByHandleOrFail<P extends ValidPopulatePaths<D, T> = never, C extends boolean = false, Th extends boolean = false>(
    handle: string,
    opts?: PopulateOptions<P, C, Th>
  ): Promise<FromDefinitionWithSystemData<D, T, P, C, Th>> {
    const metaobject = await this.findByHandle(handle, opts);

    if (!metaobject) {
      throw new NotFoundException(`Metaobject with handle ${handle} not found`);
    }

    return metaobject;
  }

  /**
   * Find all metaobjects (this endpoint does not support pagination and just set a max limit of 250)
   */
  async findAll<P extends ValidPopulatePaths<D, T> = never, C extends boolean = false, Th extends boolean = false>(
    opts?: PopulateOptions<P, C, Th> & { sortKey?: SortKey, limit?: number }
  ): Promise<FromDefinitionWithSystemData<D, T, P, C, Th>[]> {
    const connectionParameters = {
      type: this.type,
      first: opts?.limit || 250,
      sortKey: opts?.sortKey
    }

    const builder = QueryBuilder.query('GetMetaobjects')
      .connection('metaobjects', connectionParameters, (connection) => {
        connection.object('nodes', (nodesBuilder) => {
          populateMetaobjectQuery({ 
            metaobjectDefinitions: this.metaobjectDefinitions, 
            metaobjectType: this.type, 
            fieldBuilder: nodesBuilder, 
            includeCapabilities: opts?.includeCapabilities,
            includeThumbnail: opts?.includeThumbnail,
            populate: opts?.populate || [], 
            onPopulate: opts?.onPopulate
          });
        });
      });

    const { nodes } = (await doRequest({ connection: this.connection, builder })).data.metaobjects;

    return nodes.map((metaobject: Metaobject) => deserialize(metaobject));
  }

  /**
   * Return a list of paginated metaobjects
   */
  async find<P extends ValidPopulatePaths<D, T> = never, C extends boolean = false, Th extends boolean = false>(
    opts: FindOptions & PopulateOptions<P, C, Th>
  ): Promise<PaginatedMetaobjects<D, T, P, C, Th>> {
    const connectionParameters = {
      type: this.type,
      first: ('after' in opts) ? (opts.first || 50) : undefined,
      last: ('before' in opts) ? (opts.last || 50) : undefined,
      after: opts.after,
      before: opts.before,
      query: opts.query,
      sortKey: opts.sortKey,
      reverse: opts.reverse,
    }

    if (!connectionParameters.first && !connectionParameters.last) {
      connectionParameters.first = 50; // Provide a default value for first
    }

    const builder = QueryBuilder.query('GetMetaobjects')
      .connection('metaobjects', connectionParameters, (connection) => {
        connection.object('nodes', (nodesBuilder) => {
          populateMetaobjectQuery({ 
            metaobjectDefinitions: this.metaobjectDefinitions, 
            metaobjectType: this.type, 
            fieldBuilder: nodesBuilder, 
            includeCapabilities: opts?.includeCapabilities,
            includeThumbnail: opts?.includeThumbnail,
            populate: opts?.populate || [], 
            onPopulate: opts?.onPopulate
          });
        });
      });

    const { nodes, pageInfo } = (await doRequest({ connection: this.connection, builder })).data.metaobjects;

    return {
      pageInfo,
      items: nodes.map((metaobject: Metaobject) => deserialize(metaobject))
    }
  }

  /**
   * --------------------------------------------------------------------------------------------------------
   * MUTATIONS
   * --------------------------------------------------------------------------------------------------------
   */

  /** 
   * Create a new object, typed by your definitions 
   */
  async create<P extends ValidPopulatePaths<D, T> = never, C extends boolean = false, Th extends boolean = false>(
    input: CreateInput<D, T>, 
    opts?: PopulateOptions<P, C, Th>
  ): Promise<FromDefinitionWithSystemData<D, T, P, C, Th>> {
    const builder = QueryBuilder.mutation('CreateMetaobject')
      .variables({ metaobject: 'MetaobjectCreateInput!' })
      .operation<MetaobjectCreatePayload>('metaobjectCreate', { metaobject: '$metaobject' }, (metaobjectCreate) => {
        metaobjectCreate
          .object('metaobject', (metaobjectBuilder) => {
            populateMetaobjectQuery({ 
              metaobjectDefinitions: this.metaobjectDefinitions, 
              metaobjectType: this.type, 
              fieldBuilder: metaobjectBuilder, 
              includeCapabilities: opts?.includeCapabilities,
              includeThumbnail: opts?.includeThumbnail,
              populate: opts?.populate || [], 
              onPopulate: opts?.onPopulate
            });
          })
          .object('userErrors', (userErrors) => {
            userErrors.fields('code', 'field', 'message');
          });
      });

    const variables = {
      metaobject: { 
        ...input, 
        type: this.type, 
        fields: serializeFields(input.fields)
      }
    };

    const { metaobject, userErrors } = (await doRequest({ connection: this.connection, builder, variables })).data.metaobjectCreate;

    if (userErrors.length > 0) {
      throw new UserErrorsException(userErrors);
    }

    return deserialize(metaobject);
  }

  /** 
   * Create a list of new objects, typed by your definitions 
   */
  async createMany<P extends ValidPopulatePaths<D, T> = never, C extends boolean = false, Th extends boolean = false>(
    input: CreateInput<D, T>[], 
    opts?: PopulateOptions<P, C, Th>
  ): Promise<FromDefinitionWithSystemData<D, T, P, C, Th>[]> {
    if (input.length > 25) {
      throw new Error('You can only create a maximum of 25 metaobjects at once');
    }

    const builder = QueryBuilder.mutation('CreateMetaobjects')
      .variables({ input: 'MetaobjectsCreateInput!' })
      .operation<MetaobjectsCreatePayload>('metaobjectsCreate', { input: '$input' }, (metaobjectsCreate) => {
        metaobjectsCreate
          .object('metaobjects', (metaobjectsBuilder) => {
            populateMetaobjectQuery({ 
              metaobjectDefinitions: this.metaobjectDefinitions, 
              metaobjectType: this.type, 
              fieldBuilder: metaobjectsBuilder, 
              includeCapabilities: opts?.includeCapabilities,
              includeThumbnail: opts?.includeThumbnail,
              populate: opts?.populate || [], 
              onPopulate: opts?.onPopulate
            });
          })
          .object('userErrors', (userErrors) => {
            userErrors.fields('code', 'field', 'message');
          });
      });

    const variables = {
      input: {
        type: this.type,
        metaobjects: input.map(metaobject => {
          return {
            ...metaobject,
            fields: serializeFields(metaobject.fields)
          }
        })
      }
    };

    const { metaobjects, userErrors } = (await doRequest({ connection: this.connection, builder, variables, apiVersion: ApiVersion.Unstable })).data.metaobjectsCreate;

    if (userErrors.length > 0) {
      throw new UserErrorsException(userErrors);
    }

    return metaobjects.map((metaobject: Metaobject) => deserialize(metaobject));
  }

  /**
   * Update an existing object, typed by your definitions 
   */
  async update<P extends ValidPopulatePaths<D, T> = never, C extends boolean = false, Th extends boolean = false>(
    input: UpdateInput<D, T>, 
    opts?: PopulateOptions<P, C, Th>
  ): Promise<FromDefinitionWithSystemData<D, T, P, C, Th>> {
    const builder = QueryBuilder.mutation('UpdateMetaobject')
      .variables({ id: 'ID!', metaobject: 'MetaobjectUpdateInput!' })
      .operation<MetaobjectUpdatePayload>('metaobjectUpdate', { id: '$id', metaobject: '$metaobject' }, (metaobjectUpdate) => {
        metaobjectUpdate
          .object('metaobject', (metaobjectBuilder) => {
            populateMetaobjectQuery({ 
              metaobjectDefinitions: this.metaobjectDefinitions, 
              metaobjectType: this.type, 
              fieldBuilder: metaobjectBuilder, 
              includeCapabilities: opts?.includeCapabilities,
              includeThumbnail: opts?.includeThumbnail,
              populate: opts?.populate || [], 
              onPopulate: opts?.onPopulate
            });
          })
          .object('userErrors', (userErrors) => {
            userErrors.fields('code', 'field', 'message');
          });
      });

    const { id, ...inputWithoutId } = input; 

    const variables = {
      id: this.transformId(id),
      metaobject: {
        ...inputWithoutId,
        fields: serializeFields(input.fields)
      }
    };

    const { metaobject, userErrors } = (await doRequest({ connection: this.connection, builder, variables })).data.metaobjectUpdate;

    if (userErrors.length > 0) {
      throw new UserErrorsException(userErrors);
    }

    return deserialize(metaobject);
  }

  /** 
   * Upsert an existing object, typed by your definitions 
   */
  async upsert<P extends ValidPopulatePaths<D, T> = never, C extends boolean = false, Th extends boolean = false>(
    input: UpsertInput<D, T>, 
    opts?: PopulateOptions<P, C, Th>
  ): Promise<FromDefinitionWithSystemData<D, T, P, C, Th>> {
    const builder = QueryBuilder.mutation('UpsertMetaobject')
      .variables({ handle: 'MetaobjectHandleInput!', metaobject: 'MetaobjectUpsertInput!' })
      .operation<MetaobjectUpsertPayload>('metaobjectUpsert', { handle: '$handle', metaobject: '$metaobject' }, (metaobjectUpsert) => {
        metaobjectUpsert
          .object('metaobject', (metaobjectBuilder) => {
            populateMetaobjectQuery({ 
              metaobjectDefinitions: this.metaobjectDefinitions, 
              metaobjectType: this.type, 
              fieldBuilder: metaobjectBuilder, 
              includeCapabilities: opts?.includeCapabilities,
              includeThumbnail: opts?.includeThumbnail,
              populate: opts?.populate || [], 
              onPopulate: opts?.onPopulate
            });
          })
          .object('userErrors', (userErrors) => {
            userErrors.fields('code', 'field', 'message');
          });
      });

    const { handle, ...inputWithoutHandle } = input;

    const variables = {
      handle: {
        handle,
        type: this.type,
      },
      metaobject: {
        ...inputWithoutHandle,
        fields: serializeFields(input.fields)
      }
    };

    const { metaobject, userErrors } = (await doRequest({ connection: this.connection, builder, variables })).data.metaobjectUpsert;

    if (userErrors.length > 0) {
      throw new UserErrorsException(userErrors);
    }

    return deserialize(metaobject);
  }

  /**
   * Delete an existing object, and return the ID of the deleted object 
   */
  async delete(id: string): Promise<string> {
    const builder = QueryBuilder.mutation('DeleteMetaobject')
      .variables({ id: 'ID!' })
      .operation<MetaobjectDeletePayload>('metaobjectDelete', { id: '$id' }, (metaobject) => {
        metaobject
          .fields('deletedId')
          .object('userErrors', (userErrors) => {
            userErrors.fields('code', 'field', 'message');
          });
      });

    const variables = { id: this.transformId(id) };
    const { deletedId, userErrors } = (await doRequest({ connection: this.connection, builder, variables })).data.metaobjectDelete; 

    if (userErrors.length > 0) {
      throw new UserErrorsException(userErrors);
    }

    return deletedId;
  }

  /**
   * Delete a list of metaobjects by ids
   */
  async bulkDelete(ids: string[]): Promise<Job> {
    const builder = QueryBuilder.mutation('DeleteMetaobjects')
      .variables({ where: 'MetaobjectBulkDeleteWhereCondition!' })
      .operation<MetaobjectBulkDeletePayload>('metaobjectBulkDelete', { where: '$where' }, (job) => {
        job
          .object('job', (job) => {
            job.fields('id', 'done')
          })
          .object('userErrors', (userErrors) => {
            userErrors.fields('code', 'field', 'message');
          });
      });

    const variables = {
      where: {
        ids: ids.map(this.transformId)
      }
    }
    
    const { job, userErrors } = (await doRequest({ connection: this.connection, builder, variables })).data.metaobjectBulkDelete;

    if (userErrors.length > 0) {
      throw new UserErrorsException(userErrors);
    }

    return job;
  }

  /**
   * --------------------------------------------------------------------------------------------------------
   * OTHER UTILITIES
   * --------------------------------------------------------------------------------------------------------
   */

  /**
   * Ensure that a metaobject ID is always using the GID format
   */
  private transformId(id: string): string {
    return id.startsWith('gid://shopify/Metaobject') ? id : `gid://shopify/Metaobject/${id}`;
  }
}