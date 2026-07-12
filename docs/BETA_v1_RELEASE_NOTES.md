# Zerei Rotas Beta v1 Release Notes

These notes summarize the first closed-beta build intended for approximately 10 Shopee drivers.

## Release Goal

Validate whether Zerei Rotas can reliably support a real driver importing, reviewing, executing, recovering, and completing a Shopee route on Android.

## Completed Sprints

- Sprint 1.x: Import, route execution UX, package separation, address grouping, and fast stop completion.
- Sprint 2.x: Place Intelligence, route review, manual ordering, map/navigation helpers, and per-address delivery workflow.
- Sprint 3.x: Occurrence lifecycle, occurrence resolution/edit/delete, Ocorrências tab, MVP readiness QA, and map overview.
- Sprint 4.x: Supabase auth/profile foundation, beta feedback/waitlist, Android internal build setup, route recovery/offline reliability, coordinate consistency, and official branding.
- Sprint 5.0: Beta readiness audit, production-hardening polish, and closed-beta documentation.

## Major Features

- Android-first route import from Shopee spreadsheets.
- XLSX, XLS, CSV, pasted CSV/TSV, and native document picker support.
- Immediate planning-route persistence after import.
- Route summary, route review, manual stop ordering, and map overview.
- Package grouping by stop, address group, `#P` missing-stop grouping, and duplicate-address warnings.
- Address-level package selection, delivery completion, navigation, and PlaceInfo.
- Package-level and address-level occurrence registration.
- Occurrence reason editing, resolution as Entregue or Devolvido ao Hub, and deletion.
- Ocorrências tab with pending and recently resolved sections.
- Active-route crash/restart recovery with versioned local persistence.
- Offline-first local route execution for already loaded active routes.
- Completed-route history and route management.
- Supabase login/profile/trial foundation.
- Official Zerei Rotas branding assets for launcher icon, adaptive icon, favicon, splash, and in-app logo.

## Testing Scope

Automated validation for this checkpoint includes:

- TypeScript typechecking.
- Node test suite for route persistence, route ordering, map helpers, geocoding cache helpers, occurrence lifecycle, PlaceInfo, profile/trial helpers, waitlist helpers, and route presentation.
- Git whitespace validation.
- Expo web export.
- Expo Android export.

Manual beta validation must still cover:

- Real Android APK installation.
- Real Shopee spreadsheet import.
- Physical-device route execution with the phone in hand.
- Native Android file picker behavior.
- Native map/navigation behavior.
- Offline route recovery.
- Long-route performance.
- Occurrence workflow during an actual delivery.

## Known Limitations

- Payments and paywall are not active.
- Route progress is local to the device and is not cloud-synced.
- Reinstalling the app or clearing storage can remove local route progress.
- Live geocoding is not configured.
- iOS is not validated for this beta.
- Supabase profile/funnel actions need connectivity, although local route work should continue offline.
- Automated UI/E2E coverage is still limited.

## Beta Recommendation

The app is ready for a controlled Android closed beta if testers are briefed on the known limitations and use the beta checklist during each field test.
