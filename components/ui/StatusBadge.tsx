import React from 'react';
import { StyleSheet, Text, View, type ViewProps } from 'react-native';
import { BorderRadius, Spacing } from '@/constants/theme';
import { ComponentSize, StatusTone, Typography, type Tone } from '@/constants/designSystem';

export type StatusValue =
  | 'planning'
  | 'active'
  | 'completed'
  | 'pending'
  | 'delivered'
  | 'skipped';

export interface StatusBadgeProps extends ViewProps {
  status: StatusValue;
  label?: string;
}

const statusConfig: Record<StatusValue, { label: string; tone: Tone }> = {
  planning: { label: 'Planejada', tone: 'neutral' },
  active: { label: 'Em andamento', tone: 'warning' },
  completed: { label: 'Concluída', tone: 'success' },
  pending: { label: 'Pendente', tone: 'neutral' },
  delivered: { label: 'Entregue', tone: 'success' },
  skipped: { label: 'Ocorrência', tone: 'error' },
};

export function StatusBadge({ status, label, style, ...props }: StatusBadgeProps) {
  const config = statusConfig[status];
  const colors = StatusTone[config.tone];

  return (
    <View
      {...props}
      accessibilityLabel={`Status: ${label ?? config.label}`}
      style={[
        styles.base,
        { backgroundColor: colors.background, borderColor: colors.border },
        style,
      ]}
    >
      <View style={[styles.dot, { backgroundColor: colors.foreground }]} />
      <Text style={[Typography.label, { color: colors.foreground }]}>
        {label ?? config.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: ComponentSize.badge,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: BorderRadius.full,
  },
});
