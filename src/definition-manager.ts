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
   * Create a list of definitions from the schema. It automatically handles the creation of the metaobjects definitions recursively
   */
  async createFromSchema(definitions: DefinitionSchema): Promise<void> {
    // 1) Turn our DefinitionsSchema into GraphQL inputs, one per key
    const createInputs: Record<string, MetaobjectDefinitionCreateInput> = {};

    definitions.forEach((definition) => {
      createInputs[definition.type] = {
        type: definition.type,
        name: definition.name,
        description: definition.description,
        displayNameKey: definition.displayNameKey,
        access: definition.access as MetaobjectAccessInput,
        capabilities: definition.capabilities,
        fieldDefinitions: definition.fields.map((field) => ({
          name:        field.name,
          key:         field.key,
          type:        field.type,
          description: field.description ?? '',
          required:    field.required ?? false,
          validations: this.convertValidations(field),
        })),
      };
    });
    
    // 2) Prime existing definitions by type
    const existingIds: Record<string, string> = {};
    await Promise.all(
      Object.values(createInputs).map(async (inp) => {
        const id = await this.getDefinitionId(inp.type);

        if (id) {
          existingIds[inp.type] = id
        };
      })
    );

    // 3) Which schema‐keys still need creation?
    const toCreateKeys = Object.entries(createInputs)
      .filter(([, inp]) => !existingIds[inp.type])
      .map(([key]) => key);
    if (toCreateKeys.length === 0) return;

    // 4) Map from type → our schema‐key
    const typeToKey: Record<string, string> = {};
    for (const [key, schema] of Object.entries(definitions)) {
      typeToKey[schema.type] = key;
    }

    // 5) Compute dependencies among the missing ones
    const deps: Record<string, Set<string>> = {};
    for (const key of toCreateKeys) {
      const input = createInputs[key]!;
      const depSet = new Set<string>();
      for (const fd of input.fieldDefinitions ?? []) {
        for (const v of fd.validations ?? []) {
          if (v.name === 'metaobject_definition_type') {
            const depKey = typeToKey[v.value];
            if (depKey && toCreateKeys.includes(depKey)) {
              depSet.add(depKey);
            }
          }
          if (v.name === 'metaobject_definition_types') {
            try {
              const arr: string[] = JSON.parse(v.value);
              for (const t of arr) {
                const depKey = typeToKey[t];
                if (depKey && toCreateKeys.includes(depKey)) {
                  depSet.add(depKey);
                }
              }
            } catch {}
          }
        }
      }
      deps[key] = depSet;
    }

    // 6) Topo-sort into batches
    const batches = this.topoSort(toCreateKeys, deps);

    // 7) Create, layer by layer
    const createdIds = { ...existingIds };
    for (const layer of batches) {
      await Promise.all(
        layer.map(async (key) => {
          // clone so we can rewrite validations in place
          const clone = structuredClone(createInputs[key]);
          for (const fd of clone.fieldDefinitions ?? []) {
            fd.validations = fd.validations!.map((v) => {
              if (v.name === "metaobject_definition_type") {
                return {
                  name:  "metaobject_definition_id",
                  value: createdIds[v.value]!,
                };
              }
              if (v.name === "metaobject_definition_types") {
                const types: string[] = JSON.parse(v.value);
                const ids = types.map((t) => createdIds[t]!);
                return {
                  name:  "metaobject_definition_ids",
                  value: JSON.stringify(ids),
                };
              }
              return v;
            });
          }
          const newId = await this.createDefinition(clone);
          createdIds[clone.type] = newId;
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