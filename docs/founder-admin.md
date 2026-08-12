# Founder Admin

Founder Admin is a read-only production admin surface for the founding team. It is built on existing Founder RPCs and intentionally avoids client-side mutations, SQL changes, migrations, authentication changes, or business logic changes.

## Architecture

- `app/(tabs)/index.tsx` renders the Founder dashboard when `fetchFounderAdminAccess` allows the signed-in user.
- `app/(tabs)/users.tsx` renders the read-only registered users CRM.
- `app/(tabs)/waitlist.tsx` renders the read-only waitlist CRM.
- `contexts/AnalyticsTimeContext.tsx` owns selected analytics ranges for dashboard, users, and waitlist views.
- `lib/founderAccess.ts` checks Founder Admin visibility.
- `lib/founderDashboardMetrics.ts`, `lib/founderUsers.ts`, and `lib/founderWaitlist.ts` are the only Founder data access modules. They call existing RPCs and normalize returned records into UI-safe types.
- React Query owns remote state, retries, stale data, and refetch behavior. Founder pages should prefer stable `queryKey` values that include the selected analytics range.

## Folder Structure

- `app/(tabs)/index.tsx`: dashboard composition, top-level founder analytics cards, and existing route summary content.
- `app/(tabs)/users.tsx`: registered users table, metrics, search, filters, pagination, and user details panel trigger.
- `app/(tabs)/waitlist.tsx`: waitlist page shell and `FounderWaitlistTable` composition.
- `components/founder/FounderStates.tsx`: shared Founder loading, empty, error, and inline skeleton states.
- `components/analytics/`: reusable analytics header and time range selector.
- `components/dashboard/`: dashboard widgets for charts, funnel, alerts, activity, and quick actions.
- `components/FounderUserDetailsPanel.tsx`: user details modal.
- `components/FounderWaitlistDetailsPanel.tsx`: waitlist lead details modal.
- `components/FounderWaitlistTable.tsx`: waitlist metrics, filtering, table, pagination, and lead details panel trigger.
- `components/ui/`: shared app primitives, including buttons, chips, data table, empty state, loading state, and typography.
- `types/founderDashboardMetrics.ts`, `types/founderUsers.ts`, and `types/founderWaitlist.ts`: Founder Admin UI contracts.

## Analytics Components

- `PageAnalyticsHeader` provides consistent page titles, subtitles, time range controls, and page actions.
- `AnalyticsTimeRangeSelector` is the shared control for dashboard, users, and waitlist date scopes.
- `GrowthCharts` derives simple daily buckets from users and waitlist records.
- `ConversionFunnel` displays existing dashboard metrics as a read-only funnel.
- `FounderAlerts` derives informational alert cards from already-loaded dashboard metrics and users.
- `RecentActivity` merges user, waitlist, trial, and premium signals from existing read-only records.

## CRM Components

- `FounderWaitlistTable` supports search, status filters, sort order, pagination, and row selection.
- `FounderUserDetailsPanel` and `FounderWaitlistDetailsPanel` are read-only modal panels. They use `onRequestClose` so Escape and native back actions close the dialogs.
- `DataTable` wraps wide admin tables in a local horizontal scroll container to avoid page-level overflow on smaller screens.
- Status pills and badges use `StatusTone` from `constants/designSystem.ts` for consistent color, border, and dot treatment.

## Dashboard Widgets

- KPI cards show a consistent inline skeleton while metrics are loading.
- Chart cards show friendly unavailable states when the underlying RPC data is missing or temporarily unavailable.
- Dashboard chart data, recent activity, and alert arrays are memoized because they are derived from larger users and waitlist arrays.
- Quick actions remain navigational only and should not introduce write paths.

## Loading, Empty, And Error States

- Use `FounderLoadingState` for page, table, chart, and panel loading.
- Use `FounderInlineSkeleton` inside metric cards or compact surfaces where a full loader would be too heavy.
- Use `FounderEmptyState` for no users, no waitlist records, no search results, no activity, and no alerts.
- Use `FounderErrorState` for all Founder RPC failures. Do not show raw Supabase error messages in UI copy.
- Retry buttons should call the matching React Query `refetch`.

## Future Extension Points

- Add new read-only metrics by extending the existing data access modules and types first, then rendering through dashboard widgets.
- Add new CRM fields by normalizing them in `lib/founderUsers.ts` or `lib/founderWaitlist.ts` before displaying them.
- Add new filters only when the existing RPC data already supports them locally or an approved backend change exists.
- Add new dashboard widgets under `components/dashboard/` and keep derived calculations memoized.
- Add new shared Founder UI states under `components/founder/` when multiple Founder surfaces need the same pattern.

## Production Guardrails

- No SQL changes, RPC changes, migrations, authentication changes, or business logic changes are required for UI stabilization work.
- Founder Admin screens should remain read-only until a separate product and backend decision approves mutations.
- Avoid raw backend error output in user-facing copy.
- Maintain keyboard-accessible controls with labels, button roles, selected states, and modal close handling.
