import React, { type ReactNode } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';
import { Colors, Spacing } from '@/constants/theme';
import { AppButton } from '@/components/ui/AppButton';
import { AppText } from '@/components/ui/AppText';

export interface EmptyStateProps extends ViewProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  style,
  ...props
}: EmptyStateProps) {
  return (
    <View {...props} style={[styles.base, style]}>
      {icon}
      <AppText variant="sectionTitle" style={styles.centered}>
        {title}
      </AppText>
      {description ? (
        <AppText variant="body" color={Colors.gray} style={styles.centered}>
          {description}
        </AppText>
      ) : null}
      {actionLabel && onAction ? (
        <AppButton
          label={actionLabel}
          onPress={onAction}
          variant="secondary"
          fullWidth={false}
          style={styles.action}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.xl,
  },
  centered: {
    textAlign: 'center',
  },
  action: {
    marginTop: Spacing.sm,
  },
});
