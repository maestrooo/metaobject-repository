
# Metaobject-ORM Documentation

## What is Metaobject-ORM?

**Metaobject-ORM** is a library to interact more easily with Shopify metaobjects, with a fully typed approach.

## Why Use Metaobject-ORM?

Metaobject-ORM helps structure and simplify interactions with Shopify metaobjects. It provides decorators and an intuitive API. If your interaction with metaobjects is limited or dynamic, directly using the GraphQL API might be preferable.

## Installation

To install the library, use npm:

```shell
npm i metaobject-orm
```

## Schema

### Defining a schema

To start with, define a schema for your metaobjects. The schema must satisfies with the `DefinitionSchema` type:

```ts
// ────────────────────────────────────────────────────────────────────────
// File: definitions.ts
// ────────────────────────────────────────────────────────────────────────

import { DefinitionSchema } from "metaobject-orm";

export const definitions = [
  {
    type: "$app:event",
    name: "Event",
    displayNameKey: "label",
    access: { 
      storefront: "NONE"
    },
    capabilities: {
      translatable: { enabled: true },
      publishable: { enabled: true }
    },
    fields: [
      { name: "Label", key: "label", type: "single_line_text_field", validations: { max: 255 } },
      { name: "Tags", key: "tags", type: "list.single_line_text_field", validations: { listMax: 2, choices: ["Food", "Social", "Ecology"] } },
      { name: "Product", key: "product", type: "product_reference" },
      { name: "Banner", key: "banner", type: "file_reference", validations: { fileTypeOptions: ["Image" ] }},
      { name: "host", key: "host", type: "metaobject_reference", metaobjectType: "$app:host" }
    ],
  },

  {
    type: "$app:host",
    name: "Host",
    displayNameKey: "first_name",
    access: { 
      storefront: "NONE"
    },
    capabilities: {
      translatable: { enabled: true },
      publishable: { enabled: true }
    },
    fields: [
      { name: "First name", key: "first_name", type: "single_line_text_field", validations: { max: 255 } },
      { name: "Last name", key: "last_name", type: "single_line_text_field", validations: { max: 255 } }
    ],
  }
] as const satisfies DefinitionSchema;

/** Handy alias for your definitions type. */
export const eventRepository = new ObjectRepository(definitions, "$app:event");
export const hostRepository = new ObjectRepository(definitions, "$app:host");
```

> Don't forget the `as const satisfies DefinitionSchema`, this is essential for enabling full-typing support.

The schema is pretty close to the default structure of Shopify, with a few exceptions to make it easier to use. It is also
fully typed, meaning that you will get validation auto-completion based on the selected type.

* Validations does not need to be converted to a string. You can use simple arrays.
* When working with metaobject references (or mixed references), you can specify a type instead of an ID. This makes it
easier to consume, and the library will take care of the dependencies when creating the schema.
* You can create references to other metaobjects that you own, but you can also 

After defining your schema, we recommend that you export one object repository for each metaobject that you need to interact
with. Make sure to pass the type to have all the magic happen:

```ts
export const eventRepository = new ObjectRepository(definitions, "$app:event");
```

### Creating the schema

When your app is installed, it is needed to create the definitions for all metaobjects. To do that, import the `definitionManager`
and use the `createFromSchema` method (your definition schema must be exported):

```ts
import { definitionManager } from "metaobject-orm";
import { definitions } from "your-definitions";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  definitionManager.withClient(admin.graphql); // <== Don't forget

  await definitionManager.createFromSchema(definitions);

  return null;
};
```

> Before calling any methods from the `definitionManager`, don't forget to call the `withClient` method and passing the authentified
GraphQL client.

The `createFromSchema` will automatically:

* Check if a metaobject definition depends on another definition (recursively) and create them in order.
* Resolve the types with the created ID.
* Ensure that definitions are not created twice, making it idempotent.

> If you have a lot of definitions with complex dependencies, this method can take time. It is recommended that you save somewhere in your
app when you have fully initialized the definitions, to skip the process.

### Updating a schema

It might be needed to alter a definition beyond the fixed schema. To do that, the `definitionManager` has a nice `updateDefinition`, which
accepts a type (so you don't have to get the ID yourself) and a compliant [`MetaobjectDefinitionUpdateInput`](https://shopify.dev/docs/api/admin-graphql/unstable/input-objects/MetaobjectDefinitionUpdateInput) payload:

```ts
import { definitionManager } from "metaobject-orm";
import { definitions } from "your-definitions";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  definitionManager.withClient(admin.graphql); // <== Don't forget

  await definitionManager.updateDefinition({
    type: '$app:event',
    definition: {
      name: 'Big events',
      fieldDefinitions: [
        {
          create: {
            key: 'country',
            type: 'single_line_text_field'
          }
        }
      ]
    }
  })

  return null;
};
```

## Interacting with the object manager

To interact with metaobjects, you must create an object manager for a given type. We recommend to export it along your definitions so that
it can be accessed globally:

definition.ts:

```ts
export const eventRepository = new ObjectRepository(definitions, "$app:event");
```

app.ts:
```ts
import { eventRepository } from "your-definitions";
import { definitions } from "your-definitions";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  eventRepository.withClient(admin.graphql); // <== Don't forget

  // Do something with the repository

  return null;
};
```

> As for the `definitionManager`, don't forget to call the `withClient` method before interacting with a repository. If you have multiple
repositories, you must call this for all your repositories.

### Understanding the typing system

The whole purpose of this library is to automatically infer types from the schema. To make it easier to work with, this library makes a
few assumptions:

* All metaobject fields are saved using `snake_case` conventions (to make it consistent with Liquid conventions).
* All metaobject fields are converted back to `camelCase` to make it consistent with JavaScript convention.

When working with this library, you must make sure that your schema is using snake_case keys. However, all the types are automatically converted
to `camelCase`, and you don't have to convert back to snake_case yourself when saving data: everything is done for you.

### Finding by handle

To get a metaobject by handle, use the `findByHandle`:

```ts
const event = await eventRepository.findByHandle('my-handle', opts);
```

Supported options:

* `populate`
* `onPopulate`

### Finding by ID

To get a metaobject by handle, use the `findById`:

```ts
const event = await eventRepository.findById('1234', opts);
```

Supported options:

* `populate`
* `onPopulate`

> You can either pass a legacy ID or a GID. The library will automatically make the conversion.

### Find all

To get all metaobjects of a given type, use the `findAll`:

```ts
const event = await eventRepository.findAll('1234', opts);
```

Supported options:

* `populate`
* `onPopulate`
* `sortKey`
* `limit`: change the default 250 limit to something smaller (useful for reducing query cost)

> Only up to 250 metaobjects can be retrieved at a time. This method is handy when you don't need validations, but if your
definitions can have more than 250 objects, use the `find` method instead for more control.

### Find

To get metaobjects of a given type, use the `find`:

```ts
const event = await eventRepository.find(opts);
```

Supported options:

* `populate`
* `onPopulate`
* `sortKey`
* `first`
* `after`
* `last`
* `before`
* `query`
* `reverse`

### Deleting by ID

To get a metaobject by handle, use the `delete`:

```ts
const event = await eventRepository.delete('1234');
```

> You can either pass a legacy ID or a GID. The library will automatically make the conversion.

### Bulk delete

To get a metaobject by handle, use the `bulkDelete`:

```ts
const job = await eventRepository.bulkDelete(['1234', '4567']);
```

The `bulkDelete` being a asynchronous operation, it returns a `Job` instance, that you can inspect to get details.

> You can either pass a legacy ID or a GID. The library will automatically make the conversion.

### Creating an object

To create a metaobject, use the `create` method:

```ts
const event = await eventRepository.create({
  handle: 'your-handle', // <== Optional
  capabilities: { publishable: { status: 'ACTIVE' } },
  fields: {
    name: 'Event',
    tags: ['Food']
  }
}, { opts });
```

Supported options:

* `populate`
* `onPopulate`

Here as well, everything is fully-typed, so only the capabilities specified in your schema can be setup, and all the fields are
also auto-completed. Fields that are marked with a `required: true` in your schema are required when using the `create` method.

> To make it easier to work with JavaScript conventions, all fields must be set using `camelCase`. The library automatically converts
them to `snake_case` and convert them to the required Shopify structure.

### Creating multiple objects

To create multiple metaobjects, use the `createMany` method:

```ts
const events = await eventRepository.createMany(
  [
    {
    handle: 'your-handle', // <== Optional
    capabilities: { publishable: { status: 'ACTIVE' } },
    fields: {
      name: 'Event',
      tags: ['Food']
    },
    {
    handle: 'your-handle-2', // <== Optional
    capabilities: { publishable: { status: 'ACTIVE' } },
    fields: {
      name: 'Another event',
      tags: ['Food']
    }
  ], 
  { opts });
```

Supported options:

* `populate`
* `onPopulate`

> `createMany` is only available on the `unstable` API.

### Update an object

To update an existing metaobject, use the `update` method:

```ts
const event = await eventRepository.update({
  id: 'gid://shopify/Metaobject/123', // <== Required
  handle: 'your-handle', // <== Optional
  redirectNewHandle: false, // <== Optional
  capabilities: { publishable: { status: 'ACTIVE' } },
  fields: {
    name: 'Event',
    tags: ['Food']
  }
}, { opts });
```

Supported options:

* `populate`
* `onPopulate`

As for the `create` method, everything is fully typed. However, contrary to the `create` method, even if fields are marked as `required: true`
in the schema, everything will be optional in the update method.

### Upsert an object

To upsert an existing metaobject, use the `upsert` method:

```ts
const event = await eventRepository.upsert({
  handle: 'your-handle', // <== Required in upsert
  capabilities: { publishable: { status: 'ACTIVE' } },
  fields: {
    name: 'Event',
    tags: ['Food']
  }
}, { opts });
```

Supported options:

* `populate`
* `onPopulate`

As for the `create` method, everything is fully typed. However, contrary to the `create` method, even if fields are marked as `required: true`
in the schema, everything will be optional in the upsert method.

### Populating

All methods (except `delete` and `bulkDelete`) support an optional `populate` array. This array, which is auto-completed based on your schema,
allows to generate optimized queries that automatically fetch references (eventually recursively).

For instance, assuming our example schema:

```ts
const event = await eventRepository.findByHandle('my-handle');
event.label; // <== typed as string (as it is a string)
event.host; // <== typed as string (it is the ID to the reference), but has not been populated

const populatedEvent = await eventRepository.findByHandle('my-handle', { populate: ["host"] });
event.label; // <== typed as string (as it is a string)
event.host; // <== typed as { firstName: string, lastName: string }
```

This also works recursively by using the dot notation:

```ts
const populatedEvent = await eventRepository.findByHandle('my-handle', { populate: ["host"] });
event.label; // <== typed as string (as it is a string)
event.host; // <== typed as { firstName: string, lastName: string, anotherReference: string }

const populatedEvent = await eventRepository.findByHandle('my-handle', { populate: ["host.anotherReference"] });
event.label; // <== typed as string (as it is a string)
event.host; // <== typed as { firstName: string, lastName: string, anotherReference: { ANOTHER TYPE } }
```

This work for queries, but also for mutations, which means that you can do an optimized query that create an option AND
get the fully populated object:

```ts
const event = await eventRepository.create({
  fields: {
    name: 'Event',
    tags: ['Food'],
    host: 'gid://shopify/Metaobject/123'
  }
}, { populate: ['host'] });

event.host; // <== thanks to the populate option, the host is of type { firstName: string, lastName: string }
```

### Accessing system data

Whenever you interact with a repository method, it returns a fully created object. In addition to all the fields, the
library also transparently fetch metaobject data and store them inside a `system` key:

```ts
const event = await eventRepository.findById('1234', opts);

event.system.id; // Get the ID of the metaobject
event.system.handle; // Get the handle of the metaobject
event.system.displayName; // Get the display name
event.system.createdAt; // Get the creation date
event.system.updatedAt; // Get the updated date
event.system.capabilities; // Get the capabilities
event.system.thumbnail; // Get the thumbnail object
```

To reduce query cost, the library fetches some information conditionally. For instance, `capabilities` are only retrieved
when the definition specifies one or more capabilities, while the `thumbnail` is only retrieved if the definition has at least
one `color` or one `file_reference` field in its schema.

### Customizing references

When working with metaobjects that you own, you don't have anything special to do. However, it becomes a bit more complicatd
when interacting with references to other resources, such as products or collections.

Let's say that you have a schema like this:

```ts
export const definitions = [
  {
    type: "$app:event",
    name: "Event",
    displayNameKey: "label",
    access: { 
      storefront: "NONE"
    },
    capabilities: {
      translatable: { enabled: true },
      publishable: { enabled: true }
    },
    fields: [
      { name: "Label", key: "label", type: "single_line_text_field", validations: { max: 255 } },
      { name: "Product", key: "featured_product", type: "product_reference" }
    ],
  },
] as const satisfies DefinitionSchema;
```

Here, our definition contains a reference to a built-in resource, a product.

When retrieving it, by default the ID will be returned:

```ts
const event = await eventRepository.findByHandle('my-handle');
event.featuredProduct: // Type as string
```

If we populate, however, the library will do an optimized query to get the product reference:

```ts
const event = await eventRepository.findByHandle('my-handle', { populate: ["productReference" ]});
event.featuredProduct: // Type as Product
```

To avoid performance problems, when creating a reference to a built-in type, the library will limit the
fields it gets. Here is the list of default fields being available when populating a reference:

* Product reference: 'id', 'handle', 'title', 'vendor', 'updatedAt'
* Collection reference: 'id', 'handle', 'title', 'updatedAt'
* Customer reference: 'id', 'displayName', 'email', 'phone', 'updatedAt'
* Metaobject reference / mixed reference (that are not owned by your app): 'id', 'handle', 'displayName', 'updatedAt'
* Page reference: 'id', 'handle', 'title', 'updatedAt'
* Product taxonomy value: 'id', 'name'
* Variant reference: 'id', 'title', 'sku', 'price', 'inventoryQuantity', 'barcode'
* File reference:
  * If "Image": 'id', 'image.id', 'image.altText', 'image.height', 'image.width', 'image.url'
  * If "Video": 'id', 'duration', 'sources.format', 'sources.fileSize', 'sources.height', 'sources.width', 'sources.mimeType', 'sources.url',
    'preview.image.id', 'preview.image.altText', 'preview.image.height', 'preview.image.width', 'preview.image.url'
  * If "Generic": 'id', 'alt', 'url', 'preview.image.id', 'preview.image.altText', 'preview.image.height', 'preview.image.width', 'preview.image.url'

> We reserve the right to add more fields if they do not impact performance negatively.

Sometimes, it might be useful to get more information. To do that, the library let you define an optional `onPopulate` method. This gives
you access to the underlying builder:

```ts
import { FieldBuilder } from "raku-ql";
import { OnPopulateFunc, FieldDefinition } from "metaobject-orm":

const onPopulate: OnPopulateFunc = (fieldDefinition: FieldDefinition, fieldBuilder: FieldBuilder) => {
  // FieldDefinition: { name: string, type: string, key: string, required: boolean, description: string, validations: [] }

  if (fieldDefinition.key === 'product') {
    return fieldBuilder.inlineFragment<Product>('Product', (fragment) => {
      fragment
        .fields('id', 'handle', 'title', 'vendor', 'updatedAt')
        .object('category', (category) => {
          category.fields('id', 'fullName', 'isArchived')
        })
    });
  }
}

const event = await eventRepository.findByHandle('my-handle', { 
  populate: ['product'],
  onPopulate
});

event.featuredProduct.category.fullName; // This can be accessed
```

The `onPopulate` function gives you two argument:

* The `fieldDefinition` gives you full details from the schema about this field, allowing you to controlling on a per-field
basis which info to retrieve. Please note that here, the `key` is the key from the schema, so it is `snake_case`.
* The `fieldBuilder` is a FieldBuilder instance from the library `raku-ql` that we have created to use for this library. You
can learn more about this library [here](https://github.com/maestrooo/raku-ql).

The `Product` passed in the example is coming from the Shopify auto-generated types, and allows you to get full auto-completion
for the fields.

> As of today, references to built-in types are not fully typed, so if you dynamically change the fields that you retrieve,
this won't be reflected in the type.