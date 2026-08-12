import React, { type ReactNode, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
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
  const pressScale = useRef(new Animated.Value(1)).current;
  const animatePress = (toValue: number) => {
    Animated.spring(pressScale, {
      toValue,
      friction: 6,
      tension: 180,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={[fullWidth && styles.fullWidth, { transform: [{ scale: pressScale }] }]}>
      <TouchableOpacity
        {...props}
        disabled={isDisabled}
        activeOpacity={Motion.pressOpacity}
        onPressIn={event => {
          animatePress(0.98);
          props.onPressIn?.(event);
        }}
        onPressOut={event => {
          animatePress(1);
          props.onPressOut?.(event);
        }}
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
    </Animated.View>
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
