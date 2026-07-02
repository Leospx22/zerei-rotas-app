import { normalizeAddress } from './executionPresentation.ts';

const GOOGLE_MAPS_SEARCH_URL = 'https://www.google.com/maps/search/?api=1&query=';

export function buildGoogleMapsSearchUrl(address: string): string {
  const navigationAddress = normalizeAddress(address).displayAddress;
  return `${GOOGLE_MAPS_SEARCH_URL}${encodeURIComponent(navigationAddress)}`;
}
