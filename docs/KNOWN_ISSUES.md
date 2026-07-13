# Known Issues

This register contains confirmed open limitations and risks for the closed beta. Update Status and Notes when an issue changes.

Priority meanings:

- **Critical:** Blocks closed beta or can cause active delivery data loss.
- **High:** Important reliability, field-test, or driver-trust gap.
- **Medium:** Non-blocking quality, maintainability, or coverage gap.
- **Low:** Cosmetic or deferred cleanup.
- **Future Improvements:** Product enhancements intentionally deferred.

## Critical

| ID | Description | Status | Owner | Notes |
| --- | --- | --- | --- | --- |
| None | No confirmed Critical beta blockers at this checkpoint. | N/A | N/A | Keep this section updated during field testing. |

## High

| ID | Description | Status | Owner | Notes |
| --- | --- | --- | --- | --- |
| ZR-001 | Live geocoding provider is not configured. Stops without valid spreadsheet coordinates, duplicate-address coordinate reuse, or cached coordinates still require manual address entry/copy. | Open | Unassigned | Intentional for beta. Do not add a paid/geocoding provider without approval. |
| ZR-002 | Route progress is local-only and not cloud-synced. Reinstalling the app, clearing app storage, or switching phones can still lose local route progress. | Open | Unassigned | Sprint 4.8 improves local crash/restart reliability only. Cloud backup/restore needs an approved sync architecture. |
| ZR-003 | Android tab interaction depends on fixed tab bar dimensions (`height: 100`, `paddingBottom: 24`). Behavior needs validation across tester devices and Android navigation modes. | Open | Unassigned | Do not reduce these values without physical-device testing. |
| ZR-004 | Native iOS document picking, spreadsheet parsing, navigation, persistence, and safe-area behavior have not been validated on a physical iOS device. | Open | Unassigned | Closed beta is Android-first. Complete iOS release checklist before iOS distribution. |
| ZR-005 | Automated tests do not cover native touch handling, native file selection, screen rendering, or full route lifecycle E2E behavior. | Open | Unassigned | Physical-device smoke testing remains mandatory for beta. |

## Medium

| ID | Description | Status | Owner | Notes |
| --- | --- | --- | --- | --- |
| ZR-006 | `npm test` emits Node `MODULE_TYPELESS_PACKAGE_JSON` warnings while loading TypeScript modules. | Open | Unassigned | Tests pass. Resolve only after checking the impact of setting package module type or adjusting the test loader. |
| ZR-007 | Some older strings and generated docs may still need accent/encoding review in terminal output or copied logs. | Open | Unassigned | App-facing text should be validated on device during beta QA. |
| ZR-008 | Long routes with 100+ stops rely on manual field validation for scroll responsiveness and map/list usability. | Open | Unassigned | Helper tests pass, but real-device performance should be observed with real Shopee spreadsheets. |

## Low

| ID | Description | Status | Owner | Notes |
| --- | --- | --- | --- | --- |
| ZR-009 | Some legacy styles remain unused after official branding replacement. | Open | Unassigned | Low-risk cleanup only; avoid churn before beta unless it affects build output. |

## Future Improvements

| ID | Description | Status | Owner | Notes |
| --- | --- | --- | --- | --- |
| ZR-F001 | Cloud backup and restore for routes, history, occurrences, and PlaceInfo. | Deferred | Unassigned | Needed before multi-device or reinstall-safe production use. |
| ZR-F002 | Live geocoding provider and coordinate confidence review. | Deferred | Unassigned | Requires provider choice, API key strategy, cost review, and privacy review. |
| ZR-F003 | Payment, subscription enforcement, and server-managed trial expiration. | Deferred | Unassigned | Do not implement before payment architecture approval. |
| ZR-F004 | Automated E2E tests for import, execution, occurrence, recovery, and completion flows. | Deferred | Unassigned | Consider after beta workflows stabilize. |
| ZR-F005 | Definir localização no mapa for unresolved stops. | Deferred | Unassigned | Future workflow: search address, move/confirm a map pin, save validated coordinates locally, and reuse them for matching normalized street + number addresses. |
| ZR-F006 | Native overview map remains feature-flagged during closed beta. | Monitoring | Unassigned | Preview APKs enable `EXPO_PUBLIC_ENABLE_NATIVE_ROUTE_MAP=true`; if Android crashes recur, capture `adb logcat` and rely on the ordered-list fallback. |
