# Release Checklist

Complete this checklist for every production candidate. Record device models, OS versions, test files, failures, and approved exceptions in the release ticket.

## Code Quality

- [ ] Review the final diff for unrelated changes.
- [ ] Remove temporary logs, debug UI, feature flags, and test credentials.
- [ ] Confirm no known P0 issue remains open.
- [ ] Review new dependencies and lockfile changes.
- [ ] Confirm `ARCHITECTURE.md`, `ROADMAP.md`, and this checklist still match the implementation.
- [ ] Update `docs/CHANGELOG.md` for all user-visible behavior changes.
- [ ] Ensure commits are atomic and clearly named.

## TypeScript

- [ ] Run `npm run typecheck`.
- [ ] Confirm strict typechecking passes with no errors.
- [ ] Confirm no new broad `any`, unsafe cast, or ignored error was introduced without justification.
- [ ] Verify Expo Router typed paths compile.

## Tests

- [ ] Run `npm test`.
- [ ] Confirm the full suite passes.
- [ ] Add a regression test for every bug fixed in the release.
- [ ] Verify import, planning persistence, planning-to-active, and active-to-completed tests.
- [ ] Verify current-route and completed-history rename tests.
- [ ] Verify duplicate-ID and stale-completion history tests.
- [ ] Record any test-runner warnings and link their known-issue IDs.

## Persistence

- [ ] Import a route and confirm `zerei_current_route` contains a version `1` envelope with `savedAt` and the planning route.
- [ ] Restart the application and confirm the planning route is restored.
- [ ] Start the route and confirm active progress persists after restart.
- [ ] Confirm the one-time restored-route notice appears after active-route recovery and does not repeat on every tab change.
- [ ] Deliver one package, force-close, reopen, and confirm the delivered status remains.
- [ ] Register, edit, resolve, and delete an occurrence, force-close after each action, and confirm the latest state remains.
- [ ] Reorder stops, force-close, and confirm the saved order remains in review, map overview, and execution.
- [ ] Complete the route and confirm `zerei_current_route` is removed.
- [ ] Confirm one entry is added to `zerei_route_history`.
- [ ] Retry completion and confirm no duplicate history entry is created.
- [ ] Corrupt active-route storage in a test build and confirm startup does not crash or delete history.
- [ ] Rename current and completed routes, restart, and verify the names remain.
- [ ] Delete current and completed routes and verify every tab refreshes.
- [ ] Confirm repeated completion writes do not revert a renamed history title.
- [ ] Verify existing persisted data remains compatible after an upgrade.

## Navigation

- [ ] Sign in and reach Painel using the expected root Stack flow.
- [ ] Verify Painel, Rotas, Historico, and Perfil tabs receive presses.
- [ ] Confirm the tab bar is visible only on main tab screens.
- [ ] Confirm the tab bar is hidden on every route lifecycle screen.
- [ ] Complete the full import-to-completion flow without ghost screens.
- [ ] Confirm Android Back follows the logical previous lifecycle step.
- [ ] Confirm completion returns to Minhas Rotas and tabs work immediately.
- [ ] Confirm no duplicate navigator or custom static bottom navigation exists.

## Import

- [ ] Import a representative XLSX file.
- [ ] Import a representative XLS file.
- [ ] Import comma-separated and semicolon-separated CSV files.
- [ ] Import pasted CSV and tab-separated spreadsheet data.
- [ ] Verify headers, package count, stop count, and preview rows.
- [ ] Verify Stop grouping never uses sequence/order columns.
- [ ] Verify duplicate-address warnings across different stops.
- [ ] Test empty, malformed, unsupported, and oversized files.
- [ ] Confirm errors are clear, actionable, and written in Portuguese.
- [ ] Confirm Continue reuses the existing planning route without duplication.

## Route Execution

- [ ] Verify `planning -> active -> completed` transitions.
- [ ] Deliver individual packages and verify counters.
- [ ] Skip packages with an occurrence and verify counters.
- [ ] Complete and skip entire stops.
- [ ] Expand and collapse stops with multiple packages and addresses.
- [ ] Reorder stops and confirm package ownership remains correct.
- [ ] Resume an interrupted active route.
- [ ] Complete the final stop and verify the completion screen.
- [ ] Confirm exactly one correctly named history entry is created.
- [ ] Verify Painel, Minhas Rotas, and Historico display matching data.

## Android

- [ ] Test at least one gesture-navigation device.
- [ ] Test at least one three-button-navigation device.
- [ ] Verify the bottom tab hit area with the current `100/24/8` dimensions.
- [ ] Open Document Picker, cancel, and return without logout or reset.
- [ ] Select XLSX, XLS, CSV, and invalid files.
- [ ] Background and foreground the application during an active route.
- [ ] Force-close and reopen during planning and active states.
- [ ] Restart the phone during an active route and confirm local route recovery.
- [ ] Put the phone offline, continue deliveries/occurrences locally, force-close, reopen, and confirm local progress remains.
- [ ] Verify Supabase session persistence after force-close.
- [ ] Record device model, Android version, and Expo/native build version.

## iOS

- [ ] Test on a physical iPhone supported by the release.
- [ ] Verify safe areas on main tabs and lifecycle screens.
- [ ] Open Document Picker, cancel, and return normally.
- [ ] Select XLSX, XLS, CSV, and invalid files.
- [ ] Verify authentication survives document selection and backgrounding.
- [ ] Verify tab navigation, Back behavior, route persistence, and completion.
- [ ] Record device model, iOS version, and Expo/native build version.

## Performance

- [ ] Import small, typical, and large representative spreadsheets.
- [ ] Record parsing and preview time for the largest supported file.
- [ ] Scroll and update status on a route with many stops and packages.
- [ ] Confirm no repeated render, storage-write, or history-reload loop.
- [ ] Verify memory remains stable through import, execution, and completion.
- [ ] Confirm touch interactions remain responsive during persistence work.
- [ ] Compare release performance with the previous production build.

## UI Review

- [ ] Review every main tab in light of real device safe areas.
- [ ] Review every lifecycle screen with short and long route names.
- [ ] Review empty, loading, error, planning, active, and completed states.
- [ ] Verify modal input, keyboard behavior, and destructive confirmations.
- [ ] Verify Portuguese accents, truncation, line wrapping, and date formatting.
- [ ] Confirm icons, colors, contrast, spacing, and status labels are consistent.
- [ ] Confirm no debug label, trace output, or placeholder content is visible.
- [ ] Capture final screenshots for the release record.
