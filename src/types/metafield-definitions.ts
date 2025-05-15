import type { MetafieldAccessInput, MetafieldCapabilityCreateInput, MetafieldDefinitionConstraintsInput } from "./admin.types";
import { MetafieldOwnerType } from "./admin.types";
import type { FieldType, FieldValidations } from "./fields";
import type { AllowRawEnum } from "./utils";

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
  ownerType: AllowRawEnum<MetafieldOwnerType>;
  namespace?: string;
  access?: AllowRawEnum<MetafieldAccessInput>;
  pin?: boolean;
  capabilities?: MetafieldCapabilityCreateInput;
  constraints?: MetafieldDefinitionConstraintsInput;
};

export type MetafieldDefinitionSchema = MetafieldDefinitionSchemaEntry[];