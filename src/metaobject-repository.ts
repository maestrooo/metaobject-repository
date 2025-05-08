import { GraphQLClient } from "node_modules/@shopify/shopify-app-remix/dist/ts/server/clients/types";
import { AdminOperations } from "@shopify/admin-api-client";
import { FieldBuilder, QueryBuilder } from "raku-ql";
import { camel } from "snake-camel";
import { Collection, Company, Customer, GenericFile, Job, MediaImage, Metaobject, MetaobjectBulkDeletePayload, MetaobjectCreatePayload, MetaobjectDeletePayload, MetaobjectsCreatePayload, MetaobjectUpdatePayload, MetaobjectUpsertPayload, Page, PageInfo, Product, ProductVariant, TaxonomyValue, Video } from "~/types/admin.types";
import { DefinitionSchema, DefinitionSchemaEntry, FieldDefinition, FromDefinitionWithSystemData, ValidPopulatePaths } from "./types/definitions";
import { CreateInput, FindOptions, OnPopulateFunc, PopulateOptions, SortKey, UpdateInput, UpsertInput } from "./types/metaobject-repository";
import { UserErrorsException } from "./exception/user-errors-exception";
import { deserialize, serializeFields } from "./transformer";

/**
 * Object repository
 */
export class MetaobjectRepository<
  D extends DefinitionSchema, 
  T extends D[number]["type"]
> {
  private client!: GraphQLClient<AdminOperations>;
  
  constructor(private readonly defs: D, public readonly type: T) {}

  /**
   * Set the GraphQL client to interact with Shopify API
   */
  withClient(client: GraphQLClient<AdminOperations>): this {
    this.client = client;
    return this;
  }

  /**
   * --------------------------------------------------------------------------------------------------------
   * QUERIES
   * --------------------------------------------------------------------------------------------------------
   */

  /**
   * Find a metaobject by its ID
   */
  async findById<P extends ValidPopulatePaths<D, T> = never>(
    id: string,
    opts?: PopulateOptions<P>
  ): Promise<FromDefinitionWithSystemData<D, T, P> | null> {
    const definition = this.getDefinitionSchemaEntry(this.type);

    const builder = QueryBuilder.query('GetMetaobject')
      .variables({ id: 'ID!' })
      .fragment<Metaobject>('BaseMetaobjectFields', 'Metaobject', (fragment) => {
        this.setupMetaobjectFragment(definition, fragment);
      })
      .operation<Metaobject>('metaobject', { 'id': '$id' }, (metaobject) => {
        this.setupMetaobjectQuery(definition, metaobject, opts?.populate || [], opts?.onPopulate);
      });
    
    const variables = { id: this.transformId(id) };
    const { metaobject } = (await (await this.client(builder.build(), { variables })).json()).data;

    return metaobject ? deserialize(metaobject) : null;
  }

  /**
   * Find a metaobject by its ID or throw an error if not found
   */
  async findByIdOrFail<P extends ValidPopulatePaths<D, T> = never>(
    id: string,
    opts?: PopulateOptions<P>
  ): Promise<FromDefinitionWithSystemData<D, T, P>> {
    const metaobject = await this.findById(id, opts);

    if (!metaobject) {
      throw new Error(`Metaobject with ID ${id} not found`);
    }

    return metaobject;
  }

  /**
   * Find a metaobject by handle
   */
  async findByHandle<P extends ValidPopulatePaths<D, T> = never>(
    handle: string,
    opts?: PopulateOptions<P>
  ): Promise<FromDefinitionWithSystemData<D, T, P> | null> {
    const definition = this.getDefinitionSchemaEntry(this.type);

    const builder = QueryBuilder.query('GetMetaobjectByHandle')
      .variables({ handle: 'MetaobjectHandleInput!' })
      .fragment<Metaobject>('BaseMetaobjectFields', 'Metaobject', (fragment) => {
        this.setupMetaobjectFragment(definition, fragment);
      })
      .operation<Metaobject>('metaobjectByHandle', { 'handle': '$handle' }, (metaobject) => {
        this.setupMetaobjectQuery(definition, metaobject, opts?.populate || [], opts?.onPopulate);
      });

    const variables = { handle: { handle, type: this.type } };
    const { metaobjectByHandle } = (await (await this.client(builder.build(), { variables })).json()).data;

    return metaobjectByHandle ? deserialize(metaobjectByHandle) : null;
  }

  /**
   * Find a metaobject by its handle or throw an error if not found
   */
  async findByHandleOrFail<P extends ValidPopulatePaths<D, T> = never>(
    handle: string,
    opts?: PopulateOptions<P>
  ): Promise<FromDefinitionWithSystemData<D, T, P>> {
    const metaobject = await this.findByHandle(handle, opts);

    if (!metaobject) {
      throw new Error(`Metaobject with ID ${handle} not found`);
    }

    return metaobject;
  }

  /**
   * Find all metaobjects (this endpoint does not support pagination and just set a max limit of 250)
   */
  async findAll<P extends ValidPopulatePaths<D, T> = never>(
    opts?: PopulateOptions<P> & { sortKey?: SortKey, limit?: number }
  ): Promise<FromDefinitionWithSystemData<D, T, P>[]> {
    const connectionParameters = {
      type: this.type,
      first: opts?.limit || 250,
      sortKey: opts?.sortKey
    }

    const definition = this.getDefinitionSchemaEntry(this.type);

    const builder = QueryBuilder.query('GetMetaobjects')
      .fragment<Metaobject>('BaseMetaobjectFields', 'Metaobject', (fragment) => {
        this.setupMetaobjectFragment(definition, fragment);
      })
      .connection('metaobjects', connectionParameters, (connection) => {
        connection.object('nodes', (nodes) => {
          this.setupMetaobjectQuery(definition, nodes, opts?.populate || [], opts?.onPopulate);
        });
      });

    const { nodes } = (await (await this.client(builder.build())).json()).data.metaobjects;

    return nodes.map((metaobject: Metaobject) => deserialize(metaobject));
  }

  /**
   * Return a list of paginated metaobjects
   */
  async find<P extends ValidPopulatePaths<D, T> = never>(
    opts: FindOptions & PopulateOptions<P>
  ): Promise<{ pageInfo: PageInfo, items: FromDefinitionWithSystemData<D, T, P>[] }> {
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

    const definition = this.getDefinitionSchemaEntry(this.type);

    const builder = QueryBuilder.query('GetMetaobjects')
      .fragment<Metaobject>('BaseMetaobjectFields', 'Metaobject', (fragment) => {
        this.setupMetaobjectFragment(definition, fragment);
      })
      .connection('metaobjects', connectionParameters, (connection) => {
        connection.object('nodes', (nodes) => {
          this.setupMetaobjectQuery(definition, nodes, opts?.populate || [], opts?.onPopulate);
        });
      });

    const { nodes, pageInfo } = (await (await this.client(builder.build())).json()).data.metaobjects;

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
  async create<P extends ValidPopulatePaths<D, T> = never>(
    input: CreateInput<D, T>, 
    opts?: PopulateOptions<P>
  ): Promise<FromDefinitionWithSystemData<D, T, P>> {
    const definition = this.getDefinitionSchemaEntry(this.type);

    const builder = QueryBuilder.mutation('CreateMetaobject')
      .variables({ metaobject: 'MetaobjectCreateInput!' })
      .fragment<Metaobject>('BaseMetaobjectFields', 'Metaobject', (fragment) => {
        this.setupMetaobjectFragment(definition, fragment);
      })
      .operation<MetaobjectCreatePayload>('metaobjectCreate', { metaobject: '$metaobject' }, (metaobjectCreate) => {
        metaobjectCreate
          .object('metaobject', (metaobject) => {
            this.setupMetaobjectQuery(definition, metaobject, opts?.populate || [], opts?.onPopulate);
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

    const { metaobject, userErrors } = (await (await this.client(builder.build(), { variables })).json()).data.metaobjectCreate;

    if (userErrors.length > 0) {
      throw new UserErrorsException(userErrors);
    }

    return deserialize(metaobject);
  }

  /** 
   * Create a list of new objects, typed by your definitions 
   */
  async createMany<P extends ValidPopulatePaths<D, T> = never>(
    input: CreateInput<D, T>[], 
    opts?: PopulateOptions<P>
  ): Promise<FromDefinitionWithSystemData<D, T, P>[]> {
    const definition = this.getDefinitionSchemaEntry(this.type);

    const builder = QueryBuilder.mutation('CreateMetaobjects')
      .variables({ input: 'MetaobjectsCreateInput!' })
      .fragment<Metaobject>('BaseMetaobjectFields', 'Metaobject', (fragment) => {
        this.setupMetaobjectFragment(definition, fragment);
      })
      .operation<MetaobjectsCreatePayload>('metaobjectsCreate', { input: '$input' }, (metaobjectsCreate) => {
        metaobjectsCreate
          .object('metaobjects', (metaobjects) => {
            this.setupMetaobjectQuery(definition, metaobjects, opts?.populate || [], opts?.onPopulate);
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

    const { metaobjects, userErrors } = (await (await this.client(builder.build(), { variables })).json()).data.metaobjectsCreate;

    if (userErrors.length > 0) {
      throw new UserErrorsException(userErrors);
    }

    return metaobjects.map((metaobject: Metaobject) => deserialize(metaobject));
  }

  /**
   * Update an existing object, typed by your definitions 
   */
  async update<P extends ValidPopulatePaths<D, T> = never>(
    input: UpdateInput<D, T>, 
    opts?: PopulateOptions<P>
  ): Promise<FromDefinitionWithSystemData<D, T, P>> {
    const definition = this.getDefinitionSchemaEntry(this.type);

    const builder = QueryBuilder.mutation('UpdateMetaobject')
      .variables({ id: 'ID!', metaobject: 'MetaobjectUpdateInput!' })
      .fragment<Metaobject>('BaseMetaobjectFields', 'Metaobject', (fragment) => {
        this.setupMetaobjectFragment(definition, fragment);
      })
      .operation<MetaobjectUpdatePayload>('metaobjectUpdate', { id: '$id', metaobject: '$metaobject' }, (metaobjectUpdate) => {
        metaobjectUpdate
          .object('metaobject', (metaobject) => {
            this.setupMetaobjectQuery(definition, metaobject, opts?.populate || [], opts?.onPopulate);
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

    const { metaobject, userErrors } = (await (await this.client(builder.build(), { variables })).json()).data.metaobjectUpdate;

    if (userErrors.length > 0) {
      throw new UserErrorsException(userErrors);
    }

    return deserialize(metaobject);
  }

  /** 
   * Upsert an existing object, typed by your definitions 
   */
  async upsert<P extends ValidPopulatePaths<D, T> = never>(
    input: UpsertInput<D, T>, 
    opts?: PopulateOptions<P>
  ): Promise<FromDefinitionWithSystemData<D, T, P>> {
    const definition = this.getDefinitionSchemaEntry(this.type);

    const builder = QueryBuilder.mutation('UpsertMetaobject')
      .variables({ handle: 'MetaobjectHandleInput!', metaobject: 'MetaobjectUpsertInput!' })
      .fragment<Metaobject>('BaseMetaobjectFields', 'Metaobject', (fragment) => {
        this.setupMetaobjectFragment(definition, fragment);
      })
      .operation<MetaobjectUpsertPayload>('metaobjectUpsert', { handle: '$handle', metaobject: '$metaobject' }, (metaobjectUpsert) => {
        metaobjectUpsert
          .object('metaobject', (metaobject) => {
            this.setupMetaobjectQuery(definition, metaobject, opts?.populate || [], opts?.onPopulate);
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

    const { metaobject, userErrors } = (await (await this.client(builder.build(), { variables })).json()).data.metaobjectUpsert;

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
    const { deletedId, userErrors } = (await (await this.client(builder.build(), { variables })).json()).data.metaobjectDelete; 

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
    
    const { job, userErrors } = (await (await this.client(builder.build(), { variables })).json()).data.metaobjectBulkDelete;

    if (userErrors.length > 0) {
      throw new UserErrorsException(userErrors);
    }

    return job;
  }

  /**
   * --------------------------------------------------------------------------------------------------------
   * QUERY BUILDER UTILITIES
   * --------------------------------------------------------------------------------------------------------
   */

  /**
   * Setup the base fields that are retrieved for all metaobjects (including the system information)
   */
  private setupMetaobjectFragment(schema: DefinitionSchemaEntry, fragment: FieldBuilder<Metaobject>): void {
    fragment
      .fields('id', 'type', 'handle', 'createdAt', 'updatedAt', 'displayName')
      .object('fields', (fields) => {
        fields.fields('key', 'jsonValue', 'type')
      });

    // We get the capabilities only if the definition contains some
    if (schema.capabilities?.publishable || schema.capabilities?.onlineStore) {
      fragment.object('capabilities', (capabilities) => {
        if (schema.capabilities?.publishable) {
          capabilities.object('publishable', (publishable) => {
            publishable.fields('status');
          })
        }

        if (schema.capabilities?.onlineStore) {
          capabilities.object('onlineStore', (onlineStore) => {
            onlineStore.fields('templateSuffix')
          })
        }
      })
    }

    // We only include the thumbnail field if the schema contains one reference
    const hasThumbnailField = schema.fields.some(field => field.type.includes('file_reference') || field.type.includes('color'));

    if (hasThumbnailField) {
      fragment.object('thumbnailField', (thumbnailField) => {
        thumbnailField.object('thumbnail', (thumbnail) => {
          thumbnail
            .fields('hex')
            .object('file', (file) => {
              file.object('preview', (preview) => {
                preview.object('image', (image) => {
                  image.fields('id', 'altText', 'url', 'width', 'height');
                })
              });
            });
        });
      });
    }
  }

  /**
   * Configure the query for a specific metaobject type
   */
  private setupMetaobjectQuery<T>(schema: DefinitionSchemaEntry, fieldBuilder: FieldBuilder<Metaobject>, populate: readonly string[], onPopulate?: OnPopulateFunc): void {
    fieldBuilder.useFragment('BaseMetaobjectFields');
    
    schema.fields.forEach((field) => {
      const cameledKey = camel(field.key);

      if (field.type.endsWith('_reference') && populate.some(key => key === cameledKey || key.startsWith(`${cameledKey}.`))) {
        // This resolve the populate recursively. For instance if we have ['foo.bar', 'baz'] and that this property is 'foo',
        // this will generate a new array that will be just ['bar]
        const nestedPopulate = populate
          .filter(key => key === cameledKey || key.startsWith(`${cameledKey}.`))
          .map(key => key === cameledKey ? '' : key.slice(cameledKey.length + 1))
          .filter(Boolean); // Remove empty strings

        this.setupReferenceQuery(field, fieldBuilder, nestedPopulate, onPopulate);
      }
    });
  }

  /**
   * Setup how a reference query is generated
   */
  private setupReferenceQuery(fieldDefinition: FieldDefinition, fieldBuilder: FieldBuilder<any>, populate: readonly string[], onPopulate?: OnPopulateFunc): void {
    // We prefix all references by a _ character to avoid clashes and to easily identify them when deserializing
    fieldBuilder.object({ field: `_${camel(fieldDefinition.key)}` }, { key: fieldDefinition.key }, (field) => {
      const baseResourceName = fieldDefinition.type.replace('list.', '');

      const setupReference = (reference: FieldBuilder) => {
        if ((fieldDefinition.type === 'metaobject_reference' || fieldDefinition.type === 'list.metaobject_reference') && fieldDefinition.metaobjectType) {
          return reference.inlineFragment<Metaobject>('Metaobject', (fragment) => {
            this.setupMetaobjectQuery(this.getDefinitionSchemaEntry(fieldDefinition.metaobjectType!), fragment, populate, onPopulate);
          });
        }

        if ((fieldDefinition.type === 'mixed_reference' || fieldDefinition.type === 'list.mixed_reference') && fieldDefinition.metaobjectTypes) {
          return fieldDefinition.metaobjectTypes?.forEach((metaobjectType) => {
            reference.inlineFragment<Metaobject>('Metaobject', (fragment) => {
              this.setupMetaobjectQuery(this.getDefinitionSchemaEntry(metaobjectType), fragment, populate, onPopulate);
            })
          });
        }

        // We first call the onPopulate method to let author populate their own fields
        if (onPopulate) {
          onPopulate(fieldDefinition, reference);
        }

        // If nothing has been specified, we use some default fields
        const hasFieldsExcludingTypename = reference.getFields().some((field) => (field.kind === 'field' && field.name !== '__typename'));

        if (!hasFieldsExcludingTypename) {
          switch (baseResourceName) {
            case 'product_reference':
              return reference.inlineFragment<Product>('Product', (fragment) => {
                fragment
                  .fields('id', 'handle', 'title', 'productType', 'status', 'description', 'vendor', 'tags', 'hasOnlyDefaultVariant', 'createdAt', 'updatedAt', 'publishedAt', 'templateSuffix')
                  .object('variantsCount', (variantsCount) => {
                    variantsCount.fields('count', 'precision')
                  })
                  .object('featuredImage', (featuredImage) => {
                    featuredImage.fields('id', 'altText', 'height', 'width', 'url')
                  })
              });

            case 'collection_reference':
              return reference.inlineFragment<Collection>('Collection', (fragment) => {
                fragment
                  .fields('id', 'handle', 'title', 'description', 'hasProduct', 'sortOrder', 'updatedAt', 'templateSuffix')
                  .object('image', (image) => {
                    image.fields('altText', 'height', 'width', 'url')
                  })
              });
            
            case 'customer_reference':
              return reference.inlineFragment<Customer>('Customer', (fragment) => {
                fragment
                  .fields('id', 'displayName', 'amountSpent', 'numberOfOrders', 'email', 'verifiedEmail', 'phone', 'locale', 'createdAt', 'updatedAt')
                  .object('image', (image => {
                    image.fields('id', 'altText', 'height', 'width', 'url');
                  }))
              });

            case 'company_reference':
              return reference.inlineFragment<Company>('Company', (fragment) => {
                fragment.fields('id', 'externalId', 'name', 'lifetimeDuration', 'ordersCount', 'totalSpent', 'createdAt', 'updatedAt')
              });

            case 'metaobject_reference':
            case 'mixed_reference':
              return reference.inlineFragment<Metaobject>('Metaobject', (fragment) => {
                fragment
                  .fields('id', 'type', 'handle', 'createdAt', 'updatedAt', 'displayName')
                  .object('fields', (fields) => {
                    fields.fields('key', 'jsonValue', 'type')
                  })
              });

            case 'page_reference':
              return reference.inlineFragment<Page>('Page', (fragment) => {
                fragment.fields('id', 'handle', 'title', 'body', 'isPublished', 'createdAt', 'updatedAt', 'templateSuffix');
              });

            case 'product_taxonomy_value_reference':
              return reference.inlineFragment<TaxonomyValue>('TaxonomyValue', (fragment) => {
                fragment.fields('id', 'name');
              });

            case 'variant_reference':
              return reference.inlineFragment<ProductVariant>('ProductVariant', (fragment) => {
                fragment
                  .fields('id', 'title', 'displayName', 'sku', 'price', 'compareAtPrice', 'availableForSale', 'inventoryQuantity', 'barcode', 'createdAt', 'updatedAt')
                  .object('image', (image) => {
                    image.fields('id', 'altText', 'height', 'width', 'url');
                  })
              });

            case 'file_reference':
              if (fieldDefinition.type === 'file_reference') {
                if (fieldDefinition.validations?.fileTypeOptions?.includes('Image')) {
                  reference.inlineFragment<MediaImage>('MediaImage', (fragment) => {
                    fragment
                      .fields('id')
                      .object('image', (image) => {
                        image.fields('id', 'altText', 'height', 'width', 'url');
                      })
                  });
                }

                if (fieldDefinition.validations?.fileTypeOptions?.includes('Video')) {
                  reference.inlineFragment<Video>('Video', (fragment) => {
                    fragment
                      .fields('id', 'duration')
                      .object('preview', (preview) => {
                        preview.object('image', (image) => {
                          image.fields('id', 'altText', 'height', 'width', 'url');
                        })
                      })
                      .object('sources', (sources) => {
                        sources.fields('format', 'fileSize', 'height', 'width', 'mimeType', 'url')
                      })
                  });
                }

                if (!fieldDefinition.validations?.fileTypeOptions) {
                  reference.inlineFragment<GenericFile>('GenericFile', (fragment) => {
                    fragment
                      .fields('id', 'alt', 'url')
                      .object('preview', (preview) => {
                        preview.object('image', (image) => {
                          image.fields('id', 'altText', 'height', 'width', 'url');
                        })
                      })
                  });
                }
              }

              return;
          }
        }
      }

      if (fieldDefinition.type.startsWith('list.')) {
        field.connection('references', { first: 50 }, (connection) => {
          connection.object('nodes', (nodes) => {
            nodes.fields('__typename');
            setupReference(nodes);
          });
        });
      } else {
        field.object('reference', (reference) => {
          reference.fields('__typename');
          setupReference(reference);
        });
      }
    })
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

  /**
   * Retrieve the schema for a specific type
   */
  private getDefinitionSchemaEntry(type: string): DefinitionSchemaEntry {
    const entry = this.defs.find(def => def.type === type);

    if (!entry) {
      throw new Error(`Can't find any definition schema with the type ${type}`);
    }

    return entry;
  }
}