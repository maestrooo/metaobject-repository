// ────────────────────────────────────────────────────────────────────────
// File: definitions.ts
// ────────────────────────────────────────────────────────────────────────

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
    fields: [
      { name: "name", type: "single_line_text_field", validations: { maxLength: 34 } },
    ],
  },
  StoreType: {
    type: "$app:baz",
    fields: [
      { name: "name",        type: "single_line_text_field" },
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
    fields: [
      { name:       "name",        type: "single_line_text_field" },
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
