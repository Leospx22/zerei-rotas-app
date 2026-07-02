import React from 'react';
import { ActivityIndicator, StyleSheet, View, type ViewProps } from 'react-native';
import { Colors, Spacing } from '@/constants/theme';
import { AppText } from '@/components/ui/AppText';

export interface LoadingStateProps extends ViewProps {
  message?: string;
  compact?: boolean;
}

export function LoadingState({
  message = 'Carregando...',
  compact = false,
  style,
  ...props
}: LoadingStateProps) {
  return (
    <View
      {...props}
      accessibilityRole="progressbar"
      accessibilityLabel={message}
      style={[styles.base, compact ? styles.compact : styles.full, style]}
    >
      <ActivityIndicator size={compact ? 'small' : 'large'} color={Colors.gold[400]} />
      <AppText variant={compact ? 'label' : 'bodyStrong'} color={Colors.gray}>
        {message}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  compact: {
    flexDirection: 'row',
    padding: Spacing.md,
  },
  full: {
    flex: 1,
    padding: Spacing.xl,
  },
});
