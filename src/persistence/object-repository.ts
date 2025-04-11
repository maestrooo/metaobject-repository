import { Constructor } from "../types";
import { PageInfo } from "../types/admin.types";
import { ObjectManager } from "./object-manager";
import { FindOptions, ManagedMetaobject, MetaobjectGid, MetaobjectCreateInput, Job, CreateOptions } from "./types";

/**
 * An object repository allows to interact with metaobjects of a single type. It makes it less verbose to interact with
 * as you don't need to specify the type each time you interact with methods.
 *
 * Under the hood, it forwards everything to the ObjectManager instance.
 */
export class ObjectRepository<T> {
  constructor(private readonly objectManager: ObjectManager, private readonly ctor: Constructor<T>) {}

  /**
   * --------------------------------------------------------------------------------------------------------
   * CRUD OPERATIONS
   * --------------------------------------------------------------------------------------------------------
   */

  /**
   * Get a single object by ID or handle, or null if not found
   */
  async findOne(id: MetaobjectGid): Promise<ManagedMetaobject<T> | null>;
  async findOne(handle: string): Promise<ManagedMetaobject<T> | null>;
  async findOne(identifier: string): Promise<ManagedMetaobject<T> | null> {
    return this.objectManager.findOne<T>(this.ctor, identifier);
  }

  /**
   * Get a single object by ID or handle, or throw an error if not found
   */
  async findOneOrFail(id: MetaobjectGid): Promise<ManagedMetaobject<T>>;
  async findOneOrFail(handle: string): Promise<ManagedMetaobject<T>>;
  async findOneOrFail(identifier: string): Promise<ManagedMetaobject<T>> {
    return this.objectManager.findOneOrFail<T>(this.ctor, identifier);
  }

  /**
   * Find multiple objects matching some conditions
   */
  async find(options: FindOptions): Promise<{ pageInfo: PageInfo, items: ManagedMetaobject<T>[] }> {
    return this.objectManager.find<T>(this.ctor, options);
  }

  /**
   * Delete a single object by its ID or by the object itself
   */
  async delete(id: MetaobjectGid): Promise<MetaobjectGid>;
  async delete(object: ManagedMetaobject<T>): Promise<MetaobjectGid>;
  async delete(objectOrId: (MetaobjectGid | ManagedMetaobject<T>)): Promise<MetaobjectGid> {
    return this.objectManager.delete<T>(this.ctor, objectOrId);
  }

  /**
   * Delete many objects by their IDS or by the objects themselves
   */
  async deleteMany(ids: MetaobjectGid[]): Promise<Job>;
  async deleteMany(objects: ManagedMetaobject<T>[]): Promise<Job>;
  async deleteMany(objectsOrIds: (MetaobjectGid[] | ManagedMetaobject<T>[])): Promise<Job> {
    return this.objectManager.deleteMany<T>(this.ctor, objectsOrIds);
  }

  /**
   * Create a single object, or optionally pass an option
   */
  async create(ctor: Constructor<T>, input: MetaobjectCreateInput<T>, options?: CreateOptions): Promise<ManagedMetaobject<T>>
  async create(ctor: Constructor<T>, object: T, options?: CreateOptions): Promise<ManagedMetaobject<T>>
  async create(ctor: Constructor<T>, objectOrInput: T | MetaobjectCreateInput<T>, options?: CreateOptions): Promise<ManagedMetaobject<T>> {
    return this.objectManager.create<T>(this.ctor, objectOrInput, options);
  }

  /**
   * Create multiple objects, or optionally pass an handle
   */
  async createMany(input: MetaobjectCreateInput<T>[]): Promise<ManagedMetaobject<T>[]>
  async createMany(objects: T[]): Promise<ManagedMetaobject<T>[]>
  async createMany(objectsOrInputs: T[] | MetaobjectCreateInput<T>[]): Promise<ManagedMetaobject<T>[]> {

  }

  /**
   * Upsert a given object. When upserting an object directly, this must be a managed object
   */
  async upsert(input: MetaobjectUpsertInput<T>[]): Promise<ManagedMetaobject<T>>
  async upsert(object: ManagedMetaobject<T>): Promise<ManagedMetaobject<T>>
  async upsert(objectOrInput: ManagedMetaobject<T> | MetaobjectUpsertInput<T>): Promise<ManagedMetaobject<T>> {

  }

  /**
   * Update a given object. Only managed objects can be updated
   */
  async update(object: ManagedMetaobject<T>): Promise<ManagedMetaobject<T>> {

  }
}