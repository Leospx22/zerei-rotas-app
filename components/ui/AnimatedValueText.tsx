import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, type TextProps, type TextStyle } from 'react-native';
import { Motion } from '@/constants/designSystem';

export interface AnimatedValueTextProps extends TextProps {
  value: string | number;
  style?: TextStyle | TextStyle[];
}

export function AnimatedValueText({
  value,
  style,
  ...props
}: AnimatedValueTextProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const opacity = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (Object.is(displayValue, value)) return;

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: Motion.duration.fast,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: -4,
        duration: Motion.duration.fast,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(() => {
      setDisplayValue(value);
      translateY.setValue(4);
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: Motion.duration.fast,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: Motion.duration.fast,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();
    });
  }, [displayValue, opacity, translateY, value]);

  return (
    <Animated.Text
      {...props}
      style={[style, { opacity, transform: [{ translateY }] }]}
    >
      {displayValue}
    </Animated.Text>
  );
}
