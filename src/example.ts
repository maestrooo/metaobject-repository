import { Capability } from "./decorators/capability";
import { Embeddable } from "./decorators/embeddable";
import { Field } from "./decorators/field";
import { Metaobject } from "./decorators/metaobject";
import { MetaobjectStatus, MetaobjectStorefrontAccess } from "./types/admin.types";

@Embeddable({ schema: { foo: 'baz' } })
export class Emb {

}

@Metaobject({
  type: 'bar',
  name: 'Instructor'
})
export class Instructor {
  @Field({ type: 'single_line_text_field', list: true, required: true, validations: { maxLength: 10 } })
  name?: string;

  @Field({ type: 'product_reference' })
  subProduct?: string;
}

@Metaobject({
  type: '$app:example',
  name: 'Example',
  capabilities: { publishable: { enabled: false } },
  access: { admin: "MERCHANT_READ", storefront: "DD" },
})
export class Example {
  @Field({ type: 'single_line_text_field', list: true, required: true, validations: { maxLength: 10 } })
  allowProperty?: string;

  @Capability("onlineStore")
  status?: MetaobjectStatus;

  @Field({ type: 'single_line_text_field', list: true, required: true, validations: { maxLength: 10 } })
  foo?: string;

  @Field({ embedded: Emb, validations: { schema: { foo: 'bar' } } })
  example?: Emb;

  @Field({ metaobject: Instructor, list: true })
  instructors?: Instructor[];

  @Field({ type: 'product_reference' })
  product?: string;

  @Field({ type: 'product_reference', list: true })
  products?: string[];

  @Field({ type: 'metaobject_reference', metaobjectType: 'foo-123' })
  meta?: string[];

  bar() {
    console.log('TEST');
  }
}