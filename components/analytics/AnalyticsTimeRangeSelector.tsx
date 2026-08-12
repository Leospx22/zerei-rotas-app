import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { CalendarRange } from 'lucide-react-native';
import { AppChip } from '@/components/ui';
import { BorderRadius, Colors, Spacing } from '@/constants/theme';
import { IconSize } from '@/constants/designSystem';
import {
  ANALYTICS_TIME_RANGE_OPTIONS,
  type AnalyticsTimeRange,
} from '@/lib/analyticsTimeRange';

export interface AnalyticsTimeRangeSelectorProps {
  value: AnalyticsTimeRange;
  onChange: (value: AnalyticsTimeRange) => void;
  showCustom?: boolean;
}

export function AnalyticsTimeRangeSelector({
  value,
  onChange,
  showCustom = true,
}: AnalyticsTimeRangeSelectorProps) {
  const options = showCustom
    ? ANALYTICS_TIME_RANGE_OPTIONS
    : ANALYTICS_TIME_RANGE_OPTIONS.filter(option => option.value !== 'custom');

  return (
    <View style={styles.frame}>
      <CalendarRange size={IconSize.sm} color={Colors.gold[400]} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.options}
      >
        {options.map(option => (
          <AppChip
            key={option.value}
            label={option.label}
            tone="neutral"
            selected={value === option.value}
            onPress={() => onChange(option.value)}
            style={styles.option}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    minHeight: 48,
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingLeft: Spacing.md,
    paddingRight: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    backgroundColor: Colors.cardBg,
  },
  options: {
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
    paddingRight: Spacing.xs,
  },
  option: {
    minHeight: 36,
  },
});
