import { MetafieldDefinitionValidation } from "~/types/admin.types";
import { classMetadataFactory } from "../class-metadata-factory";
import { EmbeddableClassMetadata, MetafieldType, MetaobjectClassMetadata, ReferenceTypename } from "../types";

type FileMediaType = 'Image' | 'Video';

type BaseMetafield<T extends string, V = undefined> = {
  type: T;
  name?: string;
  key?: string;
  description?: string;
  required?: boolean;
  array?: boolean;
} & (V extends undefined ? {} : { validations: V });

type MetafieldType =
  | BaseMetafield<'boolean'>
  | BaseMetafield<'color'>
  | BaseMetafield<'link'>
  | BaseMetafield<'money'>
  | Omit<BaseMetafield<'rich_text_field'>, 'array'> // explicitly no array
  | BaseMetafield<'date', { min?: string; max?: string }>
  | BaseMetafield<'date_time', { min?: string; max?: string }>
  | BaseMetafield<'dimension', { min?: number; max?: number; unit: 'in' | 'ft' | 'yd' | 'mm' | 'cm' | 'm' }>
  | BaseMetafield<'id', { minLength?: number; maxLength?: number; regex?: string }>
  | BaseMetafield<'json', { schema: object }>
  | BaseMetafield<'multi_line_text_field', { minLength?: number; maxLength?: number }>
  | BaseMetafield<'number_decimal', { min?: number; max?: number; maxPrecision?: number }>
  | BaseMetafield<'number_integer', { min?: number; max?: number }>
  | BaseMetafield<'rating', { min: number; max: number }>
  | BaseMetafield<'single_line_text_field', { minLength?: number; maxLength?: number; regex?: string; choices?: string[] }> & {
      useAsDisplayName?: boolean;
    }
  | BaseMetafield<'url', { allowedDomains: string[] }>
  | BaseMetafield<'volume', { min?: number; max?: number; unit: 'ml' | 'cl' | 'l' | 'm3' | 'us_fl_oz' | 'us_pt' | 'us_qt' | 'us_gal' | 'imp_fl_oz' | 'imp_pt' | 'imp_qt' | 'imp_gal' }>
  | BaseMetafield<'weight', { min?: number; max?: number; unit: 'oz' | 'lb' | 'g' | 'kg' }>
  | BaseMetafield<'file_reference', { fileTypeOptions: FileMediaType | FileMediaType[] }>;

type DecoratorFieldOptions = {
  key?: string;
  name?: string;
  type?: MetafieldType;
  description?: string;
  required?: boolean;
  entity?: { new (...args: any[]): any };
  validations?: Omit<MetafieldDefinitionValidation, 'type'>[];
}

function camelToSnake(value: string): string {
  return value.replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase();
}

function capitalizeField(value: string): string {
  return value
    .replace(/([A-Z])/g, ' $1')  // Add space before uppercase letters
    .replace(/^./, match => match.toUpperCase()) // Capitalize the first letter
    .trim();
}

export function Field(options: DecoratorFieldOptions = {}) {
  const mapping: Record<string, ReferenceTypename> = {
    'collection_reference': 'Collection',
    'customer_reference': 'Customer',
    'metaobject_reference': 'Metaobject',
    'file_reference': options.validations?.find(validation => validation.type === 'file_type_options' && validation.value?.includes('Image')) ? 'MediaImage' : 'GenericFile',
    'page_reference': 'Page',
    'product_reference': 'Product',
    'variant_reference': 'ProductVariant',
    'product_taxonomy_value_reference': 'TaxonomyValue'
  };

  return (target: undefined, context: ClassFieldDecoratorContext) => {
    if (context.kind !== 'field') {
      throw new Error('@Field() can only be used as a field decorator');
    }
    
    const classMetadata = classMetadataFactory.upsertMetadataFor(context.metadata);

    setTimeout(() => {
      // Fields depend on the class metadata. However, due to the order on which things are initialized with decorators,
      // we have to use a setTimeout to ensure that the class metadata is already initialized.
      if (classMetadata.kind === 'metaobject') {
        let refersToEmbeddable = false;

        if (options.entity) {
          const referenceEntityMetadata = classMetadataFactory.getMetadataFor(options.entity);

          if (referenceEntityMetadata?.kind === 'embeddable') {
            refersToEmbeddable = true;
          }
        }

        if (!refersToEmbeddable && undefined === options.type) {
          throw new Error(`Type is missing for ${context.name as string} field.`);
        }
  
        const metaobjectClassMetadata = classMetadata as MetaobjectClassMetadata;
        metaobjectClassMetadata.fieldDefinitions ??= [];

        let fieldType = refersToEmbeddable ? 'json' : options.type!;
  
        metaobjectClassMetadata.fieldDefinitions.push({
          propertyName: context.name as string,
          name: options.name ?? capitalizeField(context.name as string),
          key: options.key ?? camelToSnake(context.name as string),
          type: fieldType,
          description: options.description ?? '',
          list: fieldType.startsWith('list.'),
          reference: fieldType.includes('_reference'),
          referenceTypename: mapping[fieldType.replace('list.', '')],
          required: options.required ?? false,
          entity: options.entity,
          validations: options.validations ?? []
        });
      } else {
        const embeddableClassMetadata = classMetadata as EmbeddableClassMetadata;
        embeddableClassMetadata.fieldDefinitions ??= [];
  
        embeddableClassMetadata.fieldDefinitions.push({
          propertyName: context.name as string,
          key: options.key ?? camelToSnake(context.name as string)
        });
      }
    }, 0);
  }
}