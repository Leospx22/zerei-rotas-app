export type AnalyticsTimeRange =
  | 'today'
  | 'yesterday'
  | '7d'
  | '30d'
  | 'month'
  | 'last_month'
  | 'quarter'
  | 'year'
  | 'custom';

export interface AnalyticsTimeRangeOption {
  value: AnalyticsTimeRange;
  label: string;
}

export interface AnalyticsDateWindow {
  start: Date;
  end: Date;
}

export const ANALYTICS_TIME_RANGE_OPTIONS: AnalyticsTimeRangeOption[] = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
  { value: 'month', label: 'Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'quarter', label: 'Quarter' },
  { value: 'year', label: 'Year' },
  { value: 'custom', label: 'Custom' },
];

function startOfLocalDay(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function addDays(value: Date, days: number): Date {
  const next = new Date(value);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfQuarter(value: Date): Date {
  const quarterMonth = Math.floor(value.getMonth() / 3) * 3;
  return new Date(value.getFullYear(), quarterMonth, 1);
}

export function resolveAnalyticsDateWindow(
  range: AnalyticsTimeRange,
  now = new Date()
): AnalyticsDateWindow | null {
  const todayStart = startOfLocalDay(now);

  if (range === 'today') {
    return { start: todayStart, end: now };
  }

  if (range === 'yesterday') {
    const start = addDays(todayStart, -1);
    return { start, end: todayStart };
  }

  if (range === '7d') {
    return { start: addDays(todayStart, -6), end: now };
  }

  if (range === '30d') {
    return { start: addDays(todayStart, -29), end: now };
  }

  if (range === 'month') {
    return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now };
  }

  if (range === 'last_month') {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 1);
    return { start, end };
  }

  if (range === 'quarter') {
    return { start: startOfQuarter(now), end: now };
  }

  if (range === 'year') {
    return { start: new Date(now.getFullYear(), 0, 1), end: now };
  }

  return null;
}

export function dateIsInAnalyticsRange(
  value: string,
  range: AnalyticsTimeRange,
  now = new Date()
): boolean {
  const window = resolveAnalyticsDateWindow(range, now);
  if (!window) return true;

  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return false;

  return date >= window.start && date < window.end;
}
