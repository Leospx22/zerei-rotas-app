import React, { type ReactNode } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';
import { BorderRadius, Colors, Spacing } from '@/constants/theme';
import { Elevation } from '@/constants/designSystem';

export type AppCardVariant = 'default' | 'elevated' | 'success' | 'warning' | 'error';
export type AppCardPadding = 'none' | 'small' | 'medium' | 'large';

export interface AppCardProps extends ViewProps {
  children: ReactNode;
  variant?: AppCardVariant;
  padding?: AppCardPadding;
}

export function AppCard({
  children,
  variant = 'default',
  padding = 'medium',
  style,
  ...props
}: AppCardProps) {
  return (
    <View
      {...props}
      style={[styles.base, variantStyles[variant], paddingStyles[padding], style]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: Colors.cardBg,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: BorderRadius.md,
  },
});

const variantStyles = StyleSheet.create({
  default: {},
  elevated: Elevation.card,
  success: { backgroundColor: Colors.successBg, borderColor: Colors.successBorder },
  warning: { backgroundColor: Colors.warningBg, borderColor: Colors.warningBorder },
  error: { backgroundColor: Colors.errorBg, borderColor: Colors.errorBorder },
});

const paddingStyles = StyleSheet.create({
  none: { padding: 0 },
  small: { padding: Spacing.sm },
  medium: { padding: Spacing.md },
  large: { padding: Spacing.lg },
});
