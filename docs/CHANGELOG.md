# Changelog

All notable product and architecture changes are recorded here. Versions follow semantic versioning when a release is tagged.

## 1.0.0 - Unreleased

### Added

- Expo Router application shell with login, Painel, Rotas, Historico, and Perfil.
- Nested route lifecycle Stack under the Rotas tab.
- XLSX, XLS, CSV, and pasted CSV/TSV import flows.
- Native Android document selection with Expo Document Picker.
- Native binary spreadsheet parsing through base64 and SheetJS.
- Automatic spreadsheet column detection for tracking, address, postal code, coordinates, and Stop.
- Package grouping by Stop with address subgroups and duplicate-address warnings.
- Immediate planning-route creation and persistence after successful import.
- Import summary, delivery preparation, optional route organization, execution, and completion screens.
- Package delivery and occurrence status controls.
- Painel route metrics and completed-route summaries.
- Minhas Rotas management for planning, active, and completed routes.
- Shared route history in RouteContext.
- AsyncStorage persistence for current route and completed history.
- AsyncStorage-backed Supabase authentication sessions.
- Current-route and completed-history rename and delete operations.
- Persistence regression tests for import, status transitions, duplicate prevention, rename, history identity, and stale completion writes.
- `ARCHITECTURE.md` as the technical source of truth.
- `ROADMAP.md` with MVP, Premium Driver, and AI Driver Assistant milestones.
- Additive Zerei Rotas design tokens, reusable UI primitives, and usage documentation.
- Hybrid premium execution card above the existing stop and package controls.
- Local smart package collection checklist with pickup confirmation gating.
- One-tap stop completion with automatic next-stop advance and brief success feedback.
- Select-all package collection and address-group summaries for multi-address stops.
- Presentation-only address normalization for common street abbreviations and complements.

### Changed

- Moved the complete route lifecycle from the root Stack into the nested Rotas Stack.
- Replaced wizard screen accumulation with lifecycle-aware `replace()` transitions.
- Hid the bottom tab bar during route lifecycle screens while keeping it visible on main tab screens.
- Increased the Android tab bar height and bottom padding to keep its native touch area accessible.
- Centralized current route and completed history ownership in RouteContext.
- Updated Painel, Minhas Rotas, and Historico to read shared route state consistently.
- Changed native spreadsheet imports from dynamic runtime imports to Metro-compatible static imports.
- Changed native filesystem access to `expo-file-system/legacy` for the supported Expo API.
- Made repeated completion history writes preserve an existing renamed title and completion identity.
- Prevented completed routes from being written by current-route debounced auto-save.

### Fixed

- Planning routes not being persisted after import.
- Imported routes not appearing immediately in Minhas Rotas.
- Duplicate route creation when Continue was pressed after import.
- Native Android file picker and XLS/XLSX/CSV parsing failures.
- Runtime resets caused by unresolved dynamic imports in Expo Router.
- Authentication sessions being lost while Android document selection backgrounded the application.
- Bottom tabs appearing but not receiving touch events on Android.
- Hidden lifecycle screens accumulating in the root navigation stack.
- Rename modal passing stale/default text instead of the typed route name.
- Current-route rename reverting after tab changes or application restart.
- Completed-route rename targeting the wrong entry when IDs were duplicated.
- The newest completed route being overwritten by stale `currentRoute` data.
- Route names becoming inconsistent across Painel, Minhas Rotas, and Historico.
- History reloads using separate screen-owned data sources.

### Removed

- Root-level registrations for route lifecycle screens.
- Duplicate root-level lifecycle route files after migration to the nested Rotas Stack.
- Temporary navigation, lifecycle, import, rename, and bundle-verification debug logs.
- Temporary tab-bar margin experiments that did not fix Android touch handling.
