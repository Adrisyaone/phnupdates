import React, { useEffect, useRef } from 'react';
import { Animated, StyleProp, ViewStyle } from 'react-native';
import { motion } from '@/constants/theme';
import { useReducedMotion } from './useReducedMotion';

type Direction = 'up' | 'down' | 'left' | 'right' | 'none';

interface AnimatedEntranceProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Position in a list, used to stagger the reveal. */
  index?: number;
  /** Extra delay before the reveal starts (ms). */
  delay?: number;
  /** Slide-in direction. */
  from?: Direction;
  /** Travel distance in px for the slide. */
  distance?: number;
  duration?: number;
}

const offsetFor = (from: Direction, distance: number) => {
  switch (from) {
    case 'up':
      return { x: 0, y: distance };
    case 'down':
      return { x: 0, y: -distance };
    case 'left':
      return { x: distance, y: 0 };
    case 'right':
      return { x: -distance, y: 0 };
    default:
      return { x: 0, y: 0 };
  }
};

/**
 * Fade + slide entrance with built-in stagger. Wrap any block to have it
 * reveal on mount following the shared motion tokens. Instant when
 * reduce-motion is enabled.
 */
export function AnimatedEntrance({
  children,
  style,
  index = 0,
  delay = 0,
  from = 'up',
  distance = 18,
  duration = motion.duration.base,
}: AnimatedEntranceProps) {
  const reduced = useReducedMotion();
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduced) {
      progress.setValue(1);
      return;
    }
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration,
      delay: delay + index * motion.stagger,
      easing: motion.easing.out,
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [delay, duration, index, progress, reduced]);

  const { x, y } = offsetFor(from, distance);

  const animatedStyle = {
    opacity: progress,
    transform: [
      { translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [x, 0] }) },
      { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [y, 0] }) },
    ],
  };

  return <Animated.View style={[style as any, animatedStyle]}>{children}</Animated.View>;
}
