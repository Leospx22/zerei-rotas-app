import React, { type ReactNode, useEffect, useRef } from 'react';
import {
  AccessibilityInfo,
  Animated,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Motion } from '@/constants/designSystem';

export interface FadeInViewProps {
  children: ReactNode;
  duration?: number;
  delay?: number;
  style?: StyleProp<ViewStyle>;
}

export function FadeInView({
  children,
  duration = Motion.duration.normal,
  delay = 0,
  style,
}: FadeInViewProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(Motion.entranceOffset)).current;

  useEffect(() => {
    let mounted = true;
    let animation: Animated.CompositeAnimation | undefined;

    AccessibilityInfo.isReduceMotionEnabled().then(reduceMotion => {
      if (!mounted) return;
      if (reduceMotion) {
        opacity.setValue(1);
        translateY.setValue(0);
        return;
      }

      animation = Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration,
          delay,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration,
          delay,
          useNativeDriver: true,
        }),
      ]);
      animation.start();
    });

    return () => {
      mounted = false;
      animation?.stop();
    };
  }, [delay, duration, opacity, translateY]);

  return (
    <Animated.View style={[{ opacity, transform: [{ translateY }] }, style]}>
      {children}
    </Animated.View>
  );
}
