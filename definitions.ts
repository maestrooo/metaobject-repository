// ────────────────────────────────────────────────────────────────────────
// File: definitions.ts
// ────────────────────────────────────────────────────────────────────────

import { DefinitionSchema } from "./src/types/definitions";
import { MetaobjectStorefrontAccess } from "./src/types/admin.types";

/**
 * Your “definitions” object, living wherever your user puts it.
 * Each field may optionally declare:
 *  - `validations.fileTypes` for file_reference
 *  - `metaobjectType` pointing at another definition key
 */
export const definitions = [
  {
    type: "$app:bar",
    name: "Test",
    access: { 
      storefront: MetaobjectStorefrontAccess.None 
    },
    capabilities: {
      onlineStore: { enabled: true, data: { canCreateRedirects: true, urlHandle: 'test' }},
      renderable: { enabled: true, data: { metaDescriptionKey: 'foo', metaTitleKey: 'bar' }},
      translatable: { enabled: true },
      publishable: { enabled: true }
    },
    fields: [
      { name: "name", key: "name", type: "single_line_text_field", validations: { max: 34 } },
    ],
  },
  {
    type: "$app:baz",
    name: "Store type",
    fields: [
      { name: "name", key: "name",        type: "single_line_text_field", required: true },
      {
        name:        "icon",
        key: "icon",
        type:        "file_reference",
        validations: { fileTypeOptions: ["Image"] },
      },
      { name:       "Generic obj", key: "generic_obj", type: "metaobject_reference", metaobjectType: "$app:bar" },
      {
        name:         "Another",
        key: "another",
        type:         "metaobject_reference",
        metaobjectType: "$app:bar",
      },
    ],
  },
  {
    type: "$app:test",
    name: "Test",
    capabilities: { 
      publishable: { enabled: true },
      translatable: { enabled: true }
    },
    fields: [
      { name:       "name", key: "name",        type: "single_line_text_field", required: true },
      {
        name:        "icon",
        key: "icon",
        type:        "file_reference",
        validations: { fileTypeOptions: ["Video"] },
      },
      { name:       "generic Obj", key: "generic_obj", type: "metaobject_reference", metaobjectType: "$app:baz" },
      { name:       "products", key: "products", type: "list.product_reference" },
      {
        name:         "Store type",
        key:  "sto_t",
        type:         "metaobject_reference",
        metaobjectType: "$app:baz",
      },
    ],
  },
 ] as const satisfies DefinitionSchema;

/** Handy alias for your definitions type. */
export type Definitions = typeof definitions;
