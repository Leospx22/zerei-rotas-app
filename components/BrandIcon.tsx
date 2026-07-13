import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

interface BrandIconProps {
  size?: number;
}

export function BrandIcon({ size = 36 }: BrandIconProps) {
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.container, { width: size, height: size, borderRadius: size / 2 }]}
    >
      <Image
        source={require('../assets/images/adaptive-icon.png')}
        style={{ width: size, height: size }}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
