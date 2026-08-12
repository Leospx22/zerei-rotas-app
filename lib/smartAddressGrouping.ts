import type { PackageItem, RawPackage } from './packageUtils.ts';

export interface NormalizedSmartAddress {
  streetType: string;
  street: string;
  number: string;
  complement: string;
  normalizedStreet: string;
  normalizedStreetKey: string;
  addressKey: string;
  displayAddress: string;
  blockKey: string;
  blockName: string;
  unitKey: string;
  unitLabel: string;
  isCondominiumSignal: boolean;
}

export interface SmartUnitGroup {
  key: string;
  label: string;
  packageIds: string[];
  packageCount: number;
  deliveryCount: number;
}

export interface SmartBlockGroup {
  key: string;
  name: string;
  packageIds: string[];
  packageCount: number;
  deliveryCount: number;
  units: SmartUnitGroup[];
}

export interface SmartAddressGroup {
  key: string;
  displayAddress: string;
  packageIds: string[];
  packageCount: number;
  deliveryCount: number;
  blockCount: number;
  isCondominium: boolean;
  blocks: SmartBlockGroup[];
}

interface MutableSmartUnitGroup {
  label: string;
  packages: PackageItem[];
}

interface MutableSmartBlockGroup {
  name: string;
  packages: PackageItem[];
  units: Map<string, MutableSmartUnitGroup>;
}

interface MutableSmartAddressGroup {
  normalized: NormalizedSmartAddress;
  packages: PackageItem[];
  blocks: Map<string, MutableSmartBlockGroup>;
}

const STREET_DICTIONARY: Readonly<Record<string, string>> = {
  r: 'Rua',
  rua: 'Rua',
  av: 'Avenida',
  avenida: 'Avenida',
  trav: 'Travessa',
  tr: 'Travessa',
  travessa: 'Travessa',
  est: 'Estrada',
  estrada: 'Estrada',
  al: 'Alameda',
  alameda: 'Alameda',
  praca: 'Praça',
  pc: 'Praça',
  rod: 'Rodovia',
  rodovia: 'Rodovia',
  blvd: 'Boulevard',
  boulevard: 'Boulevard',
  cel: 'Coronel',
  coronel: 'Coronel',
  dr: 'Doutor',
  doutor: 'Doutor',
  prof: 'Professor',
  professor: 'Professor',
};

const LOWERCASE_STREET_WORDS = new Set(['da', 'das', 'de', 'do', 'dos', 'e']);
const WITHOUT_BLOCK_KEY = '__sem_bloco__';
export const WITHOUT_BLOCK_LABEL = 'Sem bloco';
const WITHOUT_UNIT_KEY = '__sem_unidade__';
export const WITHOUT_UNIT_LABEL = 'Endereço principal';

function comparisonText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/[^\p{L}\p{N}\s/-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanAddressText(address: string): string {
  return address
    .replace(/\./g, '')
    .replace(/[;|]/g, ',')
    .replace(/,+/g, ',')
    .replace(/\s*,\s*/g, ', ')
    .replace(/\s*-\s*/g, ' - ')
    .replace(/\s+/g, ' ')
    .replace(/^[,\s]+|[,\s]+$/g, '')
    .trim();
}

function normalizeStreetToken(token: string, index: number): string {
  const key = comparisonText(token);
  const dictionaryValue = STREET_DICTIONARY[key];
  if (dictionaryValue) return dictionaryValue;

  const lower = token.toLocaleLowerCase('pt-BR');
  if (index > 0 && LOWERCASE_STREET_WORDS.has(comparisonText(lower))) return lower;
  return lower.charAt(0).toLocaleUpperCase('pt-BR') + lower.slice(1);
}

function parseStreetAndNumber(cleaned: string) {
  const parts = cleaned.match(
    /^(.*?)(?:,\s*|\s+)(\d+[a-zA-Z]?(?:-\d+[a-zA-Z]?)?|s\/?n)(?:\s*(?:,|-)\s*(.*))?$/i
  );
  const rawStreet = (parts?.[1] ?? cleaned).trim();
  const number = (parts?.[2] ?? '').toLocaleUpperCase('pt-BR');
  const complement = (parts?.[3] ?? '').trim();
  const streetTokens = rawStreet
    .split(/\s+/)
    .filter(Boolean)
    .map(normalizeStreetToken);
  const streetType = ['Rua', 'Avenida', 'Travessa', 'Estrada', 'Alameda', 'Praça', 'Rodovia', 'Boulevard']
    .includes(streetTokens[0] ?? '')
    ? streetTokens[0]
    : '';
  const street = (streetType ? streetTokens.slice(1) : streetTokens).join(' ');
  const normalizedStreet = streetType
    ? `${streetType} ${street}`.trim()
    : street;

  return { streetType, street, normalizedStreet, number, complement };
}

function titleFragment(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((token, index) => {
      const key = comparisonText(token);
      if (index > 0 && LOWERCASE_STREET_WORDS.has(key)) return key;
      return token.charAt(0).toLocaleUpperCase('pt-BR') + token.slice(1).toLocaleLowerCase('pt-BR');
    })
    .join(' ');
}

function detectBlock(complement: string): { key: string; name: string; signal: boolean } {
  const normalized = comparisonText(complement);
  const match = normalized.match(
    /\b(bloco|bl|torre|edificio|predio|building|tower)\s+([a-z0-9][a-z0-9/-]*)\b/i
  );
  if (!match) {
    return { key: WITHOUT_BLOCK_KEY, name: WITHOUT_BLOCK_LABEL, signal: false };
  }

  const type = match[1];
  const value = match[2].toLocaleUpperCase('pt-BR');
  const displayType = ['torre', 'tower'].includes(type) ? 'Torre' : 'Bloco';
  return {
    key: `${comparisonText(displayType)}:${comparisonText(value)}`,
    name: `${displayType} ${value}`,
    signal: true,
  };
}

function removeBlockText(complement: string): string {
  return complement
    .replace(/\b(bloco|bl|torre|edificio|predio|building|tower)\s+[a-z0-9][a-z0-9/-]*\b/ig, '')
    .replace(/^[,\s/-]+|[,\s/-]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function detectUnit(complement: string): { key: string; label: string; signal: boolean } {
  const withoutBlock = removeBlockText(complement);
  const normalized = comparisonText(withoutBlock);
  if (!normalized) {
    return { key: WITHOUT_UNIT_KEY, label: WITHOUT_UNIT_LABEL, signal: false };
  }

  const typedMatch = normalized.match(
    /\b(apartamento|apto|apt|ap|sala|sl|conjunto|cj|loja|casa|empresa|recepcao|portaria)\s*([a-z0-9][a-z0-9/-]*)?\b/i
  );
  if (typedMatch) {
    const rawType = typedMatch[1];
    const rawValue = typedMatch[2] ?? '';
    const typeMap: Record<string, string> = {
      apartamento: 'Apto',
      apto: 'Apto',
      apt: 'Apto',
      ap: 'Apto',
      sala: 'Sala',
      sl: 'Sala',
      conjunto: 'Conjunto',
      cj: 'Conjunto',
      loja: 'Loja',
      casa: 'Casa',
      empresa: 'Empresa',
      recepcao: 'Recepcao',
      portaria: 'Portaria',
    };
    const label = `${typeMap[rawType] ?? titleFragment(rawType)} ${rawValue.toLocaleUpperCase('pt-BR')}`.trim();
    return { key: comparisonText(label), label, signal: true };
  }

  const label = titleFragment(withoutBlock);
  return { key: comparisonText(label), label, signal: true };
}

export function normalizeSmartAddress(address: string): NormalizedSmartAddress {
  const cleaned = cleanAddressText(address);
  const parsed = parseStreetAndNumber(cleaned);
  const normalizedStreetKey = comparisonText(parsed.normalizedStreet);
  const addressKey = parsed.number
    ? `${normalizedStreetKey}|${comparisonText(parsed.number)}`
    : `${normalizedStreetKey}|${comparisonText(parsed.complement)}`;
  const displayAddress = parsed.number
    ? `${parsed.normalizedStreet}, ${parsed.number}`
    : parsed.normalizedStreet;
  const block = detectBlock(parsed.complement);
  const unit = detectUnit(parsed.complement);

  return {
    streetType: parsed.streetType,
    street: parsed.street,
    number: parsed.number,
    complement: parsed.complement,
    normalizedStreet: parsed.normalizedStreet,
    normalizedStreetKey,
    addressKey,
    displayAddress,
    blockKey: block.key,
    blockName: block.name,
    unitKey: unit.key,
    unitLabel: unit.label,
    isCondominiumSignal: block.signal || unit.signal,
  };
}

function statusDeliveryCount(packages: readonly PackageItem[]): number {
  return packages.length;
}

export function buildSmartAddressGroups(
  packages: readonly PackageItem[]
): SmartAddressGroup[] {
  const addressMap = new Map<string, MutableSmartAddressGroup>();

  packages.forEach(pkg => {
    const normalized = normalizeSmartAddress(pkg.destinationAddress);
    const addressEntry: MutableSmartAddressGroup = addressMap.get(normalized.addressKey) ?? {
      normalized,
      packages: [],
      blocks: new Map(),
    };
    addressEntry.packages.push(pkg);

    const blockEntry: MutableSmartBlockGroup = addressEntry.blocks.get(normalized.blockKey) ?? {
      name: normalized.blockName,
      packages: [],
      units: new Map(),
    };
    blockEntry.packages.push(pkg);

    const unitEntry: MutableSmartUnitGroup = blockEntry.units.get(normalized.unitKey) ?? {
      label: normalized.unitLabel,
      packages: [],
    };
    unitEntry.packages.push(pkg);
    blockEntry.units.set(normalized.unitKey, unitEntry);
    addressEntry.blocks.set(normalized.blockKey, blockEntry);
    addressMap.set(normalized.addressKey, addressEntry);
  });

  return [...addressMap.entries()].map(([addressKey, addressEntry]) => {
    const blocks = [...addressEntry.blocks.entries()].map(([blockKey, blockEntry]) => {
      const units = [...blockEntry.units.entries()].map(([unitKey, unitEntry]) => ({
        key: unitKey,
        label: unitEntry.label,
        packageIds: unitEntry.packages.map(pkg => pkg.id),
        packageCount: unitEntry.packages.length,
        deliveryCount: statusDeliveryCount(unitEntry.packages),
      }));

      return {
        key: blockKey,
        name: blockEntry.name,
        packageIds: blockEntry.packages.map(pkg => pkg.id),
        packageCount: blockEntry.packages.length,
        deliveryCount: statusDeliveryCount(blockEntry.packages),
        units,
      };
    });
    const visibleBlockCount = blocks.filter(block => block.key !== WITHOUT_BLOCK_KEY).length;
    const unitCount = blocks.reduce((sum, block) => sum + block.units.length, 0);

    return {
      key: addressKey,
      displayAddress: addressEntry.normalized.displayAddress,
      packageIds: addressEntry.packages.map(pkg => pkg.id),
      packageCount: addressEntry.packages.length,
      deliveryCount: statusDeliveryCount(addressEntry.packages),
      blockCount: visibleBlockCount,
      isCondominium: visibleBlockCount > 0 || unitCount > 1 || addressEntry.packages.some(pkg =>
        normalizeSmartAddress(pkg.destinationAddress).isCondominiumSignal
      ),
      blocks,
    };
  });
}

export function smartAddressKeyForPackage(pkg: Pick<RawPackage | PackageItem, 'destinationAddress'>): string {
  return normalizeSmartAddress(pkg.destinationAddress).addressKey;
}
