import { AdminGraphqlClient } from "@shopify/shopify-app-remix/server";
import { classMetadataFactory } from "../class-metadata-factory";
import { Constructor } from "../types";
import { ObjectRepository } from "./object-repository";
import { FindOptions, Job, ManagedMetaobject, MetaobjectGid, MetaobjectCreateInput, MetaobjectUpsertInput } from "./types";

/**
 * The object manager is the entry point to interact with metaobjects
 */
export class ObjectManager {
  private client: AdminGraphqlClient;
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
}

export const objectManager = new ObjectManager();