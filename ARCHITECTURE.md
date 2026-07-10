# Zerei Rotas Architecture

This document is the source of truth for the current application architecture. New work should preserve the ownership boundaries and invariants described here unless an architectural change is explicitly approved.

## Technology

- Expo SDK 54 and React Native 0.81
- Expo Router 6 file-system routing
- React Context for authentication and route state
- AsyncStorage for route and Supabase session persistence
- Supabase for authentication
- SheetJS (`xlsx`) for XLS/XLSX parsing
- Node's built-in test runner for persistence regression tests
- TypeScript in strict mode, with `@/*` mapped to the repository root

## Folder Structure

```text
app/
  _layout.tsx                  Root providers, error boundary, and root Stack
  login.tsx                    Authentication screen
  +not-found.tsx               Unknown-route fallback
  (tabs)/
    _layout.tsx                Bottom Tabs navigator
    index.tsx                  Painel dashboard
    occurrences.tsx            Current/history occurrence management
    history.tsx                Completed-route history
    profile.tsx                Profile and sign-out
    routes/
      _layout.tsx              Nested route-lifecycle Stack
      index.tsx                Minhas Rotas
      import.tsx               Spreadsheet selection and parsing
      import-summary.tsx       Parsed-route summary
      delivery-preparation.tsx Route review and activation
      route-organizer.tsx      Optional route organization screen
      route-execution.tsx      Delivery execution
      route-completed.tsx      Completion summary

assets/images/                 Application icons and static images
constants/theme.ts             Shared colors, spacing, typography, and radii
contexts/AuthContext.tsx       Supabase authentication state
contexts/RouteContext.tsx      Live route and shared history state
hooks/useDashboard.ts          Derived dashboard metrics
hooks/usePersistence.ts        React-facing persistence adapter
hooks/useImport.ts             Import-related hook retained by the project
hooks/useNavigation.ts         Navigation-related hook retained by the project
lib/packageUtils.ts            Package parsing, grouping, and route construction
lib/appLinks.ts                Closed-beta links, copy, and version configuration
lib/mapNavigation.ts           External map URL construction from normalized addresses
lib/occurrenceFlow.ts          Direct package occurrence target validation
lib/occurrenceRecords.ts       Occurrence metadata updates and record collection
lib/packageSelection.ts        Pure local separation selection helpers
lib/placeIntelligence.ts       Local address intelligence model and persistence
lib/routePersistence.ts        AsyncStorage schema and storage operations
lib/routeOrdering.ts           Pure manual stop movement and order reindexing
lib/routePresentation.ts       Pure route-card status and Portuguese label derivation
lib/spreadsheetParser.ts       CSV, TSV, XLS, and XLSX parsing
lib/supabase.ts                Supabase client and session storage configuration
lib/userProfile.ts             Profile, trial, and funnel service/helpers
lib/waitlistLeads.ts           Public lead validation and safe Supabase payloads
supabase/migrations/           Supabase database migrations
tests/routePersistence.test.mjs Persistence and route-lifecycle regressions
types/                         Project-specific declarations
```

## Navigation Architecture

```text
Root Stack
|-- login
|-- (tabs)
|   |-- index                  Painel
|   |-- routes                 Rotas nested Stack
|   |   |-- index              Minhas Rotas
|   |   |-- import
|   |   |-- import-summary
|   |   |-- delivery-preparation
|   |   |-- route-organizer
|   |   |-- route-execution
|   |   `-- route-completed
|   |-- occurrences            Ocorrencias
|   |-- history                Historico
|   `-- profile                Perfil
`-- +not-found
```

`app/_layout.tsx` owns the root Stack. Its component hierarchy is:

```text
ErrorBoundary
`-- AuthProvider
    `-- RouteProvider
        |-- Root Stack
        `-- StatusBar
```

The application must not create another `NavigationContainer`. Expo Router owns the navigation container.

`app/(tabs)/_layout.tsx` owns the real bottom tab bar. The working Android dimensions are `height: 100`, `paddingBottom: 24`, and `paddingTop: 8`; these values account for the device navigation/gesture area and should not be reduced without device testing.

Current-route presentation treats a route as Em rota when `status` is active, `startTime` exists, or delivery progress exists. A started route therefore remains resumable even before its first delivered package.

The tab bar is visible on Painel, Minhas Rotas, Ocorrencias, Historico, and Perfil. It is hidden when the focused child of the routes Stack is one of the lifecycle screens: import, import-summary, delivery-preparation, route-organizer, route-execution, or route-completed.

## Route Lifecycle

The primary route flow is:

```text
Login
  --replace--> Painel
  --push-----> Import
  --replace--> Import Summary
  --replace--> Delivery Preparation
  --replace--> Route Execution
  --replace--> Route Completed
  --replace--> Minhas Rotas
```

Detailed transitions:

1. Painel or Minhas Rotas opens `/(tabs)/routes/import` with `router.push()`.
2. A successful import immediately creates and persists a `planning` route.
3. Continue reuses that route and calls `router.replace()` for import-summary. It must not create a duplicate route.
4. Import Summary uses `router.replace()` for delivery-preparation. When Review returns to Import Summary, the summary renders the current RouteContext array sequence and provides an immediate canonical return to Review.
5. Delivery Preparation shows the full route sequence and can move stops one position up/down or directly to a validated 1-based position through `setCurrentRoute`, preserving package/address-group data while persisting the customized array order. Painel links to this same screen whenever a current route exists. Starting changes the route to `active`, sets `startTime`, and uses `router.replace()` for route-execution.
6. Route Execution updates package status through `RouteContext`, including address-group completion that marks only pending packages in the selected presentation group. Skipped occurrence packages are preserved, and the existing context logic derives stop completion.
7. When every stop is completed or skipped, `RouteContext` changes the route to `completed` and persists it to history.
8. Route Execution observes the completed status and replaces itself with route-completed.
9. Finishing the completion screen clears the in-memory current route and replaces the flow with Minhas Rotas.

`route-organizer` is registered in the lifecycle Stack but is not part of the primary import path. It may start execution after route organization.

From Minhas Rotas, a `planning` route resumes at delivery-preparation and an `active` route resumes at route-execution.

Use `replace()` between sequential wizard screens to avoid accumulating hidden lifecycle screens. Use `push()` when entering the lifecycle from a main tab screen. Back behavior within the lifecycle should return to the logical previous step, not expose obsolete wizard entries.

## RouteContext Responsibilities

`RouteContext` is the runtime source of truth for route-domain state. It owns:

- `currentRoute`: the live planning, active, or temporarily completed route
- `routeHistory`: the shared completed-route summaries used by all tabs
- `occurrences`: compatibility lookup for occurrence reasons displayed by execution UI
- Route creation assignment through `setCurrentRoute`
- Current-route rename through `renameCurrentRoute`
- Stop and package status updates
- Atomic occurrence status, reason, and registration timestamp updates
- Current-route occurrence resolution as delivered or returned to the hub
- Current-route occurrence deletion clears only occurrence metadata and safely restores non-delivered packages to pending
- Completion detection and elapsed-duration calculation
- Duplicate-stop removal and stop reordering
- Import summary calculation
- Initial hydration of current route and history
- Debounced persistence of planning and active route changes
- Completion persistence and history reload

Important ownership rules:

1. Screens read the active/planning route from `RouteContext.currentRoute`.
2. Screens read completed routes from `RouteContext.routeHistory`.
3. Screens must not maintain an independent authoritative history collection.
4. Current-route rename must go through `renameCurrentRoute` so memory and storage change together.
5. Completed-route rename may use the persistence operation, but must call `reloadHistory()` afterward.
6. Completed routes are not written by the debounced current-route auto-save.
7. Parsing, navigation, and raw AsyncStorage serialization do not belong in RouteContext.

## CurrentRoute Model

The live route is represented by `RouteData`:

```ts
interface RouteData {
  id: string;
  name: string;
  stops: GroupedStop[];
  status: 'planning' | 'active' | 'completed';
  estimatedDistanceKm: number;
  completedStops: number;
  totalPackages: number;
  deliveredPackages: number;
  startTime: number | null;
  durationMinutes: number;
}
```

Status meanings:

- `planning`: imported and persisted, but delivery execution has not started
- `active`: execution has started and `startTime` is set
- `completed`: every stop is completed or skipped; the route is moving into history

There is at most one persisted current route. `loadCurrentRouteFromStorage()` intentionally returns only planning or active routes; completed routes belong to history.

The route hierarchy is:

```text
RouteData
`-- GroupedStop[]
    |-- AddressGroup[]
    `-- PackageItem[]
```

Stops are grouped exclusively by the spreadsheet Stop column. Sequence/order columns must never be interpreted as stop numbers. Packages are grouped by stop first, then by normalized address within that stop.

`PackageItem` stores occurrence metadata additively:

```ts
occurrenceReason?: string;
occurrenceRegisteredAt?: string;
occurrenceResolution?: 'delivered' | 'returned_to_hub';
occurrenceResolvedAt?: string;
occurrenceUpdatedAt?: string;
```

These fields are optional so previously persisted routes remain valid. A package occurrence continues using the existing `skipped` status convention. Current-route AsyncStorage persistence serializes these fields with the route; skipped packages without a saved reason display `Motivo não informado`. Occurrence edits and resolutions set `occurrenceUpdatedAt`; older resolved records fall back to `occurrenceResolvedAt` when displaying their latest update.

Occurrence resolution is also additive. `delivered` changes only the target package to the existing delivered status; `returned_to_hub` retains the skipped status. Both preserve the original reason and registration timestamp. The Ocorrências screen shows unresolved records under Pendentes and resolved records for seven days under Resolvidas recentemente.

Occurrence edits target the existing package or exact completed-history summary. Pending edits may change only the reason. Resolved edits may change the reason and reverse the result; result reversal preserves both timestamps and adjusts delivered counters by exactly one without duplicating records.

## History Model

Completed routes use the compact `HistoryEntry` model:

```ts
interface HistoryEntry {
  id: string;
  name: string;
  totalPackages: number;
  totalStops: number;
  deliveredPackages: number;
  completedStops: number;
  distance: number;
  durationMinutes: number;
  completedAt: string;
  occurrences?: OccurrenceRecord[];
}
```

History invariants:

- Entries are stored newest first.
- Storage is limited to 50 entries.
- Completion removes `zerei_current_route`.
- Repeated completion writes for the same route ID preserve an existing renamed title and `completedAt`.
- A completed entry is uniquely targeted for rename by `id + completedAt`.
- `routeHistory` in RouteContext is the read source for Painel, Minhas Rotas, and Historico.
- Occurrence summaries are optional and preserve package code, address, normalized address, reason, registration time, route name, and stop number after completion.
- Occurrence summaries may also preserve `occurrenceResolution` and `occurrenceResolvedAt`; completed-history resolution targets the exact route completion and package.
- History records created before occurrence summaries remain valid and expose an empty occurrence collection.
- `reloadHistory()` is the synchronization boundary after a history mutation.

Minhas Rotas derives card status without changing persisted data: a current route with zero delivered packages is `Planejada`, a current route with deliveries is `Em rota`, and a history entry is `Concluída`. Planned cards can enter Review or activate execution; in-route cards continue execution.

## Persistence Layer

Persistence has two layers:

### `lib/routePersistence.ts`

This module defines the storage schema and operations. It accepts a `RouteStorage` interface so tests can use in-memory storage while production uses AsyncStorage.

Storage keys:

| Key | Value | Purpose |
| --- | --- | --- |
| `zerei_current_route` | `RouteData` | The single planning or active route |
| `zerei_route_history` | `HistoryEntry[]` | Completed-route summaries |
| `ZR_PLACE_INTELLIGENCE` | Address-keyed `PlaceInfo` collection | Local delivery knowledge |

The module owns JSON serialization, loading, saving, completion history, rename, and delete behavior.

### `lib/placeIntelligence.ts`

Place Intelligence is stored separately from routes under `ZR_PLACE_INTELLIGENCE`. Entries are keyed with the presentation-only `normalizeAddress()` group key, so equivalent street abbreviations and complements resolve to the same place. When the current stop changes, the execution screen loads each visible address group independently and exposes its explicit modal editor for save, update, and confirmed deletion; no automatic writes occur.

### `hooks/usePersistence.ts`

This hook adapts storage operations for React consumers. It catches storage failures, exposes a user-facing error state, and returns stable operations:

- `saveRoute`
- `loadCurrentRoute`
- `saveToHistory`
- `getHistory`
- `renameRoute`
- `deleteRoute`

Screens should prefer RouteContext for reads. Direct persistence calls are reserved for mutations not owned by the live current route, such as completed-history rename/delete.

Supabase authentication persistence is separate. `lib/supabase.ts` only creates a client when `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` are valid, then configures Auth with AsyncStorage, token refresh, persisted sessions, and URL-session detection disabled for native operation. Missing configuration leaves all local route features available.

`AuthProvider` owns the current Supabase session and loaded `profiles` record. `lib/userProfile.ts` owns profile mutations, completion derivation, and pure trial/funnel presentation. New auth users receive a seven-day trial profile and registration events through the database trigger in migration `004_auth_profile_foundation`; the client safely recovers a missing profile after login and records `profile_completed` once when onboarding is finished. Expired-trial presentation is derived locally, while persisted expiration and subscription writes remain server-owned. No payment provider is connected.

Closed-beta support links are isolated in `lib/appLinks.ts`. An unconfigured feedback form resolves to a safe null state, WhatsApp support uses an HTTPS configuration boundary, and opening a configured feedback form records the owner-scoped `feedback_opened` funnel event. These links do not gate local app usage.

The landing-page waitlist foundation is isolated from authenticated app data. Anonymous clients may insert constrained rows into `waitlist_leads` but have no read, update, or delete access; `waitlist_lead_events` is trigger-owned and unavailable to public clients. `lib/waitlistLeads.ts` mirrors that public payload boundary without exposing workflow fields.

## Import Pipeline

Supported inputs are XLSX, XLS, CSV, and pasted CSV/TSV text.

```text
User input
  -> platform-specific file read
  -> headers + rows
  -> parseSpreadsheetData()
  -> RawPackage[]
  -> groupPackagesByStop()
  -> GroupedStop[]
  -> buildPlanningRoute()
  -> RouteData(status: planning)
  -> RouteContext.setCurrentRoute()
  -> AsyncStorage
  -> import preview and summary
```

Platform behavior:

- Web uses a browser file input. Binary spreadsheets are read as `ArrayBuffer`; text files are read as text.
- Android/iOS use `expo-document-picker` with cache copying enabled.
- Native XLS/XLSX files are read as base64 through `expo-file-system/legacy` and parsed by SheetJS.
- Native CSV files are read as UTF-8 text.
- The first workbook sheet is used.
- Native files larger than 10 MB are rejected.

Parsing behavior:

1. `spreadsheetParser.ts` converts the source into headers and rows.
2. `detectColumns()` recognizes tracking, destination address, postal code, coordinates, and Stop columns.
3. `parseSpreadsheetData()` produces `RawPackage` values and ignores empty rows.
4. `groupPackagesByStop()` creates stops, address subgroups, package records, counts, and duplicate-address warnings.
5. `buildPlanningRoute()` generates an opaque route ID, a default date-based name, totals, estimates, and `planning` status.
6. `setCurrentRoute()` updates memory and persistence immediately after successful parsing, before Continue is pressed.
7. Continue checks the imported route ID and reuses the existing route to prevent duplication.

## Naming Conventions

### Files and routes

- Expo Router screen files use lowercase kebab-case: `import-summary.tsx`, `route-execution.tsx`.
- Navigator layouts are named `_layout.tsx`.
- A directory route uses `index.tsx` for its default screen.
- Context files use PascalCase: `RouteContext.tsx`, `AuthContext.tsx`.
- Hooks use camelCase and the `use` prefix: `usePersistence.ts`, `useDashboard.ts`.
- Library modules use camelCase names describing their domain: `routePersistence.ts`, `packageUtils.ts`.

### Code

- React components and TypeScript interfaces use PascalCase.
- Functions, variables, and callbacks use camelCase.
- Constants shared as fixed identifiers use uppercase snake case, such as `KEY_CURRENT`.
- Event handlers use `handle...`; modal openers may use `open...`.
- Boolean values use `is...`, `has...`, or `cameFrom...`.
- IDs are opaque strings. Never use array index as route identity.
- Completed history identity is `id + completedAt`, not list position.
- Route status literals are exactly `planning`, `active`, and `completed`.
- Stop status literals are exactly `pending`, `completed`, and `skipped`.
- Package status literals are exactly `pending`, `delivered`, and `skipped`.
- Internal imports should use the `@/` alias when practical.

## Change Guidelines

- Preserve RouteContext as the runtime source of truth.
- Preserve AsyncStorage as the route durability layer until an explicit migration is approved.
- Do not let individual tabs fetch and own separate history state.
- Do not place route lifecycle screens back in the root Stack.
- Do not show the bottom tab bar over lifecycle screens.
- Do not reduce the Android tab bar dimensions without Expo Go device validation.
- Add persistence tests for changes to import, status transitions, rename, delete, completion, or history identity.
- Run `npm run typecheck` and `npm test` before closing code changes.
