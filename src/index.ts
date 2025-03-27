import { classMetadataFactory } from './class-metadata-factory';
import { Example } from './example';
import { objectManager } from './persistence/object-manager';

export { Metaobject, Embeddable, Field } from './decorators';
export { classMetadataFactory } from './class-metadata-factory';

export { Example } from './example';

class Another {

}

const { promise } = classMetadataFactory.getMetadataFor(Example);

promise.then((metadata) => {
  console.log(metadata);
});

const f = objectManager.getRepository(Another);

console.log(f);

objectManager.findOne(Example, 'gid://shopify/Metaobject/123');