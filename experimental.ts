import { definitions, Definitions } from "./definitions";
import { ObjectRepository } from "./src-experimental/object-repository";
import { FromDefinition } from "./src-experimental/types/definitions";

// create a repository for your “Test” metaobject
const repo = new ObjectRepository<Definitions, "Test">(definitions, "Test");

// 1) everything as plain strings
const plain = await repo.findById("123");
type Foo = typeof plain;
// type of `plain.icon` is string

// 2) populate only `icon` (uses validations to pick Image|Video|…)
const withIcon = await repo.findById("123", { populate: ["icon", "products"] });
// type of `withIcon.icon` is Image | Video (per validations in definitions)

// 3) populate a nested metaobject_reference
const deep = await repo.findById("123", { populate: ["store_type.another"] });
// `deep.store_type.another` is fully populated `{ name: string }`

// 4) mix-and-match
const mix = await repo.findById("123", {
  populate: ["icon", "store_type", "store_type.another", "products" ],
});

mix.products.forEach((product) => {
  
});

let { pageInfo, items } = await repo.find({ first: 10, sortKey: 'display_name', populate: ['icon'], query: 'test' });

let u = await repo.create({ handle: '123', capabilities: { publishable: { enabled: true } }, fields: { name: 'fff', icon: '123' } }, { populate: ['icon'] });

let arrays = await repo.createMany(
  [
    { handle: '123', capabilities: { publishable: { enabled: true } }, fields: { name: 'fff', icon: '123' } },
    { handle: '123', capabilities: { publishable: { enabled: true } }, fields: { name: 'fff', icon: '123' } }
  ],
  { populate: ['icon'] }
);

deep.store_type.another.name;

if (mix.icon.__typename === 'Image') {
 
}