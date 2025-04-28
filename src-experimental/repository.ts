/// ──────────────────────────────────────────────────────────────────────
/// 5) The ObjectRepository class

import { Job, MetaobjectBulkDeleteWhereCondition } from "../src/types/admin.types";
import { CreateInput, DefinitionsSchema, FromDefinition, UpdateInput, UpsertInput } from "./types";

/// ──────────────────────────────────────────────────────────────────────
export class ObjectRepository<
  D extends DefinitionsSchema,
  K extends keyof D
> {
  constructor(
    private readonly defs: D,
    public readonly typeKey: K
  ) {}

  find<P extends string = never>(
    id: string,
    opts?: { populate?: readonly P[] }
  ): Promise<FromDefinition<D, K, P>> {
    const def = this.defs[this.typeKey];
    // …at runtime you can inspect `def.fields` and use opts.populate…
    throw new Error("Not implemented");
  }

  /** Create a new object, typed by your definitions */
  create<P extends string = never>(
    input: CreateInput<D, K>, 
    opts?: { populate?: readonly P[] }
  ): Promise<FromDefinition<D, K, P>> {
    // …build + send your mutation…
    throw new Error("Not implemented");
  }

  /** Create a list of new objects, typed by your definitions */
  createMany<P extends string = never>(
    input: CreateInput<D, K>[], 
    opts?: { populate?: readonly P[] }
  ): Promise<FromDefinition<D, K, P>[]> {
    // …build + send your mutation…
    throw new Error("Not implemented");
  }

  /** Update an existing object, typed by your definitions */
  update<P extends string = never>(
    input: UpdateInput<D, K>, 
    opts?: { populate?: readonly P[] }
  ): Promise<FromDefinition<D, K, P>> {
    // …build + send your mutation…
    throw new Error("Not implemented");
  }

  /** Upsert an existing object, typed by your definitions */
  upsert<P extends string = never>(
    input: UpsertInput<D, K>, 
    opts?: { populate?: readonly P[] }
  ): Promise<FromDefinition<D, K, P>> {
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
}