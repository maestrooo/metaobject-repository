## 0.10.0

- [BC] The `getDefinitionByType` now throws an exception if the definition does not exist, instead of returning null.

## 0.9.0

- [BC] I have removed the function `getEmptyObject` from the repository. After testing it, I felt it was an incorrect abstraction. The `getEmptyObject` was basically just used to generate an empty object with everything to null, whose only goal was to then convert it to a form state by using the `createFormState`. This, indirectly, couples the repository with a UI concern (generating a form state). A better solution is to actually manually creating your form state explicitly:

Before:
```ts
// in the loader
const event = eventRepository.getEmptyObject();
const formState = createFormState(event);
```

After:
```ts
// in the loader
const formState: createFormState<InferObjectType<typeof eventRepository>>({ fields: { foo: 'Bar' }});
```

The main difference is that you must explicitly pass the fields. Another (and safer) option, is to use a validation library like `zod`, and re-use the schema to generate an empty form state.

```ts
// in the loader
const formState: eventCreateSchema.parse({});
```

- Adding a new `InferObjectType` utility type, allowing to generate a type with a populated map. You can use it either with the definitions and an explicit type, or by using a repository:

```ts
// With a definitions
const { definitions } from 'your-definitions';
type Event = InferObjectType<typeof definitions, '$app:event', ['image']>;

// With a repository
type Event = InferObjectType<typeof eventRepository, ['image']>;
```

- Further improve the typing of the `createFormState` to handle more edge cases.

## 0.8.6

- Typing for `getEmptyObject` has been improved: it now takes into account defaultValues and properly type the values that have been explicitly set.
- Typing for `createFormState` has been improved: when using references or list of references, the form state will now be properly typed with strings (reference IDs).

## 0.8.5

- Typing for JSON fields with a validation schema is now honored for create, update, upsert and getEmptyObject.

## 0.8.4

- Further improve typing of `getEmptyObject`.

## 0.8.3

- The `getEmptyObject` now has an optional `defaultValues` option.
- The typing system has been improved for the `createFormState`. Now, 

## 0.8.1/0.8.2

- Make the default publishable of new metaobjects as active.

## 0.8.0

- [BC] The `getEmptyObject` will now have a `system` with all the possible keys set to null.
- The `getEmptyObject` now accepts an optional `defaultPublishableStatus`.
- Ensure that JSON fields are returned as an object when using the `createFormState` method, and are not serialized as a string.

## 0.7.0

- [BC] The `createFormState` method has been changed: id and handle now returns an empty string instead of null, to ensure it aligns with other properties, and make it easier to use for forms.
- Typing has been improved for capabilities. The `system.capabilities` in the returned objects will now match the definition. For instance, if a definition does not contain the `publishable` capability, it won't appear in the metaobject generated type anymore.

## 0.6.0

- The `createDefinition` method is now public on the definitions manager, to allow developers to create custom definition that are not baked by a schema.
- The `getDefinitionByType` method has been added to the definitions manager.

## 0.5.1

- Ensure the typing for JSON also works for arrays.

## 0.5.0

- JSON fields are now also converted to camelCase, to make the experience most consistent in JavaScript (and then converted back to snake_case when saved to Shopify).
- Improved the typing to add support for JSON fields.

## 0.4.1/0.4.2

- Improve the typing system on definition to ensure that `list.boolean`, `list.rich_text_field`, `list.money`, `list.id`, `list.json` and `list.multi_line_text_field` are not accepted.

## 0.4.0

- Added a new `extractFindParams` utility function that can be used to automatically extract search params to be used with the `find` method.

## 0.3.5/0.3.6

- Fix a bug where the id was not properly converted to GID when using legacy ID in the `update` method.

## 0.3.3/0.3.4

- I'm not 100% sure on what would be the best way to handle that, but actually I am changing the null values again: list fields will actually default to [] when returned, while scalar value will resolve to null (as per the change introduced in 0.3.2).

## 0.3.2

- Change the logic of how null values are treated to match Shopify structure, and improve the typing so that non required fields might resolve to null in the generated type.

## 0.3.1

- Fix an issue during deserialization for an empty reference.

## 0.3.0

- A new `getEmptyObject` method has been added on repositories, which allows creating an empty object for creating forms, while preserving all the typing system.
- A new `createFormState` method has been added to make it easier to work with forms.
- [BC] Null values are now deserialized as string (for non-list fields) and as empty array for list fields. This makes it easier to work with forms.
- [BC] The `system` is now marked as read-only, as it should not be edited.

## 0.2.5

- Fix an inference data for the `CreateInput`, `UpsertInput` and `UpdateInput` on list fields.

## 0.2.4

- Fix an issue in the definition manager dependency creation.

## 0.2.3

- Fix invalid build.

## 0.2.2

- Fix serialization of fields for `createMany`.

## 0.2.1

- Fix serialization of fields.

## 0.2.0

- Add a store access token repositories.

## 0.1.2

- Add a new `setAppMetafields` function to the metafield repository to make it easier to save app metafields without manually retrieving the current app installation ID.

## 0.1.1

- Add the missing `withClient` in metafield repository.

## 0.1.0

- Initial release