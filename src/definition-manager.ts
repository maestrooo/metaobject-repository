import { AdminOperations } from "@shopify/admin-api-client";
import { AdminGraphqlClient } from "@shopify/shopify-app-remix/server";
import { snake } from "snake-camel";
import { DefinitionSchema, FieldDefinition } from "./types/definitions";
import { MetaobjectAccessInput, MetaobjectDefinitionCreateInput } from "~/types/admin.types";
import { ClientAware } from "./client-aware";
import { definitionRepository, DefinitionRepository } from "./definition-repository";

type SyncFromSchemaOptions = {
  deleteDanglingDefinitions: boolean;
  deleteDanglingFields: boolean;
}

/**
 * Manage the schema definitions
 */
export class DefinitionManager extends ClientAware {
  private definitionIdCache = new Map<string, string>();

  constructor(private readonly definitionRepository: DefinitionRepository) {
    super();
  }

  withClient(client: AdminGraphqlClient<AdminOperations>): this {
    super.withClient(client);
    this.definitionRepository.withClient(client);

    return this;
  }

  /**
   * Create a list of definitions from the schema. Definitions are created in dependency order:
   * deeper definitions (no cross-deps) first, then dependent ones, so that validations can be
   * resolved directly at creation time.
   */
  async createFromSchema(definitions: DefinitionSchema): Promise<void> {
    // 1) Build GraphQL inputs from in-memory schema
    const createInputs: Record<string, MetaobjectDefinitionCreateInput> = {};
    definitions.forEach((def) => {
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
          validations: this.convertValidations(field),
        })),
      };
    });

    // 2) Seed existing definitions cache
    const existingIds: Record<string, string> = {};

    await Promise.all(
      Object.values(createInputs).map(async (inp) => {
        const id = await this.getCachedDefinitionId(inp.type);

        if (id) {
          existingIds[inp.type] = id;
        }
      })
    );

    // 3) Determine which types still need creation
    const toCreate = Object.keys(createInputs).filter(
      (type) => !existingIds[type]
    );
    
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
          const newId = await this.definitionRepository.create(resolvedInput);
          createdIds[type] = newId;
        })
      );
    }
  }

  /**
   * Sync local definitions with the Shopify schema. By default, definitions that exist on Shopify but no longer locally are not
   * deleted to avoid data loss. To delete dangling definitions, set `deleteDanglingDefinitions` to true.
   */
  async syncFromSchema(definitions: DefinitionSchema, opts?: SyncFromSchemaOptions): Promise<void> {
    throw new Error("Not implemented yet");
  }

  /**
   * --------------------------------------------------------------------------------------------------------------------------------
   * PRIVATE METHODS
   * --------------------------------------------------------------------------------------------------------------------------------
   */

  /** 
   * Convert our in‐memory `validations` + any `metaobjectType(s)` into a Shopify-ready array 
   */
  private convertValidations(field: FieldDefinition): Array<{ name: string; value: string }> {
    const out: Array<{ name: string; value: string }> = [];

    // 1) We convert the "metaobjectType(s)" into a temporary validation
    if ('metaobjectType' in field && field.metaobjectType) {
      out.push({
        name: 'metaobject_definition_type',
        value: field.metaobjectType,
      });
    }
    if ('metaobjectTypes' in field && field.metaobjectTypes) {
      out.push({
        name: 'metaobject_definition_types',
        value: JSON.stringify(field.metaobjectTypes),
      });
    }

    // 2) turn each validation‐prop into {name,value:string}
    if ('validations' in field && field.validations) {
      for (const [name, raw] of Object.entries(field.validations)) {
        if (raw == null) {
          continue;
        }

        const validationName = (name === 'listMax') ? 'list.max' : ((name === 'listMin') ? 'list.min' : snake(name));
        const value = typeof raw === "string" || typeof raw === "number" ? String(raw) : JSON.stringify(raw);

        out.push({ name: validationName, value });
      }
    }

    return out;
  }

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

  /**
   * Get the metaobject definition ID from the type, or null if it doesn't exist
   */
  private async getCachedDefinitionId(type: string): Promise<string | null> {
    if (this.definitionIdCache.has(type)) {
      return this.definitionIdCache.get(type)!;
    }

    const id = await this.definitionRepository.findIdByType(type);

    // If we have resolved that ID already we cache it
    if (id) {
      this.definitionIdCache.set(type, id);
    }

    return id;
  }
}

export const definitionManager = new DefinitionManager(definitionRepository);