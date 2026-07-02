import React, { type ReactNode } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ViewStyle,
} from 'react-native';
import { BorderRadius, Spacing } from '@/constants/theme';
import { ComponentSize, Motion, StatusTone, Typography, type Tone } from '@/constants/designSystem';

export interface AppChipProps {
  label: string;
  tone?: Tone;
  selected?: boolean;
  icon?: ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
}

export function AppChip({
  label,
  tone = 'neutral',
  selected = false,
  icon,
  onPress,
  style,
}: AppChipProps) {
  const colors = StatusTone[selected && tone === 'neutral' ? 'brand' : tone];
  const content = (
    <>
      {icon}
      <Text style={[Typography.label, { color: colors.foreground }]}>{label}</Text>
    </>
  );
  const chipStyle = [
    styles.base,
    onPress && styles.interactive,
    { backgroundColor: colors.background, borderColor: colors.border },
    style,
  ];

  if (!onPress) {
    return <View style={chipStyle}>{content}</View>;
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={Motion.pressOpacity}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      style={chipStyle}
    >
      {content}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: ComponentSize.chip,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  interactive: {
    minHeight: ComponentSize.iconButton,
  },
});
