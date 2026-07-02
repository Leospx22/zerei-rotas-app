# Zerei Rotas Design System

This additive foundation standardizes new UI without changing existing screens. All user-facing copy must be written in Portuguese.

## Principles

- Optimize for outdoor visibility and one-handed Android use.
- Keep interactive targets at least 48 dp high and primary actions at least 52 dp.
- Use semantic components instead of repeating raw colors and dimensions.
- Pair status color with text or an icon; never communicate status by color alone.
- Respect reduced-motion accessibility settings.
- Prefer direct, short Portuguese labels such as `Continuar`, `Navegar`, and `Registrar ocorrência`.

## Component Inventory

| Component | Purpose |
| --- | --- |
| `AppText` | Semantic typography variants and consistent default color |
| `AppButton` | Primary, secondary, danger, and ghost actions with loading state |
| `AppCard` | Standard card surfaces, padding, borders, and semantic tones |
| `StatusBadge` | Portuguese labels for route, stop, and package status |
| `AppChip` | Static or interactive filters, metadata, and selections |
| `IconContainer` | Consistent icon framing at 36, 48, or 64 dp |
| `LoadingState` | Full-page or compact Portuguese loading feedback |
| `EmptyState` | Empty-state title, description, icon, and optional action |
| `FadeInView` | Reduced-motion-aware entrance animation |

Import primitives from the barrel:

```tsx
import {
  AppButton,
  AppCard,
  AppChip,
  AppText,
  EmptyState,
  StatusBadge,
} from '@/components/ui';
```

## Design Tokens

Tokens are defined in `constants/designSystem.ts` and build on the existing `constants/theme.ts` palette.

### Spacing and Layout

| Token | Value | Use |
| --- | ---: | --- |
| `Layout.screenPadding` | 24 | Horizontal screen padding |
| `Layout.screenBottomPadding` | 48 | Scroll content bottom space |
| `Layout.sectionGap` | 24 | Major sections |
| `Layout.contentGap` | 16 | Related content |
| `Layout.compactGap` | 8 | Tight inline groups |
| `Layout.touchTarget` | 48 | Minimum interactive target |

Use the `Space` scale for exceptions: `4, 8, 16, 24, 32, 48`.

### Typography

Available variants:

- `display`: hero numbers and operational totals
- `pageTitle`: screen titles
- `sectionTitle`: section headings
- `cardTitle`: card headings
- `body`: normal content
- `bodyStrong`: emphasized content
- `label`: badges, chips, and metadata
- `caption`: supporting details
- `button` and `buttonLarge`: action labels

### Component Sizes

- Medium button: 52 dp
- Large primary button: 64 dp
- Interactive chip/icon target: 48 dp
- Static badge: 28 dp
- Input: 52 dp
- Icons: 12, 16, 20, 24, 32, or 48 dp

### Status Tones

- `neutral`: pending or informational
- `brand`: Zerei Rotas gold/blue emphasis
- `success`: completed or delivered
- `warning`: active route or attention
- `error`: occurrence, destructive action, or failure

### Motion

- Fast: 120 ms
- Normal: 220 ms
- Slow: 360 ms
- Press opacity: 0.78
- Entrance offset: 8 dp

`FadeInView` automatically avoids animation when the operating system requests reduced motion. Motion must not delay route actions or hide operational information.

## Usage

```tsx
<AppCard variant="elevated" padding="large">
  <AppText variant="sectionTitle">Parada atual</AppText>
  <StatusBadge status="active" />
  <AppChip label="Portaria" tone="brand" selected />
  <AppButton
    label="PEGUEI OS 8 PACOTES"
    size="large"
    onPress={handleConfirmar}
  />
</AppCard>
```

```tsx
<LoadingState message="Carregando rota..." />

<EmptyState
  title="Nenhuma rota ativa"
  description="Importe uma planilha para começar."
  actionLabel="Importar planilha"
  onAction={handleImportar}
/>
```

## Duplication Audit

The initial audit found safe future migration candidates:

- Card background patterns in 12 screen files.
- Card border patterns in 11 screen files.
- Empty-state layouts in 6 screen files.
- Gradient/button patterns in 9 screen files.
- Repeated 52/56 dp action heights across login, dashboard, import, preparation, summary, organizer, and completion.
- Repeated route/package status labels and badge styling across dashboard, Minhas Rotas, history, and execution.
- Repeated header rows, screen padding, modal actions, icon containers, and loading indicators.

This audit identifies candidates only. Existing screens must not be mechanically migrated without behavior and screenshot validation.

## Migration Plan

1. **Foundation:** keep all primitives additive; validate typecheck and existing tests.
2. **Low-risk states:** migrate isolated loading and empty states one screen at a time.
3. **Metadata:** migrate status badges and static chips with screenshot comparison.
4. **Cards:** migrate simple history/profile cards before operational route cards.
5. **Buttons:** migrate non-destructive actions, then primary and destructive actions with touch testing.
6. **Execution flow:** adopt primitives in `ExecutionCard` only when its feature flag is approved.
7. **Complex surfaces:** migrate modals, package rows, and lifecycle screens after focused regression checks.
8. **Cleanup:** remove obsolete styles only after every consumer has migrated.

For every migration: preserve Portuguese copy, compare before/after screenshots, run typecheck/tests, and validate Android touch targets.

## Future Reusable Components

- `ScreenContainer` and `ScrollScreen`
- `AppHeader` and `SectionHeader`
- `IconButton`
- `MetricCard` and `ProgressBar`
- `FormField` and `SearchField`
- `ListRow` and `SwipeActionRow`
- `AppModal`, `ConfirmationSheet`, and `BottomSheet`
- `Snackbar` with Undo
- `SkeletonCard`
- `StickyActionBar`
- `StopCard`, `PackageRow`, and `OccurrenceSelector`
- `DeliveryTypeSelector`
- `RouteProgressSummary`

Domain components should compose the primitives rather than duplicate their tokens.
