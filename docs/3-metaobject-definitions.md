# Managing Definitions

This section explains how to create, retrieve, and update Shopify metaobject definitions.

---

## Creating from schema

### Defining a schema

Create a `definitions.ts` file somewhere in your code, and export your definitions. Make sure to add `as const satisfies MetaobjectDefinitionSchema`
at the end to get type validation.

```ts
import { MetaobjectDefinitionSchema } from "metaobject-repository";

export const definitions = [
  {
    type: "$app:event",
    name: "Event",
    description: "Representing an event",
    displayNameKey: "name",
    access: {
      admin: "MERCHANT_READ",
      storefront: "PUBLIC_READ"
    },
    capabilities: {　
      translatable: {　enabled: true　}
    },
    fields: [
      {
        key: "name",
        name: "Name",
        required: true,
        type: "single_line_text_field",
        validations: { max: 255 }
      },
      {
        key: "tags",
        name: "Tags",
        type: "list.single_line_text_field",
        validations: { listMax: 5 }
      },
      {
        key: "host",
        name: "Host",
        required: true,
        type: "metaobject_reference",
        metaobjectType: "$app:host"
      },
      {
        key: "featured_product",
        name: "Featured product",
        type: "product_reference"
      },
      {
        key: "address",
        name: "Address",
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
      },
      {
        key: "banner",
        name: "Banner image",
        description: "100 x 100px .png recommended",
        type: "file_reference",
        validations: { fileTypeOptions: ['Image'] }
      }
    ]
  },

  {
    type: "$app:host",
    name: "Host",
    description: "Representing a host",
    displayNameKey: "name",
    access: {
      admin: "MERCHANT_READ",
      storefront: "PUBLIC_READ"
    },
    fields: [
      {
        key: "first_name",
        name: "First name",
        required: true,
        type: "single_line_text_field",
        validations: { max: 255 }
      },
      {
        key: "last_name",
        name: "Last name",
        required: true,
        type: "single_line_text_field",
        validations: { max: 255 }
      }
    ]
  },
] as const satisfies MetaobjectDefinitionSchema;
```

The schema follows closely the Shopify one, with a few notable exceptions:

* Validations are fully typed based on the attribute type, and you don't have to format them as an array of objects.
* For `metaobject_reference` and `mixed_reference` (and their list counterpart), you don't have to set the validation yourself. Instead,
just pass the object type (using `metaobjectType` for metaobject reference, and `metaobjectTypes` for mixed reference). When the schema
is created, dependencies are automatically resolved, and definitions are creating in the correct order.

> Circular dependencies are not handled. If your model implies definitions that both reference themselves, you will manually create them.

### Creating a schema

Use the `createContext` to retrieve authentified objects, and get the `metaobjectDefinitionManager`:

```ts
import { createContext } from "metaobject-repository";
import { metaobjectDefinitions } from "./your-definitions";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const { metaobjectDefinitionManager } = createContext({ connection: { client: admin.graphql }, metaobjectDefinitions });

  await metaobjectDefinitionManager.createFromSchema(definitions);

  return null;
};
```

This method does a few things automatically:

- Recursively resolves and creates all dependent definitions.
- Links references using type names instead of IDs.
- It is idempotent, meaning that running the method multiple times won't cause error, as existence of each definition is checked.

> ⏱ This can be slow if you have many interdependent definitions. We recommend you to create the definitions once, and then save an app metafield (for instance) to indicate that you have already initialized the definitions.

---

## Managing definitions individually

In advanced use cases, or when working with dynamic fields, you might want to update or fetch definitions manually. This can be useful, for instance,
to customize a definition on a per-merchant basis.

> When using those methods, you must format the validations yourself, and resolve metaobject references to ID.

---

### Updating a definition

```ts
import { createContext } from "metaobject-repository";
import { metaobjectDefinitions } from "./your-definitions";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const { metaobjectDefinitionManager } = createContext({ connection: { client: admin.graphql }, metaobjectDefinitions });

  await metaobjectDefinitionManager.updateDefinition({
    type: "$app:event",
    definition: {
      name: "Big events", // Change the name
      fieldDefinitions: [
        {
          create: {
            key: "country",
            type: "single_line_text_field" // Add a new field
          }
        }
      ]
    }
  });

  return null;
};
```

---

### Deleting a definition

```ts
import { createContext } from "metaobject-repository";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const { metaobjectDefinitionManager } = createContext({ connection: { client: admin.graphql }, metaobjectDefinitions });

  const deletedId = await metaobjectDefinitionManager.deleteDefinition("$app:event");

  return null;
};
```

---

### Creating a definition manually

Most of the time, you will use the `createFromSchema` from the definition manager, as it creates automatically all your definitions
and handle the dependencies between metaobjects automatically.

```ts
import { createContext } from "metaobject-repository";
import { metaobjectDefinitions } from "./your-definitions";

const { metaobjectDefinitionManager } = createContext({ connection: { client: admin.graphql }, metaobjectDefinitions });

const createdId = await metaobjectDefinitionManager.createDefinition({
  definition: {
    type: "$app:event",
    name: "Big events",
    fieldDefinitions: [
      {
        key: "country",
        type: "single_line_text_field"
      }
    ]
  }
});
```

---

### Retrieving definitions

```ts
import { createContext } from "metaobject-repository";
import { metaobjectDefinitions } from "./your-definitions";

const { metaobjectDefinitionManager } = createContext({ connection: { client: admin.graphql }, metaobjectDefinitions });

const definition = await metaobjectDefinitionManager.findDefinitionByType("$app:event");
// or
const definition = await metaobjectDefinitionManager.findDefinitionByTypeOrFail("$app:event"); // throws if not found
```

---

## Notes

- Returned definitions exclude `createdByApp`, `createdByStaff`, `metaobjects`, and `standardTemplate` by design.
- The schema must be defined using `snake_case` for field keys.
- For best results, export one `MetaobjectRepository` per metaobject type and pass the associated type when initializing.

---

## Best practice

Use `createFromSchema` for reliable setup during app installation or migration, or use the `createDefinition` or `updateDefinition` only when you need dynamic control or one-off changes outside of the schema.