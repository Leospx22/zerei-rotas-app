import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Crown } from 'lucide-react-native';
import { Colors } from '@/constants/theme';

interface HeaderBrandIconProps {
  size?: number;
  containerSize?: number;
  color?: string;
  filled?: boolean;
}

export function HeaderBrandIcon({
  size = 24,
  containerSize,
  color = Colors.gold[400],
  filled = false,
}: HeaderBrandIconProps) {
  const content = (
    <Crown
      pointerEvents="none"
      size={size}
      color={filled ? Colors.primary[900] : color}
    />
  );

  if (!containerSize) return content;

  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.container,
        {
          width: containerSize,
          height: containerSize,
          borderRadius: containerSize / 2,
          backgroundColor: filled ? Colors.gold[500] : 'transparent',
        },
      ]}
    >
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
