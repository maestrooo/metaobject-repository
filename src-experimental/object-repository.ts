/// ──────────────────────────────────────────────────────────────────────
/// 5) The ObjectRepository class

import { Job, MetaobjectBulkDeleteWhereCondition, PageInfo } from "../src/types/admin.types";
import { DefinitionsSchema, FromDefinition, FromDefinitionWithSystemData, ValidPopulatePaths } from "./types/definitions";
import { CreateInput, FindOptions, UpdateInput, UpsertInput } from "./types/repository";

/// ──────────────────────────────────────────────────────────────────────
export class ObjectRepository<D extends DefinitionsSchema, K extends keyof D> {
  constructor(
    private readonly defs: D,
    public readonly typeKey: K
  ) {}

  findById<P extends ValidPopulatePaths<D, K>>(
    id: string,
    opts?: { populate?: readonly P[] }
  ): Promise<FromDefinitionWithSystemData<D, K, P>> {
    const def = this.defs[this.typeKey];
    // …at runtime you can inspect `def.fields` and use opts.populate…
    throw new Error("Not implemented");
  }

  findByHandle<P extends ValidPopulatePaths<D, K>>(
    handle: string,
    opts?: { populate?: readonly P[] }
  ): Promise<FromDefinitionWithSystemData<D, K, P>> {
    const def = this.defs[this.typeKey];
    // …at runtime you can inspect `def.fields` and use opts.populate…
    throw new Error("Not implemented");
  }

  findAll<P extends ValidPopulatePaths<D, K>>(
    opts?: { populate?: readonly P[], limit?: number }
  ): Promise<FromDefinitionWithSystemData<D, K, P>[]> {
    const { populate, limit = 250 } = opts ?? {};

    const def = this.defs[this.typeKey];
    // …at runtime you can inspect `def.fields` and use opts.populate…
    throw new Error("Not implemented");
  }

  find<P extends ValidPopulatePaths<D, K>>(
    opts: FindOptions & { populate?: readonly P[] }
  ): Promise<{ pageInfo: PageInfo, items: FromDefinitionWithSystemData<D, K, P>[] }> {
    const def = this.defs[this.typeKey];
    // …at runtime you can inspect `def.fields` and use opts.populate…
    throw new Error("Not implemented");
  }

  /** Create a new object, typed by your definitions */
  create<P extends ValidPopulatePaths<D, K>>(
    input: CreateInput<D, K>, 
    opts?: { populate?: readonly P[] }
  ): Promise<FromDefinition<D, K, P>> {
    // …build + send your mutation…
    throw new Error("Not implemented");
  }

  /** Create a list of new objects, typed by your definitions */
  createMany<P extends ValidPopulatePaths<D, K>>(
    input: CreateInput<D, K>[], 
    opts?: { populate?: readonly P[] }
  ): Promise<FromDefinitionWithSystemData<D, K, P>[]> {
    // …build + send your mutation…
    throw new Error("Not implemented");
  }

  /** Update an existing object, typed by your definitions */
  update<P extends ValidPopulatePaths<D, K>>(
    input: UpdateInput<D, K>, 
    opts?: { populate?: readonly P[] }
  ): Promise<FromDefinitionWithSystemData<D, K, P>> {
    // …build + send your mutation…
    throw new Error("Not implemented");
  }

  /** Upsert an existing object, typed by your definitions */
  upsert<P extends ValidPopulatePaths<D, K>>(
    input: UpsertInput<D, K>, 
    opts?: { populate?: readonly P[] }
  ): Promise<FromDefinitionWithSystemData<D, K, P>> {
    // …build + send your mutation…
    throw new Error("Not implemented");
  }

  /** Delete an existing object, and return the ID of the deleted object */
  delete(id: string): Promise<string> {
    // …build + send your mutation…
    throw new Error("Not implemented");
  }

  /** Upsert an existing object, typed by your definitions */
  bulkDelete(where: MetaobjectBulkDeleteWhereCondition): Promise<Job> {
    // …build + send your mutation…
    throw new Error("Not implemented");
  }

  /**
   * Ensure that a metaobject ID is always using the GID format
   */
  private transformId(id: string): string {
    return id.startsWith('gid://shopify/Metaobject') ? id : `gid://shopify/Metaobject/${id}`;
  }
}