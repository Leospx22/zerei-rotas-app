# Zerei Rotas Product Roadmap

This roadmap defines development order and product priorities. It is outcome-based rather than date-based: a milestone is complete only when its exit criteria are met.

See `ARCHITECTURE.md` for the technical boundaries that all roadmap work must preserve.

## Priority Model

| Priority | Meaning |
| --- | --- |
| P0 | Required for a reliable release; blocks the milestone |
| P1 | Important to the milestone goal; build after P0 is stable |
| P2 | Valuable enhancement; may move to a later milestone |

Development order is strict:

1. Milestone 1: reliable driver workflow
2. Milestone 2: paid productivity value
3. Milestone 3: differentiated AI assistance

Premium and AI work must not delay MVP reliability.

## Milestone 1 - MVP (Highest Priority)

**Goal:** A Shopee driver can import, organize, execute, and complete a route reliably.

### Import Improvements

- **P0:** Reliably import XLSX, XLS, and CSV files on Android and web.
- **P0:** Preserve native file-picker and authentication state when the app returns from Android document selection.
- **P0:** Validate required columns and show actionable Portuguese error messages.
- **P0:** Keep planning-route creation idempotent so Continue never creates a duplicate.
- **P1:** Improve column detection for common Shopee export variations.
- **P1:** Show clear file, package, stop, and rejected-row summaries before execution.
- **P1:** Handle empty sheets, malformed rows, duplicate packages, unsupported files, and oversized files.
- **P2:** Allow the driver to review and correct detected column mappings.

### Route Execution

- **P0:** Preserve the complete status flow: `planning -> active -> completed`.
- **P0:** Resume an interrupted active route after tab changes or application restart.
- **P0:** Persist package and stop progress without losing completed work.
- **P0:** Complete a route exactly once and create one stable history entry.
- **P1:** Make remaining packages, stops, distance, and elapsed time immediately visible.
- **P1:** Keep Android Back behavior predictable throughout the route lifecycle.
- **P2:** Add a confirmation step for destructive or irreversible execution actions.

### Stop Management

- **P0:** Group packages by the spreadsheet Stop column, never by sequence number.
- **P0:** Keep packages from different stop numbers separate even when addresses match.
- **P0:** Preserve address subgroups and duplicate-address warnings.
- **P1:** Support safe stop reordering without changing package ownership.
- **P1:** Support duplicate-stop cleanup with a clear preview of the result.
- **P1:** Make large stops easy to expand, inspect, and collapse during execution.
- **P2:** Allow manual stop notes and driver-defined stop labels.

### Delivery Status

- **P0:** Support package states `pending`, `delivered`, and `skipped`.
- **P0:** Support stop states `pending`, `completed`, and `skipped`.
- **P0:** Keep package totals, delivered totals, and completed-stop totals consistent.
- **P0:** Preserve completed-route names and statistics in history.
- **P1:** Persist occurrence reasons for skipped packages.
- **P1:** Make accidental status changes reversible before route completion.
- **P2:** Add completion validation for unresolved packages or stops.

### Performance Improvements

- **P0:** Keep import and route execution responsive with realistic driver spreadsheets.
- **P0:** Prevent repeated storage writes and render loops during route updates.
- **P1:** Measure import parsing time, route grouping time, and large-list rendering.
- **P1:** Reduce unnecessary RouteContext consumer rerenders.
- **P1:** Render large stop/package collections incrementally where needed.
- **P2:** Move expensive spreadsheet processing off the critical interaction path.

### Bug Fixes and Reliability

- **P0:** Maintain working Android bottom-tab hit areas and lifecycle tab visibility.
- **P0:** Maintain route rename persistence across tabs, restart, and completion.
- **P0:** Prevent stale current-route state from overwriting renamed history entries.
- **P0:** Keep current route and history storage free of unintended duplicates.
- **P0:** Add regression tests for every confirmed data-loss or navigation bug.
- **P1:** Add structured error reporting for import, persistence, and authentication failures.
- **P1:** Test cold start, background/foreground, app termination, and low-connectivity scenarios.
- **P2:** Add migration handling for older persisted route formats.

### MVP Exit Criteria

- A driver can import a representative Shopee XLSX, XLS, or CSV file on Android.
- The imported planning route appears immediately in Painel and Minhas Rotas.
- The driver can organize, start, pause, resume, and complete the route without data loss.
- Package, stop, route, rename, delete, and history state survive application restart.
- Completion produces one correctly named history record across all tabs.
- Bottom tabs and Android Back behave correctly before, during, and after the lifecycle.
- Typecheck and the full automated test suite pass.
- A device smoke-test checklist passes on the supported Android/Expo Go baseline.

## Milestone 2 - Premium Driver

**Goal:** Make Zerei Rotas worth R$9.90/month through durable time savings and useful operational insight.

### Advanced Statistics

- **P0:** Daily, weekly, and monthly delivery summaries.
- **P0:** Packages, stops, completion rate, route duration, and distance trends.
- **P1:** Average time per stop and packages per stop.
- **P1:** Comparison against the driver's own previous periods.
- **P2:** Exportable personal performance reports.

### Favorite Addresses

- **P0:** Save frequently visited addresses with driver-defined names and notes.
- **P1:** Reuse delivery instructions and occurrence notes.
- **P1:** Recognize favorites during import using normalized address matching.
- **P2:** Pin favorite addresses for quick review before route start.

### Backup and Restore

- **P0:** Back up routes, history, names, favorites, and templates securely.
- **P0:** Restore data after reinstall or device replacement.
- **P0:** Make backup state and last successful synchronization visible.
- **P1:** Resolve local/cloud conflicts without silent data loss.
- **P2:** Support user-initiated data export and import.

### Route Templates

- **P0:** Save a completed or planned route structure as a reusable template.
- **P1:** Create a new planning route from a template.
- **P1:** Edit template names, stop order, and address notes.
- **P2:** Suggest templates based on imported route similarity.

### Smart Grouping

- **P0:** Improve address normalization while preserving spreadsheet stop identity.
- **P1:** Suggest safe merges for likely duplicate addresses.
- **P1:** Flag suspicious grouping and coordinate inconsistencies before execution.
- **P2:** Learn driver-approved grouping corrections for future imports.

### Productivity Insights

- **P0:** Highlight where the driver spends the most time.
- **P1:** Identify recurring difficult stops, high-volume stops, and occurrence patterns.
- **P1:** Provide practical recommendations grounded in the driver's own history.
- **P2:** Track the estimated time saved by premium features.

### Premium Exit Criteria

- Premium features have clear entitlement and graceful offline behavior.
- Backup and restore are verified against device replacement and reinstall scenarios.
- Statistics reconcile exactly with persisted history.
- Templates and favorite addresses measurably reduce repeated setup work.
- Insights are understandable, actionable, and based on transparent metrics.
- The core MVP workflow remains fully usable and reliable.

## Milestone 3 - AI Driver Assistant

**Goal:** Differentiate Zerei Rotas from every competitor with assistance that reduces planning effort and helps drivers make better decisions during the day.

### AI Route Analysis

- **P0:** Analyze an imported route before execution and surface unusual stops, duplicates, missing data, and workload concentration.
- **P0:** Explain recommendations in concise Portuguese with the supporting route facts.
- **P1:** Suggest route preparation actions without silently changing driver data.
- **P1:** Compare the planned route with the driver's historical patterns.
- **P1:** Identify likely delays and high-effort sections of a route.
- **P2:** Generate an end-of-route summary with lessons for future routes.

### Voice Assistant

- **P0:** Support hands-free status queries such as remaining packages and next stop.
- **P0:** Require explicit confirmation before any voice action changes route data.
- **P1:** Mark deliveries or occurrences using short Portuguese commands.
- **P1:** Read stop details and package counts without requiring screen interaction.
- **P1:** Handle noisy environments, recognition failure, and ambiguous commands safely.
- **P2:** Offer configurable spoken progress updates during execution.

### AI Safety and Trust

- **P0:** Keep deterministic route and persistence logic authoritative; AI output is advisory unless the driver confirms an action.
- **P0:** Never invent addresses, package identifiers, delivery status, or completed work.
- **P0:** Clearly distinguish route facts from AI suggestions.
- **P0:** Protect personal, address, and delivery data in transit and at rest.
- **P1:** Provide non-AI fallbacks for every critical workflow.
- **P1:** Record consented AI actions for troubleshooting and user review.
- **P2:** Let drivers control which AI capabilities and data sources are enabled.

### AI Exit Criteria

- AI analysis produces useful recommendations on representative real-world routes.
- Voice interactions work safely in hands-free scenarios and never mutate data without confirmation.
- Failed, unavailable, or low-confidence AI responses do not block route execution.
- Privacy, consent, retention, and deletion behavior are documented and tested.
- AI features demonstrate measurable planning-time or interaction-time improvement.
- MVP and Premium workflows continue to function without an AI connection.

## Cross-Milestone Engineering Rules

- Follow `ARCHITECTURE.md`; architectural changes require explicit approval.
- Keep RouteContext as the runtime source of truth for current route and history.
- Keep persistence operations deterministic and covered by regression tests.
- Treat navigation, import, rename, completion, and recovery as release-critical paths.
- Add observability without leaving temporary debug UI or logs in production.
- Run `npm run typecheck` and `npm test` for every code change.
- Validate Android-specific navigation, file selection, and safe-area behavior on a physical device or Expo Go.
