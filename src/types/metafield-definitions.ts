import type { MetafieldOwnerType, MetafieldAccessInput, MetafieldCapabilityCreateInput, MetafieldDefinitionConstraintsInput } from "./admin.types";
import type { FieldType, FieldValidations } from "./fields";

export type MetafieldDefinitionMap = {
  [T in FieldType]: {
    name: string;
    type: T;
    key: string;
    description?: string;
  } & FieldValidations<T>;
}

export type MetafieldBaseDefinition = MetafieldDefinitionMap[keyof MetafieldDefinitionMap];

/**
 * --------------------------------------------------------------------------------------------
 * Definition schema
 * --------------------------------------------------------------------------------------------
 */

export type MetafieldDefinitionSchemaEntry = MetafieldBaseDefinition & {
  ownerType: MetafieldOwnerType;
  namespace?: string;
  access?: MetafieldAccessInput;
  pin?: boolean;
  capabilities?: MetafieldCapabilityCreateInput;
  constraints?: MetafieldDefinitionConstraintsInput;
};

export type MetafieldDefinitionSchema = MetafieldDefinitionSchemaEntry[];