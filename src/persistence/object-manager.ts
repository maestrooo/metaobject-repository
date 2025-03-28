import { AdminGraphqlClient } from "@shopify/shopify-app-remix/server";
import { classMetadataFactory } from "../class-metadata-factory";
import { Constructor, FieldDefinition, MetaobjectClassMetadata } from "../types";
import { ObjectRepository } from "./object-repository";
import { FindOptions, Job, ManagedMetaobject, MetaobjectGid, MetaobjectCreateInput, MetaobjectUpsertInput } from "./types";
import { FieldBuilder, QueryBuilder } from "raku-ql";
import { Metaobject } from "../types/admin.types";

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
  async findOne<T>(ctor: Constructor<T>, id: MetaobjectGid): Promise<ManagedMetaobject<T> | null>;
  async findOne<T>(ctor: Constructor<T>, handle: string): Promise<ManagedMetaobject<T> | null>;
  async findOne<T>(ctor: Constructor<T>, identifier: string): Promise<ManagedMetaobject<T> | null> {
    const fetchById = identifier.startsWith('gid://shopify/Metaobject/');

    const builder = QueryBuilder.query('GetMetaobject')
      .variables({ identifier: fetchById ? 'ID!' : 'String!' })
      .operation<Metaobject>({ [fetchById ? 'metaobject' : 'metaobjectByHandle']: 'metaobject' }, { [fetchById ? 'id' : 'handle']: '$identifier' }, (metaobject) => {
        this.setupMetaobjectQuery(ctor, metaobject);
      });

    const { metaobject } = (await (await this.client(builder.build(), { variables: { identifier } })).json()).data;

    console.log(builder.build({ pretty: true }));
  }

  /**
   * Get a single object by ID or handle, or throw an error if not found
   */
  async findOneOrFail<T>(ctor: Constructor<T>, id: MetaobjectGid): Promise<ManagedMetaobject<T>>;
  async findOneOrFail<T>(ctor: Constructor<T>, handle: string): Promise<ManagedMetaobject<T>>;
  async findOneOrFail<T>(ctor: Constructor<T>, identifier: string): Promise<ManagedMetaobject<T>> {
  }

  /**
   * Find multiple objects matching some conditions
   */
  async find<T>(ctor: Constructor<T>, options: FindOptions): Promise<ManagedMetaobject<T>[]> {
  }

  /**
   * Delete a single object by its ID or by the object itself
   */
  async delete<T>(ctor: Constructor<T>, id: MetaobjectGid): Promise<MetaobjectGid>;
  async delete<T>(ctor: Constructor<T>, object: ManagedMetaobject<T>): Promise<MetaobjectGid>;
  async delete<T>(ctor: Constructor<T>, objectOrId: (MetaobjectGid | ManagedMetaobject<T>)): Promise<MetaobjectGid> {

  }

  /**
   * Delete many objects by their IDS or by the objects themselves
   */
  async deleteMany<T>(ctor: Constructor<T>, ids: MetaobjectGid[]): Promise<Job>;
  async deleteMany<T>(ctor: Constructor<T>, objects: ManagedMetaobject<T>[]): Promise<Job>;
  async deleteMany<T>(ctor: Constructor<T>, objectsOrIds: (MetaobjectGid[] | ManagedMetaobject<T>[])): Promise<Job> {
  }

  /**
   * Create a single object, or optionally pass a handle
   */
  async create<T>(ctor: Constructor<T>, input: MetaobjectCreateInput<T>): Promise<ManagedMetaobject<T>>
  async create<T>(ctor: Constructor<T>, object: T): Promise<ManagedMetaobject<T>>
  async create<T>(ctor: Constructor<T>, objectOrInput: T | MetaobjectCreateInput<T>): Promise<ManagedMetaobject<T>> {

  }

  /**
   * Create multiple objects, or optionally pass an handle
   */
  async createMany<T>(ctor: Constructor<T>, input: MetaobjectCreateInput<T>[]): Promise<ManagedMetaobject<T>[]>
  async createMany<T>(ctor: Constructor<T>, objects: T[]): Promise<ManagedMetaobject<T>[]>
  async createMany<T>(ctor: Constructor<T>, objectsOrInputs: T[] | MetaobjectCreateInput<T>[]): Promise<ManagedMetaobject<T>[]> {

  }

  /**
   * Upsert a given object. When upserting an object directly, this must be a managed object
   */
  async upsert<T>(ctor: Constructor<T>, input: MetaobjectUpsertInput<T>[]): Promise<ManagedMetaobject<T>>
  async upsert<T>(ctor: Constructor<T>, object: ManagedMetaobject<T>): Promise<ManagedMetaobject<T>>
  async upsert<T>(ctor: Constructor<T>, objectOrInput: ManagedMetaobject<T> | MetaobjectUpsertInput<T>): Promise<ManagedMetaobject<T>> {

  }

  /**
   * Update a given object. Only managed objects can be updated
   */
  async update<T>(ctor: Constructor<T>, object: ManagedMetaobject<T>): Promise<ManagedMetaobject<T>> {

  }

  /**
   * --------------------------------------------------------------------------------------------------------
   * QUERY BUILDER UTILITIES
   * --------------------------------------------------------------------------------------------------------
   */

  public registerFragmentGenerator(callback: (resourceName: string, builder: FieldBuilder) => void): void {
    this.fragmentGenerator = callback;
  }

  private setupMetaobjectQuery<T>(ctor: Constructor<T>, fieldBuilder: FieldBuilder<Metaobject>): void {
    fieldBuilder
      .fields('id', 'handle', 'createdAt', 'updatedAt', 'displayName')
      .object('fields', (fields) => {
        fields.fields('key', 'jsonValue')
      });
    
    const classMetadata = classMetadataFactory.getMetadataFor(ctor) as MetaobjectClassMetadata;

    classMetadata.fields.forEach((field) => {
      if (field.type.endsWith('_reference')) {
        this.setupReferenceQuery(field, fieldBuilder);
      }
    });
  }

  private setupReferenceQuery(fieldDefinition: FieldDefinition, fieldBuilder: FieldBuilder<any>): void {
    const defaultMapping = {
      'product_reference': { resourceName: 'Product', fields: ['id', 'handle', 'title', 'vendor', 'variantsCount', 'updatedAt' ] },
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
          this.setupMetaobjectQuery(fieldDefinition.metaobject, fragment);
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
          connection.inlineFragment(resourceName, (fragment) => {
            setupFragment(fragment);
          })
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
}

export const objectManager = new ObjectManager();