import test from 'node:test';
import assert from 'node:assert/strict';
import {
  deriveRouteDisplayStatus,
  routeDisplayStatusLabel,
} from '../lib/routePresentation.ts';

test('shows a current route without deliveries as planned', () => {
  assert.equal(deriveRouteDisplayStatus(true, 0), 'planning');
  assert.equal(routeDisplayStatusLabel('planning'), 'Planejada');
});

test('shows a current route with delivered packages as in route', () => {
  assert.equal(deriveRouteDisplayStatus(true, 1), 'active');
  assert.equal(routeDisplayStatusLabel('active'), 'Em rota');
});

test('shows history entries as completed', () => {
  assert.equal(deriveRouteDisplayStatus(false, 0), 'completed');
  assert.equal(routeDisplayStatusLabel('completed'), 'Concluída');
});
