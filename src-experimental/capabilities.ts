// capabilities.ts

import { MetaobjectCapabilitiesOnlineStore, MetaobjectCapabilitiesPublishable, MetaobjectCapabilitiesRenderable, MetaobjectCapabilitiesTranslatable, MetaobjectCapabilityOnlineStoreInput, MetaobjectCapabilityPublishableInput } from "../src/types/admin.types";

// Definition‐level capability shapes
export type CapabilityConfigMap = {
  onlineStore: MetaobjectCapabilitiesOnlineStore;
  renderable: MetaobjectCapabilitiesRenderable;
  translatable: MetaobjectCapabilitiesTranslatable;
  publishable: MetaobjectCapabilitiesPublishable;
}

// Create‐time input for each capability
export type CapabilityInputMap = {
  onlineStore: MetaobjectCapabilityOnlineStoreInput;
  publishable: MetaobjectCapabilityPublishableInput;
}