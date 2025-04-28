// ─────────────────────────────────────────────────────────────────────────────
// File: validations.ts
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Literal union of file‐types you support.
 */
export type FileTypeVal = "Image" | "Video";

/**
 * Map each field‐`type` to the _shape_ of its possible validations.
 * When you add a brand‐new field‐type (e.g. "number" or "date"), just
 * add another key here.
 */
export interface ValidationConfigMap {
  single_line_text_field: {
    minLength?: number;
    maxLength?: number;
    choices?: string[];
  };
  file_reference: {
    fileTypes?: FileTypeVal[];
  };
  // ← add new types and their validation props here
}

export type FieldTypeWithValidation = keyof ValidationConfigMap;

/**
 * The union of all your field‐type keys.
 */
export type FieldType = FieldTypeWithValidation | "metaobject_reference";