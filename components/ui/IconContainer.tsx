import React, { type ReactNode } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';
import { BorderRadius } from '@/constants/theme';
import { StatusTone, type Tone } from '@/constants/designSystem';

export type IconContainerSize = 'small' | 'medium' | 'large';

export interface IconContainerProps extends ViewProps {
  children: ReactNode;
  size?: IconContainerSize;
  tone?: Tone;
  circular?: boolean;
}

export function IconContainer({
  children,
  size = 'medium',
  tone = 'brand',
  circular = false,
  style,
  ...props
}: IconContainerProps) {
  const colors = StatusTone[tone];

  return (
    <View
      {...props}
      style={[
        styles.base,
        sizeStyles[size],
        circular && styles.circular,
        { backgroundColor: colors.background, borderColor: colors.border },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  circular: {
    borderRadius: BorderRadius.full,
  },
});

const sizeStyles = StyleSheet.create({
  small: { width: 36, height: 36 },
  medium: { width: 48, height: 48 },
  large: { width: 64, height: 64 },
});
