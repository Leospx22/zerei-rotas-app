import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import test from 'node:test';

const root = fileURLToPath(new URL('..', import.meta.url));

function read(path) {
  return readFileSync(join(root, path), 'utf8');
}

function listFiles(dir, suffix = '.tsx') {
  const base = join(root, dir);
  const output = [];
  for (const entry of readdirSync(base)) {
    const full = join(base, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      output.push(...listFiles(join(dir, entry), suffix));
    } else if (entry.endsWith(suffix)) {
      output.push(join(dir, entry));
    }
  }
  return output;
}

test('minimalist header brand icon is decorative and not a pressable overlay', () => {
  const source = read('components/HeaderBrandIcon.tsx');
  assert.match(source, /Crown/);
  assert.match(source, /pointerEvents="none"/);
  assert.doesNotMatch(source, /Pressable|TouchableOpacity|TouchableWithoutFeedback/);
  assert.doesNotMatch(source, /absoluteFill|position:\s*['"]absolute|zIndex|elevation/);
});

test('detailed official BrandIcon is non-blocking when rendered', () => {
  const source = read('components/BrandIcon.tsx');
  assert.match(source, /adaptive-icon\.png/);
  assert.match(source, /pointerEvents="none"/);
  assert.doesNotMatch(source, /Pressable|TouchableOpacity|TouchableWithoutFeedback/);
  assert.doesNotMatch(source, /absoluteFill|position:\s*['"]absolute|zIndex|elevation/);
});

test('small internal headers use the minimalist crown, not the detailed launcher icon', () => {
  const appSources = listFiles('app').map(file => [file, read(file)]);
  for (const [file, source] of appSources) {
    assert.doesNotMatch(source, /@\/components\/BrandIcon/, `${file} should not import the detailed icon`);
    assert.doesNotMatch(source, /<BrandIcon\b/, `${file} should not render the detailed icon`);
  }

  const headerIconUsages = appSources.filter(([, source]) => source.includes('HeaderBrandIcon'));
  assert.ok(headerIconUsages.length >= 10, 'Expected shared minimalist header icon usage across app screens');
});

test('dashboard actions and bottom tabs remain structurally registered', () => {
  const dashboard = read('app/(tabs)/index.tsx');
  assert.match(dashboard, /router\.push\('\/\(tabs\)\/routes\/import'\)/);
  assert.match(dashboard, /Importar Planilha/);
  assert.match(dashboard, /router\.push\('\/\(tabs\)\/routes\/delivery-preparation'\)/);
  assert.match(dashboard, /Revisar Rota/);

  const tabs = read('app/(tabs)/_layout.tsx');
  for (const routeName of ['index', 'routes', 'occurrences', 'history', 'profile']) {
    assert.match(tabs, new RegExp(`name="${routeName}"`));
  }
});

test('official launcher, splash, package, and EAS metadata remain unchanged', () => {
  const config = JSON.parse(read('app.json'));
  assert.equal(config.expo.icon, './assets/images/icon.png');
  assert.equal(config.expo.splash.image, './assets/images/splash-icon.png');
  assert.equal(config.expo.android.adaptiveIcon.foregroundImage, './assets/images/adaptive-icon.png');
  assert.equal(config.expo.web.favicon, './assets/images/favicon.png');
  assert.equal(config.expo.android.package, 'com.zereirotas.app');
  assert.equal(config.expo.extra.eas.projectId, 'd1794a60-25c0-41fa-9de9-787536d806bf');
});

test('preview Android build explicitly enables native route map testing', () => {
  const eas = JSON.parse(read('eas.json'));
  assert.equal(eas.build.preview.distribution, 'internal');
  assert.equal(eas.build.preview.android.buildType, 'apk');
  assert.equal(eas.build.preview.env.EXPO_PUBLIC_ENABLE_NATIVE_ROUTE_MAP, 'true');

  const envExample = read('.env.example');
  assert.match(envExample, /EXPO_PUBLIC_ENABLE_NATIVE_ROUTE_MAP=false/);
});

test('root fallback is only rendered by the error boundary path', () => {
  const source = read('app/_layout.tsx');
  assert.match(source, /hasError/);
  assert.match(source, /Tentar novamente/);
  assert.match(source, /this\.state\.hasError/);
  assert.doesNotMatch(source, /pointerEvents="auto"/);
});

test('active Prioridade UI keeps copy concise', () => {
  const activeScreens = [
    'app/(tabs)/routes/delivery-preparation.tsx',
    'app/(tabs)/routes/import-summary.tsx',
    'app/(tabs)/routes/route-organizer.tsx',
    'app/(tabs)/routes/map-overview.tsx',
  ];

  for (const file of activeScreens) {
    const source = read(file);
    assert.doesNotMatch(source, /Sem número de parada e sequência na planilha/, `${file} should not show verbose priority explanation`);
  }

  assert.match(read('app/(tabs)/routes/delivery-preparation.tsx'), /SHOPEE_PRIORITY_LABEL/);
});

test('map overview isolates native map rendering behind a fallback', () => {
  const source = read('app/(tabs)/routes/map-overview.tsx');
  assert.match(source, /MapVisualizationBoundary/);
  assert.match(source, /MapFallbackCard/);
  assert.match(source, /Não foi possível carregar o mapa agora/);
  assert.match(source, /Você ainda pode usar a lista da rota/);
  assert.match(source, /EXPO_PUBLIC_ENABLE_NATIVE_ROUTE_MAP/);
  assert.match(source, /O mapa está desativado nesta versão de teste/);
  assert.match(source, /RouteSequenceList/);
});

test('native map component stages risky Android rendering work', () => {
  const source = read('components/RouteMap.native.tsx');
  assert.doesNotMatch(source, /renderMarkers/);
  assert.doesNotMatch(source, /setRenderMarkers/);
  assert.match(source, /tracksMarkerChanges/);
  assert.match(source, /setTracksMarkerChanges\(true\)/);
  assert.match(source, /setTracksMarkerChanges\(false\)/);
  assert.match(source, /fitAttemptedRef/);
  assert.match(source, /safePayload\.polylineCoordinates\.length >= 2/);
  assert.match(source, /markerLabel/);
  assert.match(source, /collapsable=\{false\}/);
  assert.match(source, /pointerEvents="none"/);
  assert.match(source, /styles\.markerText/);
  assert.match(source, /title=\{stop\.badge\}/);
  assert.match(source, /tracksViewChanges=\{tracksMarkerChanges\}/);
  assert.match(source, /safePayload\.markers\.map/);
});

test('operational route screens avoid eager repeated work on large routes', () => {
  const importSummary = read('app/(tabs)/routes/import-summary.tsx');
  assert.match(importSummary, /FlatList/);
  assert.match(importSummary, /initialNumToRender=\{8\}/);
  assert.match(importSummary, /buildDuplicateAddressWarnings/);
  assert.doesNotMatch(importSummary, /getDuplicateAddressWarning/);
  assert.doesNotMatch(importSummary, /<ScrollView/);

  const routeExecution = read('app/(tabs)/routes/route-execution.tsx');
  assert.match(routeExecution, /buildDuplicateAddressWarnings/);
  assert.match(routeExecution, /updatePackagesStatus/);
  assert.doesNotMatch(routeExecution, /getDuplicateAddressWarning/);
  assert.doesNotMatch(routeExecution, /pendingPackageIds\.forEach/);
  assert.match(routeExecution, /optimisticCompletedAddressGroupKeys/);
  assert.match(routeExecution, /InteractionManager\.runAfterInteractions/);
  assert.match(routeExecution, /React\.startTransition/);

  const executionCard = read('components/ExecutionCard.tsx');
  assert.match(executionCard, /completedAddressGroupKeys/);
  assert.match(executionCard, /completedAddressGroupKeys\.has\(group\.key\)/);

  const context = read('contexts/RouteContext.tsx');
  assert.match(context, /persistQueueRef/);
  assert.match(context, /updatePackagesStatus/);
});

test('map overview user-facing text is valid Portuguese, not mojibake', () => {
  const files = [
    'app/(tabs)/routes/map-overview.tsx',
    'components/RouteMap.native.tsx',
    'components/RouteMap.tsx',
  ];

  for (const file of files) {
    const source = read(file);
    assert.doesNotMatch(source, new RegExp('[\\u00c3\\u00c2\\u00e2]'), `${file} contains corrupted visible text`);
  }

  const overview = read('app/(tabs)/routes/map-overview.tsx');
  assert.match(overview, /• \{currentRoute\.totalPackages\} pacotes/);
  assert.match(overview, /Cinza: concluída/);
  assert.match(overview, /coordenadas inválidas ou ausentes/);
});
