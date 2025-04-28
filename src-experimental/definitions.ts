// ────────────────────────────────────────────────────────────────────────
// File: definitions.ts
// ────────────────────────────────────────────────────────────────────────

import { MetaobjectStorefrontAccess } from "../src/types/admin.types";
import { DefinitionsSchema } from "./types";

/**
 * Your “definitions” object, living wherever your user puts it.
 * Each field may optionally declare:
 *  - `validations.fileTypes` for file_reference
 *  - `metaobjectType` pointing at another definition key
 */
export const definitions = {
  Another: {
    type: "$app:bar",
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
      { name: "name", type: "single_line_text_field", validations: { maxLength: 34 } },
    ],
  },
  StoreType: {
    type: "$app:baz",
    fields: [
      { name: "name",        type: "single_line_text_field", required: true },
      {
        name:        "icon",
        type:        "file_reference",
        validations: { fileTypes: ["Image"] },
      },
      { name:       "generic_obj", type: "metaobject_reference" },
      {
        name:         "another",
        type:         "metaobject_reference",
        metaobjectType: "$app:bar",
      },
    ],
  },
  Test: {
    type: "$app:test",
    capabilities: { 
      publishable: { enabled: true }
    },
    fields: [
      { name:       "name",        type: "single_line_text_field", required: true },
      {
        name:        "icon",
        type:        "file_reference",
        validations: { fileTypes: ["Image","Video"] },
      },
      { name:       "generic_obj", type: "metaobject_reference" },
      {
        name:         "store_type",
        type:         "metaobject_reference",
        metaobjectType: "$app:baz",
      },
    ],
  },
} as const satisfies DefinitionsSchema;

/** Handy alias for your definitions’ type. */
export type Definitions = typeof definitions;
