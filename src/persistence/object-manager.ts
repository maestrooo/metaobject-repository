import { AdminGraphqlClient } from "@shopify/shopify-app-remix/server";
import { classMetadataFactory } from "../class-metadata-factory";
import { Constructor, FieldDefinition, MetaobjectClassMetadata } from "../types";
import { ObjectRepository } from "./object-repository";
import { FindOptions, Job, ManagedMetaobject, MetaobjectGid, MetaobjectCreateInput, MetaobjectUpsertInput, FindOneOptions } from "./types";
import { FieldBuilder, QueryBuilder } from "raku-ql";
import { Metaobject, PageInfo } from "../types/admin.types";
import { hydrateMetaobject } from "../hydrators/metaobject";

/**
 * The object manager is the entry point to interact with metaobjects
 */
export class ObjectManager {
  private client: AdminGraphqlClient;
  private fragmentGenerator: (resourceName: string, builder: FieldBuilder) => void;
  private repositories: Map<Constructor, ObjectRepository<any>> = new Map();

  /**
   * Set the authenticated GraphQL Client returned from Shopify
   */
  public withClient(client: AdminGraphqlClient): ObjectManager {
    this.client = client;
    return this;
  }

  /**
   * Get a repository for a specific type
   */
  public getRepository<T>(ctor: Constructor<T>): ObjectRepository<T> {
    if (!classMetadataFactory.hasMetadataFor(ctor)) {
      throw new Error(`No class metadata could be found for "${ctor.name}". Decorate the class with @Metaobject.`);
    }

    if (!this.repositories.has(ctor)) {
      this.repositories.set(ctor, new ObjectRepository<T>(this, ctor));
    }

    return this.repositories.get(ctor) as ObjectRepository<T>;
  }

  /**
   * --------------------------------------------------------------------------------------------------------
   * CRUD OPERATIONS
   * --------------------------------------------------------------------------------------------------------
   */

  /**
   * Get a single object by ID or handle, or null if not found
   */
  async findOne<T>(ctor: Constructor<T>, id: MetaobjectGid, options?: FindOneOptions): Promise<ManagedMetaobject<T> | null>;
  async findOne<T>(ctor: Constructor<T>, handle: string, options?: FindOneOptions): Promise<ManagedMetaobject<T> | null>;
  async findOne<T>(ctor: Constructor<T>, identifier: string, options?: FindOneOptions): Promise<ManagedMetaobject<T> | null> {
    this.validateClient();

    const fetchById = identifier.startsWith('gid://shopify/Metaobject/');

    const builder = QueryBuilder.query('GetMetaobject')
      .variables({ identifier: fetchById ? 'ID!' : 'MetaobjectHandleInput!' })
      .fragment<Metaobject>('BaseMetaobjectFields', 'Metaobject', (fragment) => {
        this.setupMetaobjectFragment(fragment);
      })
      .operation<Metaobject>({ [fetchById ? 'metaobject' : 'metaobjectByHandle']: 'metaobject' }, { [fetchById ? 'id' : 'handle']: '$identifier' }, (metaobject) => {
        this.setupMetaobjectQuery(ctor, metaobject, options?.populate || []);
      });

    const classMetadata = classMetadataFactory.getMetadataFor(ctor) as MetaobjectClassMetadata;
    const variables = fetchById ? { identifier } : { identifier: { handle: identifier, type: classMetadata.type } };

    const { metaobject } = (await (await this.client(builder.build(), { variables })).json()).data;

    return metaobject ? hydrateMetaobject(ctor, metaobject) : null;
  }

  /**
   * Get a single object by ID or handle, or throw an error if not found
   */
  async findOneOrFail<T>(ctor: Constructor<T>, id: MetaobjectGid, options?: FindOneOptions): Promise<ManagedMetaobject<T> | null>;
  async findOneOrFail<T>(ctor: Constructor<T>, handle: string, options?: FindOneOptions): Promise<ManagedMetaobject<T> | null>;
  async findOneOrFail<T>(ctor: Constructor<T>, identifier: string, options?: FindOneOptions): Promise<ManagedMetaobject<T> | null> {
    this.validateClient();

    const object = await this.findOne<T>(ctor, identifier);

    if (!object) {
      const classMetadata = classMetadataFactory.getMetadataFor(ctor) as MetaobjectClassMetadata;
      throw new Error(`No object of name "${classMetadata.name}" could be found with the identifier "${identifier}".`);
    }

    return object;
  }

  /**
   * Find multiple objects matching some conditions
   */
  async find<T>(ctor: Constructor<T>, options: FindOptions): Promise<{ pageInfo: PageInfo, items: ManagedMetaobject<T>[] }> {
    this.validateClient();

    const classMetadata = classMetadataFactory.getMetadataFor(ctor) as MetaobjectClassMetadata;

    const connectionParameters = {
      type: classMetadata.type,
      first: ('after' in options) ? (options.first || 50) : undefined,
      last: ('before' in options) ? (options.last || 50) : undefined,
      after: options.after,
      before: options.before,
      query: options.query,
      sortKey: options.sortBy,
      reverse: options.reverse,
    }

    if (!connectionParameters.first && !connectionParameters.last) {
      connectionParameters.first = 50; // Provide a default value for first
    }

    const builder = QueryBuilder.query('GetMetaobjects')
      .fragment<Metaobject>('BaseMetaobjectFields', 'Metaobject', (fragment) => {
        this.setupMetaobjectFragment(fragment);
      })
      .connection('metaobjects', connectionParameters, (connection) => {
        connection.object('nodes', (nodes) => {
          this.setupMetaobjectQuery(ctor, nodes, options?.populate || []);
        });
      });

    const { pageInfo, nodes } = (await (await this.client(builder.build())).json()).data.metaobjects;

    return {
      pageInfo,
      items: nodes.map((metaobject: Metaobject) => hydrateMetaobject(ctor, metaobject))
    }
  }

  /**
   * Delete a single object by its ID or by the object itself
   */
  async delete<T>(ctor: Constructor<T>, id: MetaobjectGid): Promise<MetaobjectGid>;
  async delete<T>(ctor: Constructor<T>, object: ManagedMetaobject<T>): Promise<MetaobjectGid>;
  async delete<T>(ctor: Constructor<T>, objectOrId: (MetaobjectGid | ManagedMetaobject<T>)): Promise<MetaobjectGid> {
    this.validateClient();
  }

  /**
   * Delete many objects by their IDS or by the objects themselves
   */
  async deleteMany<T>(ctor: Constructor<T>, ids: MetaobjectGid[]): Promise<Job>;
  async deleteMany<T>(ctor: Constructor<T>, objects: ManagedMetaobject<T>[]): Promise<Job>;
  async deleteMany<T>(ctor: Constructor<T>, objectsOrIds: (MetaobjectGid[] | ManagedMetaobject<T>[])): Promise<Job> {
    this.validateClient();
  }

  /**
   * Create a single object, or optionally pass a handle
   */
  async create<T>(ctor: Constructor<T>, input: MetaobjectCreateInput<T>): Promise<ManagedMetaobject<T>>
  async create<T>(ctor: Constructor<T>, object: T): Promise<ManagedMetaobject<T>>
  async create<T>(ctor: Constructor<T>, objectOrInput: T | MetaobjectCreateInput<T>): Promise<ManagedMetaobject<T>> {
    this.validateClient();
  }

  /**
   * Create multiple objects, or optionally pass an handle
   */
  async createMany<T>(ctor: Constructor<T>, input: MetaobjectCreateInput<T>[]): Promise<ManagedMetaobject<T>[]>
  async createMany<T>(ctor: Constructor<T>, objects: T[]): Promise<ManagedMetaobject<T>[]>
  async createMany<T>(ctor: Constructor<T>, objectsOrInputs: T[] | MetaobjectCreateInput<T>[]): Promise<ManagedMetaobject<T>[]> {
    this.validateClient();
  }

  /**
   * Upsert a given object. When upserting an object directly, this must be a managed object
   */
  async upsert<T>(ctor: Constructor<T>, input: MetaobjectUpsertInput<T>[]): Promise<ManagedMetaobject<T>>
  async upsert<T>(ctor: Constructor<T>, object: ManagedMetaobject<T>): Promise<ManagedMetaobject<T>>
  async upsert<T>(ctor: Constructor<T>, objectOrInput: ManagedMetaobject<T> | MetaobjectUpsertInput<T>): Promise<ManagedMetaobject<T>> {
    this.validateClient();
  }

  /**
   * Update a given object. Only managed objects can be updated
   */
  async update<T>(ctor: Constructor<T>, object: ManagedMetaobject<T>): Promise<ManagedMetaobject<T>> {
    this.validateClient();
  }

  /**
   * --------------------------------------------------------------------------------------------------------
   * QUERY BUILDER UTILITIES
   * --------------------------------------------------------------------------------------------------------
   */

  public registerFragmentGenerator(callback: (resourceName: string, builder: FieldBuilder) => void): void {
    this.fragmentGenerator = callback;
  }

  private setupMetaobjectFragment(fragment: FieldBuilder<Metaobject>): void {
    fragment
      .fields('id', 'handle', 'createdAt', 'updatedAt', 'displayName')
      .object('fields', (fields) => {
        fields.fields('key', 'jsonValue')
      })
      .object('thumbnailField', (thumbnailField) => {
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

  private setupMetaobjectQuery<T>(ctor: Constructor<T>, fieldBuilder: FieldBuilder<Metaobject>, populate: readonly string[]): void {
    fieldBuilder.useFragment('BaseMetaobjectFields');
    const classMetadata = classMetadataFactory.getMetadataFor(ctor) as MetaobjectClassMetadata;

    classMetadata.fields.forEach((field) => {
      if (field.isReference && populate.some(key => key === field.propertyName || key.startsWith(`${field.propertyName}.`))) {
        // This resolve the populate recursively. For instance if we have ['foo.bar', 'baz'] and that this property is 'foo',
        // this will generate a new array that will be just ['bar]
        const nestedPopulate = populate
          .filter(key => key === field.propertyName || key.startsWith(`${field.propertyName}.`))
          .map(key => key === field.propertyName ? '' : key.slice(field.propertyName.length + 1))
          .filter(Boolean); // Remove empty strings

        this.setupReferenceQuery(field, fieldBuilder, nestedPopulate);
      }
    });
  }

  private setupReferenceQuery(fieldDefinition: FieldDefinition, fieldBuilder: FieldBuilder<any>, populate: string[]): void {
    const defaultMapping = {
      'product_reference': { resourceName: 'Product', fields: ['id', 'handle', 'title', 'vendor', 'updatedAt' ] },
      'collection_reference': { resourceName: 'Collection', fields: ['id', 'handle', 'title', 'productsCount', 'updatedAt' ] },
      'customer_reference': { resourceName: 'Customer', fields: ['id', 'displayName', 'email', 'phone', 'createdAt' ] },
      'metaobject_reference': { resourceName: 'Metaobject', fields: ['id', 'handle', 'displayName', 'updatedAt' ] },
      'page_reference': { resourceName: 'Page', fields: ['id', 'handle', 'title', 'updatedAt' ] },
      'variant_reference': { resourceName: 'ProductVariant', fields: ['id', 'title', 'sku', 'price', 'inventoryQuantity', 'barcode'] },
      'product_taxonomy_value_reference': { resourceName: 'TaxonomyValue', fields: ['id', 'name' ] }
    }

    fieldBuilder.object({ field: `_${fieldDefinition.propertyName}` }, { key: fieldDefinition.key }, (field) => {
      const { resourceName, fields } = defaultMapping[fieldDefinition.type as keyof typeof defaultMapping] ?? { name: fieldDefinition.type, fields: [] };

      const setupFragment = (fragment: FieldBuilder) => {
        if ('metaobject' in fieldDefinition && fieldDefinition.metaobject) {
          this.setupMetaobjectQuery(fieldDefinition.metaobject, fragment, populate);
        }

        if (this.fragmentGenerator) {
          this.fragmentGenerator(resourceName, fragment);
        }

        if (fragment.getFields().length === 0) {
          fragment.fields(...fields);
        }
      }

      if (fieldDefinition.list) {
        field.connection('references', { first: 50 }, (connection) => {
          connection.object('nodes', (nodes) => {
            nodes.inlineFragment(resourceName, (fragment) => {
              setupFragment(fragment);
            })
          });
        })
      } else {
        field.object('reference', (reference) => {
          reference.inlineFragment(resourceName, (fragment) => {
            setupFragment(fragment);
          });
        });
      }
    })
  }

  /**
   * --------------------------------------------------------------------------------------------------------
   * OTHER
   * --------------------------------------------------------------------------------------------------------
   */

  private validateClient(): void {
    if (!this.client) {
      throw new Error('No authenticated client has been set on the object manager. Use withClient() to set one.');
    }
  }
}

export const objectManager = new ObjectManager();