import { ObjectRepository } from "./persistence/object-repository";

export type Constructor<T = any> = new (...args: any[]) => T;

export enum CurrencyCode { 
  Aed = 'AED', Afn = 'AFN', All = 'ALL', Amd = 'AMD', Ang = 'ANG', Aoa = 'AOA', Ars = 'ARS', Aud = 'AUD', Awg = 'AWG', Azn = 'AZN', Bam = 'BAM', 
  Bbd = 'BBD', Bdt = 'BDT', Bgn = 'BGN', Bhd = 'BHD', Bif = 'BIF', Bmd = 'BMD', Bnd = 'BND', Bob = 'BOB', Brl = 'BRL', Bsd = 'BSD', Btn = 'BTN', 
  Bwp = 'BWP', Byn = 'BYN', Byr = 'BYR', Bzd = 'BZD', Cad = 'CAD', Cdf = 'CDF', Chf = 'CHF', Clp = 'CLP', Cny = 'CNY', Cop = 'COP', Crc = 'CRC', 
  Cve = 'CVE', Czk = 'CZK', Djf = 'DJF', Dkk = 'DKK', Dop = 'DOP', Dzd = 'DZD', Egp = 'EGP', Ern = 'ERN', Etb = 'ETB', Eur = 'EUR', Fjd = 'FJD', 
  Fkp = 'FKP', Gbp = 'GBP', Gel = 'GEL', Ghs = 'GHS', Gip = 'GIP', Gmd = 'GMD', Gnf = 'GNF', Gtq = 'GTQ', Gyd = 'GYD', Hkd = 'HKD', Hnl = 'HNL', 
  Hrk = 'HRK', Htg = 'HTG', Huf = 'HUF', Idr = 'IDR', Ils = 'ILS', Inr = 'INR', Iqd = 'IQD', Irr = 'IRR', Isk = 'ISK', Jep = 'JEP', Jmd = 'JMD', 
  Jod = 'JOD', Jpy = 'JPY', Kes = 'KES', Kgs = 'KGS', Khr = 'KHR', Kid = 'KID', Kmf = 'KMF', Krw = 'KRW', Kwd = 'KWD', Kyd = 'KYD', Kzt = 'KZT', 
  Lak = 'LAK', Lbp = 'LBP', Lkr = 'LKR', Lrd = 'LRD', Lsl = 'LSL', Ltl = 'LTL', Lvl = 'LVL', Lyd = 'LYD', Mad = 'MAD', Mdl = 'MDL', Mga = 'MGA', 
  Mkd = 'MKD', Mmk = 'MMK', Mnt = 'MNT', Mop = 'MOP', Mru = 'MRU', Mur = 'MUR', Mvr = 'MVR', Mwk = 'MWK', Mxn = 'MXN', Myr = 'MYR', Mzn = 'MZN', 
  Nad = 'NAD', Ngn = 'NGN', Nio = 'NIO', Nok = 'NOK', Npr = 'NPR', Nzd = 'NZD', Omr = 'OMR', Pab = 'PAB', Pen = 'PEN', Pgk = 'PGK', Php = 'PHP', 
  Pkr = 'PKR', Pln = 'PLN', Pyg = 'PYG', Qar = 'QAR', Ron = 'RON', Rsd = 'RSD', Rub = 'RUB', Rwf = 'RWF', Sar = 'SAR', Sbd = 'SBD', Scr = 'SCR', 
  Sdg = 'SDG', Sek = 'SEK', Sgd = 'SGD', Shp = 'SHP', Sll = 'SLL', Sos = 'SOS', Srd = 'SRD', Ssp = 'SSP', Std = 'STD', Stn = 'STN', Syp = 'SYP', 
  Szl = 'SZL', Thb = 'THB', Tjs = 'TJS', Tmt = 'TMT', Tnd = 'TND', Top = 'TOP', Try = 'TRY', Ttd = 'TTD', Twd = 'TWD', Tzs = 'TZS', Uah = 'UAH', 
  Ugx = 'UGX', Usd = 'USD', Uyu = 'UYU', Uzs = 'UZS', Ved = 'VED', Vef = 'VEF', Ves = 'VES', Vnd = 'VND', Vuv = 'VUV', Wst = 'WST', Xaf = 'XAF', 
  Xcd = 'XCD', Xof = 'XOF', Xpf = 'XPF', Xxx = 'XXX', Yer = 'YER', Zar = 'ZAR', Zmw = 'ZMW' 
}

export type Money = {
  amount: any;
  currencyCode: CurrencyCode;
};

export type FileMediaType = 'Image' | 'Video';

export type MetafieldDefinitionValidation = {
  name: string;
  type: string;
  value?: string;
}

export type MetaobjectCapabilities = {
  publishable?: {
    enabled: boolean
  };
  translatable?: {
    enabled: boolean
  };
  renderable?: {
    enabled: boolean;
    data?: {
      metaDescriptionKey?: string;
      metaTitleKey?: string;
    }
  };
  onlineStore?: {
    enabled: boolean;
    data?: {
      urlHandle: string;
      createRedirects?: boolean;
    }
  }
}

export type MetaobjectAccess = {
  admin?: 'MERCHANT_READ' | 'MERCHANT_READ_WRITE';
  storefront?: 'PUBLIC_READ' | 'NONE';
}

export type MetaobjectClassMetadata = {
  kind: 'metaobject';
  repositoryClass: Constructor<ObjectRepository<any>> | undefined;
  type: string;
  name: string;
  description: string;
  access: MetaobjectAccess;
  capabilities: MetaobjectCapabilities;
  fields: FieldDefinition[];
}

export type EmbeddableClassMetadata = {
  kind: 'embeddable';
  strict: boolean;
  schema?: object;
}

export type ClassMetadata = MetaobjectClassMetadata | EmbeddableClassMetadata;

export type FieldDefinition = BaseFieldDefinition | FieldEmbeddedDefinition | FieldMetaobjectReferenceDefinition;

export type BaseFieldDefinition = {
  propertyName: string;
  key: string;
  type: string;
  name: string;  
  description: string;
  list: boolean;
  required: boolean;
  isReference: boolean;
  validations?: object;
}

export type FieldEmbeddedDefinition = BaseFieldDefinition & {
  embedded: Constructor;
}

export type FieldMetaobjectReferenceDefinition = BaseFieldDefinition & {
  metaobject: Constructor;
}