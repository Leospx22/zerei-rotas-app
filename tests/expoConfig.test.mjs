import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import test from 'node:test';

const root = fileURLToPath(new URL('..', import.meta.url));
const require = createRequire(import.meta.url);
const appConfig = require('../app.config.js');

function read(path) {
  return readFileSync(join(root, path), 'utf8');
}

function listRepoFiles(dir = '.', output = []) {
  const base = join(root, dir);
  for (const entry of readdirSync(base)) {
    if (entry === '.git' || entry === 'node_modules' || entry === 'dist') continue;
    const relative = dir === '.' ? entry : join(dir, entry);
    const full = join(root, relative);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      listRepoFiles(relative, output);
    } else {
      output.push(relative);
    }
  }
  return output;
}

test('dynamic Expo config preserves application metadata', () => {
  const config = appConfig({ config: {} });

  assert.equal(config.name, 'Zerei Rotas');
  assert.equal(config.slug, 'zerei-rotas');
  assert.equal(config.version, '1.0.0');
  assert.equal(config.android.package, 'com.zereirotas.app');
  assert.equal(config.extra.eas.projectId, 'd1794a60-25c0-41fa-9de9-787536d806bf');
  assert.equal(config.web.description, 'Organize, otimize e conclua suas rotas de entrega mais rápido');
});

test('dynamic Expo config injects Android Google Maps key from environment', () => {
  const config = appConfig.withAndroidGoogleMapsApiKey(appConfig.cloneExpoConfig(), {
    GOOGLE_MAPS_API_KEY: 'AIza-test-masked',
  });

  assert.equal(config.android.config.googleMaps.apiKey, 'AIza-test-masked');
  assert.ok(config.plugins.includes('expo-router'));
  assert.ok(config.plugins.includes('expo-font'));
  assert.ok(config.plugins.includes('expo-web-browser'));
});

test('dynamic Expo config updates an existing Android Google Maps key without changing plugins', () => {
  const base = appConfig.cloneExpoConfig();
  base.android.config = { googleMaps: { apiKey: 'old-key' } };
  const originalPlugins = [...base.plugins];
  const config = appConfig.withAndroidGoogleMapsApiKey(base, {
    GOOGLE_MAPS_API_KEY: 'AIza-test-masked',
  });

  assert.deepEqual(config.plugins, originalPlugins);
  assert.equal(config.android.config.googleMaps.apiKey, 'AIza-test-masked');
});

test('missing Google Maps key throws clearly when a native map build requires it', () => {
  assert.throws(
    () => appConfig.withAndroidGoogleMapsApiKey(appConfig.cloneExpoConfig(), {
      EXPO_PUBLIC_ENABLE_NATIVE_ROUTE_MAP: 'true',
    }),
    new RegExp(appConfig.MISSING_MAPS_KEY_ERROR)
  );
  assert.throws(
    () => appConfig.withAndroidGoogleMapsApiKey(appConfig.cloneExpoConfig(), {
      EAS_BUILD_PLATFORM: 'android',
    }),
    new RegExp(appConfig.MISSING_MAPS_KEY_ERROR)
  );
});

test('missing Google Maps key keeps web/local config safe when native map is not required', () => {
  const config = appConfig.withAndroidGoogleMapsApiKey(appConfig.cloneExpoConfig(), {});

  assert.equal(config.android.config?.googleMaps, undefined);
  assert.ok(config.plugins.includes('expo-router'));
});

test('preview EAS profile enables native map flag without hardcoding Google key', () => {
  const eas = JSON.parse(read('eas.json'));

  assert.equal(eas.build.preview.environment, 'preview');
  assert.equal(eas.build.preview.env.EXPO_PUBLIC_ENABLE_NATIVE_ROUTE_MAP, 'true');
  assert.equal(JSON.stringify(eas), JSON.stringify(eas).replace(/GOOGLE_MAPS_API_KEY/g, ''));
});

test('repository does not hardcode a Google Maps API key', () => {
  for (const file of listRepoFiles()) {
    if (/\.(png|jpg|jpeg|ico|hbc|xlsx|xls)$/i.test(file)) continue;
    const source = read(file);
    assert.doesNotMatch(source, /AIza[0-9A-Za-z_-]{20,}/, `${file} appears to contain a Google API key`);
  }
});
