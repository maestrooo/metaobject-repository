import { definitions, Definitions } from "./src-experimental/definitions";
import { ObjectRepository } from "./src-experimental/repository";

// create a repository for your “Test” metaobject
const repo = new ObjectRepository<Definitions, "Test">(definitions, "Test");

// 1) everything as plain strings
const plain = await repo.find("123");
// type of `plain.icon` is string

// 2) populate only `icon` (uses validations to pick Image|Video|…)
const withIcon = await repo.find("123", { populate: ["icon"] });
// type of `withIcon.icon` is Image | Video (per validations in definitions)

// 3) populate a nested metaobject_reference
const deep = await repo.find("123", { populate: ["store_type.another"] });
// `deep.store_type.another` is fully populated `{ name: string }`

// 4) mix-and-match
const mix = await repo.find("123", {
  populate: ["icon", "store_type", "store_type.another"],
});

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