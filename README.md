
# Metaobject-Repository Documentation

## What is Metaobject-Repository?

**Metaobject-Repository** is a library to interact more easily with Shopify metaobjects, with a fully typed approach.

## Why Use Metaobject-Repository?

Metaobject-Repository helps structure and simplify interactions with Shopify metaobjects. It provides decorators and an intuitive API. If your interaction with metaobjects is limited or dynamic, directly using the GraphQL API might be preferable.

While this library is specialized for retrieving metaobjects, it also offers a thin wrapper around metafields and storefront access tokens, to make it easier
to work with.

> The goal of this library is NOT to offer a repository for all possible kind of resources, so we don't plan to add more repositories.

## Installation

To install the library, use npm:

```shell
npm i metaobject-repository
```

## Schema

### Defining a schema

To start with, define a schema for your metaobjects. The schema must satisfies with the `DefinitionSchema` type:

```ts
// ────────────────────────────────────────────────────────────────────────
// File: definitions.ts
// ────────────────────────────────────────────────────────────────────────

import { DefinitionSchema } from "metaobject-repository";

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
export const eventRepository = new MetaobjectRepository(definitions, "$app:event");
export const hostRepository = new MetaobjectRepository(definitions, "$app:host");
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
export const eventRepository = new MetaobjectRepository(definitions, "$app:event");
```

#### Get typing for JSON fields

If you have a field of type JSON, then you won't get typing information automatically:

```ts
// Some field definition
fields: [
  { name: "Address", key: "address", type: "json" }
]

// ...

const event = await eventRepository.findByHandle('handle');
event.address.???; // This won't be autocompleted
```

If you need to get type, first install the library json-schema-to-ts:

```
npm install --save-dev json-schema-to-ts
```

To make this work, you can pass an JSON schema as the validations (this is also a good practice, as it helps ensuring data consistency,
as Shopify won't save metaobjects that do not comply with the schema):

```ts
// Some field definition
fields: [
  { 
    name: "Address", 
    key: "address", 
    type: "json",
    validations: {
      schema: {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "title": "Address",
        "type": "object",
        "properties": {
          "address1": {
            "type": "string",
            "description": "Primary street address"
          },
          "address2": {
            "type": "string",
            "description": "Secondary address information (e.g. apartment, suite)"
          },
          "zip_code": {
            "type": "string",
            "description": "Postal or ZIP code"
          }
        },
        "required": ["address1"],
        "additionalProperties": false
      }
    }
  }
];
```

You will now get auto-completion. For making it easier to use, all the keys are automatically converted to camelCase in the schema,
so you get consistent auto-completion.

> In the schema, make sure to use the underscore_separated naming, as this is the schema saved as part of the definition (the library)
won't convert those to snake_case.

### Creating the schema

When your app is installed, it is needed to create the definitions for all metaobjects. To do that, import the `definitionManager`
and use the `createFromSchema` method (your definition schema must be exported):

```ts
import { definitionManager } from "metaobject-repository";
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

### Updating a definition

It might be needed to alter a definition beyond the fixed schema. To do that, the `definitionManager` has a nice `updateDefinition`, which
accepts a type (so you don't have to get the ID yourself) and a compliant [`MetaobjectDefinitionUpdateInput`](https://shopify.dev/docs/api/admin-graphql/unstable/input-objects/MetaobjectDefinitionUpdateInput) payload:

```ts
import { definitionManager } from "metaobject-repository";
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

### Creating a definition

The preferred method to create definitions is by using the `createFromSchema`. This method automatically takes care of creating all your
definitions, with their dependencies. However, if you need to create a custom definition, that is not baked by a schema, you can use the
`createDefinition` method:

```ts
import { definitionManager } from "metaobject-repository";
import { definitions } from "your-definitions";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  definitionManager.withClient(admin.graphql); // <== Don't forget

  await definitionManager.createDefinition({
    definition: {
      type: '$app:event',
      name: 'Big events',
      fieldDefinitions: [
        {
          key: 'country',
          type: 'single_line_text_field'
        }
      ]
    }
  })

  return null;
};
```

### Retrieving a definition

You can get information about a definition by using the `getDefinitionByType`:

```ts
import { definitionManager } from "metaobject-repository";
import { definitions } from "your-definitions";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  definitionManager.withClient(admin.graphql); // <== Don't forget

  const definition = await definitionManager.getDefinitionByType('$app:event');

  return null;
};
```

> The `createdByApp`, `createdByStaff`, `metaobjects` and `standardTemplate` are not retrieved, as they are not very useful for the use case of this library.

## Interacting with the object manager

To interact with metaobjects, you must create an object manager for a given type. We recommend to export it along your definitions so that
it can be accessed globally:

definition.ts:

```ts
export const eventRepository = new MetaobjectRepository(definitions, "$app:event");
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
const events = await eventRepository.findAll('1234', opts);
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
const events = await eventRepository.find(opts);
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
const eventDeletedId = await eventRepository.delete('1234');
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
event.system.type; // Get the type of the metaobject (useful when dealing with mixed references)
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

* Product reference: 'id', 'handle', 'title', 'productType', 'status', 'description', 'vendor', 'updatedAt', 'createdAt', 'publishedAt', 'tags','hasOnlyDefaultVariant', 'variantsCount', 'templateSuffix', 'featuredImage'.
* Collection reference: 'id', 'handle', 'title', 'description', 'hasProduct', 'sortOrder', 'updatedAt', 'templateSuffix', 'image'
* Customer reference: 'id', 'displayName', 'amountSpent', 'numberOfOrders', 'email', 'verifiedEmail', 'phone', 'createdAt', 'updatedAt', 'locale', 'image'
* Company reference: 'id', 'externalId', 'name', 'lifetimeDuration', 'ordersCount', 'totalSpent', 'createdAt', 'updatedAt'
* Metaobject reference / mixed reference (that are not owned by your app): 'id', 'type', 'handle', 'displayName', 'createdAt', 'updatedAt', 'fields'
* Page reference: 'id', 'handle', 'title', 'body', 'isPublished', 'createdAt', 'updatedAt', 'templateSuffix'
* Product taxonomy value: 'id', 'name'
* Variant reference: 'id', 'title', 'displayName', 'sku', 'price', 'compareAtPrice', 'availableForSale', 'inventoryQuantity', 'barcode', 'createdAt',             'updatedAt', 'image'
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
import { OnPopulateFunc, FieldDefinition } from "metaobject-repository":

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

### Data validation

When creating, updating or upserting a metaobject, please keep in mind that no validation beyond the validation defined on Shopify
will happen. We recommend that you always validate your data (using a library like `zod`) before you push data. Here is an example:

```ts
import * as z from "zod";

export const eventSchema = z.interface({
  name: z.string().nonempty().max(255),
  type: z.enum(['Food', 'Social', 'Ecology']),
});

export const attributeCreateInput = attributeSchema;

// In your action:

const result = attributeCreateInput.safeParse(body);

if (!result.success) {
  return { errors: result.error };
}

// The data is now validated and safe
const event = await eventRepository.create({ handle: '123', fields: result.data });
```

## Metafield repository

While the library goal is to interact with metaobjects, it gives a thin layer for retrieving app metafields, saving metafields and
deleting metafields. To do that, import the `metafieldRepository`:

```ts
import { metafieldRepository } from "metaobject-repository";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  metafieldRepository.withClient(admin.graphql); // <== Don't forget

  // Get an app metafield
  const appMetafield = await metafieldRepository.getAppMetafield({ key: 'foo' });

  // Get a list of metafields
  const { items, pageInfo } = await metafieldRepository.getMetafields({ owner: 'gid://shopify/Product/123', first: 50 });

  // Save metafields
  await metafieldRepository.setMetafields([
    { type: 'single_line_text_field', key: 'foo', namespace: 'bar', value: '123', ownerId: 'gid://shopify/Product/123' }
  ]);

  // Save app metafields (when doing so, you don't have to set the ownerId, it is retrieved under the hood automatically)
  await metafieldRepository.setAppMetafields([
    { type: 'single_line_text_field', key: 'foo', namespace: 'bar', value: '123' }
  ]);

  // Delete metafields
  await metafieldRepository.deleteMetafields([
    { key: 'foo', namespace: 'bar', ownerId: 'gid://shopify/Product/123' }
  ])

  return null;
};
```

## Storefront tokens repository

In addition to the metafield repository, the library also offers a thin wrapper to manage storefront access tokens, which is often
required when working with Liquid.

```ts
import { storefrontTokenRepository } from "metaobject-repository";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  storefrontTokenRepository.withClient(admin.graphql); // <== Don't forget

  // Create a new token by title
  const accessToken = await storefrontTokenRepository.createToken({ title: 'Foo' });

  // Upsert a new token by title (create it if not exists, otherwise return it)
  const accessToken = await storefrontTokenRepository.upsertToken({ title: 'Foo' });

  // Delete an existing token by title
  await storefrontTokenRepository.deleteToken({ title: 'Foo' });

  // Get all existing storefront tokens for an app
  const tokens = await storefrontTokenRepository.getExistingTokens();

  return null;
};
```

## Recipes

### Inferring a type

It can be useful to generate a type from an object returned by the metaobject repository, optionally populated. To do that, you can use the `InferObjectType` utility type:

```ts
import { InferObjectType } from "metaobject-repository";

// With a definitions
const { definitions } from 'your-definitions';
type Event = InferObjectType<typeof definitions, '$app:event', ['image']>;

// With a repository
type Event = InferObjectType<typeof eventRepository, ['image']>;
```

### Creating a form state

When using repositories methods, the object is fully expands, and can contain a deep object. The library also adds various information such as the system
key. At the end, an object might look like this:

```ts
{
  system: {
    id: "gid://shopify/Metaobject/123",
    handle: "my-handle",
    // other system data
  },
  title: "bar",
  icon: {
    id: "gid://shopify/MediaImage/456",
    altText: "Some text",
    // other properties...
  },
  product: {
    id: "gid://shopify/Product/678"
  }
}
```

This makes it hard when working with form, as when saving a metaobject we need to have a flat hierarchy. To make it easier to work with forms, you can
use the `createFormState` method, which will flatten the data, while preserving fully typed object:

```ts
const formState = createFormState(myObject);

/* Will be this:
{
  id: "gid://shopify/Metaobject/123",
  capabilities: {
    publishable: { enabled: 'ACTIVE' }
  },
  handle: "my-handle",
  title: "bar",
  icon: "gid://shopify/MediaImage/456",
  product: "gid://shopify/Product/678"
}
*/

// You can also define a subset of fields:
const formState = createFormState(myObject, ['id', 'title']);

/* Will be this:
{
  id: "gid://shopify/Metaobject/123",
  title: "bar"
}
*/
```

Note that id, handle and capabilities are flattened as top keys from the `system` key. If you are using a validation library like `zod`, make sure
to match the same structure.

### Working with empty object

When using a create form, it is often useful to have an empty state. In older version of the library, we had a convenience method `getEmptyObject` as part of the metaobject repository. This has been deleted though, as I felt it was not a good abstraction. Instead, to create an empty state, we recommend you to explicitly create an empty object or, better, using a library like `zod` to generate an empty form state:

```ts
// in your loader

// Manually creating an empty state
const formState = { 
  capabilities: { 
    publishable: { enabled: 'ACTIVE' }
  },
  title: '',
  other: ''
}

// Or better, by using a library such as zod
const formState = eventSchema.parse({});
```

### Extracting query params

When using the `find` method, you can use the `extractFindParams` by passing a `URLSearchParams` object to automatically build attributes:

```ts
import { extractFindParams } from 'metaobject-repository';

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  let { searchParams } = new URL(request.url);

  eventRepository.withClient(admin.graphql);

  return { 
    events: await eventRepository.findAll({ ...extractFindParams(searchParams), populate: ["icon"] }) 
  };
}
```

The library expects the query params to be called `first`, `last`, `before`, `after`, `query`, `reverse` and `sortKey`.

### Typing loader data

Let's say that you have a loader in a `index.ts` route, that returns a list of events, with some populated properties:

```ts
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  eventRepository.withClient(admin.graphql);

  return { 
    events: await eventRepository.findAll({ populate: ["icon"] }) 
  };
}

export default function Events() {
  const { events } = useLoaderData<typeof loader>();

  // events is properly typed
}
```

Metaobject-Repository will automatically infer the correct type to provide autocompletion. However, if you pass this property
to a child component, then the typing will be lost:

index.ts
```ts
export default function Events() {
  const { events } = useLoaderData<typeof loader>();

  <EventsIndexTable events={ events } />
}
```

list.ts
```ts
export function EventsIndexTable({ events }) {
  // Typing is lost here!!
}
```

The problem is that recreating the typing is complex. To preserve the typing, the recommended approach is to infer the generated
type from the parent, and re-use it on the child:

index.ts
```ts
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  eventRepository.withClient(admin.graphql);

  return { 
    events: await eventRepository.findAll({ populate: ["icon"] }) 
  };
}

export default function Events() {
  const { events } = useLoaderData<typeof loader>();

  // events is properly typed
}

// We export the generated type from the loader
export type EventsList = ReturnType<typeof useLoaderData<typeof loader>>['events'];
```

list.ts
```ts
import { EventsList } from './index';

type EventsIndexTableProps = {
  events: EventsList;
}

export function EventsIndexTable({ events }: EventsIndexTableProps) {
  // typing is now carried over
}
```


### Roadmap

* Adding a translation repository to make it easier to translate metaobjects.
* Adding a `bulkUpsert` method to upsert a high number of objects using a long standing job.
* Add an `export` method to the repository to export up to 250 metaobjects.
* Add a `bulkExport` method to export any number of metaobjects, using the bulk API.