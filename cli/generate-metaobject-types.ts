#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { parse as parseToml } from '@iarna/toml';
import { camelCase, upperFirst } from 'lodash';

// --- Helper Type Definitions (move to shared types if desired)
/*type PickedFile = Pick<File, 'id' | 'fileStatus' | 'alt' | 'preview'>;
type PickedMediaImage = Pick<MediaImage, '__typename' | 'id' | 'fileStatus' | 'alt' | 'preview' | 'mimeType' | 'originalSource' | 'image'>;
type PickedVideo = Pick<Video, '__typename' | 'id' | 'fileStatus' | 'alt' | 'preview' | 'duration' | 'sources'>;
type PickedGenericFile = Pick<GenericFile, '__typename' | 'id' | 'fileStatus' | 'alt' | 'preview' | 'mimeType' | 'url'>;*/

const defaultTypes = `
type Weight = {
  unit: 'oz' | 'lb' | 'g' | 'kg';
  value: number;
}

type Volume = {
  unit: 'ml' | 'cl' | 'l' | 'm3' | 'us_fl_oz' | 'us_pt' | 'us_qt' | 'us_gal' | 'imp_fl_oz' | 'imp_pt' | 'impt_qt' | 'imp_gal';
  value: number;
}

type Dimension = {
  unit: 'in' | 'ft' | 'yd' | 'mm' | 'cm' | 'm';
  value: number;
}

type Link = {
  text: string;
  url: string;
}

type Money = {
  amount: string;
  currencyCode: string;
}

type Rating = {
  value: string;
  scaleMin: string;
  scaleMax: string;
}
`

// --- Base mapping for simple and list types
const baseTypeMapping: Record<string, string> = {
  boolean: 'boolean',
  color: 'string',
  date: 'string',
  date_time: 'string',
  dimension: 'Dimension',
  id: 'string',
  link: 'Link',
  money: 'Money',
  multi_line_text_field: 'string',
  number_decimal: 'number',
  number_integer: 'number',
  rating: 'Rating',
  rich_text_field: 'string',
  single_line_text_field: 'string',
  url: 'string',
  volume: 'Volume',
  weight: 'Weight',
  json: 'object',
  collection_reference: 'string',
  customer_reference: 'string',
  company_reference: 'string',
  file_reference: 'string',
  metaobject_reference: 'string',
  mixed_reference: 'any',
  page_reference: 'string',
  product_reference: 'string',
  product_taxonomy_value_reference: 'string',
  variant_reference: 'string',
};

// --- Static PopulatedMap entries
const staticPopulatedMapping: Record<string, string> = {
  boolean: 'boolean',
  color: 'string',
  date: 'string',
  date_time: 'string',
  dimension: 'Dimension',
  id: 'string',
  link: 'Link',
  money: 'Money',
  multi_line_text_field: 'string',
  number_decimal: 'number',
  number_integer: 'number',
  rating: 'Rating',
  rich_text_field: 'string',
  single_line_text_field: 'string',
  url: 'string',
  volume: 'Volume',
  weight: 'Weight',
  json: 'object',
  collection_reference: "Pick<Collection,'id'|'handle'|'title'|'description'|'hasProduct'|'sortOrder'|'updatedAt'|'templateSuffix'|'image'>",
  customer_reference: "Pick<Customer,'id'|'displayName'|'amountSpent'|'numberOfOrders'|'email'|'verifiedEmail'|'phone'|'createdAt'|'updatedAt'|'locale'|'image'>",
  company_reference: "Pick<Company,'id'|'externalId'|'name'|'lifetimeDuration'|'ordersCount'|'totalSpent'|'createdAt'|'updatedAt'>",
  file_reference: 'PickedFile|PickedMediaImage|PickedVideo|PickedGenericFile',
  page_reference: "Pick<Page,'id'|'handle'|'title'|'body'|'isPublished'|'createdAt'|'updatedAt'|'templateSuffix'>",
  product_reference: "Pick<Product,'id'|'handle'|'title'|'productType'|'status'|'description'|'vendor'|'updatedAt'|'createdAt'|'publishedAt'|'tags'|'hasOnlyDefaultVariant'|'variantsCount'|'templateSuffix'|'featuredImage'>",
  product_taxonomy_value_reference: "Pick<TaxonomyValue,'id'|'name'>",
  variant_reference: "Pick<ProductVariant,'id'|'title'|'displayName'|'sku'|'price'|'compareAtPrice'|'availableForSale'|'inventoryQuantity'|'barcode'|'createdAt'|'updatedAt'|'image'>",
};

// --- Map a raw TOML type key to TS type (handles list variants)
function mapFieldType(raw: string): string {
  if (raw.startsWith('list.')) {
    return mapSingleType(raw.slice(5)) + '[]';
  }
  return mapSingleType(raw);
}
function mapSingleType(key: string): string {
  return baseTypeMapping[key] ?? 'any';
}

// --- Recursively collect JSON schemas including nested ones
function collectSchemas(
  name: string,
  schema: any,
  collected: Array<{ name: string; schema: any }>
) {
  if (schema.type === 'object' && schema.properties) {
    const props = schema.properties as Record<string, any>;
    // Process nested object properties
    for (const [propKey, propSchemaRaw] of Object.entries(props)) {
      const propSchema = propSchemaRaw as any;
      if (
        propSchema.type === 'object' &&
        propSchema.properties
      ) {
        const nestedName = `${name}${upperFirst(camelCase(propKey))}`;
        collectSchemas(nestedName, propSchema, collected);
        // Replace nested schema with reference
        schema.properties[propKey] = { $ref: nestedName };
      } else if (
        propSchema.type === 'array' &&
        propSchema.items
      ) {
        const itemSchema = propSchema.items as any;
        if (
          itemSchema.type === 'object' &&
          itemSchema.properties
        ) {
          const nestedItemName = `${name}${upperFirst(camelCase(propKey))}Item`;
          collectSchemas(nestedItemName, itemSchema, collected);
          // Replace items with reference
          schema.properties[propKey] = { type: 'array', items: { $ref: nestedItemName } };
        }
      }
    }
    collected.push({ name, schema });
  } else if (schema.type === 'array' && schema.items) {
    const itemSchema = (schema.items as any);
    const nestedName = `${name}Item`;
    if (itemSchema.type === 'object' && itemSchema.properties) {
      collectSchemas(nestedName, itemSchema, collected);
      // After nested, keep collection schema
      collected.push({ name, schema: { type: 'array', items: { $ref: nestedName } } });
    } else {
      // Array of primitives
      collected.push({ name, schema });
    }
  } else {
    // Primitives or fallback
    collected.push({ name, schema });
  }
}

// --- Map JSON schema entry to TS type (primitive, $ref, array)
function mapJsonType(schema: any): string {
  if (schema.$ref) {
    return schema.$ref;
  }
  if (schema.type === 'array' && schema.items) {
    return `${mapJsonType(schema.items)}[]`;
  }
  return mapJsonSchemaType(schema);
}

// --- Generate TS from flattened JSON schema definitions
function generateTypesFromJsonSchemas(
  schemas: Array<{ name: string; schema: any }>
): string {
  return schemas
    .map(({ name, schema }) => {
      if (schema.type === 'object' && schema.properties) {
        const required = new Set<string>(schema.required || []);
        const props = Object.entries(schema.properties)
          .map(([k, v]) => {
            const propName = camelCase(k);
            const opt = required.has(k) ? '' : '?';
            const tsType = mapJsonType(v);
            return `  ${propName}${opt}: ${tsType};`;
          })
          .join('\n');
        return `export interface ${name} {\n${props}\n}`;
      }
      if (schema.type === 'array' && schema.items) {
        const tsType = mapJsonType(schema);
        return `export type ${name} = ${tsType};`;
      }
      return `export type ${name} = ${mapJsonType(schema)};`;
    })
    .join('\n\n');
}

// --- Map individual JSON schema property to TS type (primitive fallback)
function mapJsonSchemaType(prop: any): string {
  const t = prop.type;
  if (Array.isArray(t)) {
    return t.map((x: any) => mapJsonSchemaType({ type: x })).join(' | ');
  }
  switch (t) {
    case 'string':
      return 'string';
    case 'number':
    case 'integer':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'object':
      // Should have been replaced or collected
      return 'object';
    case 'array':
      return prop.items ? mapJsonSchemaType(prop.items) + '[]' : 'any[]';
    default:
      return 'any';
  }
}

// --- Parse populated types for metaobject and mixed references
function parsePopulatedType(raw: string, metaNames: string[]): string {
  const m = raw.match(/^metaobject_reference<\$app:([^>]+)>$/);
  if (m) {
    const nm = m[1];
    if (metaNames.includes(nm)) return upperFirst(camelCase(nm));
  }
  const mm = raw.match(/^mixed_reference<([^>]+)>$/);
  if (mm) {
    return mm[1]
      .split(',')
      .map(s => upperFirst(camelCase(s.replace(/\$app:/, ''))))
      .join(' | ');
  }
  return staticPopulatedMapping[raw] ?? 'any';
}

// --- Main CLI
const [,, inputFile, outputFile] = process.argv;
if (!inputFile || !outputFile) {
  console.error('Usage: generate-metaobject-types <input.toml> <output.ts>');
  process.exit(1);
}

const tomlContent = fs.readFileSync(path.resolve(inputFile), 'utf-8');
const parsed: any = parseToml(tomlContent);
const appMeta: any = parsed.metaobjects?.app;
if (!appMeta) {
  console.error('Missing [metaobjects.app]');
  process.exit(1);
}

// 1) Collect JSON schemas and map to subtype names
const jsonSchemas: Array<{name: string; schema: any}> = [];
const jsonFieldMap: Record<string, string> = {};
for (const [metaKey, def] of Object.entries(appMeta as any)) {
  const typeName = upperFirst(camelCase(metaKey));
  const fields = (def as any).fields || {};
  for (const [fieldKey, cfg] of Object.entries(fields as any)) {
    if ((cfg as any).type === 'json' && (cfg as any).validations?.schema) {
      const subName = `${typeName}${upperFirst(camelCase(fieldKey))}`;
      const schemaObj = JSON.parse((cfg as any).validations.schema);
      jsonSchemas.push({ name: subName, schema: schemaObj });
      jsonFieldMap[`${metaKey}.${fieldKey}`] = subName;
    }
  }
}

// 2) Generate TS interfaces for JSON schemas
const jsonTypeDefs = generateTypesFromJsonSchemas(jsonSchemas);

// 3) Collect raw field types for dynamic PopulateMap
const rawTypesSet = new Set<string>();
for (const defObj of Object.values(appMeta as any)) {
  const fields = (defObj as any).fields || {};
  for (const cfg of Object.values(fields as any)) {
    rawTypesSet.add((cfg as any).type);
  }
}
const metaNames = Object.keys(appMeta);

// 4) Generate TS types for each metaobject
const interfaces = Object.entries(appMeta as any)
  .map(([metaKey, def]: [string, any]) => {
    const typeName = upperFirst(camelCase(metaKey));
    const fields = (def as any).fields || {};
    const props = Object.entries(fields as any)
      .map(([fieldKey, cfg]: [string, any]) => {
        const mapKey = `${metaKey}.${fieldKey}`;
        const propName = camelCase(fieldKey);
        const optional = cfg.required ? '' : '?';
        const tsType = jsonFieldMap[mapKey]
          ? jsonFieldMap[mapKey]
          : mapFieldType(cfg.type);
        return `  ${propName}${optional}: ${tsType};`;
      })
      .join('\n');
    return `export type ${typeName} = {\n${props}\n};`;
  })
  .join('\n\n');

// 5) Generate PopulatedMap entries
const populatedEntries: string[] = [];
for (const [k, v] of Object.entries(staticPopulatedMapping)) {
  populatedEntries.push(`  '${k}': ${v};`);
}
for (const raw of Array.from(rawTypesSet)) {
  if (/^(metaobject_reference|mixed_reference)<.*>$/.test(raw)) {
    const mapped = parsePopulatedType(raw, metaNames);
    populatedEntries.push(`  '${raw}': ${mapped};`);
  }
}
const populatedMap = `export type PopulatedMap = {\n${populatedEntries.join('\n')}\n};`;

// 6) Populate utility\
const populateHelper = `/**
 * Populate<T, Keys extends readonly (keyof T)[]> replaces string IDs
 * for Keys with actual types from PopulatedMap.
 */
export type Populate<
  T,
  Keys extends readonly (keyof T)[]
> = { [P in keyof T]:
  P extends Keys[number]
    ? T[P] extends string
      ? PopulatedMap[T[P] & keyof PopulatedMap]
      : T[P]
    : T[P]
};`;

// 7) Compose output
const header = `/** AUTO-GENERATED: do NOT edit */`;
const output = [header, defaultTypes, jsonTypeDefs, interfaces, populatedMap, populateHelper].join('\n\n');
fs.writeFileSync(path.resolve(outputFile), output, 'utf-8');
console.log(`✨ Generated types to ${outputFile}`);
