import React, { type ReactNode } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  type TouchableOpacityProps,
} from 'react-native';
import { BorderRadius, Colors, Spacing } from '@/constants/theme';
import { ComponentSize, Motion, Typography } from '@/constants/designSystem';

export type AppButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
export type AppButtonSize = 'medium' | 'large';

export interface AppButtonProps extends Omit<TouchableOpacityProps, 'children'> {
  label: string;
  variant?: AppButtonVariant;
  size?: AppButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
}

export function AppButton({
  label,
  variant = 'primary',
  size = 'medium',
  loading = false,
  fullWidth = true,
  leftIcon,
  disabled,
  style,
  ...props
}: AppButtonProps) {
  const isDisabled = disabled || loading;
  const colors = buttonColors[variant];

  return (
    <TouchableOpacity
      {...props}
      disabled={isDisabled}
      activeOpacity={Motion.pressOpacity}
      accessibilityRole="button"
      accessibilityLabel={props.accessibilityLabel ?? label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={[
        styles.base,
        { minHeight: ComponentSize.button[size] },
        fullWidth && styles.fullWidth,
        { backgroundColor: colors.background, borderColor: colors.border },
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.foreground} />
      ) : (
        <>
          {leftIcon}
          <Text
            style={[
              size === 'large' ? Typography.buttonLarge : Typography.button,
              { color: colors.foreground },
            ]}
          >
            {label}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const buttonColors = {
  primary: {
    background: Colors.gold[500],
    border: Colors.gold[700],
    foreground: Colors.primary[900],
  },
  secondary: {
    background: Colors.primary[500],
    border: Colors.primary[300],
    foreground: Colors.gold[400],
  },
  danger: {
    background: Colors.errorBg,
    border: Colors.errorBorder,
    foreground: Colors.error,
  },
  ghost: {
    background: 'transparent',
    border: Colors.cardBorder,
    foreground: Colors.gray,
  },
} as const;

const styles = StyleSheet.create({
  base: {
    minWidth: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
});
