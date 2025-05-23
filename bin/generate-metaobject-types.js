#!/usr/bin/env node
"use strict";
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
var path = require("path");
var toml_1 = require("@iarna/toml");
var lodash_1 = require("lodash");
// --- Helper Type Definitions (move to shared types if desired)
/*type PickedFile = Pick<File, 'id' | 'fileStatus' | 'alt' | 'preview'>;
type PickedMediaImage = Pick<MediaImage, '__typename' | 'id' | 'fileStatus' | 'alt' | 'preview' | 'mimeType' | 'originalSource' | 'image'>;
type PickedVideo = Pick<Video, '__typename' | 'id' | 'fileStatus' | 'alt' | 'preview' | 'duration' | 'sources'>;
type PickedGenericFile = Pick<GenericFile, '__typename' | 'id' | 'fileStatus' | 'alt' | 'preview' | 'mimeType' | 'url'>;*/
var defaultTypes = "\ntype Weight = {\n  unit: 'oz' | 'lb' | 'g' | 'kg';\n  value: number;\n}\n\ntype Volume = {\n  unit: 'ml' | 'cl' | 'l' | 'm3' | 'us_fl_oz' | 'us_pt' | 'us_qt' | 'us_gal' | 'imp_fl_oz' | 'imp_pt' | 'impt_qt' | 'imp_gal';\n  value: number;\n}\n\ntype Dimension = {\n  unit: 'in' | 'ft' | 'yd' | 'mm' | 'cm' | 'm';\n  value: number;\n}\n\ntype Link = {\n  text: string;\n  url: string;\n}\n\ntype Money = {\n  amount: string;\n  currencyCode: string;\n}\n\ntype Rating = {\n  value: string;\n  scaleMin: string;\n  scaleMax: string;\n}\n";
// --- Base mapping for simple and list types
var baseTypeMapping = {
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
var staticPopulatedMapping = {
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
function mapFieldType(raw) {
    if (raw.startsWith('list.')) {
        return mapSingleType(raw.slice(5)) + '[]';
    }
    return mapSingleType(raw);
}
function mapSingleType(key) {
    var _a;
    return (_a = baseTypeMapping[key]) !== null && _a !== void 0 ? _a : 'any';
}
// --- Recursively collect JSON schemas including nested ones
function collectSchemas(name, schema, collected) {
    if (schema.type === 'object' && schema.properties) {
        var props = schema.properties;
        // Process nested object properties
        for (var _i = 0, _a = Object.entries(props); _i < _a.length; _i++) {
            var _b = _a[_i], propKey = _b[0], propSchemaRaw = _b[1];
            var propSchema = propSchemaRaw;
            if (propSchema.type === 'object' &&
                propSchema.properties) {
                var nestedName = "".concat(name).concat((0, lodash_1.upperFirst)((0, lodash_1.camelCase)(propKey)));
                collectSchemas(nestedName, propSchema, collected);
                // Replace nested schema with reference
                schema.properties[propKey] = { $ref: nestedName };
            }
            else if (propSchema.type === 'array' &&
                propSchema.items) {
                var itemSchema = propSchema.items;
                if (itemSchema.type === 'object' &&
                    itemSchema.properties) {
                    var nestedItemName = "".concat(name).concat((0, lodash_1.upperFirst)((0, lodash_1.camelCase)(propKey)), "Item");
                    collectSchemas(nestedItemName, itemSchema, collected);
                    // Replace items with reference
                    schema.properties[propKey] = { type: 'array', items: { $ref: nestedItemName } };
                }
            }
        }
        collected.push({ name: name, schema: schema });
    }
    else if (schema.type === 'array' && schema.items) {
        var itemSchema = schema.items;
        var nestedName = "".concat(name, "Item");
        if (itemSchema.type === 'object' && itemSchema.properties) {
            collectSchemas(nestedName, itemSchema, collected);
            // After nested, keep collection schema
            collected.push({ name: name, schema: { type: 'array', items: { $ref: nestedName } } });
        }
        else {
            // Array of primitives
            collected.push({ name: name, schema: schema });
        }
    }
    else {
        // Primitives or fallback
        collected.push({ name: name, schema: schema });
    }
}
// --- Map JSON schema entry to TS type (primitive, $ref, array)
function mapJsonType(schema) {
    if (schema.$ref) {
        return schema.$ref;
    }
    if (schema.type === 'array' && schema.items) {
        return "".concat(mapJsonType(schema.items), "[]");
    }
    return mapJsonSchemaType(schema);
}
// --- Generate TS from flattened JSON schema definitions
function generateTypesFromJsonSchemas(schemas) {
    return schemas
        .map(function (_a) {
        var name = _a.name, schema = _a.schema;
        if (schema.type === 'object' && schema.properties) {
            var required_1 = new Set(schema.required || []);
            var props = Object.entries(schema.properties)
                .map(function (_a) {
                var k = _a[0], v = _a[1];
                var propName = (0, lodash_1.camelCase)(k);
                var opt = required_1.has(k) ? '' : '?';
                var tsType = mapJsonType(v);
                return "  ".concat(propName).concat(opt, ": ").concat(tsType, ";");
            })
                .join('\n');
            return "export interface ".concat(name, " {\n").concat(props, "\n}");
        }
        if (schema.type === 'array' && schema.items) {
            var tsType = mapJsonType(schema);
            return "export type ".concat(name, " = ").concat(tsType, ";");
        }
        return "export type ".concat(name, " = ").concat(mapJsonType(schema), ";");
    })
        .join('\n\n');
}
// --- Map individual JSON schema property to TS type (primitive fallback)
function mapJsonSchemaType(prop) {
    var t = prop.type;
    if (Array.isArray(t)) {
        return t.map(function (x) { return mapJsonSchemaType({ type: x }); }).join(' | ');
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
function parsePopulatedType(raw, metaNames) {
    var _a;
    var m = raw.match(/^metaobject_reference<\$app:([^>]+)>$/);
    if (m) {
        var nm = m[1];
        if (metaNames.includes(nm))
            return (0, lodash_1.upperFirst)((0, lodash_1.camelCase)(nm));
    }
    var mm = raw.match(/^mixed_reference<([^>]+)>$/);
    if (mm) {
        return mm[1]
            .split(',')
            .map(function (s) { return (0, lodash_1.upperFirst)((0, lodash_1.camelCase)(s.replace(/\$app:/, ''))); })
            .join(' | ');
    }
    return (_a = staticPopulatedMapping[raw]) !== null && _a !== void 0 ? _a : 'any';
}
// --- Main CLI
var _c = process.argv, inputFile = _c[2], outputFile = _c[3];
if (!inputFile || !outputFile) {
    console.error('Usage: generate-metaobject-types <input.toml> <output.ts>');
    process.exit(1);
}
var tomlContent = fs.readFileSync(path.resolve(inputFile), 'utf-8');
var parsed = (0, toml_1.parse)(tomlContent);
var appMeta = (_a = parsed.metaobjects) === null || _a === void 0 ? void 0 : _a.app;
if (!appMeta) {
    console.error('Missing [metaobjects.app]');
    process.exit(1);
}
// 1) Collect JSON schemas and map to subtype names
var jsonSchemas = [];
var jsonFieldMap = {};
for (var _i = 0, _d = Object.entries(appMeta); _i < _d.length; _i++) {
    var _e = _d[_i], metaKey = _e[0], def = _e[1];
    var typeName = (0, lodash_1.upperFirst)((0, lodash_1.camelCase)(metaKey));
    var fields = def.fields || {};
    for (var _f = 0, _g = Object.entries(fields); _f < _g.length; _f++) {
        var _h = _g[_f], fieldKey = _h[0], cfg = _h[1];
        if (cfg.type === 'json' && ((_b = cfg.validations) === null || _b === void 0 ? void 0 : _b.schema)) {
            var subName = "".concat(typeName).concat((0, lodash_1.upperFirst)((0, lodash_1.camelCase)(fieldKey)));
            var schemaObj = JSON.parse(cfg.validations.schema);
            jsonSchemas.push({ name: subName, schema: schemaObj });
            jsonFieldMap["".concat(metaKey, ".").concat(fieldKey)] = subName;
        }
    }
}
// 2) Generate TS interfaces for JSON schemas
var jsonTypeDefs = generateTypesFromJsonSchemas(jsonSchemas);
// 3) Collect raw field types for dynamic PopulateMap
var rawTypesSet = new Set();
for (var _j = 0, _k = Object.values(appMeta); _j < _k.length; _j++) {
    var defObj = _k[_j];
    var fields = defObj.fields || {};
    for (var _l = 0, _m = Object.values(fields); _l < _m.length; _l++) {
        var cfg = _m[_l];
        rawTypesSet.add(cfg.type);
    }
}
var metaNames = Object.keys(appMeta);
// 4) Generate TS types for each metaobject
var interfaces = Object.entries(appMeta)
    .map(function (_a) {
    var metaKey = _a[0], def = _a[1];
    var typeName = (0, lodash_1.upperFirst)((0, lodash_1.camelCase)(metaKey));
    var fields = def.fields || {};
    var props = Object.entries(fields)
        .map(function (_a) {
        var fieldKey = _a[0], cfg = _a[1];
        var mapKey = "".concat(metaKey, ".").concat(fieldKey);
        var propName = (0, lodash_1.camelCase)(fieldKey);
        var optional = cfg.required ? '' : '?';
        var tsType = jsonFieldMap[mapKey]
            ? jsonFieldMap[mapKey]
            : mapFieldType(cfg.type);
        return "  ".concat(propName).concat(optional, ": ").concat(tsType, ";");
    })
        .join('\n');
    return "export type ".concat(typeName, " = {\n").concat(props, "\n};");
})
    .join('\n\n');
// 5) Generate PopulatedMap entries
var populatedEntries = [];
for (var _o = 0, _p = Object.entries(staticPopulatedMapping); _o < _p.length; _o++) {
    var _q = _p[_o], k = _q[0], v = _q[1];
    populatedEntries.push("  '".concat(k, "': ").concat(v, ";"));
}
for (var _r = 0, _s = Array.from(rawTypesSet); _r < _s.length; _r++) {
    var raw = _s[_r];
    if (/^(metaobject_reference|mixed_reference)<.*>$/.test(raw)) {
        var mapped = parsePopulatedType(raw, metaNames);
        populatedEntries.push("  '".concat(raw, "': ").concat(mapped, ";"));
    }
}
var populatedMap = "export type PopulatedMap = {\n".concat(populatedEntries.join('\n'), "\n};");
// 6) Populate utility\
var populateHelper = "/**\n * Populate<T, Keys extends readonly (keyof T)[]> replaces string IDs\n * for Keys with actual types from PopulatedMap.\n */\nexport type Populate<\n  T,\n  Keys extends readonly (keyof T)[]\n> = { [P in keyof T]:\n  P extends Keys[number]\n    ? T[P] extends string\n      ? PopulatedMap[T[P] & keyof PopulatedMap]\n      : T[P]\n    : T[P]\n};";
// 7) Compose output
var header = "/** AUTO-GENERATED: do NOT edit */";
var output = [header, defaultTypes, jsonTypeDefs, interfaces, populatedMap, populateHelper].join('\n\n');
fs.writeFileSync(path.resolve(outputFile), output, 'utf-8');
console.log("\u2728 Generated types to ".concat(outputFile));
