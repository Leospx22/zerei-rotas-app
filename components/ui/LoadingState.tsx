import React, { useEffect, useMemo, useRef } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  StyleSheet,
  View,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from 'react-native';
import { BorderRadius, Colors, Spacing } from '@/constants/theme';
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
      <SkeletonLine width={compact ? 24 : 56} height={compact ? 24 : 56} radius={BorderRadius.full} />
      <AppText variant={compact ? 'label' : 'bodyStrong'} color={Colors.gray}>
        {message}
      </AppText>
    </View>
  );
}

export interface SkeletonLineProps {
  width?: ViewStyle['width'];
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

export function SkeletonLine({
  width = '100%',
  height = 14,
  radius = BorderRadius.sm,
  style,
}: SkeletonLineProps) {
  const opacity = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    let mounted = true;
    let animation: Animated.CompositeAnimation | undefined;

    AccessibilityInfo.isReduceMotionEnabled().then(reduceMotion => {
      if (!mounted || reduceMotion) return;
      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: 0.9,
            duration: 850,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0.45,
            duration: 850,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
    });

    return () => {
      mounted = false;
      animation?.stop();
    };
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        { width, height, borderRadius: radius, opacity },
        style,
      ]}
    />
  );
}

export interface SkeletonCardProps extends ViewProps {
  lines?: number;
  compact?: boolean;
}

export function SkeletonCard({
  lines = 3,
  compact = false,
  style,
  ...props
}: SkeletonCardProps) {
  const lineWidths = useMemo<ViewStyle['width'][]>(
    () => Array.from(
      { length: lines },
      (_, index) => `${Math.max(46, 92 - index * 16)}%` as ViewStyle['width']
    ),
    [lines]
  );

  return (
    <View
      {...props}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.skeletonCard, compact && styles.skeletonCardCompact, style]}
    >
      <View style={styles.skeletonHeader}>
        <SkeletonLine width={36} height={36} radius={18} />
        <View style={styles.skeletonHeaderText}>
          <SkeletonLine width="72%" height={14} />
          <SkeletonLine width="46%" height={10} />
        </View>
      </View>
      {lineWidths.map((width, index) => (
        <SkeletonLine
          key={`${width}-${index}`}
          width={width}
          height={compact ? 10 : 12}
        />
      ))}
    </View>
  );
}

export function ScreenSkeleton({
  message = 'Carregando...',
  rows = 4,
  style,
  ...props
}: ViewProps & { message?: string; rows?: number }) {
  return (
    <View
      {...props}
      accessibilityRole="progressbar"
      accessibilityLabel={message}
      style={[styles.screenSkeleton, style]}
    >
      <View style={styles.screenSkeletonHeader}>
        <SkeletonLine width={44} height={44} radius={22} />
        <View style={styles.screenSkeletonTitle}>
          <SkeletonLine width="48%" height={22} />
          <SkeletonLine width="64%" height={12} />
        </View>
      </View>
      {Array.from({ length: rows }, (_, index) => (
        <SkeletonCard key={index} compact={index > 1} />
      ))}
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
  skeleton: {
    backgroundColor: 'rgba(225, 229, 235, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(225, 229, 235, 0.05)',
  },
  skeletonCard: {
    padding: Spacing.md,
    gap: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    backgroundColor: Colors.cardBg,
  },
  skeletonCardCompact: {
    gap: Spacing.sm,
  },
  skeletonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  skeletonHeaderText: {
    flex: 1,
    gap: Spacing.sm,
  },
  screenSkeleton: {
    flex: 1,
    gap: Spacing.md,
    padding: Spacing.lg,
    backgroundColor: Colors.background,
  },
  screenSkeletonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  screenSkeletonTitle: {
    flex: 1,
    gap: Spacing.sm,
  },
});
