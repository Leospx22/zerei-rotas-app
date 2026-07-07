# Changelog

All notable product and architecture changes are recorded here. Versions follow semantic versioning when a release is tagged.

## 1.0.0 - Unreleased

### Added

- Supabase waitlist lead/event schema, anonymous insert-only RLS boundary, safe lead helper, integration guide, and regression tests.

- Closed-beta status, support and feedback actions, build label, beta tester checklist, and optional `feedback_opened` funnel tracking.

- Profile completion progress, Portuguese missing-field guidance, polished trial dates/status, and a one-time `profile_completed` funnel event.

- Supabase profile, seven-day trial, funnel-event, and future subscription database foundation with owner-scoped RLS.
- Environment-safe account configuration and a real Perfil login, registration, profile editing, trial status, and sign-out experience.
- Pure profile/trial helpers and regression coverage for configuration, trial dates, funnel stages, safe updates, and schema presence.

- Added confirmed occurrence deletion for current-route packages and exact completed-history summaries.

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
- Local Place Intelligence model, dedicated AsyncStorage collection, and read-only execution hints.
- Place Information editor with quick suggestions and explicit save, update, and delete actions.
- Address-group Place Information actions and compact cards in route execution.
- Per-address-group Google Maps navigation using normalized street-and-number queries.
- Per-address-group delivery completion with occurrence-safe package updates.
- Post-import route review with stop/package inspection, route rename, and existing reorder controls.
- Route overview with address totals, manual stop ordering, package previews, and map actions.
- Painel shortcut to Route Review and dependency-free direct-position stop movement.
- Execution route-name context and status-driven Minhas Rotas cards with planned/in-route actions.
- Mobile-focused Minhas Rotas card hierarchy, action layout, and larger management controls.
- Address-group package selection and clearing in both execution phases, with per-group occurrence access.
- Reliable individual package selection and direct package-to-occurrence-reason flow.
- Address-aware group occurrence flow with direct single-package reasons and filtered multi-package selection.
- Persistent package occurrence reasons and registration timestamps.
- Read-only Ocorrências screen for current and completed routes.
- Optional completed-history occurrence summaries and route-card occurrence access.
- Occurrence resolution as Entregue or Devolvido ao Hub with confirmation actions.
- Seven-day recently resolved occurrence audit trail.
- Occurrence reason editing and safe Entregue/Devolvido ao Hub result correction.

### Changed

- Reorganized Perfil into Conta, Teste grátis, Dados do motorista, and Segurança sections with clearer loading, success, and authentication errors.
- Trial expiration is now derived correctly in the UI while server-managed status synchronization remains deferred.

- Simplified occurrence cards to show only registration and latest-update timestamps, with compatibility fallback for older resolved records.

- Promoted Ocorrências to its own bottom tab and restored Rotas as a route-management-only screen.

- Polished Ocorrências with compact summary counts, clearer card hierarchy, calmer resolved states, and consolidated actions.

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
- Clarified execution hierarchy with a street-and-number title and an immediate address/package summary.
- Sorted current-stop address groups numerically for faster package scanning.
- Aligned the execution title and package summary with the first sorted address group.
- Removed the misleading stop-wide delivery type selector in favor of per-address information.
- Polished per-address Place Information headers, saved indicators, and compact field hierarchy.
- Removed the duplicate stop-wide delivery action after address-group delivery became primary.
- Persisted occurrence metadata inside the existing current-route and history storage records.
- Split the Ocorrências screen into pending and recently resolved sections.
- Replaced the large Minhas Rotas import banner with a pending/recent occurrence summary.
- Preserved occurrence timestamps while editing reasons or reversing resolved outcomes.

### Fixed

- Preserved the Em rota presentation and Continuar action after reloading a started route with zero deliveries.

- Made every occurrence card show Registrado em, using Não informado for legacy records without a registration timestamp.

- Restored the Minhas Rotas control-center hierarchy so the compact occurrence summary no longer obscures route cards, statuses, or actions.

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
- Occurrence controls expanding outside the viewport after the address-group delivery layout grew taller.
- Import Summary making customized route order appear reverted after leaving Route Review.
- Individual package selection being disabled during the delivery phase.
- Group occurrence requiring package reselection even when pending packages were already selected.
- Completed address groups exposing selection and occurrence actions with no pending target.
- The empty execution state labeling its Minhas Rotas destination as Painel.
- Legacy whole-stop completion controls competing with address-level delivery actions.
- Occurrence resolution confirmations not invoking callbacks reliably on web.
- Occurrence edit save remaining disabled for result-only changes without a reason.

### Removed

- Root-level registrations for route lifecycle screens.
- Duplicate root-level lifecycle route files after migration to the nested Rotas Stack.
- Temporary navigation, lifecycle, import, rename, and bundle-verification debug logs.
- Temporary tab-bar margin experiments that did not fix Android touch handling.
