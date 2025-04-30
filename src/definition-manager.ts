import { GraphQLClient } from "node_modules/@shopify/shopify-app-remix/dist/ts/server/clients/types";
import { DefinitionSchema, FieldDefinition } from "./types/definitions";
import { AdminOperations } from "@shopify/admin-api-client";
import { snake } from "snake-camel";
import { MetaobjectAccessInput, MetaobjectDefinitionCreateInput, MetaobjectDefinitionUpdateInput } from "~/types/admin.types";

/**
 * Manage the schema definitions
 */
export class DefinitionManager {
  private client!: GraphQLClient<AdminOperations>;
  private definitionIdCache = new Map<string, string>();

  /**
   * Set the GraphQL client to interact with Shopify API
   */
  withClient(client: GraphQLClient<AdminOperations>): this {
    this.client = client;
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
        const id = await this.getDefinitionId(inp.type);

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
          const newId = await this.createDefinition(resolvedInput);
          createdIds[type] = newId;
        })
      );
    }
  }

  /**
   * Update an existing definition. This is useful when you need to customize a given definition beyond the original schema, or
   * dynamically change the definition.
   */
  async updateDefinition(options: { type: string, definition: MetaobjectDefinitionUpdateInput }): Promise<void> {
    const id = await this.getDefinitionId(options.type);

    const response = await this.client(
      `#graphql
      mutation UpdateMetaobjectDefinition($id: ID!, $definition: MetaobjectDefinitionUpdateInput!) {
        metaobjectDefinitionUpdate(id: $id, definition: $definition) {
          metaobjectDefinition {
            id
            name
            type
          }

          userErrors {
            field
            message
            code
          }
        }
      }`, {
        variables: { 
          id,
          definition: options.definition
        }
      }
    );

    const responseJson = await response.json();

    const { userErrors } = responseJson.data.metaobjectDefinitionUpdate;

    if (userErrors.length > 0) {
      console.warn(userErrors);
      throw new Error(`Cannot create the metaobject definition. Reason: ${userErrors[0].message}`);
    }
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
  private async getDefinitionId(type: string): Promise<string | null> {
    if (this.definitionIdCache.has(type)) {
      return this.definitionIdCache.get(type)!;
    }

    const response = await this.client(
      `#graphql
      query GetMetaobjectDefinitionByType($type: String!) {
        metaobjectDefinitionByType(type: $type) {
          id
        }
      }`, {
        variables: { type }
      }
    );

    const responseJson = await response.json();
    const id = responseJson.data.metaobjectDefinitionByType?.id ?? null;

    // If we have resolved that ID already we cache it
    if (id) {
      this.definitionIdCache.set(type, id);
    }

    return id;
  }

  /**
   * Create a new definition and return the ID of the generated definition. This method is used internally to create
   * the definition and can't be used directly.
   */
  private async createDefinition(definition: MetaobjectDefinitionCreateInput): Promise<string> {
    const response = await this.client(
      `#graphql
      mutation CreateMetaobjectDefinition($definition: MetaobjectDefinitionCreateInput!) {
        metaobjectDefinitionCreate(definition: $definition) {
          metaobjectDefinition {
            id
            name
            type
          }

          userErrors {
            field
            message
            code
          }
        }
      }`, {
        variables: { definition }
      }
    );

    const responseJson = await response.json();

    const { metaobjectDefinition, userErrors } = responseJson.data.metaobjectDefinitionCreate;

    if (userErrors.length > 0) {
      console.warn(userErrors);
      throw new Error(`Cannot create the metaobject definition. Reason: ${userErrors[0].message}`);
    }

    return metaobjectDefinition.id;
  }
}

export const definitionManager = new DefinitionManager();