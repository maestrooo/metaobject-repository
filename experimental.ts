import { definitions, Definitions } from "./definitions";
import { ObjectRepository } from "./src/object-repository";
import { CreateInput } from "./src/types/repository";

// create a repository for your “Test” metaobject
const repo = new ObjectRepository<Definitions, "$app:test">(definitions, "$app:test");

// 1) everything as plain strings
const plain = await repo.findById("123");
plain.icon;
// type of `plain.icon` is string

// 2) populate only `icon` (uses validations to pick Image|Video|…)
const withIcon = await repo.findById("123", { populate: ["icon"] });
// type of `withIcon.icon` is Image | Video (per validations in definitions)

withIcon.icon;

withIcon.products.forEach(product => {
  product.name;
})

// 3) populate a nested metaobject_reference
const deep = await repo.findById("123", { populate: ["genericObj", "genericObj"] });
// `deep.store_type.another` is fully populated `{ name: string }`
deep.genericObj.genericObj;
// 4) mix-and-match
const mix = await repo.findById("123", {
  populate: [],
});

mix.products.forEach((product) => {
  
});

let { pageInfo, items } = await repo.find({ first: 10, sortKey: 'display_name', populate: ['icon'], query: 'test' });

let u = await repo.create({ handle: '123', capabilities: { translatable: { enabled: true } }, fields: { name: 'fff', icon: '123' } }, { populate: ['icon'] });

let arrays = await repo.createMany(
  [
    { handle: '123', capabilities: { publishable: { enabled: true } }, fields: { name: 'fff', icon: '123' } },
    { handle: '123', capabilities: { publishable: { enabled: true } }, fields: { name: 'fff', icon: '123' } }
  ],
  { populate: ['icon'] }
);