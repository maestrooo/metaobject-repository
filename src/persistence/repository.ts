import type { AdminGraphqlClient } from "@shopify/shopify-app-react-router/server";
import type { StandardSchemaV1 } from '@standard-schema/spec';
import { MetaobjectBulkDeleteWhereCondition, MetaobjectCapabilityDataInput } from "~/types/admin.types";
import { serializeFields } from "~/fields/serializer";
import { CreateMetaobjectMutation } from '~/graphql/create';
import { BaseMetaobject, Reference, ReferenceList } from "~/runtime/types";
import { standardValidate } from "~/utils/validation";
import { UpdateMetaobjectMutation } from "~/graphql/update";
import { UpsertMetaobjectMutation } from "~/graphql/upsert";
import { DeleteMetaobjectMutation } from "~/graphql/delete";
import { BulkDeleteMetaobjectMutation } from "~/graphql/bulk-delete";
import normalizeMetaobjectGid from "~/utils/id";
import { GetByIdQuery } from "~/graphql/get-by-id";
import { GetByHandleQuery } from "~/graphql/get-by-handle";
import { deserializeMetaobject } from "~/fields/deserializer";

type CreateOptions<Schema extends StandardSchemaV1> = {
  client: AdminGraphqlClient;
  schema: Schema;
  fields: StandardSchemaV1.InferInput<Schema>;
  handle?: string;
  capabilities?: MetaobjectCapabilityDataInput;
}

type UpdateOptions<Schema extends StandardSchemaV1> = {
  client: AdminGraphqlClient;
  schema: Schema;
  id: string;
  fields: StandardSchemaV1.InferInput<Schema>;
  handle?: string;
  redirectNewHandle?: boolean;
  capabilities?: MetaobjectCapabilityDataInput;
}

type UpsertOptions<Schema extends StandardSchemaV1> = {
  client: AdminGraphqlClient;
  schema: Schema;
  fields: StandardSchemaV1.InferInput<Schema>;
  handle: string;
  capabilities?: MetaobjectCapabilityDataInput;
}

type DeleteOptions = {
  client: AdminGraphqlClient;
  id: string;
}

type BulkDeleteOptions = {
  client: AdminGraphqlClient;
  where: MetaobjectBulkDeleteWhereCondition;
}

type With = {
  capabilities?: boolean;
  thumbnail?: boolean;
  fields?: {
    reference?: boolean; // populate single reference
    references?: boolean; // populate reference list
  };
};

type GetByIdOptions<W extends With | undefined = undefined> = {
  client: AdminGraphqlClient;
  id: string;
  with?: W;
}

type GetByHandleOptions<W extends With | undefined = undefined> = {
  client: AdminGraphqlClient;
  handle: string;
  with?: W;
}

// --- utils for nicer displayed types
type Simplify<T> = { [K in keyof T]: T[K] } & {};

// --- field-level transforms based on with.fields
type FieldsControl<W> = W extends { fields: infer F } ? F : {};

type TransformField<V, WF> =
  // Reference<T, Required> → keep as-is if WF.reference === true, else strip to { value: ... }
  V extends Reference<infer R, infer Req>
    ? (WF extends { reference: true }
        ? Reference<R, Req>
        : { value: Reference<R, Req>["value"] })
  // ReferenceList<T> → keep as-is if WF.references === true, else { value: string[] }
  : V extends ReferenceList<any>
    ? (WF extends { references: true }
        ? V
        : { value: string[] })
  // anything else → unchanged
  : V;

type TransformFields<F, WF> = {
  [K in keyof F]: TransformField<F[K], WF>;
};

// --- top-level transform for capabilities / thumbnail / fields
type ApplyWith<T extends BaseMetaobject, W> =
  Simplify<
    // drop the 3 keys, then re-add conditionally
    Omit<T, "capabilities" | "thumbnail" | "fields"> &
    (W extends { capabilities: true } ? { capabilities: T["capabilities"] } : {}) &
    (W extends { thumbnail: true } ? { thumbnail: T["thumbnail"] } : {}) &
    { fields: TransformFields<T["fields"], FieldsControl<W>> }
  >;

export class MetaobjectRepository<T extends BaseMetaobject> {
  constructor(private readonly type: string) {
  }

  /**
   * ---------------------------------------------------------------------------------------------------------------------
   * MUTATIONS
   * ---------------------------------------------------------------------------------------------------------------------
   */

  /**
   * Create a new metaobject for this type, and return the ID of the created metaobject
   */
  async create<S extends StandardSchemaV1>({ client, schema, fields, handle, capabilities }: CreateOptions<S>) {
    const validationResult = await standardValidate(schema, fields);
    
    const response = await client(CreateMetaobjectMutation, {
      variables: {
        metaobject: {
          type: this.type,
          handle,
          capabilities,
          fields: serializeFields(validationResult as Record<string, unknown>)
        }
      }
    });
    
    const { metaobject, userErrors } = (await response.json()).data?.metaobjectCreate!;
  
    if (userErrors.length) {
      throw new Error(`Metaobject creation failed. Reason: ${userErrors.map((e: any) => e.message).join(', ')}`);
    }
  
    return metaobject?.id!;
  }

  /**
   * Update an existing metaobject for this type, and return the ID of the updated metaobject
   */
  async update<S extends StandardSchemaV1>({ client, schema, id, fields, handle, redirectNewHandle, capabilities }: UpdateOptions<S>) {
    const validationResult = await standardValidate(schema, fields);
    
    const response = await client(UpdateMetaobjectMutation, {
      variables: {
        id,
        metaobject: {
          handle,
          redirectNewHandle,
          capabilities,
          fields: serializeFields(validationResult as Record<string, unknown>)
        }
      }
    });
    
    const { metaobject, userErrors } = (await response.json()).data?.metaobjectUpdate!;
  
    if (userErrors.length) {
      throw new Error(`Metaobject update failed. Reason: ${userErrors.map((e: any) => e.message).join(', ')}`);
    }
  
    return metaobject?.id!;
  }

  /**
   * Upsert an existing metaobject for this type, and return the ID of the upserted metaobject
   */
  async upsert<S extends StandardSchemaV1>({ client, schema, fields, handle, capabilities }: UpsertOptions<S>) {
    const validationResult = await standardValidate(schema, fields);
    
    const response = await client(UpsertMetaobjectMutation, {
      variables: {
        handle: {
          type: this.type,
          handle,
        },
        metaobject: {
          capabilities,
          fields: serializeFields(validationResult as Record<string, unknown>)
        }
      }
    });
    
    const { metaobject, userErrors } = (await response.json()).data?.metaobjectUpsert!;
  
    if (userErrors.length) {
      throw new Error(`Metaobject upsert failed. Reason: ${userErrors.map((e: any) => e.message).join(', ')}`);
    }
  
    return metaobject?.id!;
  }

  /**
   * Delete an existing metaobject for this type, and return the ID of the deleted metaobject
   */
  async delete({ client, id }: DeleteOptions) {
    const response = await client(DeleteMetaobjectMutation, {
      variables: {
        id: normalizeMetaobjectGid(id)
      }
    });
    
    const { deletedId, userErrors } = (await response.json()).data?.metaobjectDelete!;
  
    if (userErrors.length) {
      throw new Error(`Metaobject deletion failed. Reason: ${userErrors.map((e: any) => e.message).join(', ')}`);
    }
  
    return deletedId!;
  }

  /**
   * Bulk delete existing metaobjects for this type, and return the ID of the async job
   */
  async bulkDelete({ client, where }: BulkDeleteOptions) {
    where.ids = where.ids?.map(id => normalizeMetaobjectGid(id));

    const response = await client(BulkDeleteMetaobjectMutation, {
      variables: {
        where
      }
    });
    
    const { job, userErrors } = (await response.json()).data?.metaobjectBulkDelete!;
  
    if (userErrors.length) {
      throw new Error(`Metaobject deletion failed. Reason: ${userErrors.map((e: any) => e.message).join(', ')}`);
    }
  
    return job?.id!;
  }

  /**
   * ---------------------------------------------------------------------------------------------------------------------
   * QUERIES
   * ---------------------------------------------------------------------------------------------------------------------
   */

  async getById<const W extends With | undefined = undefined>({ client, id, with: withProp }: GetByIdOptions<W>)
    : Promise<ApplyWith<T, W extends undefined ? {} : NonNullable<W>>> {
    const response = await client(GetByIdQuery, {
      variables: {
        id: normalizeMetaobjectGid(id),
        includeCapabilities: !!withProp?.capabilities,
        includeThumbnail:    !!withProp?.thumbnail,
        populateReference:   !!withProp?.fields?.reference,
        populateReferenceList: !!withProp?.fields?.references
      }
    });

    const { metaobject } = (await response.json()).data!;

    if (!metaobject) {
      throw new Error(`Metaobject with id "${normalizeMetaobjectGid(id)}" does not exist.`);
    }

    // runtime still conditionally includes keys; cast to the narrowed return
    return deserializeMetaobject(metaobject) as ApplyWith<T, W extends undefined ? {} : NonNullable<W>>;
  }

  async getByHandle<const W extends With | undefined = undefined>({ client, handle, with: withProp }: GetByHandleOptions<W>)
    : Promise<ApplyWith<T, W extends undefined ? {} : NonNullable<W>>> {
    const response = await client(GetByHandleQuery, {
      variables: {
        handle: { type: this.type, handle },
        includeCapabilities:   !!withProp?.capabilities,
        includeThumbnail:      !!withProp?.thumbnail,
        populateReference:     !!withProp?.fields?.reference,
        populateReferenceList: !!withProp?.fields?.references
      }
    });

    const { metaobjectByHandle } = (await response.json()).data!;

    if (!metaobjectByHandle) {
      throw new Error(`Metaobject with handle "${handle}" does not exist.`);
    }

    return deserializeMetaobject(metaobjectByHandle) as ApplyWith<T, W extends undefined ? {} : NonNullable<W>>;
  }
}