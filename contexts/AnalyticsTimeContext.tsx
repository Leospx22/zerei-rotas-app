import React, { createContext, ReactNode, useContext, useMemo, useState } from 'react';
import type { AnalyticsTimeRange } from '@/lib/analyticsTimeRange';

export interface AnalyticsTimeContextValue {
  now: Date;
  todayStart: Date;
  weekStart: Date;
  monthStart: Date;
  dashboardRange: AnalyticsTimeRange;
  setDashboardRange: (value: AnalyticsTimeRange) => void;
  usersRange: AnalyticsTimeRange;
  setUsersRange: (value: AnalyticsTimeRange) => void;
  waitlistRange: AnalyticsTimeRange;
  setWaitlistRange: (value: AnalyticsTimeRange) => void;
}

const AnalyticsTimeContext = createContext<AnalyticsTimeContextValue | null>(null);

function startOfLocalDay(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function startOfLocalWeek(value: Date): Date {
  const dayStart = startOfLocalDay(value);
  const day = dayStart.getDay();
  const daysSinceMonday = day === 0 ? 6 : day - 1;
  dayStart.setDate(dayStart.getDate() - daysSinceMonday);
  return dayStart;
}

function startOfLocalMonth(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), 1);
}

export function AnalyticsTimeProvider({ children }: { children: ReactNode }) {
  const [dashboardRange, setDashboardRange] = useState<AnalyticsTimeRange>('7d');
  const [usersRange, setUsersRange] = useState<AnalyticsTimeRange>('7d');
  const [waitlistRange, setWaitlistRange] = useState<AnalyticsTimeRange>('7d');
  const value = useMemo<AnalyticsTimeContextValue>(() => {
    const now = new Date();
    return {
      now,
      todayStart: startOfLocalDay(now),
      weekStart: startOfLocalWeek(now),
      monthStart: startOfLocalMonth(now),
      dashboardRange,
      setDashboardRange,
      usersRange,
      setUsersRange,
      waitlistRange,
      setWaitlistRange,
    };
  }, [dashboardRange, usersRange, waitlistRange]);

  return (
    <AnalyticsTimeContext.Provider value={value}>
      {children}
    </AnalyticsTimeContext.Provider>
  );
}

export function useAnalyticsTime(): AnalyticsTimeContextValue {
  const context = useContext(AnalyticsTimeContext);
  if (!context) {
    throw new Error('useAnalyticsTime must be used within AnalyticsTimeProvider.');
  }
  return context;
}
