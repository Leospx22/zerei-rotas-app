import React, { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui';
import { AnalyticsTimeRangeSelector } from '@/components/analytics/AnalyticsTimeRangeSelector';
import { Colors, Spacing } from '@/constants/theme';
import type { AnalyticsTimeRange } from '@/lib/analyticsTimeRange';

export interface PageAnalyticsHeaderProps {
  title: string;
  subtitle?: string;
  timeRange?: AnalyticsTimeRange;
  onTimeRangeChange?: (value: AnalyticsTimeRange) => void;
  showTimeSelector?: boolean;
  actions?: ReactNode;
  children?: ReactNode;
}

export function PageAnalyticsHeader({
  title,
  subtitle,
  timeRange,
  onTimeRangeChange,
  showTimeSelector = true,
  actions,
  children,
}: PageAnalyticsHeaderProps) {
  const canShowTimeSelector = showTimeSelector && timeRange && onTimeRangeChange;

  return (
    <View style={styles.header}>
      <View style={styles.copy}>
        <AppText variant="pageTitle">{title}</AppText>
        {subtitle ? (
          <AppText variant="body" color={Colors.gray}>
            {subtitle}
          </AppText>
        ) : null}
        {children}
      </View>

      <View style={styles.actions}>
        {canShowTimeSelector ? (
          <AnalyticsTimeRangeSelector
            value={timeRange}
            onChange={onTimeRangeChange}
            showCustom
          />
        ) : null}
        {actions}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.md,
    flexWrap: 'wrap',
  },
  copy: {
    minWidth: 0,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
    flexWrap: 'wrap',
    flexShrink: 1,
  },
});
