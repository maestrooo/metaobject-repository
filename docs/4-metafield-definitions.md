# Managing Definitions

This section explains how to create, retrieve, and update Shopify metafield definitions. The process is similar to metaobject definitions, with a few important differences.

---

## Creating from schema

### Defining a schema

Create a `definitions.ts` file somewhere in your code, and export your definitions. Make sure to add `as const satisfies MetafieldDefinitionSchema`
at the end to get type validation.

```ts
import { MetaobjectAdminAccessInput, MetaobjectStorefrontAccess } from "~/types/admin.types";
import { MetafieldDefinitionSchema } from "metaobject-repository";

export const definitions = [
  {
    type: "single_line_text_field",
    ownerType: "PRODUCT",
    name: "Tagline",
    key: "tagline",
    namespace: "$app:settings", // optional
    description: "Tagline for a product",
    validations: { min: 3 },
    access: {
      admin: "MERCHANT_READ",
      storefront: "PUBLIC_READ"
    },
    capabilities: {　
      adminFilterable: {　enabled: true　}
    }
  },
  {
    type: "metaobject_reference",
    ownerType: "PRODUCT",
    name: "Event",
    key: "event",
    namespace: "$app:settings", // optional
    metaobjectType: "$app:event"
  },
] as const satisfies MetafieldDefinitionSchema;
```

The schema follows closely the Shopify one, with a few notable exceptions:

* Validations are fully typed based on the attribute type, and you don't have to format them as an array of objects.
* For `metaobject_reference` and `mixed_reference` (and their list counterpart), you don't have to set the validation yourself. Instead,
just pass the object type (using `metaobjectType` for metaobject reference, and `metaobjectTypes` for mixed reference). When the schema
is created, those types are automatically resolved to an ID.

### Creating a schema

Use the `metafieldDefinitionManager` to automatically create metafield definitions from a static schema:

```ts
import { metafieldDefinitionManager } from "metaobject-repository";
import { definitions } from "./your-definitions";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  metafieldDefinitionManager.withClient(admin.graphql);
  await metafieldDefinitionManager.createFromSchema(definitions);

  return null;
};
```

This method does a few things automatically:

- It creates all the definitions.
- If a definition already exists, it is skipped.

> ⏱ This can be slow if you have many definitions. We recommend you to create the definitions once, and then save an app metafield (for instance) to indicate that you have already initialized the definitions.

---

## Managing definitions individually

In advanced use cases, you might want to manage definitions manually. To do that, you can use the convenience methods around the API:

> When using those methods, you must format the validations yourself, and resolve metaobject references to ID.

---

### Creating a definition

```ts
import { metafieldDefinitionManager } from "metaobject-repository";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  metafieldDefinitionManager.withClient(admin.graphql);

  const createdId = await metafieldDefinitionManager.createDefinition({ 
    type: "single_line_text_field", 
    key: "foo", 
    ownerType: "PRODUCT" 
  });

  return null;
};
```

---

### Updating a definition

```ts
import { metafieldDefinitionManager } from "metaobject-repository";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  metafieldDefinitionManager.withClient(admin.graphql);

  const createdId = await metafieldDefinitionManager.updateDefinition({ 
    type: "single_line_text_field", 
    key: "foo", 
    ownerType: "PRODUCT",
    description: "Your description"
  });

  return null;
};
```

---

### Deleting a definition

```ts
import { metafieldDefinitionManager } from "metaobject-repository";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  metafieldDefinitionManager.withClient(admin.graphql);

  const deletedId = await metafieldDefinitionManager.deleteDefinition({ 
    key: "foo", 
    ownerType: "PRODUCT",
    deleteAllAssociatedMetafields: true
  });

  return null;
};
```

---

### Pinning a definition

```ts
import { metafieldDefinitionManager } from "metaobject-repository";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  metafieldDefinitionManager.withClient(admin.graphql);

  await metafieldDefinitionManager.pinDefinition({ key: "foo", ownerType: "PRODUCT" });

  return null;
};
```

---

### Unpinning a definition

```ts
import { metafieldDefinitionManager } from "metaobject-repository";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  metafieldDefinitionManager.withClient(admin.graphql);

  await metafieldDefinitionManager.unpinDefinition({ key: "foo", ownerType: "PRODUCT" });

  return null;
};
```

---

## Best practice

Use `createFromSchema` for reliable setup during app installation or migration, or use the `createDefinition` or `updateDefinition` only when you need dynamic control or one-off changes outside of the schema.