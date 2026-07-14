# Android Field Test Build

This guide explains how to create an installable Android build of Zerei Rotas for real route testing without Expo Go.

## Why Not Expo Go

Expo Go is great for development, but it is fragile for street testing:

- It depends on the development server or QR-code session being reachable.
- A phone can lose network, background the app, or close the dev session during a route.
- Native runtime behavior can differ from a real installed build.
- A driver needs to reopen the app from the Android launcher, not from a QR code.

For real Shopee route tests, use an internal Android APK build.

## Current App Identity

The Android package is already configured in `app.json`:

```text
expo.name: Zerei Rotas
expo.slug: zerei-rotas
android.package: com.zereirotas.app
android.versionCode: 1
```

Do not change the package name casually. Android treats a different package name as a different app.

## Build Profile

The project uses `eas.json` with a `preview` profile:

```json
{
  "build": {
    "preview": {
      "distribution": "internal",
      "env": {
        "EXPO_PUBLIC_ENABLE_NATIVE_ROUTE_MAP": "true"
      },
      "android": {
        "buildType": "apk"
      }
    }
  }
}
```

This creates an APK suitable for internal field testing. It does not publish to Google Play.

## Native Overview Map Flag

The Android overview map is controlled by a public beta flag:

```text
EXPO_PUBLIC_ENABLE_NATIVE_ROUTE_MAP=true
```

The `preview` EAS build profile enables it explicitly so closed-beta APKs can test the native map. If the flag is missing or false, Zerei Rotas keeps the safe ordered-list fallback and does not mount the native Android map.

If the EAS environment is managed outside `eas.json`, configure the same public variable manually:

```bash
eas env:create --environment preview --name EXPO_PUBLIC_ENABLE_NATIVE_ROUTE_MAP --value "true" --visibility plain
```

This is not a secret. Do not use this mechanism for private keys.

## Google Maps API Key

Standalone Android builds also require the native Google Maps SDK key:

```text
GOOGLE_MAPS_API_KEY
```

This value must be supplied through EAS environments and must never be committed to `app.json`, `app.config.js`, `eas.json`, source code, tests, or documentation.

For the closed-beta preview build, the Google Cloud key restriction must match:

- Android package: `com.zereirotas.app`
- The EAS preview signing certificate SHA-1 used for the APK.

After changing native Maps configuration or key restrictions, create a new APK. An already-installed APK will not pick up native manifest/configuration changes.

## Prerequisites

1. Install or access the EAS CLI.
2. Log in to the correct Expo account.
3. Confirm `.env.local` exists locally with the public Supabase values if the test requires account/profile features.
4. Make sure the working tree is clean before building.

Useful commands:

```bash
npx eas-cli login
git status
npm run typecheck
npm test
```

## Create the Android APK

Preferred project script:

```bash
npm run build:android:preview
```

Equivalent direct command:

```bash
eas build --platform android --profile preview
```

Do not run a production build for field testing unless that is explicitly approved.

## Install on a Phone

After EAS finishes, it provides an install link or QR code.

On the Android test phone:

1. Open the EAS install link.
2. Download the APK.
3. If Android asks, allow installation from that browser/source.
4. Install the APK.
5. Open **Zerei Rotas** from the Android app launcher.

If the phone blocks installation, check:

- Android Settings > Security / Privacy > Install unknown apps.
- The browser or file manager used for the download has permission to install apps.

## Share With Test Drivers

Share the EAS internal install link with the driver by WhatsApp.

Include:

- The install link.
- A reminder that this is a test build.
- The route-test checklist or instructions for what to validate.

Do not share private Expo credentials. Drivers only need the install link.

## Field Test Checklist

Before the route:

- Install the APK.
- Open the app from the Android launcher.
- Log in if account testing is required.
- Import or prepare the route.
- Confirm the route remains available after closing and reopening the app.

During the route:

- Confirm package preview and execution open without Expo Go.
- Confirm tabs and route screens are usable.
- Confirm occurrences can be registered.
- Confirm the app can be closed and reopened from the launcher.
- Confirm an active route restores after force-close, phone restart, and temporary loss of internet.
- Confirm delivered packages, occurrence edits/resolutions/deletions, manual stop order, and `#P` stops remain intact after reopening.

After the route:

- Confirm history/occurrences are still visible.
- Capture screenshots of any incorrect behavior.

## Do Not Publish Yet

This setup is for internal field testing only.

Do not:

- Publish to Google Play.
- Create a production release.
- Change payment/paywall behavior.
- Change Supabase schema.
- Share service-role keys or secrets.

Google Play distribution should be handled in a later release sprint after field testing is stable.

## Troubleshooting

### `eas` command not found

Use:

```bash
npx eas-cli build --platform android --profile preview
```

or install EAS CLI globally if that is the team preference.

### Build asks for credentials

Follow the EAS prompt for Android credentials. For internal APK testing, EAS can manage credentials safely.

### Environment variables are missing

Local route features still work, but Supabase account/profile behavior may show configuration warnings. Confirm `.env.local` for local testing and Expo/EAS environment configuration for cloud builds.

For native Android map testing, confirm the EAS preview environment has `GOOGLE_MAPS_API_KEY` configured as a secret/sensitive variable and `EXPO_PUBLIC_ENABLE_NATIVE_ROUTE_MAP=true` enabled for the preview profile.

### APK installs but opens old behavior

Confirm the build was created from the expected Git commit and branch. Rebuild after committing the latest changes.

### Native map still crashes or falls back

The map screen should keep the ordered route list usable even if native map rendering fails. If the APK still crashes when opening **Mostrar no mapa**, capture Android logs for the next diagnostic pass:

```bash
adb logcat | findstr /i "Zerei ReactNativeJS AndroidRuntime react-native-maps"
```

Share the log excerpt around the crash. Do not include private route/package data in screenshots or logs.
