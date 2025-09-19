import * as v from "valibot";
import { MetaobjectRepository } from "./persistence/repository";
import { repositoryFor } from "../app/types/metaobject-types";

export * from "./runtime/types";
export { toFieldsObject } from "./fields/deserializer";
export { serializeFields } from "./fields/serializer";

export { MetaobjectRepository } from "./persistence/repository";

const Schema = v.object({
  title: v.string()
});

//const r = new MetaobjectRepository<CustomField>('$app:custom-field');
//r.create({ schema: Schema, fields: { title: '123' }})

const r = repositoryFor('$app:custom-field');
const client: any = null;
const ob = await r.getById({ client, id: '123', with: { thumbnail: true, fields: { reference: true } } });
ob.