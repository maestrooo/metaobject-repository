import { MetafieldDefinitionManager } from "./metafields/metafield-definition-manager";
import { MetafieldRepository } from "./metafields/metafield-repository";
import { MetaobjectDefinitionManager } from "./metaobjects/metaobject-definition-manager";
import { MetaobjectRepository } from "./metaobjects/metaobject-repository";
import { StorefrontTokenRepository } from "./storefront-tokens/storefront-token-repository";
import { MetafieldDefinitionSchema } from "./types/metafield-definitions";
import { MetaobjectDefinitionSchema } from "./types/metaobject-definitions";
import { CamelCase } from "./types/utils";
import { ConnectionOptions } from "./utils/request";

type CreateContextOptions<MOD extends MetaobjectDefinitionSchema, MFD extends MetafieldDefinitionSchema> = {
  connection: ConnectionOptions;
  metaobjectDefinitions?: MOD;
  metafieldDefinitions?: MFD
}

// 1. Helper to remove any “<prefix>:” from a string literal
type RemovePrefix<S extends string> = S extends `${string}:${infer Rest}` ? Rest : S;

// 2. Build the repository‐key names: e.g. "$app:store-type" → "storeTypeRepository"
type RepoKey<Def extends MetaobjectDefinitionSchema, T extends Def[number]["type"]> = `${CamelCase<RemovePrefix<T>>}Repository`;

// 3. Build the “repositories” slice of your context
type MetaobjectRepositories<Def extends MetaobjectDefinitionSchema> = {
  [D in Def[number] as RepoKey<Def, D["type"]>]:
    MetaobjectRepository<Def, D["type"]>;
};

// 4. Your full context type
export type AppContext<MOD extends MetaobjectDefinitionSchema, MFD extends MetafieldDefinitionSchema> = {
  metaobjectDefinitionManager: MetaobjectDefinitionManager;
  metafieldDefinitionManager: MetafieldDefinitionManager;
  storefrontTokenRepository: StorefrontTokenRepository;
  metafieldRepository: MetafieldRepository;
} & MetaobjectRepositories<MOD>;

// 5. The implementation
export function createContext<MOD extends MetaobjectDefinitionSchema, MFD extends MetafieldDefinitionSchema> (
  {
    connection,
    metaobjectDefinitions = [] as unknown as MOD,
    metafieldDefinitions  = [] as unknown as MFD,
  }: CreateContextOptions<MOD, MFD>
): AppContext<MOD, MFD> {
  const metaobjectDefinitionManager = new MetaobjectDefinitionManager({ connection, metaobjectDefinitions });
  const metafieldDefinitionManager = new MetafieldDefinitionManager({ connection, metafieldDefinitions, metaobjectDefinitionManager });
  const metafieldRepository = new MetafieldRepository({ connection, metafieldDefinitions, metaobjectDefinitions });
  const storefrontTokenRepository = new StorefrontTokenRepository(connection);

  const repoEntries = metaobjectDefinitions.map(def => {
    const withoutPrefix = def.type.replace(/^[^:]+:/, ""); // strip the “$app:” prefix
    const camel = withoutPrefix.replace(/-([a-z])/g, (_, c) => c.toUpperCase()); // turn “store-type” → “storeType”
    const key = `${camel}Repository`;  // e.g. "storeTypeRepository"

    // instantiate the repo; we know def.type is one of MOD[number]["type"]
    const repo = new MetaobjectRepository<MOD, typeof def.type>({ type: def.type, connection, metaobjectDefinitions });

    return [key, repo] as const;
  });

  // one single cast here:
  const repositories = Object.fromEntries(repoEntries);

  return {
    metaobjectDefinitionManager,
    metafieldDefinitionManager,
    metafieldRepository,
    storefrontTokenRepository,
    ...repositories,
  } as AppContext<MOD, MFD>;
}
