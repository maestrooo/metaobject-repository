import { MetafieldAccessInput, MetafieldCapabilityCreateInput, MetafieldDefinitionConstraintsInput, MetafieldOwnerType } from "./admin.types";
import { FieldType, FieldValidations } from "./fields";
import { AllowRawEnum } from "./utils";

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