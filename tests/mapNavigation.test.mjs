import test from 'node:test';
import assert from 'node:assert/strict';
import { buildGoogleMapsSearchUrl } from '../lib/mapNavigation.ts';

test('builds a Google Maps search URL from street and number', () => {
  assert.equal(
    buildGoogleMapsSearchUrl('Rua Coronel Trancoso, 20'),
    'https://www.google.com/maps/search/?api=1&query=Rua%20Coronel%20Trancoso%2C%2020'
  );
});

test('removes delivery complements from the map query', () => {
  const url = buildGoogleMapsSearchUrl(
    'Rua Coronel Trancoso, 20, APTO 31, ANDAR 2, INTERFONE 4'
  );

  assert.equal(decodeURIComponent(url.split('query=')[1]), 'Rua Coronel Trancoso, 20');
  assert.equal(url.includes('APTO'), false);
  assert.equal(url.includes('ANDAR'), false);
  assert.equal(url.includes('INTERFONE'), false);
});
