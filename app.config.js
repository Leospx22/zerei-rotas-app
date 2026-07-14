const appJson = require('./app.json');

const MISSING_MAPS_KEY_ERROR = 'GOOGLE_MAPS_API_KEY is required for Android native map builds.';

function cloneExpoConfig() {
  return JSON.parse(JSON.stringify(appJson.expo));
}

function nativeMapsKeyIsRequired(env = process.env) {
  return (
    env.ZR_REQUIRE_GOOGLE_MAPS_API_KEY === 'true' ||
    env.EAS_BUILD_PLATFORM === 'android' ||
    env.EAS_BUILD_PROFILE === 'preview' ||
    env.EXPO_PUBLIC_ENABLE_NATIVE_ROUTE_MAP === 'true'
  );
}

function withoutGoogleMapsApiKey(expoConfig) {
  const android = { ...(expoConfig.android ?? {}) };
  const androidConfig = { ...(android.config ?? {}) };
  const { googleMaps: _googleMaps, ...remainingAndroidConfig } = androidConfig;

  return {
    ...expoConfig,
    android: {
      ...android,
      config: remainingAndroidConfig,
    },
  };
}

function withAndroidGoogleMapsApiKey(expoConfig, env = process.env) {
  const apiKey = env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    if (nativeMapsKeyIsRequired(env)) {
      throw new Error(MISSING_MAPS_KEY_ERROR);
    }
    return withoutGoogleMapsApiKey(expoConfig);
  }

  return {
    ...expoConfig,
    android: {
      ...(expoConfig.android ?? {}),
      config: {
        ...(expoConfig.android?.config ?? {}),
        googleMaps: {
          ...(expoConfig.android?.config?.googleMaps ?? {}),
          apiKey,
        },
      },
    },
  };
}

function createExpoConfig({ config } = {}) {
  const baseConfig = cloneExpoConfig();
  return withAndroidGoogleMapsApiKey({
    ...baseConfig,
    ...config,
    extra: {
      ...baseConfig.extra,
      ...(config?.extra ?? {}),
      eas: {
        ...baseConfig.extra?.eas,
        ...(config?.extra?.eas ?? {}),
      },
    },
  });
}

module.exports = createExpoConfig;
module.exports.MISSING_MAPS_KEY_ERROR = MISSING_MAPS_KEY_ERROR;
module.exports.cloneExpoConfig = cloneExpoConfig;
module.exports.nativeMapsKeyIsRequired = nativeMapsKeyIsRequired;
module.exports.withAndroidGoogleMapsApiKey = withAndroidGoogleMapsApiKey;
