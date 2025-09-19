#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Generate TypeScript types from Shopify declarative metaobjects (shopify.app*.toml)
 * - ESM-only
 * - Flags:
 *   --config=<name>   -> reads shopify.app.<name>.toml (default: shopify.app.toml)
 *   --out-dir=<dir>   -> writes <dir>/metaobject-types.ts (default: app/types/metaobject-types.ts)
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { parse as tomlParse } from "@ltd/j-toml";

// --------- Parse ONLY the two supported flags (supports "--k=v" and "--k v") ----------
function getArg(name: string): string | undefined {
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === `--${name}`) {
      const v = argv[i + 1];
      if (v && !v.startsWith("--")) return v;
      return "";
    }
    if (a.startsWith(`--${name}=`)) return a.split("=", 2)[1]!;
  }
  return undefined;
}

const configToken = getArg("config"); // e.g., "dev" -> shopify.app.dev.toml
const outDirArg = getArg("out-dir");  // e.g., "foo" -> foo/metaobject-types.ts

const INPUT = resolve(
  process.cwd(),
  configToken ? `shopify.app.${configToken}.toml` : "shopify.app.toml",
);

// default output: app/types/metaobject-types.ts
const OUTPUT = resolve(
  process.cwd(),
  outDirArg && outDirArg.length > 0 ? outDirArg : "app/types",
  "metaobject-types.ts",
);

const HEADER_COMMENT = "THIS FILE IS AUTO-GENERATED. DO NOT EDIT.";

// ---------- name helpers ----------
const toPascal = (s: string) =>
  String(s)
    .replace(/[$<>]/g, "")
    .split(/[^a-zA-Z0-9]+/g)
    .filter(Boolean)
    .map((x) => x[0].toUpperCase() + x.slice(1))
    .join("");

const toCamel = (raw: string) => {
  const cleaned = String(raw).trim().replace(/[\s._-]+/g, " ");
  const pas = cleaned
    .split(" ")
    .filter(Boolean)
    .map((p, idx) => (idx === 0 ? p.toLowerCase() : p[0]?.toUpperCase() + p.slice(1).toLowerCase()))
    .join("");
  return pas.replace(/^[^a-zA-Z_]+/, "_$&");
};

// ---------- reference helpers ----------
const isMetaobjectRef = (t: string) =>
  /^metaobject_reference<[^>]+>$/.test(t) || /^list\.metaobject_reference<[^>]+>$/.test(t);

const isMixedRef = (t: string) =>
  /^mixed_reference<[^>]+>$/.test(t) || /^list\.mixed_reference<[^>]+>$/.test(t);

const extractMetaobjectTarget = (t: string) => {
  const list = t.startsWith("list.");
  const m = t.match(/metaobject_reference<([^>]+)>/);
  return m ? { list, target: m[1] as string } : null;
};

const extractMixedTargets = (t: string) => {
  const list = t.startsWith("list.");
  const m = t.match(/mixed_reference<([^>]+)>/);
  if (!m) return null;
  const targets = m[1]
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return { list, targets };
};

const refTargetToTypeName = (target: string) => {
  const afterColon = target.split(":").pop() || target;
  return toPascal(afterColon);
};

// ---------- scalar mapping ----------
function baseScalar(base: string): string {
  switch (base) {
    case "boolean":
      return "boolean";
    case "date":
    case "date_time":
      return "Date";
    case "dimension":
      return "Dimension";
    case "json":
    case "rich_text_field":
      return "JsonObject";
    case "link":
      return "Link";
    case "money":
      return "Money";
    case "number":
    case "number_integer":
    case "number_decimal":
      return "number";
    case "rating":
      return "Rating";
    case "volume":
      return "Volume";
    case "weight":
      return "Weight";

    // string-like fields
    case "single_line_text_field":
    case "multi_line_text_field":
    case "id":
    case "color":
    case "url":
      return "string";

    // Built-in Shopify refs
    case "article_reference":
      return "Article";
    case "collection_reference":
      return "Collection";
    case "customer_reference":
      return "Customer";
    case "file_reference":
      return "File";
    case "page_reference":
      return "Page";
    case "product_reference":
      return "Product";
    case "product_taxonomy_value_reference":
      return "ProductTaxonomyValue";
    case "variant_reference":
      return "ProductVariant";

    default:
      return "unknown";
  }
}

function mapType(t: string, required: boolean): string {
  if (t.startsWith("list.")) {
    const inner = t.slice("list.".length);

    if (inner.startsWith("metaobject_reference<")) {
      const info = extractMetaobjectTarget(t)!;
      return `ReferenceList<${refTargetToTypeName(info.target)}>`;
    }

    if (inner.startsWith("mixed_reference<")) {
      const info = extractMixedTargets(t)!;
      const unionInner = info.targets.map(refTargetToTypeName).join(" | ");
      return `ReferenceList<${unionInner}>`;
    }

    if (inner.endsWith("_reference")) {
      return `ReferenceList<${baseScalar(inner)}>`;
    }

    return `${baseScalar(inner)}[]`;
  }

  if (isMetaobjectRef(t)) {
    const info = extractMetaobjectTarget(t)!;
    return `Reference<${refTargetToTypeName(info.target)}, ${required ? 'true' : 'false'}>`;
  }

  if (isMixedRef(t)) {
    const info = extractMixedTargets(t)!;
    const unionInner = info.targets.map(refTargetToTypeName).join(" | ");
    return `Reference<${unionInner}, ${required ? 'true' : 'false'}>`;
  }

  if (t.endsWith('_reference')) {
    return `Reference<${baseScalar(t)}, ${required ? 'true' : 'false'}>`;
  }

  return baseScalar(t);
}

// ---------- TOML structs ----------
type FieldDef = { name?: string; type: string; required?: boolean };
type MetaobjectDef = { fields?: Record<string, FieldDef> };
type AppToml = {
  metaobjects?: {
    [namespace: string]: Record<string, MetaobjectDef> | undefined;
  };
};

// ---------- main ----------
async function main() {
  const raw = readFileSync(INPUT, "utf8");
  const parsed = tomlParse(raw, { joiner: "." }) as AppToml;

  if (!parsed.metaobjects) {
    console.error("No [metaobjects.*] found in TOML:", INPUT);
    process.exit(1);
  }

  const entries: Array<{ ns: string; handle: string; def: MetaobjectDef }> = [];
  for (const [ns, group] of Object.entries(parsed.metaobjects)) {
    if (!group) continue;
    for (const [handle, def] of Object.entries(group)) {
      entries.push({ ns, handle, def });
    }
  }
  if (entries.length === 0) {
    console.error("No metaobjects found under [metaobjects.*] in:", INPUT);
    process.exit(1);
  }

  const blocks: string[] = [];
  const typeMapLines: string[] = [];
  for (const { handle, def } of entries) {
    const typeName = toPascal(handle);
    const fields = def.fields ?? {};

    const fieldLines: string[] = [];
    for (const [rawKey, field] of Object.entries(fields)) {
      const prop = toCamel(rawKey);
      const tsType = mapType(field.type, !!field.required);
      fieldLines.push(field.required ? `    ${prop}: ${tsType};` : `    ${prop}: ${tsType};`);
    }

    typeMapLines.push(`  "$app:${handle}": ${typeName};`);

    blocks.push(
      `export type ${typeName} = BaseMetaobject & {
  fields: {
${fieldLines.join("\n")}
  };
};`,
    );
  }

  blocks.push(
    `export interface MetaobjectTypeMap {\n${typeMapLines.join("\n")}\n}`
  );
  blocks.push(
    `export type AnyMetaobjectType = keyof MetaobjectTypeMap;`
  );
  blocks.push(
    `export type AnyMetaobject = MetaobjectTypeMap[AnyMetaobjectType];`
  );

  const header = `/**
* ${HEADER_COMMENT}
* Source: ${INPUT.replace(process.cwd(), ".")}
*/`;

  const helperImport =
    `import { MetaobjectRepository } from "metaobject-persistence";
    import type { 
      BaseMetaobject, Reference, ReferenceList, JsonObject, Dimension, Volume, Weight, Money, Link, Rating,
      ArticleReference as Article, CollectionReference as Collection, CustomerReference as Customer, FileReference as File,
      PageReference as Page, ProductReference as Product, ProductTaxonomyValueReference as ProductTaxonomyValue,
      ProductVariantReference as ProductVariant
    } from "metaobject-persistence";`;

  let repositoryFactory = `// Narrowed overload (literal or K extends keys) + safe fallback
export function repositoryFor<const K extends AnyMetaobjectType>(
  type: K
): MetaobjectRepository<MetaobjectTypeMap[K]>;
export function repositoryFor(type: string): MetaobjectRepository<BaseMetaobject>;
export function repositoryFor(type: string) {
  return new MetaobjectRepository(type);
}`

  let content = [header, helperImport, "", blocks.join("\n\n"), "", repositoryFactory, ""].join("\n");

  mkdirSync(dirname(OUTPUT), { recursive: true });

  // Optional formatting with Prettier (peer dependency)
  try {
    const prettier = await import("prettier");
    content = await prettier.format(content, { parser: "typescript" });
  } catch {
    // prettier not installed – skip
  }

  writeFileSync(OUTPUT, content, "utf8");
  console.log(`✓ Wrote ${OUTPUT}`);
  console.log(`  from: ${INPUT}`);
  console.log(`  to  : ${OUTPUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});