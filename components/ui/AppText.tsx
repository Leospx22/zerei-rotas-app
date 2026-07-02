import React from 'react';
import { Text, type TextProps } from 'react-native';
import { Colors } from '@/constants/theme';
import { Typography, type TypographyVariant } from '@/constants/designSystem';

export interface AppTextProps extends TextProps {
  variant?: TypographyVariant;
  color?: string;
}

export function AppText({
  variant = 'body',
  color = Colors.white,
  style,
  ...props
}: AppTextProps) {
  return <Text {...props} style={[Typography[variant], { color }, style]} />;
}
