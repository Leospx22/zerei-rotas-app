import { normalizeAddress } from './executionPresentation.ts';

const GOOGLE_MAPS_SEARCH_URL = 'https://www.google.com/maps/search/?api=1&query=';
const WAZE_NAVIGATION_URL = 'https://waze.com/ul?navigate=yes&q=';

export type NavigationAppPreference = 'googleMaps' | 'waze';

export function buildGoogleMapsSearchUrl(
  address: string,
  app: NavigationAppPreference = 'googleMaps'
): string {
  const navigationAddress = normalizeAddress(address).displayAddress;
  if (app === 'waze') {
    return `${WAZE_NAVIGATION_URL}${encodeURIComponent(navigationAddress)}`;
  }
  return `${GOOGLE_MAPS_SEARCH_URL}${encodeURIComponent(navigationAddress)}`;
}
