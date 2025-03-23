
# Metaobject-ORM Documentation

## What is Metaobject-ORM?

**Metaobject-ORM** is a simple decorator-based ORM for managing Shopify metaobjects.

## Why Use Metaobject-ORM?

Metaobject-ORM helps structure and simplify interactions with Shopify metaobjects. It provides decorators and an intuitive API. If your interaction with metaobjects is limited or dynamic, directly using the GraphQL API might be preferable.

## Installation

To install the library, use npm:

```shell
npm i metaobject-orm
```

## Defining Mappings

First, define mappings for your metaobjects, including fields, embedded structures, and relationships.

### Embedded Objects

**Address.ts**:

```typescript
@Embeddable({
  schema: {} // Optional JSON schema validation
})
class Address {
  country: string;
  city: string;
  zipCode: string;
  street: string;
}
```

### Metaobject Definitions

**Instructor.ts**:

```typescript
import { Metaobject, Field } from 'metaobject-orm/decorators';

@Metaobject({
  type: 'instructor',
  name: 'Instructor',
  access: { admin: 'MERCHANT_READ', storefront: 'PUBLIC_READ' }
})
class Instructor {
  @Field({ type: 'single_line_text_field' })
  firstName: string;

  @Field({ type: 'single_line_text_field' })
  lastName: string;
}
```

**Workshop.ts**:

```typescript
import { Metaobject, Field, Embedded, Reference } from 'metaobject-orm/decorators';
import { Money } from 'metaobject-orm/types';

@Metaobject({
  type: 'workshop',
  name: 'Workshop',
  access: { admin: 'MERCHANT_READ', storefront: 'PUBLIC_READ' }
})
class Workshop {
  @Field({ type: 'single_line_text_field', validations: { minLength: 3 } })
  title: string;

  @Field({ type: 'multi_line_text_field' })
  description: string;

  @Field({ type: 'money' })
  participationPrice: Money;

  @Field({ type: 'single_line_text_field', array: true, description: 'Internal use tags' })
  tags: string[];

  @Embedded({ object: Address })
  address: Address;

  @Reference({ object: Instructor, array: true })
  instructors: Reference<Instructor>[];

  @Reference({ object: 'Product' })
  product: Reference<object>;
}
```

**Important notes:**  
- Embeddables don't need `@Field` decorators, as they're serialized as JSON.  
- Keys and field names are automatically inferred (pascal-case names, underscore-separated keys) to match Liquid conventions.

## Decorators Reference

### @Metaobject

| Parameter      | Type                      | Required | Description                                                  |
|----------------|---------------------------|:--------:|--------------------------------------------------------------|
| `type`         | `string`                  | ✅ Yes    | Metaobject definition type                                   |
| `name`         | `string`                  | ✅ Yes    | Display name for the metaobject                              |
| `description`  | `string`                  | ❌ No     | Optional description                                        |
| `access`       | `MetaobjectAccess`        | ❌ No     | Admin/storefront permissions                                 |
| `capabilities` | `MetaobjectCapabilities`  | ❌ No     | Default capabilities                                        |
| `repository`   | `class`                   | ❌ No     | Custom repository class                                     |

*Additional decorators to be documented soon.*

## Working with the Object Manager

### Managed Objects

Managed objects provide both your data and Shopify metadata. An object is managed when you retrieve it from a `find*` method.

```typescript
import { objectManager } from 'metaobject-orm/persistence';

const workshop = await objectManager.withClient(admin.graphql).findOne(Workshop, { id: 'gid://shopify/Metaobject/123' });

console.log(workshop.title);
console.log(workshop.system.createdAt);
```

### CRUD Operations

#### Find One

Find by ID or handle:

```typescript
import { objectManager } from 'metaobject-orm/persistence';

// By ID
const workshop = await objectManager.withClient(admin.graphql).findOne(Workshop, { id: 'gid://shopify/Metaobject/123' });

// By handle
const workshopByHandle = await objectManager.withClient(admin.graphql).findOne(Workshop, { handle: 'foo' });
```

Throws if not found:

```typescript
import { objectManager } from 'metaobject-orm/persistence';

try {
  const workshop = await objectManager.withClient(admin.graphql).findOneOrFail(Workshop, { handle: 'foo' });
} catch (e) {
  // Handle error
}
```

#### Find Many

```typescript
import { objectManager } from 'metaobject-orm/persistence';

const workshops = await objectManager.withClient(admin.graphql).find(Workshop, {
  query: 'display_name: f',
  sortBy: 'display_name',
  first: 10, // or last for backward pagination
  after: '' // or before for backward pagination
});
```

#### Delete

Single delete:

```typescript
import { objectManager } from 'metaobject-orm/persistence';

// By ID
await objectManager.delete(Workshop, { client, id: 'gid://shopify/Metaobject/123' });

// Managed object
const workshop = await objectManager.withClient(admin.graphql).findOne(Workshop, { handle: 'foo' });
await objectManager.delete(Workshop, { client, object: workshop });
```

Bulk delete (async):

> Internally, Shopify implements bulk delete using a bulk mutation. This method therefore returns a `Job`
object that you can track for completion.

```typescript
import { objectManager } from 'metaobject-orm/persistence';

// By IDs
await objectManager.withClient(admin.graphql).deleteBulk(Workshop, { ids: ['gid://shopify/Metaobject/123'] });
```

#### Create

Single create (by default, Shopify will auto-generate an handle):

```typescript
import { objectManager } from 'metaobject-orm/persistence';

const workshop = new Workshop();
workshop.title = 'Foo';

await objectManager.withClient(admin.graphql).create(Workshop, { object: workshop });
```

Create with handle:

```typescript
import { objectManager } from 'metaobject-orm/persistence';

await objectManager.withClient(admin.graphql).create(Workshop, { input: { object: workshop, handle: 'foo' } });
```

Create many (limited to 25):

```typescript
import { objectManager } from 'metaobject-orm/persistence';

await objectManager.withClient(admin.graphql).createMany(Workshop, { objects: [workshop1, workshop2] });
```

Or create many with handles:

```typescript
import { objectManager } from 'metaobject-orm/persistence';

await objectManager.withClient(admin.graphql).createMany(Workshop, { input: [{ object: workshop1, handle: 'foo' }, { object: workshop2, handle: 'bar' }] });
```

#### Upsert

Upsert one object that is already managed (effectively doing an update):

> This will throw an error if the object is not managed, and that no handle is given explicitly:

```typescript
import { objectManager } from 'metaobject-orm/persistence';

await objectManager.withClient(admin.graphql).upsert(Workshop, object: workshop });
```

Upsert one object with an explicit handle:

```typescript
import { objectManager } from 'metaobject-orm/persistence';

await objectManager.withClient(admin.graphql).upsert(Workshop, { input: { object: workshop, handle: 'foo' } });
```

Bulk upsert (async):

> Internally, this uses a bulk mutation. This method therefore returns a `Job` object that you can track for completion.

```typescript
import { objectManager } from 'metaobject-orm/persistence';

await objectManager.withClient(admin.graphql).upsertBulk(Workshop, { input: [{ object: workshop, handle: 'foo' }] });
```

#### Update

```typescript
import { objectManager } from 'metaobject-orm/persistence';

const workshop = await objectManager.withClient(admin.graphql).findOne(Workshop, { handle: 'foo' });
workshop.title = 'New title';

await objectManager.withClient(admin.graphql).update(Workshop, { object: workshop });
```

### Working with References

By default, only the ID from references is retrieved. You can ask the ORM to include one or mutliple references:

> Requesting too many references might hit the rate limits faster. Make sure to monitor your API calls and ensure that you
ask only what is needed.

```typescript
import { objectManager } from 'metaobject-orm/persistence';

const workshop = await objectManager.withClient(admin.graphql).findOne(Workshop, { handle: 'foo', include: ['instructors'] });
console.log(workshop.instructors);
```

This can work recursively by using the dot notation (eg.: `instructors.profilePicture`).

### Using repositories

When using the object manager, you must pass the object type in each call. You can also get a repository, so that you don't
have to manually pass the object type.

```typescript
import { objectManager } from 'metaobject-orm/persistence';

const workshopRepository = objectManager.getRepository(Workshop);
await workshopRepository.withClient(admin.graphql).findOne({ handle: 'foo' });
```

#### Custom repositories

You can create a custom repository to encapsulate common or specialized queries. This helps maintain clean and reusable code.

Step 1: Define your custom repository

workshop-repository.ts:

```ts
import { ObjectRepository } from 'metaobject-orm/persistence';
import { Workshop } from './Workshop';

export class WorkshopRepository extends ObjectRepository<Workshop> {
  async findOldest(): Promise<Workshop[]> {
    return this.find({
      sortBy: 'created_at'
    });
  }
}
```

Step 2: Link the repository to your metaobject definition

```ts
import { Metaobject } from 'metaobject-orm/decorators';
import { WorkshopRepository } from './workshop-repository';

@Metaobject({
  type: 'workshop',
  repository: WorkshopRepository
})
class Workshop {
  // ... your fields
}
```

Step 3: Using your custom repository

```ts
import { objectManager } from 'metaobject-orm/persistence';

const workshopRepository = objectManager.getRepository(Workshop); // Returns your custom repository
const oldestWorkshops = await workshopRepository.withClient(admin.graphql).findOldest();
```

## Managing definitions

`Metaobject-ORM` provides a convenient API for managing metaobject definitions in your Shopify store, including verifying, creating, deleting, synchronizing, and customizing definitions.

### Checking if a definition exists

You can verify if a metaobject definition exists:

```typescript
import { definitionManager } from 'metaobject-orm/definition';

const exists = await definitionManager
  .withClient(admin.graphql)
  .exists(Workshop);
```

### Creating a definition

To create a new definition (throws an error if the definition already exists):

```typescript
import { definitionManager } from 'metaobject-orm/definition';

const createdDefinitionId = await definitionManager
  .withClient(admin.graphql)
  .create(Workshop);
```

### Deleting a definition

To delete an existing definition:

```typescript
import { definitionManager } from 'metaobject-orm/definition';

const deletedDefinitionId = await definitionManager
  .withClient(admin.graphql)
  .delete(Workshop);
```

### Synchronizing definitions

The `sync` method automatically manages multiple definitions by:

- Creating missing definitions.
- Updating existing definitions with new or modified fields.
- Optionally deleting definitions or fields no longer present in your project.

**Example:**

```typescript
import { definitionManager } from 'metaobject-orm/definition';

await definitionManager.withClient(admin.graphql).sync({
  deleteDanglingDefinitions: true, // deletes definitions no longer defined in your code
  deleteDanglingFields: true       // deletes fields no longer defined in your code
});
```

> By default, both `deleteDanglingDefinitions` and `deleteDanglingFields` are set to false, to avoid unwanted removal.

Usually, the `sync` method is called during the initial app installation to set up all required definitions.

> **Note:** The library automatically manages definition creation order based on object relationships (e.g., it ensures `Instructor` is defined before `Workshop` if needed).

### Customizing definitions

You can add, update, or remove fields dynamically from existing definitions. To use this feature, your metaobject must include the `@DynamicFields` decorator. Each customized field uses a prefix to avoid conflicts.

**Example:**

```typescript
import { definitionManager } from 'metaobject-orm/definition';

await definitionManager.withClient(admin.graphql).customize(Workshop, {
  create: {
    key: 'bar',
    name: 'Bar',
    required: false
  },
  update: {
    key: 'foo',
    name: 'New foo'
  },
  delete: {
    key: 'baz'
  }
});
```

**Important:**  
- Only one field per operation (`create`, `update`, `delete`) is allowed per call.
- The field keys will automatically include the prefix defined in `@DynamicFields`. For example, if your prefix is `custom`, the keys become `custom_bar`, `custom_foo`, and `custom_baz`.
- Keys won't be automatically converted to underscore_separated. You must do it yourself. However, when hydrated to your object, they will be converted to
camelCase. So the key `durability_rating` will be accessible using `myObject.dynamicFields.durabilityRating`.
- Name are not inferred here, so you must explicitly pass them.

## Advanced use: Dynamic fields

Sometimes, it's useful to combine a set of structured fields (common to all merchants) with additional custom fields unique to each merchant. For example, you might have a "Review" metaobject that includes a fixed set of standard fields required by all merchants, but you also want to allow each merchant the flexibility to define their own custom fields.

There are two primary ways to accomplish this:

- **Use a JSON field:** This method allows you to store extra, unstructured information within a single JSON field.
- **Use the `DynamicFields` decorator:** This approach allows structured access to custom fields by prefixing the field keys, saving each custom field into a dedicated field.

Here's how you can implement the `DynamicFields` decorator:

**Review.ts:**

```ts
import { Metaobject } from 'metaobject-orm/decorators';

@Metaobject({ type: 'review' })
class Review {
  @Field({ type: 'rating' })
  rating: object;

  @DynamicFields({ keyPrefix: 'custom' })
  dynamicFields: DynamicFields;
}
```

For instance, suppose you've defined the fields `custom_durability_rating` and `custom_quality_rating`. Here's how you can retrieve them:

```ts
const review = objectRepository.withClient(admin.graphql).find({ handle: 'foo' });

review.rating; // Accesses the rating from the common definition
review.dynamicFields.durabilityRating; // Retrieves the durability rating value

// You can also use these additional utility methods:

if (review.dynamicFields.has('durabilityRating')) {
  // Check if the field exists
}

review.dynamicFields.get('durabilityRating'); // Same as accessing the field directly
review.dynamicFields.getSchema('durabilityRating'); // Retrieves the schema of the custom field (useful to show them in the app admin)

review.dynamicFields.forEach(([key, value]) => {
  console.log(key); // Outputs: "durabilityRating"
  console.log(value); // Outputs the value of the durability rating field
});
```

## Limitations

- No diff-checking (all fields updated).
- No mixed references.
- No cascading creation (nested object creation).

Example (manual cascading creation):

```typescript
const instructor = new Instructor();
instructor.firstName = 'John';
await objectManager.withClient(admin.graphql).create(Instructor, { object: instructor });

const workshop = new Workshop();
workshop.instructor = instructor;
await objectManager.withClient(admin.graphql).create(Workshop, { object: workshop });
