# Typing system

One of the main benefit of using `Metaobject Repository` is that it provides a fully typed access to your metaobjects fields. The library automatically converts data between **snake_case** and **camelCase** to make it easy to use across environments (JS and Liquid).

---

## Schema conventions

When defining schemas, use **snake_case** for all field keys. Internally, the library converts these to **camelCase** when exposing them to JavaScript/TypeScript, and everything is converted back to snake_case when persisting to Shopify.

Example:

```ts
fields: [
  { name: "First name", key: "first_name", type: "single_line_text_field" }
]
```

When accessing data in your code:

```ts
const host = await hostRepository.findById("gid://shopify/Metaobject/123");
host.firstName; // camelCase auto-completed and type-safe
```

---

## Typed repositories

The primary entrypoint is the `MetaobjectRepository`, which infers types from the schema you define:

```ts
export const eventRepository = new MetaobjectRepository(definitions, "$app:event");
```

From this, the returned objects are strictly typed with the correct field structure, capabilities, and even system-level properties like `id`, `handle`, `createdAt`, etc. More information can be found in [metaobjects documentation](/3-metaobjects.md).

---

## JSON field typing

If you define a JSON field in your schema, the type is `any` by default unless you provide a JSON Schema.

To get type-safety, you must define a schema and use the `json-schema-to-ts` library.

1. Install the `json-schema-to-ts` as a dev dependency:

```bash
npm install --save-dev json-schema-to-ts
```

2. Add a JSON Schema to your field's `validations`:
```ts
fields: [
  {
    name: "Address",
    key: "address",
    type: "json",
    validations: {
      schema: {
        type: "object",
        properties: {
          address1: { type: "string" },
          zip_code: { type: "string" }
        },
        required: ["address1"]
      }
    }
  }
]
```

> Make sure to use `snake_case` for your fields, as the library will convert all keys before saving an object.

3. When retrieving an object it will now be auto-completed and safe:

```ts
const event = await eventRepository.findByHandleOrFail('my-handle');
event.address.zipCode; // Autocompleted and type safe
```

---

## Recursive Population and Typing

All methods support a `populate` function, allowing to get reference (or references) transparently:

```ts
const event = await eventRepository.findById("gid://shopify/Metaobject/123", {
  populate: ["host"]
});
```

The field `event.host` is now fully typed as the referenced metaobject. You can go deeper using dot notation:

```ts
populate: ["host.anotherReference"]
```

And you'll receive nested object types accordingly.

> Getting references is not free, and if you're not careful, you can be rate-limited. Only include the references
that you need inside a given loader/action.

---

## Inferred object type

You can generate the inferred return type of a repository with:

```ts
import { InferObjectType } from "metaobject-repository";

// Using the definitions array
type Event = InferObjectType<typeof definitions, "$app:event", ["host"]>;

// Using an existing repository
type Event = InferObjectType<typeof eventRepository, ["host"]>;
```

This is useful when you want to type a variable outside of the main data-fetching logic, or when passing data to components.

---

## Summary

| Feature                        | Supported? | Notes |
|-------------------------------|------------|-------|
| Auto camelCase conversion     | ✅         | From snake_case keys in schema |
| Schema-based field types      | ✅         | Including validations |
| JSON field inference          | ✅         | Via JSON Schema + `json-schema-to-ts` |
| Recursive population types    | ✅         | With `populate` and `onPopulate` |
| System metadata fields        | ✅         | Available under `.system` key |

By following the schema conventions and using the provided utility types, you can build fully type-safe workflows on top of Shopify metaobjects.