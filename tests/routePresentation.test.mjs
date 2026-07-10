import test from 'node:test';
import assert from 'node:assert/strict';
import {
  deriveRouteDisplayStatus,
  routePrimaryActionLabel,
  routeDisplayStatusLabel,
} from '../lib/routePresentation.ts';

test('shows a current route without deliveries as planned', () => {
  assert.equal(deriveRouteDisplayStatus(true, 0, false), 'planning');
  assert.equal(routeDisplayStatusLabel('planning'), 'Planejada');
  assert.equal(routePrimaryActionLabel('planning'), 'Começar entrega');
});

test('shows a started current route without deliveries as in route', () => {
  const status = deriveRouteDisplayStatus(true, 0, true);

  assert.equal(status, 'active');
  assert.equal(routeDisplayStatusLabel(status), 'Em rota');
  assert.equal(routePrimaryActionLabel(status), 'Continuar entrega');
});

test('shows a current route with delivered packages as in route', () => {
  assert.equal(deriveRouteDisplayStatus(true, 1, false), 'active');
  assert.equal(routeDisplayStatusLabel('active'), 'Em rota');
});

test('shows history entries as completed', () => {
  assert.equal(deriveRouteDisplayStatus(false, 0, false), 'completed');
  assert.equal(routeDisplayStatusLabel('completed'), 'Concluída');
  assert.equal(routePrimaryActionLabel('completed'), null);
});
