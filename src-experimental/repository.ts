/// ──────────────────────────────────────────────────────────────────────
/// 5) The ObjectRepository class

import { DefinitionsSchema, FromDefinition } from "./types";

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
  ): FromDefinition<D, K, P> {
    const def = this.defs[this.typeKey];
    // …at runtime you can inspect `def.fields` and use opts.populate…
    throw new Error("Not implemented");
  }
}