// utils/deserialize-fields.ts
import { BaseMetaobject } from "~/runtime/types";
import { MetaobjectFragment } from "~/types/admin.generated";
import { Metaobject, MetaobjectField } from "~/types/admin.types";
import { camelKeysDeep, toCamelCaseKey } from "~/utils/camel";

// ---- helpers ---------------------------------------------------------------
const isList = (t: string) => t.startsWith("list.");
const innerOf = (t: string) => t.slice(5); // after "list."
const isRefBase = (t: string) => t.endsWith("_reference");
const isRef = (t: string) => isRefBase(t);

function normalizeJson(value: unknown) {
  if (value == null) {
    return null;
  }

  if (typeof value === "string") {
    try { return JSON.parse(value); } catch { /* not JSON, keep as string */ }
  }

  return value;
}

function normalizeRefsArray(references: any): any[] {
  if (!references) {
    return [];
  }

  if (Array.isArray(references)) {
    return references;
  }

  if (Array.isArray(references.nodes)) {
    return references.nodes;
  }

  return [];
}

// ---- main converter --------------------------------------------------------
/** Convert a single field {type,jsonValue,reference,references} to the runtime value */
function convertValue(type: string, jsonValue: any, reference: any, references: any): any {
  // Lists
  if (isList(type)) {
    const inner = innerOf(type);

    // List of references → { value: string[], references: any[] }
    if (isRefBase(inner)) {
      const raw = normalizeJson(jsonValue);
      const valueArr = Array.isArray(raw) ? raw : [];
      const refsArr = normalizeRefsArray(references);
      return {
        value: valueArr,
        references: camelKeysDeep(refsArr),
      };
    }

    // List of scalars/complex → recurse and return array
    const raw = normalizeJson(jsonValue);
    const arr = Array.isArray(raw) ? raw : [];
    return arr.map((v: any) => convertValue(inner, v, reference, references));
  }

  // Single reference → { value: string | null, reference: any | null }
  if (isRef(type)) {
    return {
      value: jsonValue ?? null,
      reference: reference ? camelKeysDeep(reference) : null,
    };
  }

  // Scalars / complex shapes
  switch (type) {
    case "boolean":
      return Boolean(jsonValue);

    case "date":
    case "date_time":
      return jsonValue ? new Date(jsonValue) : null;

    case "money":
    case "link":
    case "rating":
    case "json":
    case "volume":
    case "weight":
    case "dimension": {
      const v = normalizeJson(jsonValue);
      return v ? camelKeysDeep(v) : null;
    }

    case "number":
    case "number_integer":
    case "number_decimal":
      return jsonValue === null ? null : Number(jsonValue);

    // string-like
    case "single_line_text_field":
    case "multi_line_text_field":
    case "rich_text_field":
    case "color":
    case "url":
      return jsonValue ?? null;

    default:
      return jsonValue ?? null;
  }
}

/** Convert Shopify's fields[] to { fields: { ... } } with camelCased keys */
function toFieldsObject(fields: MetaobjectFragment['fields']) {
  const obj: Record<string, unknown> = {};

  for (const field of fields) {
    obj[toCamelCaseKey(field.key)] = convertValue(
      field.type,
      field.jsonValue,
      field.reference,
      field.references
    );
  }

  return obj;
}

export function deserializeMetaobject<T extends BaseMetaobject>(metaobject: MetaobjectFragment): T {
  const data = {
    id: metaobject.id,
    type: metaobject.type,
    handle: metaobject.handle,
    displayName: metaobject.displayName,
    updatedAt: new Date(metaobject.updatedAt),
    fields: toFieldsObject(metaobject.fields),
  } as T;

  if ('capabilities' in metaobject) {
    data['capabilities'] = metaobject.capabilities;
  }

  if ('thumbnailField' in metaobject) {
    if (metaobject.thumbnailField?.thumbnail) {
      const { hex, file } = metaobject.thumbnailField.thumbnail;

      data['thumbnail'] = {
        hex: hex ?? null,
        image: file?.preview?.image ?? null 
      }
    } else {
      data['thumbnail'] = null;
    }
  }

  return data;
}