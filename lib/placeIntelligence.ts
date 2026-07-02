import AsyncStorage from '@react-native-async-storage/async-storage';
import { normalizeAddress } from './executionPresentation.ts';

export type DeliveryType = 'portaria' | 'condominio' | 'comercio' | 'endereco';

export interface PlaceInfo {
  normalizedAddress: string;
  deliveryType: DeliveryType;
  parkingNote?: string;
  accessNote?: string;
  deliveryNote?: string;
  localTip?: string;
  updatedAt: string;
}

export interface PlaceIntelligenceStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

type PlaceInfoCollection = Record<string, PlaceInfo>;

export const KEY_PLACE_INTELLIGENCE = 'ZR_PLACE_INTELLIGENCE';

function storageKeyForAddress(address: string): string {
  return normalizeAddress(address).groupKey;
}

async function readCollection(
  storage: PlaceIntelligenceStorage
): Promise<PlaceInfoCollection> {
  try {
    const raw = await storage.getItem(KEY_PLACE_INTELLIGENCE);
    return raw ? (JSON.parse(raw) as PlaceInfoCollection) : {};
  } catch {
    return {};
  }
}

async function writeCollection(
  storage: PlaceIntelligenceStorage,
  collection: PlaceInfoCollection
): Promise<void> {
  await storage.setItem(KEY_PLACE_INTELLIGENCE, JSON.stringify(collection));
}

export async function loadPlaceInfo(
  normalizedAddress: string,
  storage: PlaceIntelligenceStorage = AsyncStorage
): Promise<PlaceInfo | null> {
  const collection = await readCollection(storage);
  return collection[storageKeyForAddress(normalizedAddress)] ?? null;
}

export async function savePlaceInfo(
  place: PlaceInfo,
  storage: PlaceIntelligenceStorage = AsyncStorage
): Promise<void> {
  const normalized = normalizeAddress(place.normalizedAddress);
  if (!normalized.normalizedStreet) {
    throw new Error('Endereço inválido para Place Intelligence.');
  }

  const collection = await readCollection(storage);
  collection[normalized.groupKey] = {
    ...place,
    normalizedAddress: normalized.displayAddress,
  };
  await writeCollection(storage, collection);
}

export async function deletePlaceInfo(
  normalizedAddress: string,
  storage: PlaceIntelligenceStorage = AsyncStorage
): Promise<void> {
  const collection = await readCollection(storage);
  delete collection[storageKeyForAddress(normalizedAddress)];
  await writeCollection(storage, collection);
}
